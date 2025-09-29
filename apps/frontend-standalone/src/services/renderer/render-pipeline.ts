import { Camera } from "shared";
import { useFps } from "shared";
import { GridRenderer } from "./grid";
import { PointcloudRenderer } from "./pointcloud";

function createRenderResources({
  device,
  context,
}: {
  device: GPUDevice;
  context: GPUCanvasContext;
}) {
  const { canvas } = context;

  const renderDepthTexture: GPUTexture = device.createTexture({
    size: [canvas.width, canvas.height],
    format: "depth24plus",
    usage: GPUTextureUsage.RENDER_ATTACHMENT,
  });

  const createRenderPassDescriptor = (): GPURenderPassDescriptor => ({
    colorAttachments: [
      {
        view: context.getCurrentTexture().createView(),
        clearValue: [0.1, 0.1, 0.2, 1.0],
        loadOp: "clear",
        storeOp: "store",
      },
    ],
    depthStencilAttachment: {
      view: renderDepthTexture.createView(),
      depthClearValue: 1.0,
      depthLoadOp: "clear",
      depthStoreOp: "store",
    },
  });

  return {
    renderDepthTexture,
    createRenderPassDescriptor,
  };
}

export function initRenderPipeline({
  device,
  context,
  camera,
  grid,
  pointcloud,
}: {
  device: GPUDevice;
  context: GPUCanvasContext;
  camera: Camera;
  grid: GridRenderer;
  pointcloud: PointcloudRenderer;
}) {
  const fps = useFps({ name: "renderer" });
  const { renderDepthTexture, createRenderPassDescriptor } =
    createRenderResources({
      device,
      context,
    });

  const frame = () => {
    const commandEncoder = device.createCommandEncoder();
    const renderPass = commandEncoder.beginRenderPass(
      createRenderPassDescriptor()
    );

    grid.updateCamera({
      viewMatrix: camera.viewMatrix(),
      projectionMatrix: camera.projectionMatrix(),
    });

    pointcloud.updateCamera({
      viewMatrix: camera.viewMatrix(),
      projectionMatrix: camera.projectionMatrix(),
    });

    // render
    grid.render(commandEncoder, renderPass);
    pointcloud.render(commandEncoder, renderPass);

    renderPass.end();
    device.queue.submit([commandEncoder.finish()]);
  };

  let animationId: number;
  const doFrame = () => {
    frame();
    fps.updateFps();
    animationId = requestAnimationFrame(doFrame);
  };
  animationId = requestAnimationFrame(doFrame);

  const stats = {
    avgFps: fps.avgFps,
  };

  const cleanup = () => {
    if (animationId) {
      cancelAnimationFrame(animationId);
    }
    renderDepthTexture.destroy();
  };

  return {
    fps,
    stats,
    cleanup,
  };
}

export type RenderPipeline = ReturnType<typeof initRenderPipeline>;
