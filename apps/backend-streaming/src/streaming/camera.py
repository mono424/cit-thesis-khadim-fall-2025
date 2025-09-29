from core.state import GlobalState
from streaming.camera_stream_decoder import start_camera_stream

def start_camera_streams(state: GlobalState):
    state.console.log("Starting camera streams...")
    _1 = start_camera_stream(state, 1)
    _2 = start_camera_stream(state, 2)
    _3 = start_camera_stream(state, 3)
    _4 = start_camera_stream(state, 4)
    state.set_camera_streams([_1, _2, _3, _4])