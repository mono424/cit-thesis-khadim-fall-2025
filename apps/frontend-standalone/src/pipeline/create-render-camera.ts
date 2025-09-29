import { GlobalState } from "~/lib/state";
import { Camera, createCamera, useArcballControls } from "shared";

export interface RenderCameraContext {
  camera: Camera | null;
  status: "loading" | "success" | "error";
  error?: string;
}

export async function createRenderCamera(state: GlobalState) {
  const { setRenderCamera, config } = state;
  const { canvas } = config();

  setRenderCamera({
    camera: null,
    status: "loading",
  });

  try {
    const camera = createCamera();
    const arcballControls = useArcballControls(camera);
    arcballControls.init(canvas);

    setRenderCamera({ camera, status: "success" });
  } catch (error) {
    setRenderCamera({
      camera: null,
      status: "error",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
