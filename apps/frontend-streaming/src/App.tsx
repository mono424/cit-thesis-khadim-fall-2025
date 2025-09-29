import {
  createEffect,
  createSignal,
  onCleanup,
  type Component,
} from "solid-js";
import { createGlobalState } from "./lib/state";
import StatusGraph from "./components/status-graph";
import { createWebrtc } from "./services/webrtc/webrtc";
import { createRenderCamera } from "./services/camera/create";
import { debounce, throttle } from "@solid-primitives/scheduled";
import { RecordButton, setAppName, Layout } from "shared";
import "shared/styles.css";

setAppName("streaming");

const App: Component = () => {
  const [ready, setReady] = createSignal(false);
  const [serverCsv, setServerCsv] = createSignal("");
  const [metricSeconds] = createSignal(5);
  const video = (
    <video class="w-full h-full bg-black" autoplay playsinline />
  ) as HTMLVideoElement;
  const [videoSize, setVideoSize] = createSignal({ width: 0, height: 0 });

  const state = createGlobalState({
    videoElement: video,
  });

  const updateRemoteCanvasSize = debounce(() => {
    const client = state.webrtcClient();
    const { width, height } = videoSize();
    if (client?.dataChannelStatus === "active") {
      client.sendCanvasSize?.({ width, height });
    }
  }, 150);

  const updateRemoteCameraMatrices = throttle(() => {
    const client = state.webrtcClient();
    const matrices = cameraMatrices();
    if (client?.sendCameraMatrix && matrices) {
      client.sendCameraMatrix(
        new Float32Array([...(matrices[0] ?? []), ...(matrices[1] ?? [])])
      );
    }
  }, 10);

  const initializeAndFetch = async () => {
    await createRenderCamera(state);
    await createWebrtc(state);
  };
  initializeAndFetch();

  createEffect(() => {
    const update = () => {
      const { width, height } = video.getBoundingClientRect();
      setVideoSize({ width, height });
      updateRemoteCanvasSize();
    };

    const resizeObserver = new ResizeObserver(() => update());
    resizeObserver.observe(video);

    update();
    onCleanup(() => {
      resizeObserver.disconnect();
    });
  }, [video]);

  createEffect(() => {
    const mediaStream = state.webrtcClient()?.mediaStream;
    if (mediaStream) {
      video.srcObject = mediaStream;
      setReady(true);
      updateRemoteCanvasSize();
    }
  }, [state.webrtcClient]);

  const cameraMatrices = () => [
    state.renderCamera()?.camera?.viewMatrix(),
    state.renderCamera()?.camera?.projectionMatrix(),
  ];

  const play = () => {
    console.log("Playing video", video, video.readyState);
    video.play();
  };

  createEffect(() => {
    const client = state.webrtcClient();
    const matrices = cameraMatrices();
    if (client?.dataChannelStatus === "active" && matrices) {
      updateRemoteCameraMatrices();
    }
  }, [state.webrtcClient, cameraMatrices]);

  const serverMetricGetter = () => {
    const client = state.webrtcClient();
    client?.startMetricRecording?.(metricSeconds(), (csv) => {
      setServerCsv(csv);
    });
  };

  return (
    <Layout
      title="ARTEKMed Streaming"
      action={
        <RecordButton
          startStalkerSessionTriggers={state.startStalkerSessionTriggers}
          onStartMetricRecording={serverMetricGetter}
          serverCsv={serverCsv}
          seconds={metricSeconds}
        />
      }
      sidebar={
        <>
          <StatusGraph state={state} />
          <button
            class="border disabled:opacity-50 disabled:cursor-not-allowed border-gray-800 text-gray-400 rounded-md w-full py-1 text-xs hover:bg-gray-900 cursor-pointer"
            onclick={play}
            disabled={!ready()}
          >
            Play
          </button>
        </>
      }
    >
      {video}
    </Layout>
  );
};

export default App;
