import { GlobalState } from "~/lib/state";

export interface WgpuContext {
  device: GPUDevice | null;
  context: GPUCanvasContext | null;
  status: "loading" | "success" | "error";
  error?: string;
}

export async function createWgpuContext(state: GlobalState) {
  const { setWgpuContext, config } = state;
  const { canvas } = config();

  setWgpuContext({
    device: null,
    context: null,
    status: "loading",
  });

  try {
    const context = canvas.getContext("webgpu");
    if (!context) {
      throw new Error("WebGPU not supported");
    }

    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
      throw new Error("No GPU adapter");
    }

    const device = await adapter.requestDevice({
      requiredLimits: {
        maxComputeInvocationsPerWorkgroup: 1024,
      },
    });

    const canvasFormat = navigator.gpu.getPreferredCanvasFormat();
    context.configure({
      device,
      format: canvasFormat,
    });

    const { width, height } = canvas.parentElement?.getBoundingClientRect() ?? {
      width: canvas.width,
      height: canvas.height,
    };

    context.canvas.width = width;
    context.canvas.height = height;

    setWgpuContext({ device, context, status: "success" });
  } catch (error) {
    setWgpuContext({
      device: null,
      context: null,
      status: "error",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
