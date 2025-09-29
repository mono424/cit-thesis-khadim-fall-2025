import { Box } from "lucide-solid";
import { Component, createEffect, createSignal } from "solid-js";
import { StatusRow, Status } from "shared";
import { GlobalState } from "~/lib/state";

const DecoderZDepthStatus: Component<{
  zDepthDecoders: GlobalState["zDepthDecoders"];
}> = ({ zDepthDecoders }) => {
  const [status, setStatus] = createSignal<Status>("loading");

  createEffect(() => {
    if (zDepthDecoders()) {
      setStatus("active");
    }
  }, [zDepthDecoders]);

  const fps = () =>
    (zDepthDecoders()?.stats?.avgFps() ?? 0) /
    (zDepthDecoders()?.stats?.count() ?? 1);

  return (
    <StatusRow
      variant="card"
      icon={Box}
      title="ZDepth Decoder"
      status={status}
      fps={fps}
    />
  );
};

export default DecoderZDepthStatus;
