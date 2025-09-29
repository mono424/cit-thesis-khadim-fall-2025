/// Also look at https://github.com/TUM-CAMP-NARVIS/artekmed/blob/1363421fe40c1e5bd27f9cad25efca4a42034156/apps/live_viewer/src/scenegraph/DepthToPointCloudWorkItem.cpp#L4
import { useFps } from "shared";
import { CameraModel } from "../../zenoh/schemas/device_context_reply";
import depthProcessingShader from "./depth-to-point-cloud.wgsl?raw";

function createInputBuffer({
  device,
  camera,
  xyLookupTable,
}: {
  device: GPUDevice;
  camera: CameraModel;
  xyLookupTable: Float32Array;
}) {
  const width = Number(camera.image_width);
  const height = Number(camera.image_height);

  const depthTexture = device.createTexture({
    size: [width, height],
    format: "r16uint",
    usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
  });

  const xyLookupTexture = device.createTexture({
    size: [width, height],
    format: "rg32float",
    usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
  });

  device.queue.writeTexture(
    { texture: xyLookupTexture },
    xyLookupTable,
    { bytesPerRow: width * 8 },
    { width, height }
  );

  return { depthTexture, xyLookupTexture };
}

function createOutputBuffer({
  device,
  camera,
}: {
  device: GPUDevice;
  camera: CameraModel;
}) {
  const pixelCount = Number(camera.image_width) * Number(camera.image_height);
  const usage =
    GPUBufferUsage.STORAGE |
    GPUBufferUsage.VERTEX |
    GPUBufferUsage.COPY_SRC |
    GPUBufferUsage.COPY_DST;

  const positionBuffer = device.createBuffer({
    size: pixelCount * 16, // vec4<f32>
    usage,
  });

  const texCoordBuffer = device.createBuffer({
    size: pixelCount * 16, // vec4<f32>
    usage,
  });

  const normalBuffer = device.createBuffer({
    size: pixelCount * 16, // vec4<f32>
    usage,
  });

  const cameraParamsBuffer = device.createBuffer({
    size: 144,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  return { positionBuffer, texCoordBuffer, normalBuffer, cameraParamsBuffer };
}

function writeCameraParams({
  device,
  buffer,
  camera,
}: {
  device: GPUDevice;
  buffer: GPUBuffer;
  camera: CameraModel;
}) {
  const width = Number(camera.image_width);
  const height = Number(camera.image_height);
  const cameraParamsArray = new Float32Array([
    width,
    height,
    width,
    height, // depth_dim, color_dim
    ...camera.focal_length,
    ...camera.principal_point,
    // depth_to_color_tf (4x4 identity matrix)
    1,
    0,
    0,
    0,
    0,
    1,
    0,
    0,
    0,
    0,
    1,
    0,
    0,
    0,
    0,
    1,
    0.001, // depth_scale
    1.0, // needs_projection
    0.0, // image_origin
    0, // padding
    // color_distortion as array<vec4<f32>, 2>
    camera.radial_coefficients[0],
    camera.radial_coefficients[1],
    camera.tangential_coefficients[0],
    camera.tangential_coefficients[1],
    camera.radial_coefficients[2],
    camera.radial_coefficients[3],
    camera.radial_coefficients[4],
    camera.radial_coefficients[5],
  ]);

  device.queue.writeBuffer(buffer, 0, cameraParamsArray);
}

function createCameraBuffers({
  device,
  camera,
  xyLookupTable,
}: {
  device: GPUDevice;
  camera: CameraModel;
  xyLookupTable: Float32Array;
}) {
  const [input, output] = [
    createInputBuffer({ device, camera, xyLookupTable }),
    createOutputBuffer({ device, camera }),
  ];

  return { input, output };
}

type DepthBuffers = ReturnType<typeof createCameraBuffers>;

const processDepthData = ({
  device,
  camera,
  buffers,
  depthData,
  pipeline,
}: {
  device: GPUDevice;
  camera: CameraModel;
  buffers: DepthBuffers;
  depthData: Uint16Array;
  pipeline: GPUComputePipeline;
}) => {
  const width = Number(camera.image_width);
  const height = Number(camera.image_height);
  const { input: inputBuffers, output: outputBuffers } = buffers;

  // Upload depth data
  if (depthData.byteLength > 0) {
    device.queue.writeTexture(
      { texture: inputBuffers.depthTexture },
      depthData,
      { bytesPerRow: width * 2 },
      [width, height]
    );
  }

  // Create compute pass
  const commandEncoder = device.createCommandEncoder();
  const computeBindGroup = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: inputBuffers.depthTexture.createView() },
      { binding: 1, resource: inputBuffers.xyLookupTexture.createView() },
      { binding: 2, resource: { buffer: outputBuffers.positionBuffer } },
      { binding: 3, resource: { buffer: outputBuffers.texCoordBuffer } },
      { binding: 4, resource: { buffer: outputBuffers.normalBuffer } },
      { binding: 5, resource: { buffer: outputBuffers.cameraParamsBuffer } },
    ],
  });

  const computePass = commandEncoder.beginComputePass();
  computePass.setPipeline(pipeline);
  computePass.setBindGroup(0, computeBindGroup);

  const workgroupsX = Math.ceil(width / 32);
  const workgroupsY = Math.ceil(height / 32);
  computePass.dispatchWorkgroups(workgroupsX, workgroupsY, 1);
  computePass.end();

  device.queue.submit([commandEncoder.finish()]);
};

interface DepthInputBuffers {
  depthTexture: GPUTexture;
  xyLookupTexture: GPUTexture;
}

export interface DepthOutputBuffers {
  positionBuffer: GPUBuffer;
  texCoordBuffer: GPUBuffer;
  normalBuffer: GPUBuffer;
  cameraParamsBuffer: GPUBuffer;
}

interface CameraBuffer {
  input: DepthInputBuffers;
  output: DepthOutputBuffers;
}

export function newDepthProcessor({
  device,
  cameras,
  xyLookupTables,
}: {
  device: GPUDevice;
  cameras: CameraModel[];
  xyLookupTables: Float32Array[];
}) {
  const fps = useFps({ name: "depth-processor" });
  const computeModule = device.createShaderModule({
    code: depthProcessingShader,
  });

  const pipeline = device.createComputePipeline({
    layout: "auto",
    compute: {
      module: computeModule,
      entryPoint: "main",
      constants: {
        calculate_normals: 0,
      },
    },
  });

  const cameraBuffers: CameraBuffer[] = [];
  const pixelCount =
    cameras.length > 0
      ? Number(cameras[0].image_width) * Number(cameras[0].image_height)
      : 0;

  for (let i = 0; i < cameras.length; i++) {
    const camera = cameras[i];
    const xyLookupTable = xyLookupTables[i];

    if (!xyLookupTable?.length) {
      throw new Error(`XY lookup table for camera ${i} not found`);
    }

    const { input, output } = createCameraBuffers({
      device,
      camera,
      xyLookupTable,
    });

    writeCameraParams({
      device,
      buffer: output.cameraParamsBuffer,
      camera,
    });

    cameraBuffers.push({ input, output });
  }

  const processSingle = (cameraIndex: number, depthData: Uint16Array) => {
    const { input, output } = cameraBuffers[cameraIndex];
    const camera = cameras[cameraIndex];

    fps.updateFps();
    processDepthData({
      device,
      camera,
      buffers: { input, output },
      depthData,
      pipeline,
    });
  };

  const processAll = (images: Uint16Array[]) => {
    if (images.length !== cameraBuffers.length) {
      throw new Error(
        `Expected ${cameraBuffers.length} images, got ${images.length}`
      );
    }

    for (let i = 0; i < images.length; i++) {
      processSingle(i, images[i]);
    }
  };

  return {
    fps,
    processSingle,
    processAll,
    outputBuffers: cameraBuffers.map((b) => b.output),
    pixelCount,
  };
}

export type DepthProcessor = ReturnType<typeof newDepthProcessor>;
