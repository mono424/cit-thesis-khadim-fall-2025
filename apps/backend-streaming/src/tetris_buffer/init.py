from core.state import GlobalState
from performance.fps_counter import FPSCounter
from tetris_buffer.sorted_buffer import SortedBufferGetResult
from tetris_buffer.engine import TetrisEngine
import numpy as np
import threading
import time

def init_tetris_buffer(state: GlobalState) -> TetrisEngine[np.ndarray]:
    state.console.log("Initializing tetris buffer...")

    if state.console is None:
        raise ValueError("Console is not initialized")

    fps_counter = FPSCounter(console=state.console, name="Tetris Buffer")
    fps_counter.start()

    def on_complete_row(row: list[SortedBufferGetResult[np.ndarray]]):
        fps_counter.increment()
        state.display_queues.put([r.result.value for r in row])

    tetris_engine = TetrisEngine(
        size=state.color_camera_count + state.depth_camera_count,
        max_buffer_size=30,
        max_index_value_delta=10 * 1000 * 1000, # 10ms
        on_complete_row=on_complete_row,
        remove_lower_index_values_on_complete_row=True,
    )
    
    # Attach the FPS counter to the engine for metrics recording
    tetris_engine.fps_counter = fps_counter

    def is_shutdown_requested():
        """Check if shutdown is requested, avoiding circular imports"""
        try:
            from core.shutdown import is_shutdown_requested as _is_shutdown_requested
            return _is_shutdown_requested()
        except ImportError:
            return state.should_exit
    
    def print_buffer_status():
        while not is_shutdown_requested():
            # Sleep in small intervals to check for shutdown (1 second total like frontend)
            for _ in range(10):  # Check every 0.1 seconds for 1 second total  
                if is_shutdown_requested():
                    state.console.log("Tetris buffer status thread stopping due to shutdown")
                    return
                time.sleep(0.1)
            try:
                engine_state = tetris_engine.get_state()
                buffers = tetris_engine.get_buffers()
                
                # Collect buffer sizes
                buffer_sizes = [len(buffer) for buffer in buffers]
                total_buffered_items = sum(buffer_sizes)
                
                state.console.log(f"Tetris Buffer Status:")
                state.console.log(f"  Completed rows: {engine_state.completed}")
                state.console.log(f"  Total skipped items: {engine_state.skipped['total']}")
                state.console.log(f"  Skipped per buffer: {engine_state.skipped['buffers']}")
                state.console.log(f"  Buffer sizes: {buffer_sizes}")
                state.console.log(f"  Total buffered items: {total_buffered_items}")
                state.console.log(f"  Max buffer size: {tetris_engine.max_buffer_size}")
                

                if hasattr(tetris_engine, 'fps_counter') and tetris_engine.fps_counter:
                    metrics_data = {
                        "completed_sets_total": engine_state.completed,
                        "skipped_items_total": engine_state.skipped['total'],
                    }
                    
                    for i, size in enumerate(buffer_sizes):
                        metrics_data[f"buffer_length_{i}"] = size
                        
                    skipped_buffers = engine_state.skipped['buffers']
                    if isinstance(skipped_buffers, list):
                        for i, skipped in enumerate(skipped_buffers):
                            metrics_data[f"skipped_items_buffer_{i}"] = skipped
                    
                    tetris_engine.fps_counter.emit_event("buffer_status", metrics_data)
                    
            except Exception as e:
                state.console.log(f"Error printing buffer status: {e}")

    # Start the status monitoring thread
    status_thread = threading.Thread(target=print_buffer_status, daemon=True)
    status_thread.start()
    state.console.log("Started buffer status monitoring thread")

    state.set_tetris_buffer(tetris_engine)
    return tetris_engine