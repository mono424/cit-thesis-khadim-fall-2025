import { GlobalState } from "./lib/state";
import { createDepthProcessor } from "./pipeline/create-depth-processor";
import { createDepthXylt } from "./pipeline/create-depth-xylt";
import { createH264Decoders } from "./pipeline/create-h264-decoders";
import { createPointcloudTransformer } from "./pipeline/create-pointcloud-transformer";
import { createRenderCamera } from "./pipeline/create-render-camera";
import { createGridRenderer } from "./pipeline/create-renderer-grid";
import { createPointcloudRenderer } from "./pipeline/create-renderer-pointcloud";
import { createTetrisBuffer } from "./pipeline/create-tetris-buffer";
import { createWgpuContext } from "./pipeline/create-wgpu-context";
import { createXYLTProcessor } from "./pipeline/create-xylt-processor";
import { createZDepthDecoders } from "./pipeline/create-zdepth-decoders";
import { gatherCameraDescriptions } from "./pipeline/gather-camera-descriptions";
import { startRenderer } from "./pipeline/start-renderer";
import { streamCameraColor } from "./pipeline/stream-camera-color";
import { streamCameraDepth } from "./pipeline/stream-camera-depth";

// One time setup
export const initPipeline = async (state: GlobalState) => {
  await createWgpuContext(state);
  await createRenderCamera(state);
  await createGridRenderer(state);
  await createXYLTProcessor(state);
  await gatherCameraDescriptions(state);
  await createDepthXylt(state);
  await createDepthProcessor(state);
  await createPointcloudTransformer(state);
  await createPointcloudRenderer(state);
  await createTetrisBuffer(state);
  await Promise.all([createH264Decoders(state), createZDepthDecoders(state)]);
};

// Start streaming and processing pipeline
export const startPipeline = async (state: GlobalState) => {
  await startRenderer(state);
  await Promise.all([streamCameraColor(state), streamCameraDepth(state)]);
};
