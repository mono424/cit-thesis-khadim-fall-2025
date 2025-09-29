import { Accessor } from "solid-js";
import { GlobalState } from "~/lib/state";
import {
  newPointcloudTransformer,
  PointcloudTransformer,
} from "~/services/renderer/pointcloud_transformer";

export interface PointcloudTransformerState {
  transformer: PointcloudTransformer | null;
  status: "loading" | "success" | "error";
  error?: string;
  stats: {
    avgFps: Accessor<number>;
    count: Accessor<number>;
  } | null;
}

export async function createPointcloudTransformer(state: GlobalState) {
  const {
    wgpuContext,
    cameraDescriptions,
    depthProcessor,
    setPointcloudTransformer,
    config,
    pushStartStalkerSessionTrigger,
  } = state;
  const { depthCameraCount } = config();

  setPointcloudTransformer({
    transformer: null,
    status: "loading",
    stats: null,
  });

  try {
    const device = wgpuContext()?.device;
    if (!device) {
      throw new Error("No GPU device");
    }

    const depthProcessorInstance = depthProcessor()?.processor;
    if (!depthProcessorInstance) {
      throw new Error("No depth processor");
    }

    const camerasDescriptions = cameraDescriptions()?.cameras;
    if (!camerasDescriptions) {
      throw new Error("No camera descriptions");
    }

    const pointcloudTransformer = newPointcloudTransformer({
      device,
      cameraSensors: camerasDescriptions,
      inputBuffer: depthProcessorInstance.outputBuffers.map(
        (b) => b.positionBuffer
      ),
    });

    const stats = {
      avgFps: pointcloudTransformer.fps.avgFps,
      count: () => depthCameraCount,
    };

    setPointcloudTransformer({
      transformer: pointcloudTransformer,
      status: "success",
      stats,
    });
    pushStartStalkerSessionTrigger(
      pointcloudTransformer.fps.startStalkerSession
    );
  } catch (error) {
    setPointcloudTransformer({
      transformer: null,
      status: "error",
      error: error instanceof Error ? error.message : "Unknown error",
      stats: null,
    });
  }
}
