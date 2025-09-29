from typing import Tuple, Optional, Dict, Any
import numpy as np
from dataclasses import dataclass
import wgpu
import os

@dataclass
class GridRendererOptions:
    """Configuration options for the grid renderer."""
    grid_size: int
    grid_spacing: float
    grid_height: float
    grid_color: Tuple[float, float, float]
    major_grid_color: Tuple[float, float, float]
    major_grid_interval: int


def create_grid_options(options: Optional[Dict[str, Any]] = None) -> GridRendererOptions:
    """Create grid options with default values."""
    if options is None:
        options = {}
    
    return GridRendererOptions(
        grid_size=options.get('grid_size', 10),
        grid_spacing=options.get('grid_spacing', 1.0),
        grid_height=options.get('grid_height', 0.0),
        grid_color=options.get('grid_color', (0.8, 0.8, 0.8)),
        major_grid_color=options.get('major_grid_color', (0.8, 0.8, 0.8)),
        major_grid_interval=options.get('major_grid_interval', 10)
    )


def create_grid_geometry_buffer(device, options: GridRendererOptions) -> Dict[str, Any]:
    """Create the geometry buffer for grid rendering."""
    grid_vertices = []
    
    # Calculate grid bounds
    half_size = options.grid_size * options.grid_spacing
    num_lines = options.grid_size * 2 + 1  # +1 for center line
    
    # Create grid lines parallel to X-axis (running along Y) - Horizontal lines in XY plane
    for i in range(num_lines):
        y = -half_size + i * options.grid_spacing
        is_major = i % options.major_grid_interval == 0
        color = options.major_grid_color if is_major else options.grid_color
        
        # Line from (-half_size, y, grid_height) to (half_size, y, grid_height)
        grid_vertices.extend([
            -half_size, y, options.grid_height, color[0], color[1], color[2],  # Start
            half_size, y, options.grid_height, color[0], color[1], color[2]    # End
        ])
    
    # Create grid lines parallel to Y-axis (running along X) - Vertical lines in XY plane
    for i in range(num_lines):
        x = -half_size + i * options.grid_spacing
        is_major = i % options.major_grid_interval == 0
        color = options.major_grid_color if is_major else options.grid_color
        
        # Line from (x, -half_size, grid_height) to (x, half_size, grid_height)
        grid_vertices.extend([
            x, -half_size, options.grid_height, color[0], color[1], color[2],  # Start
            x, half_size, options.grid_height, color[0], color[1], color[2]    # End
        ])
    
    data = np.array(grid_vertices, dtype=np.float32)
    
    # Create WebGPU buffer with data
    buffer = device.create_buffer_with_data(
        data=data,
        usage=wgpu.BufferUsage.VERTEX
    )
    
    return {
        'grid_vertex_buffer': buffer,
        'vertex_count': len(grid_vertices) // 6  # 6 floats per vertex (pos + color)
    }


def create_input_buffers(device, options: GridRendererOptions) -> Dict[str, Any]:
    """Create input buffers for the grid renderer."""
    uniform_buffer = device.create_buffer(
        size=128,
        usage=wgpu.BufferUsage.UNIFORM | wgpu.BufferUsage.COPY_DST
    )
    
    grid_data = create_grid_geometry_buffer(device, options)
    
    return {
        'uniform_buffer': uniform_buffer,
        'grid_vertex_buffer': grid_data['grid_vertex_buffer'],
        'vertex_count': grid_data['vertex_count']
    }


class GridRenderer:
    """WebGPU-based grid renderer for 3D visualization."""
    
    def __init__(self, device, options: GridRendererOptions, render_format: str = 'bgra8unorm'):
        """Initialize the grid renderer."""
        self.device = device
        self.options = options
        self.render_format = render_format
        
        # Load shaders (assuming they exist in the same directory structure)
        with open(os.path.join(os.path.dirname(__file__), 'shaders/grid-vertex.wgsl'), 'r') as f:
            grid_vertex_shader = f.read()
        with open(os.path.join(os.path.dirname(__file__), 'shaders/grid-fragment.wgsl'), 'r') as f:
            grid_fragment_shader = f.read()
        
        # Create shader modules
        vertex_module = device.create_shader_module(code=grid_vertex_shader)
        fragment_module = device.create_shader_module(code=grid_fragment_shader)
        
        # Create buffers
        buffer_data = create_input_buffers(device, options)
        self.uniform_buffer = buffer_data['uniform_buffer']
        self.grid_vertex_buffer = buffer_data['grid_vertex_buffer']
        self.vertex_count = buffer_data['vertex_count']
        
        # Create render pipeline
        self.pipeline = device.create_render_pipeline(
            layout='auto',
            vertex={
                'module': vertex_module,
                'entry_point': 'main',
                'buffers': [
                    {
                        # Grid vertices (position + color)
                        'array_stride': 24,  # 6 floats * 4 bytes = 24 bytes (vec3 position + vec3 color)
                        'step_mode': 'vertex',
                        'attributes': [
                            {
                                'format': 'float32x3',
                                'offset': 0,
                                'shader_location': 0  # position
                            },
                            {
                                'format': 'float32x3',
                                'offset': 12,
                                'shader_location': 1  # color
                            }
                        ]
                    }
                ]
            },
            fragment={
                'module': fragment_module,
                'entry_point': 'main',
                'targets': [
                    {
                        'format': self.render_format
                    }
                ]
            },
            primitive={
                'topology': 'line-list'
            },
            depth_stencil={
                'depth_write_enabled': True,
                'depth_compare': 'less',
                'format': 'depth24plus'
            }
        )
        
        # Create bind group
        self.bind_group = device.create_bind_group(
            layout=self.pipeline.get_bind_group_layout(0),
            entries=[
                {
                    'binding': 0,
                    'resource': {'buffer': self.uniform_buffer}
                }
            ]
        )
    
    def update_camera(self, view_matrix: np.ndarray, projection_matrix: np.ndarray) -> None:
        """Update camera matrices."""
        self.device.queue.write_buffer(self.uniform_buffer, 0, view_matrix)
        self.device.queue.write_buffer(self.uniform_buffer, 64, projection_matrix)
    
    def render(self, command_encoder, render_pass) -> None:
        """Render the grid."""
        render_pass.set_pipeline(self.pipeline)
        render_pass.set_bind_group(0, self.bind_group)
        render_pass.set_vertex_buffer(0, self.grid_vertex_buffer)
        
        # Draw grid
        render_pass.draw(self.vertex_count)
