from rendering.pointcloud_transformer.transformer import PointcloudTransformer
from zenoh import Session, Subscriber
from rich.console import Console
from rendercanvas.offscreen import OffscreenRenderCanvas as WgpuCanvas
from rendering.grid.renderer import GridRenderer, GridRendererOptions
from wgpu import GPUDevice, GPUCanvasContext
from rendering.pointcloud.renderer import PointCloudRenderer, PointCloudRendererOptions
from rendering.depth2points.processor import DepthProcessor
from typing import TYPE_CHECKING
from typing import Literal, Any
from tetris_buffer import TetrisEngine
from queue import Queue
from typing import Tuple
import numpy as np
from streaming.zenoh_cdr import CameraSensor

RenderMethod = Literal["onscreen", "webrtc"]

if TYPE_CHECKING:
    from rendering.renderer import Renderer
    from browser.camera import RemoteCamera
    from browser.webrtc import WebRTCServer
    from ui.render_loop import RenderLoop

class GlobalState:
    def __init__(self, color_camera_count: int, depth_camera_count: int):
        self.color_camera_count = color_camera_count
        self.depth_camera_count = depth_camera_count
        self.render_method: RenderMethod | None = None
        self.camera_in_channel: str | None = None
        self.browser_camera_stream: Subscriber | None = None
        self.remote_camera: "RemoteCamera | None" = None
        self.zenoh_config: str | None = None
        self.z: Session | None = None
        self.camera_descriptions: list[CameraSensor] | None = None
        self.console: Console | None = None
        self.canvas: WgpuCanvas | None = None
        self.device: GPUDevice | None = None
        self.context: GPUCanvasContext | None = None
        self.render_format: str | None = None
        self.renderer: "Renderer | None" = None
        self.camera_streams: list[tuple[Subscriber, Subscriber]] | None = None
        self.grid_renderer: GridRenderer | None = None
        self.grid_options: GridRendererOptions | None = None
        self.pointcloud_transformer: PointcloudTransformer | None = None
        self.pointcloud_renderer: PointCloudRenderer | None = None
        self.pointcloud_options: PointCloudRendererOptions | None = None
        self.depth_processor: DepthProcessor | None = None
        self.webrtc_server: "WebRTCServer | None" = None
        self.tetris_buffer: TetrisEngine[Any] | None = None
        self.display_queues: Queue[list[np.ndarray]] = Queue(maxsize=10)
        self.depth_xylt = None
        self.render_loop: RenderLoop | None = None
        # Shutdown flag for graceful termination
        self.should_exit: bool = False
    
    def set_depth_xylt(self, depth_xylt: list[np.ndarray]):
        self.depth_xylt = depth_xylt

    def set_render_method(self, render_method: RenderMethod):
        self.render_method = render_method

    def set_camera_in_channel(self, camera_in_channel: str):
        self.camera_in_channel = camera_in_channel

    def set_remote_camera(self, remote_camera: "RemoteCamera"):
        self.remote_camera = remote_camera

    def set_browser_camera_stream(self, browser_camera_stream: Subscriber):
        self.browser_camera_stream = browser_camera_stream
    
    def set_context(self, context: GPUCanvasContext):
        self.context = context

    def set_camera_descriptions(self, camera_descriptions: list[CameraSensor]):
        self.camera_descriptions = camera_descriptions

    def set_grid_renderer(self, grid_renderer: GridRenderer):
        self.grid_renderer = grid_renderer

    def set_grid_options(self, grid_options: GridRendererOptions):
        self.grid_options = grid_options

    def set_pointcloud_transformer(self, pointcloud_transformer: PointcloudTransformer):
        self.pointcloud_transformer = pointcloud_transformer

    def set_pointcloud_renderer(self, pointcloud_renderer: PointCloudRenderer):
        self.pointcloud_renderer = pointcloud_renderer

    def set_pointcloud_options(self, pointcloud_options: PointCloudRendererOptions):
        self.pointcloud_options = pointcloud_options

    def set_depth_processor(self, depth_processor: DepthProcessor):
        self.depth_processor = depth_processor

    def set_zenoh_config(self, zenoh_config: str):
        self.zenoh_config = zenoh_config

    def set_z(self, z: Session):
        self.z = z

    def set_canvas(self, canvas: WgpuCanvas):
        self.canvas = canvas

    def set_console(self, console: Console):
        self.console = console

    def set_renderer(self, renderer: "Renderer"):
        self.renderer = renderer
    
    def set_device(self, device: GPUDevice):
        self.device = device

    def set_camera_streams(self, camera_streams: list[tuple[Subscriber, Subscriber]]):
        self.camera_streams = camera_streams
    
    def set_render_format(self, render_format: str):
        self.render_format = render_format

    def set_webrtc_server(self, webrtc_server: "WebRTCServer"):
        self.webrtc_server = webrtc_server

    def set_tetris_buffer(self, tetris_buffer: TetrisEngine[Any]):
        self.tetris_buffer = tetris_buffer

    def set_render_loop(self, render_loop: "RenderLoop"):
        self.render_loop = render_loop