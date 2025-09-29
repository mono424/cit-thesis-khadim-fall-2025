import { createSignal } from "solid-js";
import { DepthProcessorState } from "~/pipeline/create-depth-processor";
import { DepthXyltState } from "~/pipeline/create-depth-xylt";
import { H264Decoders } from "~/pipeline/create-h264-decoders";
import { PointcloudTransformerState } from "~/pipeline/create-pointcloud-transformer";
import { RenderCameraContext } from "~/pipeline/create-render-camera";
import { GridRendererState } from "~/pipeline/create-renderer-grid";
import { PointcloudRendererState } from "~/pipeline/create-renderer-pointcloud";
import { TetrisBuffer } from "~/pipeline/create-tetris-buffer";
import { WgpuContext } from "~/pipeline/create-wgpu-context";
import { XyltProcessorState } from "~/pipeline/create-xylt-processor";
import { ZDepthDecoders } from "~/pipeline/create-zdepth-decoders";
import { CameraDescriptions } from "~/pipeline/gather-camera-descriptions";
import { RendererState } from "~/pipeline/start-renderer";
import { CameraColorStreams } from "~/pipeline/stream-camera-color";
import { CameraDepthStreams } from "~/pipeline/stream-camera-depth";
import { StartStalkerSessionTrigger } from "shared";
import { GridRendererOptions } from "~/services/renderer";
import { ZenohClient } from "~/services/zenoh/client";

export const createGlobalState = ({
  colorCameraCount,
  depthCameraCount,
  maxBufferSize,
  maxBufferDeltaNs,
  canvas,
  gridOptions,
}: {
  colorCameraCount: number;
  depthCameraCount: number;
  maxBufferSize: number;
  maxBufferDeltaNs: number;
  gridOptions: GridRendererOptions;
  canvas: HTMLCanvasElement;
}) => {
  const [config, setConfig] = createSignal({
    canvas,
    colorCameraCount,
    depthCameraCount,
    maxBufferSize,
    maxBufferDeltaNs,
    gridOptions,
  });

  const [zenohClient, setZenohClient] = createSignal<ZenohClient | null>(null);
  const [cameraDescriptions, setCameraDescriptions] =
    createSignal<CameraDescriptions | null>();
  const [tetrisBuffer, setTetrisBuffer] = createSignal<TetrisBuffer | null>();
  const [h264Decoders, setH264Decoders] = createSignal<H264Decoders | null>();
  const [zDepthDecoders, setZDepthDecoders] =
    createSignal<ZDepthDecoders | null>();
  const [cameraColorStreams, setCameraColorStreams] =
    createSignal<CameraColorStreams | null>();
  const [cameraDepthStreams, setCameraDepthStreams] =
    createSignal<CameraDepthStreams | null>();
  const [wgpuContext, setWgpuContext] = createSignal<WgpuContext | null>();
  const [xyltProcessor, setXyltProcessor] =
    createSignal<XyltProcessorState | null>();
  const [depthXylt, setDepthXylt] = createSignal<DepthXyltState | null>();
  const [depthProcessor, setDepthProcessor] =
    createSignal<DepthProcessorState | null>();
  const [pointcloudTransformer, setPointcloudTransformer] =
    createSignal<PointcloudTransformerState | null>();
  const [gridRenderer, setGridRenderer] =
    createSignal<GridRendererState | null>();
  const [pointcloudRenderer, setPointcloudRenderer] =
    createSignal<PointcloudRendererState | null>();
  const [renderer, setRenderer] = createSignal<RendererState | null>();
  const [renderCamera, setRenderCamera] =
    createSignal<RenderCameraContext | null>();
  const [startStalkerSessionTriggers, setStartStalkerSessionTriggers] =
    createSignal<StartStalkerSessionTrigger[]>([]);

  const pushStartStalkerSessionTrigger = (
    trigger: StartStalkerSessionTrigger
  ) => {
    setStartStalkerSessionTriggers((prev) => [...prev, trigger]);
  };

  return {
    config,
    zenohClient,
    cameraDescriptions,
    tetrisBuffer,
    h264Decoders,
    zDepthDecoders,
    cameraColorStreams,
    cameraDepthStreams,
    wgpuContext,
    xyltProcessor,
    depthXylt,
    depthProcessor,
    pointcloudTransformer,
    gridRenderer,
    pointcloudRenderer,
    renderer,
    renderCamera,
    setConfig,
    setZenohClient,
    setCameraDescriptions,
    setTetrisBuffer,
    setH264Decoders,
    setZDepthDecoders,
    setCameraColorStreams,
    setCameraDepthStreams,
    setWgpuContext,
    setXyltProcessor,
    setDepthXylt,
    setDepthProcessor,
    setPointcloudTransformer,
    setGridRenderer,
    setPointcloudRenderer,
    setRenderer,
    setRenderCamera,
    startStalkerSessionTriggers,
    pushStartStalkerSessionTrigger,
  };
};

export type GlobalState = ReturnType<typeof createGlobalState>;
