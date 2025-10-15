from core.state import GlobalState
from rendering.grid.renderer import GridRenderer
from rendering.pointcloud.renderer import PointCloudRenderer
from rendering.depth2points.processor import DepthProcessor, DepthProcessorOptions
from rendering.pointcloud_transformer.transformer import PointcloudTransformer, PointcloudTransformerOptions
from wgpu import gpu
from rendering.renderer import Renderer

def init_wgpu(state: GlobalState):
    if state.canvas is None:
        raise ValueError("Canvas is not initialized")
    adapter = gpu.request_adapter_sync(power_preference="high-performance")
    device = adapter.request_device_sync(required_limits=None)
    context = state.canvas.get_context("wgpu")
    render_texture_format = context.get_preferred_format(device.adapter)
    context.configure(
        device=device,
        format=render_texture_format,
    )
    state.set_device(device)
    state.set_context(context)
    state.set_render_format(render_texture_format)
    state.set_renderer(Renderer(state))

def init_grid_renderer(state: GlobalState):
    """Initialize the grid renderer."""
    if state.console is None:
        raise ValueError("Console is not initialized")
    if state.device is None:
        raise ValueError("Device is not initialized")
    if state.grid_options is None:
        raise ValueError("Grid options are not initialized")
    if state.render_format is None:
        raise ValueError("Render format is not initialized")
    state.set_grid_renderer(GridRenderer(state.device, state.grid_options, state.render_format))

def init_pointcloud_transformer(state: GlobalState):
    """Initialize the pointcloud transformer."""
    if state.console is None:
        raise ValueError("Console is not initialized")
    if state.device is None:
        raise ValueError("Device is not initialized")
    if state.camera_descriptions is None:
        raise ValueError("Camera descriptions are not initialized")
    if state.depth_processor is None:
        raise ValueError("Depth processor is not initialized")
    state.set_pointcloud_transformer(PointcloudTransformer(state.device, PointcloudTransformerOptions(
        camera_sensors=state.camera_descriptions,
        input_buffers=[b.position_buffer for b in state.depth_processor.output_buffers],
        console=state.console,
    )))

def init_pointcloud_renderer(state: GlobalState):
    """Initialize the pointcloud renderer."""
    if state.console is None:
        raise ValueError("Console is not initialized")
    if state.device is None:
        raise ValueError("Device is not initialized")
    if state.pointcloud_options is None:
        raise ValueError("Pointcloud options are not initialized")
    if state.render_format is None:
        raise ValueError("Render format is not initialized")
    state.set_pointcloud_renderer(PointCloudRenderer(state.device, state.pointcloud_options, state.render_format))

def init_depth_processor(state: GlobalState):
    """Initialize the depth processor."""
    if state.console is None:
        raise ValueError("Console is not initialized")
    if state.camera_descriptions is None:
        raise ValueError("Camera descriptions are not initialized")
    if state.device is None:
        raise ValueError("Device is not initialized")
    if state.depth_xylt is None:
        raise ValueError("Depth XY lookup tables are not initialized")
    
    state.set_depth_processor(DepthProcessor(state.device, DepthProcessorOptions(
        width=state.camera_descriptions[0].depth_parameters.image_width,
        height=state.camera_descriptions[0].depth_parameters.image_height,
        camera_params=[x.depth_parameters for x in state.camera_descriptions][:state.depth_camera_count],
        xy_lookup_tables=state.depth_xylt,
        console=state.console,
    )))