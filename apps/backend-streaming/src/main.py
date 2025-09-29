#!/usr/bin/env python3
import os
from core.core import run_core
from core.state import GlobalState
from rich.console import Console
from rendering.grid.renderer import create_grid_options
from rendering.pointcloud.renderer import create_pointcloud_options

zenoh_config_path = os.path.join(os.path.dirname(__file__), '../config/zenoh_config.json5')
camera_in_channel = "browser/camera"

def main():
    console = Console()
    
    console.log("Loading Zenoh config...")
    zenoh_config = open(zenoh_config_path).read()

    state = GlobalState(color_camera_count=0, depth_camera_count=4)
    state.set_zenoh_config(zenoh_config)
    state.set_grid_options(create_grid_options({}))
    state.set_pointcloud_options(create_pointcloud_options({}))

    state.set_console(console)
    state.set_camera_in_channel(camera_in_channel)
    state.set_render_method("webrtc")

    run_core(state)

