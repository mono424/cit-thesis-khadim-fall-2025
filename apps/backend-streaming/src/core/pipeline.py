from core.state import GlobalState
from streaming.camera import start_camera_streams
from ui.canvas import init_canvas
from rendering.init import init_grid_renderer, init_pointcloud_transformer, init_wgpu
from rendering.init import init_pointcloud_renderer
from rendering.init import init_depth_processor
from tetris_buffer.init import init_tetris_buffer
from streaming.camera_descriptions import init_camera_descriptions
from ui.render_loop import RenderLoop
from xylt_processor.process import init_depth_xylt
from ui.ui import run_ui
from browser.camera import init_remote_camera
from browser.webrtc import init_webrtc, run_webrtc
from core.shutdown import init_shutdown_manager, get_shutdown_manager
import asyncio
import threading
import time

def init_pipeline(state: GlobalState):
    state.console.log("Initializing pipeline...")
    init_shutdown_manager(state)  # Initialize shutdown manager first
    init_camera_descriptions(state)
    init_canvas(state)
    init_wgpu(state)
    init_remote_camera(state)
    init_grid_renderer(state)
    init_depth_xylt(state)
    init_depth_processor(state)
    init_pointcloud_transformer(state)
    init_pointcloud_renderer(state)
    init_webrtc(state)
    init_tetris_buffer(state)

def start_pipeline(state: GlobalState):
    """Start the pipeline with shutdown manager"""
    shutdown_manager = get_shutdown_manager()
    if not shutdown_manager:
        raise RuntimeError("Shutdown manager not initialized")
    
    try:
        state.console.log("Starting pipeline...")
        start_camera_streams(state)
        
        # Start WebRTC server in background thread
        state.console.log("Starting WebRTC server in background...")
        webrtc_thread = threading.Thread(target=run_webrtc, args=(state,), daemon=True)
        webrtc_thread.start()
        
        # Give WebRTC server a moment to start
        time.sleep(1)
        
        state.set_render_loop(RenderLoop(state))
        
        # Run render loop with shutdown monitoring
        state.console.log("Starting render loop...")
        asyncio.run(state.render_loop.render_loop())
        
    except KeyboardInterrupt:
        state.console.log("Pipeline interrupted by user")
        shutdown_manager.request_shutdown()
    except Exception as e:
        state.console.log(f"Pipeline error: {e}")
        shutdown_manager.request_shutdown()
        raise
    finally:
        state.console.log("Pipeline shutdown complete")
        shutdown_manager.cleanup()