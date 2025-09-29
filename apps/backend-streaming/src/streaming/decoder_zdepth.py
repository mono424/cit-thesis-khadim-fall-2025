import numpy as np
import time
import threading
from queue import Queue, Empty, Full
from rich.console import Console
import pyzdepth
from tetris_buffer.engine import TetrisEngine
from tetris_buffer.sorted_buffer import SortedBufferEntry
from streaming.zenoh_cdr import VideoStreamMessage
from core.shutdown import is_shutdown_requested

# --- Global Variables ---
# raw queue carries (payload, ts_ns)
zdepth_raw_queues: list[Queue[tuple[bytes, int]]] = [
    Queue(maxsize=100),
    Queue(maxsize=100),
    Queue(maxsize=100),
    Queue(maxsize=100),
]

def zdepth_decoder_unit_handler_factory(index: int):
    return lambda video_message: zdepth_decoder_unit_handler(index, video_message)

# --- Zenoh Callback ---
def zdepth_decoder_unit_handler(index: int, msg: VideoStreamMessage):
    """Callback function executed when a Zdepth unit is received via Zenoh."""
    try:
        payload = bytes(msg.image)
        ts_ns = msg.header.stamp.nanosec
        zdepth_raw_queues[index].put((payload, ts_ns), block=False)
    except Full:
        pass
    except Exception as e:
        print(f"Error in zdepth zenoh_callback: {e}")

# --- Decoder Thread ---
def zdepth_decoder_thread(buffer: TetrisEngine[np.ndarray], depth_buffer_offset: int, index: int):
    """Thread function to decode z-depth frames using pyzdepth."""
    global zdepth_raw_queues
    console = Console()
    zdepth_raw_queue = zdepth_raw_queues[index]

    console.log(f"Zdepth Decoder thread {index} started.")

    # Import compiled extension, avoiding the local source folder shadowing
    decompressor = pyzdepth.DepthCompressor()

    while not is_shutdown_requested():
        try:
            payload, ts_ns = zdepth_raw_queue.get(timeout=0.5)
            result, width, height, depth_bytes = decompressor.Decompress(payload)
            
            # Success is 5 in DepthResult
            if result != 5:
                if result == 3:  # MissingPFrame - frame sequencing issue, skip this frame
                    continue
                else:
                    # Log other errors but don't crash the thread
                    result_names = {0: "FileTruncated", 1: "WrongFormat", 2: "Corrupted", 4: "BadDimensions"}
                    result_name = result_names.get(result, f"Unknown({result})")
                    console.log(f"[zdepth {index}] Decompression error: {result_name} ({result})")
                    continue
            
            if width <= 0 or height <= 0 or depth_bytes is None:
                console.log(f"[zdepth {index}] Invalid dimensions or null depth_bytes")
                continue

            decoded = np.frombuffer(depth_bytes, dtype=np.uint16, count=width * height).reshape((height, width))
            if decoded is None:
                continue
            try:
                # zdepth_decoded_queue.put((decoded, ts_ns), timeout=0.1)
                buffer.insert(depth_buffer_offset + index, SortedBufferEntry(decoded, ts_ns))
            except Full:
                pass
        except Empty:
            continue
        except Exception as e:
            console.log(f"Error in zdepth decoder thread {index}: {e}")
            time.sleep(0.01)

    console.log(f"Zdepth Decoder thread {index} exiting.")
