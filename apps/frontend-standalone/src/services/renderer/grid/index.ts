import gridVertexShader from "./grid-vertex.wgsl?raw";
import gridFragmentShader from "./grid-fragment.wgsl?raw";

export interface GridRendererOptions {
  gridSize: number;
  gridSpacing: number;
  gridHeight: number;
  gridColor: [number, number, number];
  majorGridColor: [number, number, number];
  majorGridInterval: number;
}

export function createGridOptions(options: Partial<GridRendererOptions>) {
  return {
    gridSize: options.gridSize ?? 10,
    gridSpacing: options.gridSpacing ?? 1,
    gridHeight: options.gridHeight ?? 0,
    gridColor: options.gridColor ?? [0.8, 0.8, 0.8],
    majorGridColor: options.majorGridColor ?? [0.8, 0.8, 0.8],
    majorGridInterval: options.majorGridInterval ?? 10,
  };
}

function createGridGeometryBuffer({
  device,
  options,
}: {
  device: GPUDevice;
  options: GridRendererOptions;
}) {
  const gridVertices: number[] = [];
  const {
    gridSize,
    gridSpacing,
    gridHeight,
    gridColor,
    majorGridColor,
    majorGridInterval,
  } = options;

  // Calculate grid bounds
  const halfSize = gridSize * gridSpacing;
  const numLines = gridSize * 2 + 1; // +1 for center line

  // Create grid lines parallel to X-axis (running along Y) - Horizontal lines in XY plane
  for (let i = 0; i < numLines; i++) {
    const y = -halfSize + i * gridSpacing;
    const isMajor = i % majorGridInterval === 0;
    const color = isMajor ? majorGridColor : gridColor;

    // Line from (-halfSize, y, gridHeight) to (halfSize, y, gridHeight)
    gridVertices.push(
      -halfSize,
      y,
      gridHeight,
      color[0],
      color[1],
      color[2], // Start
      halfSize,
      y,
      gridHeight,
      color[0],
      color[1],
      color[2] // End
    );
  }

  // Create grid lines parallel to Y-axis (running along X) - Vertical lines in XY plane
  for (let i = 0; i < numLines; i++) {
    const x = -halfSize + i * gridSpacing;
    const isMajor = i % majorGridInterval === 0;
    const color = isMajor ? majorGridColor : gridColor;

    // Line from (x, -halfSize, gridHeight) to (x, halfSize, gridHeight)
    gridVertices.push(
      x,
      -halfSize,
      gridHeight,
      color[0],
      color[1],
      color[2], // Start
      x,
      halfSize,
      gridHeight,
      color[0],
      color[1],
      color[2] // End
    );
  }

  const data = new Float32Array(gridVertices);
  const buffer = device.createBuffer({
    size: data.byteLength,
    usage: GPUBufferUsage.VERTEX,
    mappedAtCreation: true,
  });
  new Float32Array(buffer.getMappedRange()).set(data);
  buffer.unmap();

  return {
    gridVertexBuffer: buffer,
    vertexCount: gridVertices.length / 6, // 6 floats per vertex (pos + color)
  };
}

function createInputBuffers({
  device,
  options,
}: {
  device: GPUDevice;
  options: GridRendererOptions;
}) {
  const uniformBuffer = device.createBuffer({
    size: 128,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const { gridVertexBuffer, vertexCount } = createGridGeometryBuffer({
    device,
    options,
  });

  return { uniformBuffer, gridVertexBuffer, vertexCount };
}

export function newGridRenderer({
  device,
  options,
}: {
  device: GPUDevice;
  options: GridRendererOptions;
}) {
  const vertexModule = device.createShaderModule({
    code: gridVertexShader,
  });
  const fragmentModule = device.createShaderModule({
    code: gridFragmentShader,
  });

  const { uniformBuffer, gridVertexBuffer, vertexCount } = createInputBuffers({
    device,
    options,
  });

  const pipeline = device.createRenderPipeline({
    layout: "auto",
    vertex: {
      module: vertexModule,
      entryPoint: "main",
      buffers: [
        {
          // Grid vertices (position + color)
          arrayStride: 24, // 6 floats * 4 bytes = 24 bytes (vec3 position + vec3 color)
          stepMode: "vertex",
          attributes: [
            {
              format: "float32x3",
              offset: 0,
              shaderLocation: 0, // position
            },
            {
              format: "float32x3",
              offset: 12,
              shaderLocation: 1, // color
            },
          ],
        },
      ],
    },
    fragment: {
      module: fragmentModule,
      entryPoint: "main",
      targets: [
        {
          format: "bgra8unorm",
        },
      ],
    },
    primitive: {
      topology: "line-list",
    },
    depthStencil: {
      depthWriteEnabled: true,
      depthCompare: "less",
      format: "depth24plus",
    },
  });

  const bindGroup = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [{ binding: 0, resource: { buffer: uniformBuffer } }],
  });

  const updateCamera = ({
    viewMatrix,
    projectionMatrix,
  }: {
    viewMatrix: Float32Array;
    projectionMatrix: Float32Array;
  }): void => {
    device.queue.writeBuffer(uniformBuffer, 0, viewMatrix);
    device.queue.writeBuffer(uniformBuffer, 64, projectionMatrix);
  };

  const render = (
    commandEncoder: GPUCommandEncoder,
    renderPass: GPURenderPassEncoder
  ): void => {
    renderPass.setPipeline(pipeline);
    renderPass.setBindGroup(0, bindGroup);
    renderPass.setVertexBuffer(0, gridVertexBuffer);

    // Draw grid
    renderPass.draw(vertexCount);
  };

  return {
    updateCamera,
    render,
  };
}

export type GridRenderer = ReturnType<typeof newGridRenderer>;
