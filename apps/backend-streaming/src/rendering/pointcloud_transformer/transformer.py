from rich.console import Console
import wgpu
import numpy as np
import os
from dataclasses import dataclass

# Imports updated to match the provided library structure
from performance.fps_counter import FPSCounter
from streaming.zenoh_cdr import CameraModel, CameraSensor
from .extrinsics_utils import TransformParams, derive_transform_from_extrinsics

# --- Dataclasses for options and internal state management ---

@dataclass
class PointcloudTransformerOptions:
    """Configuration options for the point cloud transformer."""
    camera_sensors: list[CameraSensor]
    input_buffers: list[wgpu.GPUBuffer]
    console: Console

@dataclass
class TransformBuffers:
    """Holds all buffers related to a single camera's transform."""
    input_buffer: wgpu.GPUBuffer
    output_buffer: wgpu.GPUBuffer
    transform_params_buffer: wgpu.GPUBuffer

@dataclass
class CameraBuffer:
    """Container for a single camera's buffers and transform parameters."""
    buffers: TransformBuffers
    transform_params: TransformParams

# --- Main Transformer Class ---

class PointcloudTransformer:
    """
    Manages and executes the transformation of point clouds from multiple
    camera sensors using a WebGPU compute shader.
    """
    def __init__(self, device: wgpu.GPUDevice, options: PointcloudTransformerOptions):
        """Initialize the point cloud transformer."""
        self.device = device
        self.options = options
        self.pipeline: wgpu.GPUComputePipeline = None
        self._camera_buffers: list[CameraBuffer] = []
        self.output_buffers: list[wgpu.GPUBuffer] = []
        self.pixel_count: int = 0
        self.fps_counter = FPSCounter(console=options.console, name="Pointcloud Transformer")
        self.fps_counter.start()

        # Load the compute shader
        shader_path = os.path.join(os.path.dirname(__file__), "pointcloud-transform.wgsl")
        with open(shader_path, "r") as f:
            shader_code = f.read()
        compute_module = self.device.create_shader_module(code=shader_code)

        # Create the compute pipeline
        self.pipeline = self.device.create_compute_pipeline(
            layout="auto",
            compute={
                "module": compute_module,
                "entry_point": "main",
            },
        )
        
        self._create_buffers()

    def _create_buffers(self):
        """Create and initialize all necessary GPU buffers for the transforms."""
        depth_sensor_data = [s.depth_parameters for s in self.options.camera_sensors]
        transform_params = [derive_transform_from_extrinsics(s.camera_pose) for s in self.options.camera_sensors]

        self.pixel_count = (
            int(depth_sensor_data[0].image_width) * int(depth_sensor_data[0].image_height)
            if depth_sensor_data
            else 0
        )

        for i, camera in enumerate(depth_sensor_data):
            params = transform_params[i]
            if params is None:
                raise ValueError(f"Transform params for camera {i} not found")

            created_buffers = self._create_single_camera_buffers(camera=camera)
            buffers = TransformBuffers(
                input_buffer=self.options.input_buffers[i],
                output_buffer=created_buffers["output_buffer"],
                transform_params_buffer=created_buffers["transform_params_buffer"],
            )

            self._write_transform_params(
                buffer=buffers.transform_params_buffer,
                params=params,
            )

            self._camera_buffers.append(CameraBuffer(buffers=buffers, transform_params=params))
        
        self.output_buffers = [cb.buffers.output_buffer for cb in self._camera_buffers]

    def _create_single_camera_buffers(self, camera: CameraModel) -> dict:
        """Creates the necessary GPU buffers for a single camera's pointcloud transform."""
        pixel_count = int(camera.image_width) * int(camera.image_height)
        usage = (
            wgpu.BufferUsage.STORAGE |
            wgpu.BufferUsage.VERTEX |
            wgpu.BufferUsage.COPY_SRC |
            wgpu.BufferUsage.COPY_DST
        )
        output_buffer = self.device.create_buffer(
            size=pixel_count * 16,  # vec4<f32>
            usage=usage,
        )
        transform_params_buffer = self.device.create_buffer(
            size=32,  # vec4<f32> rotation + vec3<f32> translation + f32 padding = 32 bytes
            usage=wgpu.BufferUsage.UNIFORM | wgpu.BufferUsage.COPY_DST,
        )
        return {"output_buffer": output_buffer, "transform_params_buffer": transform_params_buffer}

    def _write_transform_params(self, buffer: wgpu.GPUBuffer, params: TransformParams):
        """Writes the transform parameters (rotation, translation) to a GPU buffer."""
        transform_array = np.array([
            *params.rotation,      # vec4<f32> rotation (quaternion)
            *params.translation,   # vec3<f32> translation
            params.padding or 0.0, # f32 padding for alignment
        ], dtype=np.float32)
        self.device.queue.write_buffer(buffer, 0, transform_array)

    def _transform_pointcloud(self, camera_index: int):
        """Internal method to run the compute pass for a single camera."""
        buffers = self._camera_buffers[camera_index].buffers
        
        command_encoder = self.device.create_command_encoder()
        compute_bind_group = self.device.create_bind_group(
            layout=self.pipeline.get_bind_group_layout(0),
            entries=[
                {"binding": 0, "resource": {"buffer": buffers.input_buffer}},
                {"binding": 1, "resource": {"buffer": buffers.output_buffer}},
                {"binding": 2, "resource": {"buffer": buffers.transform_params_buffer}},
            ],
        )
        compute_pass = command_encoder.begin_compute_pass()
        compute_pass.set_pipeline(self.pipeline)
        compute_pass.set_bind_group(0, compute_bind_group)
        workgroups = (self.pixel_count + 63) // 64  # Ceiling division
        compute_pass.dispatch_workgroups(workgroups, 1, 1)
        compute_pass.end()
        self.device.queue.submit([command_encoder.finish()])
        self.fps_counter.increment()

    def process_single(self, camera_index: int):
        """Processes the point cloud for a single specified camera."""
        self._transform_pointcloud(camera_index)
        self.fps_counter.increment()

    def process_all(self):
        """Processes the point clouds for all cameras sequentially."""
        for i in range(len(self._camera_buffers)):
            self.process_single(i)

    def update_transform_params(self, camera_index: int, params: TransformParams):
        """Updates the transformation parameters for a specific camera on the GPU."""
        if camera_index >= len(self._camera_buffers):
            raise IndexError(f"Camera index {camera_index} out of range")
        self._camera_buffers[camera_index].transform_params = params
        self._write_transform_params(
            buffer=self._camera_buffers[camera_index].buffers.transform_params_buffer,
            params=params,
        )

    def destroy(self):
        """Clean up all GPU resources created by this class."""
        for cb in self._camera_buffers:
            cb.buffers.output_buffer.destroy()
            cb.buffers.transform_params_buffer.destroy()
        self._camera_buffers.clear()
        self.output_buffers.clear()
    
    def set_metrics_callback(self, callback):
        self.fps_counter._metrics_callback = callback
    
    def record_metrics(self, seconds: int):
        if self.fps_counter:
            self.fps_counter.record_metrics(seconds)

