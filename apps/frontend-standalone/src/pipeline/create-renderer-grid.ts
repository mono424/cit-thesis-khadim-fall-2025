import { GlobalState } from "~/lib/state";
import {
  DepthProcessor,
  newDepthProcessor,
} from "~/services/renderer/depth_processor";
import { GridRenderer, newGridRenderer } from "~/services/renderer";

export interface GridRendererState {
  renderer: GridRenderer | null;
  status: "loading" | "success" | "error";
  error?: string;
}

export async function createGridRenderer(state: GlobalState) {
  const { wgpuContext, config, setGridRenderer } = state;

  setGridRenderer({
    renderer: null,
    status: "loading",
  });

  try {
    const options = config()?.gridOptions;
    if (!options) {
      throw new Error("No grid options specified");
    }

    const device = wgpuContext()?.device;
    if (!device) {
      throw new Error("No GPU device");
    }

    const gridRenderer = newGridRenderer({
      device,
      options,
    });

    setGridRenderer({
      renderer: gridRenderer,
      status: "success",
    });
  } catch (error) {
    setGridRenderer({
      renderer: null,
      status: "error",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
