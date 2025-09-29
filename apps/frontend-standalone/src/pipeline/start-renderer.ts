import { onCleanup } from "solid-js";
import { GlobalState } from "~/lib/state";
import { initRenderPipeline, RenderPipeline } from "~/services/renderer";

export interface RendererState {
  status: "loading" | "active" | "error";
  renderer: RenderPipeline | null;
  error?: string;
}

export async function startRenderer(state: GlobalState) {
  const {
    wgpuContext,
    gridRenderer,
    pointcloudRenderer,
    renderCamera,
    setRenderer,
    pushStartStalkerSessionTrigger,
  } = state;

  setRenderer({
    status: "loading",
    renderer: null,
  });

  try {
    const device = wgpuContext()?.device;
    if (!device) {
      throw new Error("No GPU device");
    }

    const context = wgpuContext()?.context;
    if (!context) {
      throw new Error("No GPU context");
    }

    const camera = renderCamera()?.camera;
    if (!camera) {
      throw new Error("No render camera");
    }

    const grid = gridRenderer()?.renderer;
    if (!grid) {
      throw new Error("No grid renderer");
    }

    const pointcloud = pointcloudRenderer()?.renderer;
    if (!pointcloud) {
      throw new Error("No pointcloud renderer");
    }

    const renderer = initRenderPipeline({
      device,
      context,
      camera,
      grid,
      pointcloud,
    });

    setRenderer({
      status: "active",
      renderer,
    });
    pushStartStalkerSessionTrigger(renderer.fps.startStalkerSession);
  } catch (error) {
    setRenderer({
      status: "error",
      error: error instanceof Error ? error.message : "Unknown error",
      renderer: null,
    });
  }
}
