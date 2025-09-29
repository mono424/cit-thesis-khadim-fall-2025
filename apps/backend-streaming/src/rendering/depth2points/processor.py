import numpy as np
from dataclasses import dataclass
from performance.fps_counter import FPSCounter
from rich.console import Console
import wgpu
import os
import math
from streaming.zenoh_cdr import CameraModel

# --------------------------------------------------------------------------------------------------
# Options and Data Structures
# --------------------------------------------------------------------------------------------------

@dataclass
class DepthProcessorOptions:
    """Configuration options for the depth processor."""
    width: int
    height: int
    camera_params: list[CameraModel]  # list of camera parameter dictionaries
    xy_lookup_tables: list[np.ndarray]
    console: Console

@dataclass
class DepthInputBuffers:
    """Container for the per-camera input textures."""
    depth_texture: wgpu.GPUTexture
    xy_lookup_texture: wgpu.GPUTexture

@dataclass
class DepthOutputBuffers:
    """Container for the per-camera output buffers holding point cloud data."""
    position_buffer: wgpu.GPUBuffer
    tex_coord_buffer: wgpu.GPUBuffer
    normal_buffer: wgpu.GPUBuffer
    camera_params_buffer: wgpu.GPUBuffer

# --------------------------------------------------------------------------------------------------
# Depth Processor Class
# --------------------------------------------------------------------------------------------------

class DepthProcessor:
    """
    Manages the WebGPU compute pipeline for processing depth textures into 3D point clouds.
    """
    
    def __init__(self, device: wgpu.GPUDevice, options: DepthProcessorOptions):
        """Initialize the depth processor."""
        self.device = device
        self.options = options
        self.pipeline: wgpu.GPUComputePipeline = None
        self.input_buffers: list[DepthInputBuffers] = []
        self.output_buffers: list[DepthOutputBuffers] = []
        self.fps_counter = FPSCounter(console=options.console, name="Depth Processor")
        self.fps_counter.start()

        # Load the compute shader
        shader_path = os.path.join(os.path.dirname(__file__), 'shaders', 'depth-to-point-cloud.wgsl')
        with open(shader_path, 'r') as f:
            compute_shader_code = f.read()
            
        compute_module = self.device.create_shader_module(code=compute_shader_code)

        # Create the compute pipeline
        self.pipeline = self.device.create_compute_pipeline(
            layout='auto',
            compute={
                "module": compute_module,
                "entry_point": "main",
                "constants": {
                    "calculate_normals": 0, # Set to 1 to enable normal calculation in shader
                },
            }
        )

        self._create_buffers()

    def _create_buffers(self):
        """Create and initialize all necessary input and output buffers and textures."""
        width, height, camera_params, xy_lookup_tables = self.options.width, self.options.height, self.options.camera_params, self.options.xy_lookup_tables
        pixel_count = width * height

        # Create buffers for up to 4 cameras
        for i in range(4):
            intrinsics = camera_params[i]
            xy_lookup_table = xy_lookup_tables[i]
            
            # --- Create Input Textures ---
            depth_texture = self.device.create_texture(
                size=(width, height, 1), format="r16uint",
                usage=wgpu.TextureUsage.TEXTURE_BINDING | wgpu.TextureUsage.COPY_DST
            )
            xy_lookup_texture = self.device.create_texture(
                size=(width, height, 1), format="rg32float",
                usage=wgpu.TextureUsage.TEXTURE_BINDING | wgpu.TextureUsage.COPY_DST
            )
            
            self._update_xy_table(xy_lookup_table, xy_lookup_texture)
            self.input_buffers.append(DepthInputBuffers(depth_texture, xy_lookup_texture))
            
            # --- Create Output Storage Buffers ---
            position_buffer = self.device.create_buffer(
                size=pixel_count * 16, # vec4<f32>
                usage=wgpu.BufferUsage.STORAGE | wgpu.BufferUsage.VERTEX | wgpu.BufferUsage.COPY_SRC
            )
            tex_coord_buffer = self.device.create_buffer(
                size=pixel_count * 16, # vec4<f32>
                usage=wgpu.BufferUsage.STORAGE | wgpu.BufferUsage.VERTEX | wgpu.BufferUsage.COPY_SRC
            )
            normal_buffer = self.device.create_buffer(
                size=pixel_count * 16, # vec4<f32>
                usage=wgpu.BufferUsage.STORAGE | wgpu.BufferUsage.VERTEX | wgpu.BufferUsage.COPY_SRC
            )
            
            # --- Create and write camera parameters uniform buffer ---
            camera_params_buffer = self.device.create_buffer(
                size=144, # Must match shader uniform struct size
                usage=wgpu.BufferUsage.UNIFORM | wgpu.BufferUsage.COPY_DST
            )
            self._write_camera_params(camera_params_buffer, intrinsics)
            
            self.output_buffers.append(DepthOutputBuffers(
                position_buffer, tex_coord_buffer, normal_buffer, camera_params_buffer
            ))

    def _write_camera_params(self, buffer: wgpu.GPUBuffer, intrinsics: CameraModel):
        """Populate the uniform buffer with camera intrinsic parameters."""
        width, height = self.options.width, self.options.height
        k = intrinsics.radial_coefficients
        p = intrinsics.tangential_coefficients


        params_array = np.array([
            width, height, width, height,                               # depth_dim, color_dim
            *intrinsics.focal_length, *intrinsics.principal_point,      # focal_length, principal_point
            1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1,             # depth_to_color_tf (identity)
            0.001, 1.0, 0.0, 0.0,                                       # depth_scale, needs_projection, image_origin, padding
            k[0], k[1], p[0], p[1],                                     # color_distortion vec4[0]
            k[2], k[3], k[4], k[5],                                     # color_distortion vec4[1]
        ], dtype=np.float32)

        self.device.queue.write_buffer(buffer, 0, params_array)

    def _update_xy_table(self, xylt: np.ndarray, xy_lookup_texture: wgpu.GPUTexture):
        """Calculate and upload a pinhole camera model lookup table."""
        width, height = self.options.width, self.options.height
            
        self.device.queue.write_texture(
            {"texture": xy_lookup_texture},
            xylt.tobytes(),
            {"bytes_per_row": width * 8, "rows_per_image": height},
            (width, height, 1)
        )

    def process_depth_data(self, camera_index: int, depth_data: np.ndarray):
        """Run the compute shader for a given camera's depth data."""
        if self.pipeline is None or camera_index >= len(self.input_buffers):
            return

        width, height = self.options.width, self.options.height
        input_buffer = self.input_buffers[camera_index]
        output_buffer = self.output_buffers[camera_index]

        # print(depth_data)
        
        # Upload new depth data to the texture
        self.device.queue.write_texture(
            {"texture": input_buffer.depth_texture},
            depth_data,
            {"bytes_per_row": width * 2, "rows_per_image": height},
            (width, height, 1)
        )
        
        # Create a bind group for the compute pass
        compute_bind_group = self.device.create_bind_group(
            layout=self.pipeline.get_bind_group_layout(0),
            entries=[
                {"binding": 0, "resource": input_buffer.depth_texture.create_view()},
                {"binding": 1, "resource": input_buffer.xy_lookup_texture.create_view()},
                {"binding": 2, "resource": {"buffer": output_buffer.position_buffer}},
                {"binding": 3, "resource": {"buffer": output_buffer.tex_coord_buffer}},
                {"binding": 4, "resource": {"buffer": output_buffer.normal_buffer}},
                {"binding": 5, "resource": {"buffer": output_buffer.camera_params_buffer}},
            ]
        )
        
        # --- Execute Compute Pass ---
        command_encoder = self.device.create_command_encoder()
        compute_pass = command_encoder.begin_compute_pass()
        compute_pass.set_pipeline(self.pipeline)
        compute_pass.set_bind_group(0, compute_bind_group)
        
        workgroups_x = math.ceil(width / 16)
        workgroups_y = math.ceil(height / 16)
        compute_pass.dispatch_workgroups(workgroups_x, workgroups_y, 1)
        
        compute_pass.end()
        self.device.queue.submit([command_encoder.finish()])
        self.fps_counter.increment()

    def get_output_buffers(self) -> list[DepthOutputBuffers]:
        """Return the list of output buffers containing the generated point cloud data."""
        return self.output_buffers

    def destroy(self):
        """Clean up all GPU resources."""
        for ib in self.input_buffers:
            ib.depth_texture.destroy()
            ib.xy_lookup_texture.destroy()
        
        for ob in self.output_buffers:
            ob.position_buffer.destroy()
            ob.tex_coord_buffer.destroy()
            ob.normal_buffer.destroy()
            ob.camera_params_buffer.destroy()
            
        self.input_buffers.clear()
        self.output_buffers.clear()
    
    def set_metrics_callback(self, callback):
        if self.fps_counter:
            self.fps_counter._metrics_callback = callback
    
    def record_metrics(self, seconds: int):
        if self.fps_counter:
            self.fps_counter.record_metrics(seconds)