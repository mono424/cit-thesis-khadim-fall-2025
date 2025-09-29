from rendering.depth2points.processor import DepthOutputBuffers
import wgpu
from typing import Callable, Any
from dataclasses import dataclass
from core.state import GlobalState
import numpy as np

@dataclass
class RenderResources:
    """Resources needed for rendering."""
    create_render_pass_descriptor: Callable[[], dict[str, Any]]


def create_render_resources(state: GlobalState) -> RenderResources:
    # Cache for depth texture to avoid recreating it every frame if size hasn't changed
    cached_depth_texture = None
    cached_size = None
    
    def create_render_pass_descriptor() -> dict[str, Any]:
        """Create render pass descriptor for each frame."""
        nonlocal cached_depth_texture, cached_size
        
        if state.context is None:
            raise RuntimeError("Context is not initialized")
        
        current_texture = state.context.get_current_texture()
        current_size = current_texture.size
        
        # Create or recreate depth texture if size changed
        if cached_depth_texture is None or cached_size != current_size:
            if cached_depth_texture:
                cached_depth_texture.destroy()
            
            if state.device is None:
                raise RuntimeError("Device is not initialized")
            cached_depth_texture = state.device.create_texture(
                size=current_size,
                format=wgpu.TextureFormat.depth24plus,
                usage=wgpu.TextureUsage.RENDER_ATTACHMENT,
            )
            cached_size = current_size
        
        return {
            "color_attachments": [
                {
                    "view": current_texture.create_view(),
                    "clear_value": (0.1 * 0.5, 0.1 * 0.5, 0.2 * 0.5, 1.0 * 0.5),
                    "load_op": wgpu.LoadOp.clear,
                    "store_op": wgpu.StoreOp.store,
                }
            ],
            "depth_stencil_attachment": {
                "view": cached_depth_texture.create_view(),
                "depth_clear_value": 1.0,
                "depth_load_op": wgpu.LoadOp.clear,
                "depth_store_op": wgpu.StoreOp.store,
            },
        }
    
    return RenderResources(
        create_render_pass_descriptor=create_render_pass_descriptor,
    )


class Renderer:
    def __init__(self, state: GlobalState):
        self.state: GlobalState = state
        # Create render resources
        self.render_resources: RenderResources = create_render_resources(state)
        self.color_images: list[Any | None] = [None] * state.color_camera_count
        self.color_camera_count: int = state.color_camera_count
        self.depth_camera_count: int = state.depth_camera_count
        self.canvas: Any = None
        if state.camera_descriptions and len(state.camera_descriptions) > 0:
            depth_params = state.camera_descriptions[0].depth_parameters
            self.pixel_count: int = depth_params.image_width * depth_params.image_height
        else:
            self.pixel_count: int = 0

    def update_images(self):
        images = self.state.display_queues.get()
        if images is None or len(images) != self.depth_camera_count + self.color_camera_count:
            return
        if self.state.depth_processor is None:
            return
        if self.state.pointcloud_transformer is None:
            return
        for i in range(self.depth_camera_count):
            self.state.depth_processor.process_depth_data(i, images[self.color_camera_count + i])
        self.state.pointcloud_transformer.process_all()

    def render_frame(self):
        if (self.state.remote_camera is None or 
            self.state.device is None or 
            self.state.depth_processor is None or
            self.state.grid_renderer is None or
            self.state.pointcloud_transformer is None or
            self.state.pointcloud_renderer is None):
            return

        view_matrix = self.state.remote_camera.get_view_matrix()
        projection_matrix = self.state.remote_camera.get_projection_matrix()

        self.update_images()

        try:
            command_encoder = self.state.device.create_command_encoder()
            render_pass = command_encoder.begin_render_pass(
                **self.render_resources.create_render_pass_descriptor()
            )

            pointcloud_buffers = self.state.depth_processor.get_output_buffers()
            pointcloud_position_buffers = self.state.pointcloud_transformer.output_buffers

            final_pointcloud_buffers: list[DepthOutputBuffers] = [
                DepthOutputBuffers(
                    position_buffer=pointcloud_position_buffers[i],
                    normal_buffer=b.normal_buffer,
                    tex_coord_buffer=b.tex_coord_buffer,
                    camera_params_buffer=b.camera_params_buffer
                )
                for i, b in enumerate(pointcloud_buffers)
            ]
            
            # Update camera matrices
            self.state.grid_renderer.update_camera(
                view_matrix=view_matrix,
                projection_matrix=projection_matrix
            )
            self.state.pointcloud_renderer.update_camera(
                view_matrix=view_matrix,
                projection_matrix=projection_matrix
            )

            # Render grid and pointcloud
            self.state.grid_renderer.render(command_encoder, render_pass)
            
            self.state.pointcloud_renderer.render(
                command_encoder,
                render_pass,
                final_pointcloud_buffers,
                self.pixel_count
            )
            
            render_pass.end()
            self.state.device.queue.submit([command_encoder.finish()])
            
        except Exception as e:
            print(f"Error during frame rendering: {e}")

    def draw_frame(self) -> np.ndarray | None:
        if self.state.canvas is None:
            return None
        return np.asarray(self.state.canvas.draw())

    def resize(self, canvas: Any):
        self.canvas: Any = canvas