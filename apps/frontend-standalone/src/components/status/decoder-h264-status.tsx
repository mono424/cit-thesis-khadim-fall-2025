import { TvMinimalPlay } from "lucide-solid";
import { Component, createEffect, createSignal } from "solid-js";
import { StatusRow, Status } from "shared";
import { GlobalState } from "~/lib/state";

const DecoderH264Status: Component<{
  h264Decoders: GlobalState["h264Decoders"];
}> = ({ h264Decoders }) => {
  const status = () => h264Decoders?.()?.status ?? "loading";

  const fps = () =>
    (h264Decoders()?.stats?.avgFps() ?? 0) /
    (h264Decoders()?.stats?.count() ?? 1);

  return (
    <StatusRow
      variant="card"
      icon={TvMinimalPlay}
      title="H264 Decoder"
      status={status}
      fps={fps}
    />
  );
};

export default DecoderH264Status;
