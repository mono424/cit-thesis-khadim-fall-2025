import threading
from zenoh import Session, Sample, Subscriber
from streaming.decoder_mp4 import mp4_decoder_unit_handler_factory, mp4_decoder_thread
from streaming.decoder_zdepth import zdepth_decoder_unit_handler_factory, zdepth_decoder_thread
from core.state import GlobalState

from tetris_buffer.engine import TetrisEngine
from tetris_buffer.sorted_buffer import SortedBufferEntry
from streaming.zenoh_cdr import parse_video_stream_message

# Synchronized outputs (latest matched frames)
synced_color_depth = [None, None, None, None]


class _SimpleSample:
    def __init__(self, payload: bytes):
        self.payload = payload


def camera_color_stream(camera_index):
    return f"tcn/loc/pcpd/camera{str(camera_index).zfill(2)}/str/vid/color_image_bitstream"


def camera_depth_stream(camera_index):
    return f"tcn/testing/camera{str(camera_index).zfill(2)}/str/vid/depth_image_bitstream"


def cdr_passthrough_handler_factory(inner_handler):
    def handler(sample: Sample):
        try:
            msg = parse_video_stream_message(sample.payload.to_bytes())
            inner_handler(msg)
        except Exception:
            print(f"Error parsing video stream message: {sample.payload}")
    return handler


def start_camera_stream(state: GlobalState, camera_index: int) -> tuple[Subscriber, Subscriber]:
    array_index = camera_index - 1

    # Color: subscribe RAW (assume Annex B NAL units)
    if state.color_camera_count >= camera_index:
        dec_thread_mp4 = threading.Thread(target=mp4_decoder_thread, args=(state.tetris_buffer, array_index,), daemon=True)
        dec_thread_mp4.start()
        color_sub = state.z.declare_subscriber(
            camera_color_stream(camera_index),
            cdr_passthrough_handler_factory(mp4_decoder_unit_handler_factory(array_index)),
        )
    else:
        color_sub = None

    # Depth: keep CDR unwrap then forward payload to z-depth decoder
    if state.depth_camera_count >= camera_index:
        dec_thread_zdepth = threading.Thread(target=zdepth_decoder_thread, args=(state.tetris_buffer, state.color_camera_count, array_index,), daemon=True)
        dec_thread_zdepth.start()
        depth_sub = state.z.declare_subscriber(
        camera_depth_stream(camera_index),
            cdr_passthrough_handler_factory(zdepth_decoder_unit_handler_factory(array_index)),
        )
    else:
        depth_sub = None

    return (color_sub, depth_sub)