from typing import Any
import numpy as np
from dataclasses import dataclass
from rendering.depth2points.processor import DepthOutputBuffers
import wgpu
import os

# --------------------------------------------------------------------------------------------------
# Options and Data Structures
# --------------------------------------------------------------------------------------------------

@dataclass
class PointCloudRendererOptions:
    """Configuration options for the point cloud renderer."""
    enable_blending: bool


def create_pointcloud_options(options: dict[str, Any] | None = None) -> PointCloudRendererOptions:
    """Create point cloud options with default values."""
    if options is None:
        options = {}
    
    return PointCloudRendererOptions(
        enable_blending=options.get('enable_blending', True),
    )

# --------------------------------------------------------------------------------------------------
# PointCloud Renderer Class
# --------------------------------------------------------------------------------------------------

class PointCloudRenderer:
    """WebGPU-based point cloud renderer for 3D visualization."""
    
    def __init__(self, device: wgpu.GPUDevice, options: PointCloudRendererOptions, render_format: str = 'bgra8unorm'):
        """Initialize the point cloud renderer."""
        self.device = device
        self.options = options
        self.render_format = render_format

        # Load WGSL shaders from the 'shaders' subdirectory
        shader_dir = os.path.join(os.path.dirname(__file__), 'shaders')
        with open(os.path.join(shader_dir, 'PointCloudShader.vert.wgsl'), 'r') as f:
            vertex_shader_code = f.read()
        with open(os.path.join(shader_dir, 'PointCloudShader.frag.wgsl'), 'r') as f:
            fragment_shader_code = f.read()

        vertex_module = self.device.create_shader_module(code=vertex_shader_code)
        fragment_module = self.device.create_shader_module(code=fragment_shader_code)
        
        # --- Create Buffers, Textures, and Sampler ---
        
        # Uniform buffer for matrices, lighting, and other parameters (aligned to 256 bytes)
        self.uniform_buffer = self.device.create_buffer(
            size=256,
            usage=wgpu.BufferUsage.UNIFORM | wgpu.BufferUsage.COPY_DST
        )
        
        # Uniform buffer for lighting properties (aligned to 128 bytes)
        self.lighting_uniform_buffer = self.device.create_buffer(
            size=128,
            usage=wgpu.BufferUsage.UNIFORM | wgpu.BufferUsage.COPY_DST
        )

        # Create dummy 1x1 textures (to be replaced with actual data later)
        self.color_texture = self.device.create_texture(
            size=(1, 1, 1), format="rgba8unorm",
            usage=wgpu.TextureUsage.TEXTURE_BINDING | wgpu.TextureUsage.COPY_DST,
        )
        self.depth_texture = self.device.create_texture(
            size=(1, 1, 1), format="r16uint",
            usage=wgpu.TextureUsage.TEXTURE_BINDING | wgpu.TextureUsage.COPY_DST,
        )
        
        # Create a texture sampler
        self.sampler = self.device.create_sampler(mag_filter="linear", min_filter="linear")
        
        # --- Create Pipeline Layout and Bind Group ---

        bind_group_layout = self.device.create_bind_group_layout(
            entries=[
                {"binding": 0, "visibility": wgpu.ShaderStage.VERTEX | wgpu.ShaderStage.FRAGMENT, "buffer": {"type": "uniform"}},
                {"binding": 1, "visibility": wgpu.ShaderStage.FRAGMENT, "buffer": {"type": "uniform"}},
                {"binding": 2, "visibility": wgpu.ShaderStage.FRAGMENT, "texture": {"sample_type": "float"}},
                {"binding": 3, "visibility": wgpu.ShaderStage.FRAGMENT, "texture": {"sample_type": "uint"}},
                {"binding": 4, "visibility": wgpu.ShaderStage.FRAGMENT, "sampler": {"type": "filtering"}},
            ]
        )

        self.bind_group = self.device.create_bind_group(
            layout=bind_group_layout,
            entries=[
                {"binding": 0, "resource": {"buffer": self.uniform_buffer, "offset": 0, "size": self.uniform_buffer.size}},
                {"binding": 1, "resource": {"buffer": self.lighting_uniform_buffer, "offset": 0, "size": self.lighting_uniform_buffer.size}},
                {"binding": 2, "resource": self.color_texture.create_view()},
                {"binding": 3, "resource": self.depth_texture.create_view()},
                {"binding": 4, "resource": self.sampler},
            ]
        )
        
        # --- Create Render Pipeline ---
        
        pipeline_layout = self.device.create_pipeline_layout(bind_group_layouts=[bind_group_layout])
        
        blend_state = None
        if self.options.enable_blending:
            blend_state = {
                "color": {"src_factor": "src-alpha", "dst_factor": "one-minus-src-alpha", "operation": "add"},
                "alpha": {"src_factor": "one", "dst_factor": "one-minus-src-alpha", "operation": "add"},
            }

        self.pipeline = self.device.create_render_pipeline(
            layout=pipeline_layout,
            vertex={
                "module": vertex_module,
                "entry_point": "main",
                "buffers": [
                    {"array_stride": 16, "step_mode": "vertex", "attributes": [{"format": "float32x4", "offset": 0, "shader_location": 0}]}, # Position
                    {"array_stride": 16, "step_mode": "vertex", "attributes": [{"format": "float32x4", "offset": 0, "shader_location": 1}]}, # Normal
                    {"array_stride": 16, "step_mode": "vertex", "attributes": [{"format": "float32x4", "offset": 0, "shader_location": 2}]}, # Tex Coords
                ],
            },
            fragment={
                "module": fragment_module,
                "entry_point": "main",
                "targets": [{"format": self.render_format, "blend": blend_state}],
            },
            primitive={"topology": "point-list"},
            depth_stencil={"depth_write_enabled": True, "depth_compare": "less", "format": "depth24plus"},
        )
        
        # Initialize uniforms with default values
        self._update_lighting_uniforms()

    def _update_lighting_uniforms(self):
        """Write default lighting data to the lighting uniform buffer."""
        # Buffer size is 128 bytes -> 32 floats
        lighting_data = np.zeros(32, dtype=np.float32)
        lighting_data[0:4]   = [0.2, 0.2, 0.2, 1.0]  # Ambient color
        lighting_data[4:8]   = [0.8, 0.8, 0.8, 1.0]  # Diffuse color
        lighting_data[8:12]  = [1.0, 1.0, 1.0, 1.0]  # Specular color
        lighting_data[12]    = 80.0                   # Shininess
        lighting_data[16:32] = np.tile([1.0, 1.0, 1.0, 1.0], 4) # 4 Light colors

        self.device.queue.write_buffer(self.lighting_uniform_buffer, 0, lighting_data)

    def _extract_normal_matrix(self, view_matrix_flat: np.ndarray) -> np.ndarray:
        """Extract the upper-left 3x3 portion of a 4x4 matrix for normals."""
        return np.array([
            view_matrix_flat[0], view_matrix_flat[1], view_matrix_flat[2],
            view_matrix_flat[4], view_matrix_flat[5], view_matrix_flat[6],
            view_matrix_flat[8], view_matrix_flat[9], view_matrix_flat[10],
        ], dtype=np.float32)

    def update_camera(self, view_matrix: np.ndarray, projection_matrix: np.ndarray):
        """Update and write camera, lighting, and parameter data to the main uniform buffer."""
        # Buffer size is 256 bytes -> 64 floats
        uniform_data = np.zeros(64, dtype=np.float32)
        
        # Matrices (Offsets are in floats)
        uniform_data[0:16] = view_matrix.flatten()
        uniform_data[16:32] = projection_matrix.flatten()
        
        # Normal Matrix (mat3x3 padded to 3*vec4)
        normal_matrix = self._extract_normal_matrix(view_matrix.flatten())
        uniform_data[32:35] = normal_matrix[0:3]
        uniform_data[36:39] = normal_matrix[3:6]
        uniform_data[40:43] = normal_matrix[6:9]
        
        # Light Positions (4 * vec3 padded to 4*vec4)
        light_positions = np.array([
            [2.0, 2.0, 2.0, 0.0], [-2.0, 2.0, 2.0, 0.0],
            [2.0, -2.0, 2.0, 0.0], [-2.0, -2.0, 2.0, 0.0],
        ], dtype=np.float32).flatten()
        uniform_data[48:64] = light_positions

        self.device.queue.write_buffer(self.uniform_buffer, 0, uniform_data)


    def render(self, command_encoder, render_pass, point_cloud_buffers: list[DepthOutputBuffers], pixel_count: int):
        """Record rendering commands for the point clouds."""
        render_pass.set_pipeline(self.pipeline)
        render_pass.set_bind_group(0, self.bind_group)
        
        # Iterate and draw the point cloud for each buffer set provided.
        for buffers in point_cloud_buffers:
            render_pass.set_vertex_buffer(0, buffers.position_buffer)
            render_pass.set_vertex_buffer(1, buffers.normal_buffer)
            render_pass.set_vertex_buffer(2, buffers.tex_coord_buffer)
            render_pass.draw(pixel_count)
