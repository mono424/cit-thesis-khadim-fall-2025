import pointcloudVertexShader from "./pointcloud-vertex.wgsl?raw";
import pointcloudFragmentShader from "./pointcloud-fragment.wgsl?raw";
import { DepthOutputBuffers } from "~/services/renderer/depth_processor";

export interface PointcloudRendererOptions {
  pointcloudBuffers: DepthOutputBuffers[];
  pixelCount: number;
}

const extractNormalMatrix = (viewMatrix: Float32Array): Float32Array => {
  // Extract the upper-left 3x3 matrix from the 4x4 view matrix
  const normalMatrix = new Float32Array(9);
  normalMatrix[0] = viewMatrix[0];
  normalMatrix[1] = viewMatrix[1];
  normalMatrix[2] = viewMatrix[2];
  normalMatrix[3] = viewMatrix[4];
  normalMatrix[4] = viewMatrix[5];
  normalMatrix[5] = viewMatrix[6];
  normalMatrix[6] = viewMatrix[8];
  normalMatrix[7] = viewMatrix[9];
  normalMatrix[8] = viewMatrix[10];
  return normalMatrix;
};

const updateLightingUniforms = ({
  device,
  lightingUniformBuffer,
}: {
  device: GPUDevice;
  lightingUniformBuffer: GPUBuffer;
}) => {
  const lightingData = new Float32Array(32);
  let offset = 0;

  // ambientColor (vec4)
  lightingData[offset++] = 0.2; // r
  lightingData[offset++] = 0.2; // g
  lightingData[offset++] = 0.2; // b
  lightingData[offset++] = 1.0; // a

  // diffuseColor (vec4)
  lightingData[offset++] = 0.8; // r
  lightingData[offset++] = 0.8; // g
  lightingData[offset++] = 0.8; // b
  lightingData[offset++] = 1.0; // a

  // specularColor (vec4)
  lightingData[offset++] = 1.0; // r
  lightingData[offset++] = 1.0; // g
  lightingData[offset++] = 1.0; // b
  lightingData[offset++] = 1.0; // a

  // shininess (f32) + 3 padding
  lightingData[offset++] = 80.0;
  lightingData[offset++] = 0.0; // padding
  lightingData[offset++] = 0.0; // padding
  lightingData[offset++] = 0.0; // padding

  // lightColors (4 * vec4)
  for (let i = 0; i < 4; i++) {
    lightingData[offset++] = 1.0; // r
    lightingData[offset++] = 1.0; // g
    lightingData[offset++] = 1.0; // b
    lightingData[offset++] = 1.0; // a
  }

  device.queue.writeBuffer(lightingUniformBuffer, 0, lightingData);
};

function createInputBuffers({
  device,
  options,
}: {
  device: GPUDevice;
  options: PointcloudRendererOptions;
}) {
  const uniformBuffer = device.createBuffer({
    size: 256,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const lightingUniformBuffer = device.createBuffer({
    size: 128,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  return { uniformBuffer, lightingUniformBuffer };
}

function createTextures({
  device,
  options,
}: {
  device: GPUDevice;
  options: PointcloudRendererOptions;
}) {
  const colorTexture = device.createTexture({
    size: [1, 1],
    format: "rgba8unorm",
    usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
  });

  const depthTexture = device.createTexture({
    size: [1, 1],
    format: "r16uint",
    usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
  });

  const sampler = device.createSampler({
    magFilter: "linear",
    minFilter: "linear",
  });

  return { colorTexture, depthTexture, sampler };
}

export function newPointcloudRenderer({
  device,
  options,
}: {
  device: GPUDevice;
  options: PointcloudRendererOptions;
}) {
  const { pointcloudBuffers, pixelCount } = options;

  const vertexModule = device.createShaderModule({
    code: pointcloudVertexShader,
  });
  const fragmentModule = device.createShaderModule({
    code: pointcloudFragmentShader,
  });

  const { uniformBuffer, lightingUniformBuffer } = createInputBuffers({
    device,
    options,
  });

  const { colorTexture, depthTexture, sampler } = createTextures({
    device,
    options,
  });

  const bindGroupLayout = device.createBindGroupLayout({
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
        buffer: { type: "uniform" },
      },
      {
        binding: 1,
        visibility: GPUShaderStage.FRAGMENT,
        buffer: { type: "uniform" },
      },
      {
        binding: 2,
        visibility: GPUShaderStage.FRAGMENT,
        texture: { sampleType: "float", viewDimension: "2d" },
      },
      {
        binding: 3,
        visibility: GPUShaderStage.FRAGMENT,
        texture: { sampleType: "uint", viewDimension: "2d" },
      },
      {
        binding: 4,
        visibility: GPUShaderStage.FRAGMENT,
        sampler: {},
      },
    ],
  });

  const pipelineLayout = device.createPipelineLayout({
    bindGroupLayouts: [bindGroupLayout],
  });

  const pipeline = device.createRenderPipeline({
    layout: pipelineLayout,
    vertex: {
      module: vertexModule,
      entryPoint: "main",
      buffers: [
        {
          // Position attribute (per vertex)
          arrayStride: 16, // vec4<f32>
          stepMode: "vertex",
          attributes: [
            {
              format: "float32x4",
              offset: 0,
              shaderLocation: 0, // position
            },
          ],
        },
        {
          // Normal attribute (per vertex)
          arrayStride: 16, // vec4<f32>
          stepMode: "vertex",
          attributes: [
            {
              format: "float32x4",
              offset: 0,
              shaderLocation: 1, // normal
            },
          ],
        },
        {
          // Texture coordinates (per vertex)
          arrayStride: 16, // vec4<f32>
          stepMode: "vertex",
          attributes: [
            {
              format: "float32x4",
              offset: 0,
              shaderLocation: 2, // textureCoords
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
          blend: false
            ? {
                color: {
                  srcFactor: "src-alpha",
                  dstFactor: "one-minus-src-alpha",
                  operation: "add",
                },
                alpha: {
                  srcFactor: "one",
                  dstFactor: "one-minus-src-alpha",
                  operation: "add",
                },
              }
            : undefined,
        },
      ],
    },
    primitive: {
      topology: "point-list",
    },
    depthStencil: {
      depthWriteEnabled: true,
      depthCompare: "less",
      format: "depth24plus",
    },
  });

  const bindGroup = device.createBindGroup({
    layout: bindGroupLayout,
    entries: [
      { binding: 0, resource: { buffer: uniformBuffer } },
      { binding: 1, resource: { buffer: lightingUniformBuffer } },
      { binding: 2, resource: colorTexture.createView() },
      { binding: 3, resource: depthTexture.createView() },
      { binding: 4, resource: sampler },
    ],
  });

  updateLightingUniforms({ device, lightingUniformBuffer });

  const updateCamera = ({
    viewMatrix,
    projectionMatrix,
  }: {
    viewMatrix: Float32Array;
    projectionMatrix: Float32Array;
  }): void => {
    const uniformData = new Float32Array(64); // 256 bytes / 4 = 64 floats
    let offset = 0;

    for (let i = 0; i < 16; i++) {
      uniformData[offset++] = viewMatrix[i];
    }

    for (let i = 0; i < 16; i++) {
      uniformData[offset++] = projectionMatrix[i];
    }

    // normalMatrix (mat3x3) - extract from view matrix and pad to align
    const normalMatrix = extractNormalMatrix(viewMatrix);
    // Row 0
    uniformData[offset++] = normalMatrix[0];
    uniformData[offset++] = normalMatrix[1];
    uniformData[offset++] = normalMatrix[2];
    uniformData[offset++] = 0.0; // padding
    // Row 1
    uniformData[offset++] = normalMatrix[3];
    uniformData[offset++] = normalMatrix[4];
    uniformData[offset++] = normalMatrix[5];
    uniformData[offset++] = 0.0; // padding
    // Row 2
    uniformData[offset++] = normalMatrix[6];
    uniformData[offset++] = normalMatrix[7];
    uniformData[offset++] = normalMatrix[8];
    uniformData[offset++] = 0.0; // padding

    // lightPositions (4 * vec3 with padding)
    const lightPositions = [
      [2.0, 2.0, 2.0], // Light 0
      [-2.0, 2.0, 2.0], // Light 1
      [2.0, -2.0, 2.0], // Light 2
      [-2.0, -2.0, 2.0], // Light 3
    ];

    for (let i = 0; i < 4; i++) {
      uniformData[offset++] = lightPositions[i][0];
      uniformData[offset++] = lightPositions[i][1];
      uniformData[offset++] = lightPositions[i][2];
      uniformData[offset++] = 0.0; // padding
    }

    device.queue.writeBuffer(uniformBuffer, 0, uniformData);
  };

  const render = (
    commandEncoder: GPUCommandEncoder,
    renderPass: GPURenderPassEncoder
  ): void => {
    renderPass.setPipeline(pipeline);
    renderPass.setBindGroup(0, bindGroup);
    for (let i = 0; i < pointcloudBuffers.length; i++) {
      renderPass.setVertexBuffer(0, pointcloudBuffers[i].positionBuffer);
      renderPass.setVertexBuffer(1, pointcloudBuffers[i].normalBuffer);
      renderPass.setVertexBuffer(2, pointcloudBuffers[i].texCoordBuffer);
      renderPass.draw(pixelCount);
    }
  };

  return {
    updateCamera,
    render,
  };
}

export type PointcloudRenderer = ReturnType<typeof newPointcloudRenderer>;
