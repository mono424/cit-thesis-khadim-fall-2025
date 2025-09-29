import cv2
import numpy as np
import wgpu

class CameraDisplayScene:
    """
    Python adaptation of the frontend's camera_display.ts logic for displaying 4 camera views in a 2x2 grid.
    - Each view has a color texture and a depth buffer.
    - Bind group layout and pipeline should match the frontend's WebGPU layout:
        binding 0: read-only-storage buffer (depth)
        binding 1: texture (color)
        binding 2: sampler
    """
    def __init__(self, device: wgpu.GPUDevice, format: wgpu.TextureFormat):
        self.device = device
        self.format = format
        self.color_width = 2048
        self.color_height = 1536
        self.depth_width = 320
        self.depth_height = 288
        self.color_images = [None] * 4
        self.depth_images = [None] * 4

        # Create depth buffers (float32, STORAGE | COPY_DST)
        buffer_size = self.depth_width * self.depth_height * 4  # float32
        self.depth_buffers = [
            self.device.create_buffer(
                size=buffer_size,
                usage=wgpu.BufferUsage.STORAGE | wgpu.BufferUsage.COPY_DST,
            )
            for _ in range(4)
        ]

        # Create color textures (RGBA8, TEXTURE_BINDING | COPY_DST | RENDER_ATTACHMENT)
        self.color_textures = [
            self.device.create_texture(
                size=(self.color_width, self.color_height, 1),
                format=wgpu.TextureFormat.rgba8unorm,
                usage=wgpu.TextureUsage.TEXTURE_BINDING | wgpu.TextureUsage.COPY_DST | wgpu.TextureUsage.RENDER_ATTACHMENT,
            )
            for _ in range(4)
        ]

        # Create sampler (linear)
        self.sampler = self.device.create_sampler(
            mag_filter="linear",
            min_filter="linear",
        )

        # Create vertex buffer
        vertex_data = np.array([
            # pos.x, pos.y, uv.x, uv.y
            -1.0, -1.0, 0.0, 1.0,
             1.0, -1.0, 1.0, 1.0,
             1.0,  1.0, 1.0, 0.0,
            -1.0, -1.0, 0.0, 1.0,
             1.0,  1.0, 1.0, 0.0,
            -1.0,  1.0, 0.0, 0.0,
        ], dtype=np.float32)
        self.vertex_buffer = self.device.create_buffer_with_data(
            data=vertex_data,
            usage=wgpu.BufferUsage.VERTEX,
        )

        # Bind group layout and pipeline should be set externally
        self.bind_group_layout = None
        self.pipeline = None
        self.bind_groups = [None] * 4

    @staticmethod
    def create_bind_group_layout(device):
        """
        Create a bind group layout matching the TS file:
        - binding 0: read-only-storage buffer (depth)
        - binding 1: texture (color)
        - binding 2: sampler
        """
        return device.create_bind_group_layout(
            entries=[
                {"binding": 0, "visibility": wgpu.ShaderStage.FRAGMENT, "buffer": {"type": "read-only-storage"}},
                {"binding": 1, "visibility": wgpu.ShaderStage.FRAGMENT, "texture": {}},
                {"binding": 2, "visibility": wgpu.ShaderStage.FRAGMENT, "sampler": {}},
            ]
        )

    @staticmethod
    def create_pipeline(device, format, bind_group_layout, vertex_shader, fragment_shader):
        """
        Create a render pipeline matching the TS file. Vertex/fragment shaders should be WGSL source strings.
        """
        shader_module_vert = device.create_shader_module(code=vertex_shader)
        shader_module_frag = device.create_shader_module(code=fragment_shader)
        pipeline_layout = device.create_pipeline_layout(bind_group_layouts=[bind_group_layout])
        return device.create_render_pipeline(
            layout=pipeline_layout,
            vertex={
                "module": shader_module_vert,
                "entry_point": "main",
                "buffers": [
                    {
                        "array_stride": 4 * 4,  # 2 floats pos, 2 floats uv
                        "attributes": [
                            {"shader_location": 0, "offset": 0, "format": "float32x2"},
                            {"shader_location": 1, "offset": 2 * 4, "format": "float32x2"},
                        ],
                    },
                ],
            },
            fragment={
                "module": shader_module_frag,
                "entry_point": "main",
                "targets": [{"format": format}],
            },
            primitive={"topology": "triangle-list"},
        )

    def setup_bind_groups(self, bind_group_layout, pipeline):
        """
        Set up bind groups for each view, matching the TS file logic.
        """
        self.bind_group_layout = bind_group_layout
        self.pipeline = pipeline
        self.bind_groups = [
            self.device.create_bind_group(
                layout=bind_group_layout,
                entries=[
                    {"binding": 0, "resource": {"buffer": self.depth_buffers[i]}},
                    {"binding": 1, "resource": self.color_textures[i].create_view()},
                    {"binding": 2, "resource": self.sampler},
                ],
            )
            for i in range(4)
        ]

    def set_color_images(self, images):
        for i, image in enumerate(images):
            if image is not None:
                self.color_images[i] = image

    def set_depth_images(self, images):
        for i, image in enumerate(images):
            if image is not None:
                self.depth_images[i] = image

    def update_buffers(self):
        """
        Update depth buffers and color textures with new data. Match TS: write raw f32 depth (y-flipped) and color with flipY.
        """
        # Update depth buffers (raw float32, y-flipped)
        for i in range(4):
            dimg = self.depth_images[i]
            if dimg is None:
                continue
            data = dimg if isinstance(dimg, np.ndarray) else np.array(dimg, dtype=np.float32)
            if data.dtype != np.float32:
                data = data.astype(np.float32)
            # If incoming size differs, resize to expected
            if data.shape != (self.depth_height, self.depth_width):
                data = cv2.resize(data, (self.depth_width, self.depth_height), interpolation=cv2.INTER_NEAREST)
            # flip vertically to match JS and make contiguous for GPU upload
            flipped = np.flipud(data)
            flat = flipped.ravel(order='C')
            flat_contig = np.ascontiguousarray(flat, dtype=np.float32)
            self.device.queue.write_buffer(self.depth_buffers[i], 0, flat_contig)

        # Update color textures (RGBA, y-flipped)
        for i in range(4):
            cimg = self.color_images[i]
            if cimg is None:
                continue
            img = cimg

            # resize to texture size to match frontend behavior
            if (img.shape[1], img.shape[0]) != (self.color_width, self.color_height):
                img = cv2.resize(img, (self.color_width, self.color_height), interpolation=cv2.INTER_LINEAR)
            # flip vertically to match JS's flipY: true
            img = cv2.flip(img, 0)

            # Convert to RGBA - WebGPU expects RGBA not BGRA
            if img.shape[2] == 3:
                # BGR to RGBA (swap R and B channels)
                img_rgba = cv2.cvtColor(img, cv2.COLOR_BGR2RGBA)
            elif img.shape[2] == 4:
                # BGRA to RGBA (swap R and B channels)
                img_rgba = cv2.cvtColor(img, cv2.COLOR_BGRA2RGBA)
            else:
                img_rgba = img

            img_rgba = np.ascontiguousarray(img_rgba)

            bytes_per_row = self.color_width * 4
            data_layout = {
                "offset": 0,
                "bytes_per_row": bytes_per_row,
                "rows_per_image": self.color_height,
            }
            copy_size = (self.color_width, self.color_height, 1)
            self.device.queue.write_texture(
                {"texture": self.color_textures[i]},
                img_rgba,
                data_layout,
                copy_size,
            )

    def render_quads(self, render_pass: wgpu.GPURenderPassEncoder, width, height):
        """
        Render 4 quads in a 2x2 grid, matching the TS file logic.
        """
        if self.pipeline is None or self.bind_groups[0] is None:
            raise RuntimeError("Pipeline and bind groups must be set before rendering.")
        render_pass.set_pipeline(self.pipeline)
        render_pass.set_vertex_buffer(0, self.vertex_buffer)
        grid = [
            (0, 0),
            (1, 0),
            (0, 1),
            (1, 1),
        ]
        quad_width = width / 2
        quad_height = height / 2
        for i in range(4):
            x, y = grid[i]
            render_pass.set_viewport(
                x * quad_width,
                y * quad_height,
                quad_width,
                quad_height,
                0,
                1
            )
            render_pass.set_bind_group(0, self.bind_groups[i], [], 0, 999999)
            render_pass.draw(6, 1, 0, 0)