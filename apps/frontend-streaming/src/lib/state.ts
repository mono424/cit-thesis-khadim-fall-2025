import { StartStalkerSessionTrigger } from "shared";
import { createSignal } from "solid-js";
import { RenderCameraContext } from "~/services/camera/create";
import { WebRTCClient } from "~/services/webrtc/webrtc";

export const createGlobalState = ({
  videoElement,
}: {
  videoElement: HTMLVideoElement;
}) => {
  const [config, setConfig] = createSignal({
    videoElement,
  });

  const [webrtcClient, setWebrtcClient] = createSignal<WebRTCClient | null>(
    null
  );

  const [renderCamera, setRenderCamera] =
    createSignal<RenderCameraContext | null>(null);

  const [startStalkerSessionTriggers, setStartStalkerSessionTriggers] =
    createSignal<StartStalkerSessionTrigger[]>([]);

  const pushStartStalkerSessionTrigger = (
    trigger: StartStalkerSessionTrigger
  ) => {
    setStartStalkerSessionTriggers((prev) => [...prev, trigger]);
  };

  return {
    config,
    renderCamera,
    webrtcClient,
    setConfig,
    setWebrtcClient,
    setRenderCamera,
    pushStartStalkerSessionTrigger,
    startStalkerSessionTriggers,
  };
};

export type GlobalState = ReturnType<typeof createGlobalState>;
