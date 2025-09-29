import { type Component } from "solid-js";
import ZenohClientStatus from "./status/zenoh-client-status";
import { Pipeline, FunnelConnector, Splitter, DollyCamCard } from "shared";
import DecoderH264Status from "./status/decoder-h264-status";
import DecoderZDepthStatus from "./status/decoder-zdepth-status";
import TetrisBufferStatus from "./status/tetris-buffer-status";
import { GlobalState } from "../lib/state";
import CameraDescriptionStatus from "./status/camera-description-status";
import StreamCameraColorStatus from "./status/stream-camera-color-status";
import StreamCameraDepthStatus from "./status/stream-camera-depth-status";
import CreateWgpuContextStatus from "./status/create-wgpu-context-status";
import CreateXyltProcessorStatus from "./status/create-xylt-processor-status";
import CreateDepthXyltStatus from "./status/create-depth-xylt-status";
import CreateDepthProcessorStatus from "./status/create-depth-processor-status";
import CreateRendererGridStatus from "./status/create-renderer-grid-status";
import RendererStatus from "./status/renderer-status";
import CreateRenderCameraStatus from "./status/create-render-camera-status";
import DepthProcessorStatus from "./status/depth-processor-status";
import CreateRendererPointcloudStatus from "./status/create-renderer-pointcloud-status";
import CreatePointcloudTransformerStatus from "./status/create-pointcloud-transformer-status";
import PointcloudTransformerStatus from "./status/pointcloud-transformer-status";

const App: Component<{ state: GlobalState }> = ({ state }) => {
  return (
    <>
      <Pipeline>
        <ZenohClientStatus zenohClient={state.zenohClient} />
        <CreateWgpuContextStatus wgpuContext={state.wgpuContext} />
        <CreateRenderCameraStatus renderCamera={state.renderCamera} />
        <CreateRendererGridStatus gridRenderer={state.gridRenderer} />
        <CreateXyltProcessorStatus xyltProcessor={state.xyltProcessor} />
        <CameraDescriptionStatus
          cameraDescriptions={state.cameraDescriptions}
        />
        <CreateDepthXyltStatus depthXylt={state.depthXylt} />
        <CreateDepthProcessorStatus depthProcessor={state.depthProcessor} />
        <CreatePointcloudTransformerStatus
          pointcloudTransformer={state.pointcloudTransformer}
        />
        <CreateRendererPointcloudStatus
          pointcloudRenderer={state.pointcloudRenderer}
        />
      </Pipeline>

      <FunnelConnector variant="1-to-2" />

      <Splitter>
        <Pipeline>
          <StreamCameraColorStatus streams={state.cameraColorStreams} />
          <DecoderH264Status h264Decoders={state.h264Decoders} />
        </Pipeline>
        <Pipeline>
          <StreamCameraDepthStatus streams={state.cameraDepthStreams} />
          <DecoderZDepthStatus zDepthDecoders={state.zDepthDecoders} />
        </Pipeline>
      </Splitter>

      <FunnelConnector variant="2-to-1" />

      <TetrisBufferStatus
        tetrisBuffer={state.tetrisBuffer}
        config={state.config}
      />

      <FunnelConnector variant="1-to-1" />

      <Pipeline>
        <DepthProcessorStatus depthProcessor={state.depthProcessor} />
        <PointcloudTransformerStatus
          pointcloudTransformer={state.pointcloudTransformer}
        />
        <RendererStatus renderer={state.renderer} />
      </Pipeline>

      <DollyCamCard camera={() => state?.renderCamera()?.camera ?? null} />
      <div class="py-2 italic text-xs text-center text-gray-600/50">
        Bachelor Thesis - Khadim Fall
      </div>
    </>
  );
};

export default App;
