from core.state import GlobalState
from streaming.zenoh_cdr import parse_device_context_reply
import time
from zenoh import Encoding

def camera_color_stream(camera_index):
    return f"tcn/loc/pcpd/k4a_capture_multi/rpc/sensor/camera{str(camera_index).zfill(2)}/describe"

def init_camera_descriptions(state: GlobalState):
    camera_descriptions = []
    for i in range(max(state.color_camera_count, state.depth_camera_count)):
        success = False
        while not success:
            try:
                result = state.z.get(camera_color_stream(i+1), encoding=Encoding.APPLICATION_CDR).recv()
                camera_description = result.result.payload.to_bytes()
                parsed = parse_device_context_reply(camera_description)
                camera_descriptions.append(parsed.value)
                success = True
            except Exception as e:
                print(f"Waiting for camera description for camera {i+1}...")
                time.sleep(3)
    state.set_camera_descriptions(camera_descriptions)