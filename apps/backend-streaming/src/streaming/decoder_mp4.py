import av
import numpy as np
import threading
from queue import Queue, Empty, Full
from typing import Tuple
from tetris_buffer.sorted_buffer import SortedBufferEntry
from tetris_buffer.engine import TetrisEngine
from streaming.zenoh_cdr import VideoStreamMessage
from core.shutdown import is_shutdown_requested

# --- Global Variables ---
# Queues carry tuples: (payload_bytes, ts_ns)
nal_unit_queues: list[Queue[Tuple[bytes, int]]] = [
    Queue(maxsize=100),
    Queue(maxsize=100),
    Queue(maxsize=100),
    Queue(maxsize=100),
]

def mp4_decoder_unit_handler_factory(index: int):
    return lambda video_message: mp4_decoder_unit_handler(index, video_message)

# --- Zenoh Callback ---
def mp4_decoder_unit_handler(index: int, msg: VideoStreamMessage):
    """Callback function executed when a NAL unit is received via Zenoh."""
    try:
        payload = bytes(msg.image)
        ts_ns = msg.header.stamp.nanosec
        nal_unit_queues[index].put((payload, ts_ns), block=False)
    except Full:
        pass
    except Exception as e:
        print(f"Error in zenoh_callback: {e}")

# --- Decoder Thread ---
def mp4_decoder_thread(buffer: TetrisEngine[np.ndarray], index: int):
    """Thread function ONLY to decode NAL units into NumPy arrays."""
    global nal_unit_queues
    nal_unit_queue = nal_unit_queues[index]

    print(f"Decoder thread {index} started.")
    codec_context = None  # Make local

    try:
        codec_context = av.CodecContext.create('h264', 'r')
        print("H.264 Decoder Initialized.")
        processed_frames = 0

        while not is_shutdown_requested():
            try:
                nal_unit, ts_ns = nal_unit_queue.get(block=True, timeout=0.1)
                packets = codec_context.parse(nal_unit)

                if not packets:
                    continue

                # Decode packets and get frames
                for packet in packets:
                    try:
                        frames = codec_context.decode(packet)
                        if not frames:
                            continue

                        # Process decoded frames
                        for frame in frames:
                            if frame is None or not hasattr(frame, 'to_ndarray'):
                                continue

                            try:
                                img = frame.to_ndarray(format='bgr24')
                                if img is None or not isinstance(img, np.ndarray) or img.size == 0:
                                    continue

                                try:
                                    # display_queue.put((img, ts_ns), block=True, timeout=0.5)
                                    buffer.insert(index, SortedBufferEntry(img, ts_ns))
                                    processed_frames += 1
                                except Full:
                                    pass

                            except Exception:
                                continue

                    except Exception:
                        continue

            except Empty:
                continue
            except Exception as e:
                print(f"Error processing NAL unit in decoder thread: {e}")

        print(f"\nDecoder thread finished cleanly. Processed {processed_frames} frames.")

    except Exception as e:
        print(f"Critical error setting up or running decoder thread: {e}")
    finally:
        if codec_context:
            codec_context = None  # Clear context
