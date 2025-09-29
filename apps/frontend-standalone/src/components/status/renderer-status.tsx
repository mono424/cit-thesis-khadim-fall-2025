import { Paintbrush } from "lucide-solid";
import { Component, createEffect, createSignal } from "solid-js";
import { StatusRow, Status } from "shared";
import { GlobalState } from "~/lib/state";

const RendererStatus: Component<{
  renderer: GlobalState["renderer"];
}> = ({ renderer }) => {
  const [status, setStatus] = createSignal<Status>("loading");
  const [error, setError] = createSignal<string | null>(null);

  createEffect(() => {
    const context = renderer();
    if (context) {
      setStatus(context.status);
      setError(context.error ?? null);
    } else {
      setStatus("loading");
      setError(null);
    }
  }, [renderer]);

  const fps = () => renderer()?.renderer?.stats?.avgFps() ?? 0;

  return (
    <StatusRow
      variant="ghost"
      icon={Paintbrush}
      title="Renderer"
      status={status}
      error={error}
      fps={fps}
    />
  );
};

export default RendererStatus;
