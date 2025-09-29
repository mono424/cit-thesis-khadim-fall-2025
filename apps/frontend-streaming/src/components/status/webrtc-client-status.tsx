import { Cable } from "lucide-solid";
import { Accessor, Component, createEffect, createSignal } from "solid-js";
import { StatusRow, Status } from "shared";
import { WebRTCClient } from "~/services/webrtc/webrtc";

const ZenohClientStatus: Component<{
  webrtcClient: Accessor<WebRTCClient | null>;
}> = ({ webrtcClient }) => {
  const [status, setStatus] = createSignal<Status>("loading");

  const updateStatus = () => {
    const client = webrtcClient();
    if (!client?.dataChannelStatus || !client?.pcStatus) {
      setStatus("loading");
      return;
    }
    if (client.dataChannelStatus === "error" || client.pcStatus === "error") {
      setStatus("error");
      return;
    }
    if (client.dataChannelStatus === "active" && client.pcStatus === "active") {
      setStatus("active");
      return;
    }
    setStatus("loading");
  };

  createEffect(updateStatus, [webrtcClient]);
  updateStatus();

  return (
    <StatusRow
      variant="ghost"
      icon={Cable}
      title="WebRTC Client"
      status={status}
      fps={() => webrtcClient()?.stats?.fps() ?? 0}
      error={() => webrtcClient()?.error ?? null}
    />
  );
};

export default ZenohClientStatus;
