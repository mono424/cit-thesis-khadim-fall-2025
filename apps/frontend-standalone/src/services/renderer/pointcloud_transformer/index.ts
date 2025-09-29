import { useFps } from "shared";
import {
  CameraModel,
  CameraSensor,
} from "../../zenoh/schemas/device_context_reply";
import pointcloudTransformShader from "./pointcloud-transform.wgsl?raw";
import {
  TransformParams,
  deriveTransformFromExtrinsics,
} from "./extrinsics-utils";

function createCameraTransformBuffers({
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

  const outputBuffer = device.createBuffer({
    size: pixelCount * 16, // vec4<f32>
    usage,
  });

  const transformParamsBuffer = device.createBuffer({
    size: 32, // vec4<f32> rotation + vec3<f32> translation + f32 padding = 32 bytes
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  return { outputBuffer, transformParamsBuffer };
}

function writeTransformParams({
  device,
  buffer,
  params,
}: {
  device: GPUDevice;
  buffer: GPUBuffer;
  params: TransformParams;
}) {
  const transformArray = new Float32Array([
    ...params.rotation, // vec4<f32> rotation (quaternion)
    ...params.translation, // vec3<f32> translation
    params.padding || 0.0, // f32 padding for alignment
  ]);

  device.queue.writeBuffer(buffer, 0, transformArray);
}

type TransformBuffers = ReturnType<typeof createCameraTransformBuffers> & {
  inputBuffer: GPUBuffer;
};

interface CameraBuffer {
  buffers: TransformBuffers;
  transformParams: TransformParams;
}

const transformPointcloud = ({
  device,
  buffers,
  transformParams,
  pipeline,
  pixelCount,
}: {
  device: GPUDevice;
  buffers: TransformBuffers;
  transformParams: TransformParams;
  pipeline: GPUComputePipeline;
  pixelCount: number;
}) => {
  // Upload transform parameters
  writeTransformParams({
    device,
    buffer: buffers.transformParamsBuffer,
    params: transformParams,
  });

  // Create compute pass
  const commandEncoder = device.createCommandEncoder();
  const computeBindGroup = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: { buffer: buffers.inputBuffer } },
      { binding: 1, resource: { buffer: buffers.outputBuffer } },
      { binding: 2, resource: { buffer: buffers.transformParamsBuffer } },
    ],
  });

  const computePass = commandEncoder.beginComputePass();
  computePass.setPipeline(pipeline);
  computePass.setBindGroup(0, computeBindGroup);

  // Dispatch with workgroup size 64 as defined in WGSL
  const workgroups = Math.ceil(pixelCount / 64);
  computePass.dispatchWorkgroups(workgroups, 1, 1);
  computePass.end();

  device.queue.submit([commandEncoder.finish()]);
};

export interface PointcloudTransformBuffers {
  inputBuffer: GPUBuffer;
  outputBuffer: GPUBuffer;
  transformParamsBuffer: GPUBuffer;
}

// Forward declaration for return type
export interface PointcloudTransformerResult {
  fps: ReturnType<typeof useFps>;
  processSingle: (cameraIndex: number) => void;
  processAll: () => void;
  updateTransformParams: (cameraIndex: number, params: TransformParams) => void;
  outputBuffers: GPUBuffer[];
  pixelCount: number;
}

export function newPointcloudTransformer({
  device,
  cameraSensors,
  inputBuffer,
}: {
  device: GPUDevice;
  cameraSensors: CameraSensor[];
  inputBuffer: GPUBuffer[];
}) {
  const fps = useFps({ name: "pointcloud-transformer" });
  const computeModule = device.createShaderModule({
    code: pointcloudTransformShader,
  });

  const pipeline = device.createComputePipeline({
    layout: "auto",
    compute: {
      module: computeModule,
      entryPoint: "main",
    },
  });

  const cameraBuffers: CameraBuffer[] = [];

  const depthSensorData = cameraSensors.map((s) => s.depth_parameters);
  const transformParams = cameraSensors.map((sensor) => {
    return deriveTransformFromExtrinsics(sensor.camera_pose);
  });

  const pixelCount =
    depthSensorData.length > 0
      ? Number(depthSensorData[0].image_width) *
        Number(depthSensorData[0].image_height)
      : 0;

  for (let i = 0; i < depthSensorData.length; i++) {
    const camera = depthSensorData[i];
    const params = transformParams[i];

    if (!params) {
      throw new Error(`Transform params for camera ${i} not found`);
    }

    const buffers = {
      inputBuffer: inputBuffer[i],
      ...createCameraTransformBuffers({
        device,
        camera,
      }),
    };

    writeTransformParams({
      device,
      buffer: buffers.transformParamsBuffer,
      params,
    });

    cameraBuffers.push({ buffers, transformParams: params });
  }

  const processSingle = (cameraIndex: number) => {
    const { buffers, transformParams: params } = cameraBuffers[cameraIndex];
    const camera = depthSensorData[cameraIndex];
    const cameraPixelCount =
      Number(camera.image_width) * Number(camera.image_height);

    fps.updateFps();
    transformPointcloud({
      device,
      buffers,
      transformParams: params,
      pipeline,
      pixelCount: cameraPixelCount,
    });
  };

  const processAll = () => {
    for (let i = 0; i < cameraBuffers.length; i++) {
      processSingle(i);
    }
  };

  const updateTransformParams = (
    cameraIndex: number,
    params: TransformParams
  ) => {
    if (cameraIndex >= cameraBuffers.length) {
      throw new Error(`Camera index ${cameraIndex} out of range`);
    }

    cameraBuffers[cameraIndex].transformParams = params;
    writeTransformParams({
      device,
      buffer: cameraBuffers[cameraIndex].buffers.transformParamsBuffer,
      params,
    });
  };

  return {
    fps,
    processSingle,
    processAll,
    updateTransformParams,
    outputBuffers: cameraBuffers.map((cb) => cb.buffers.outputBuffer),
    pixelCount,
  };
}

export type PointcloudTransformer = PointcloudTransformerResult;
export type { TransformParams } from "./extrinsics-utils";
