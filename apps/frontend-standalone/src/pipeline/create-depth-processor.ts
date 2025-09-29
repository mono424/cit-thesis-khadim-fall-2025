import { Accessor } from "solid-js";
import { GlobalState } from "~/lib/state";
import {
  DepthProcessor,
  newDepthProcessor,
} from "~/services/renderer/depth_processor";

export interface DepthProcessorState {
  processor: DepthProcessor | null;
  status: "loading" | "success" | "error";
  error?: string;
  stats: {
    avgFps: Accessor<number>;
    count: Accessor<number>;
  } | null;
}

export async function createDepthProcessor(state: GlobalState) {
  const {
    wgpuContext,
    depthXylt,
    cameraDescriptions,
    setDepthProcessor,
    config,
    pushStartStalkerSessionTrigger,
  } = state;
  const { depthCameraCount } = config();

  setDepthProcessor({
    processor: null,
    status: "loading",
    stats: null,
  });

  try {
    const device = wgpuContext()?.device;
    if (!device) {
      throw new Error("No GPU device");
    }

    const camerasDescriptions = cameraDescriptions()?.cameras;
    if (!camerasDescriptions) {
      throw new Error("No camera descriptions");
    }

    const xyLookupTables = depthXylt()?.lookupTables;
    if (!xyLookupTables) {
      throw new Error("No XY lookup tables");
    }

    const depthCamerasDescriptions = camerasDescriptions.map(
      (c) => c.depth_parameters
    );

    const depthProcessor = newDepthProcessor({
      device,
      cameras: depthCamerasDescriptions,
      xyLookupTables,
    });

    const stats = {
      avgFps: depthProcessor.fps.avgFps,
      count: () => depthCameraCount,
    };

    setDepthProcessor({
      processor: depthProcessor,
      status: "success",
      stats,
    });
    pushStartStalkerSessionTrigger(depthProcessor.fps.startStalkerSession);
  } catch (error) {
    setDepthProcessor({
      processor: null,
      status: "error",
      error: error instanceof Error ? error.message : "Unknown error",
      stats: null,
    });
  }
}
