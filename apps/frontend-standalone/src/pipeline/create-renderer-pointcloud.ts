import { GlobalState } from "~/lib/state";
import {
  newPointcloudRenderer,
  PointcloudRenderer,
  PointcloudRendererOptions,
} from "~/services/renderer";

export interface PointcloudRendererState {
  renderer: PointcloudRenderer | null;
  status: "loading" | "success" | "error";
  error?: string;
}

export async function createPointcloudRenderer(state: GlobalState) {
  const {
    wgpuContext,
    pointcloudTransformer,
    depthProcessor,
    setPointcloudRenderer,
  } = state;

  setPointcloudRenderer({
    renderer: null,
    status: "loading",
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

    const transformer = pointcloudTransformer()?.transformer;
    if (!transformer) {
      throw new Error("No pointcloud transformer");
    }

    const finalBuffers = depthProcessorInstance.outputBuffers.map((b, i) => ({
      ...b,
      positionBuffer: transformer.outputBuffers[i],
    }));

    const options: PointcloudRendererOptions = {
      pointcloudBuffers: finalBuffers ?? [],
      pixelCount: transformer.pixelCount ?? 0,
    };

    const pointcloudRenderer = newPointcloudRenderer({
      device,
      options,
    });

    setPointcloudRenderer({
      renderer: pointcloudRenderer,
      status: "success",
    });
  } catch (error) {
    setPointcloudRenderer({
      renderer: null,
      status: "error",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
