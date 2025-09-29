import { Radio } from "lucide-solid";
import { Component, createEffect, createSignal } from "solid-js";
import { StatusRow, Status } from "shared";
import { GlobalState } from "~/lib/state";

const StreamCameraColorStatus: Component<{
  streams: GlobalState["cameraColorStreams"];
}> = ({ streams }) => {
  const [status, setStatus] = createSignal<Status>("loading");
  const [error, setError] = createSignal<string | null>(null);

  createEffect(() => {
    const s = streams();
    if (s) {
      setStatus(s.status);
      setError(s.error ?? null);
    } else {
      setStatus("loading");
      setError(null);
    }
  }, [streams]);

  const fps = () =>
    (streams()?.stats?.avgFps() ?? 0) / (streams()?.stats?.count() ?? 1);

  return (
    <StatusRow
      variant="ghost"
      icon={Radio}
      title="Color Streams"
      status={status}
      error={error}
      fps={fps}
    />
  );
};

export default StreamCameraColorStatus;
