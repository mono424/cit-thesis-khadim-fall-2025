import { Gpu } from "lucide-solid";
import { Component, createEffect, createSignal } from "solid-js";
import { StatusRow, Status } from "shared";
import { GlobalState } from "~/lib/state";

const CreateRendererGridStatus: Component<{
  gridRenderer: GlobalState["gridRenderer"];
}> = ({ gridRenderer }) => {
  const [status, setStatus] = createSignal<Status>("loading");
  const [error, setError] = createSignal<string | null>(null);

  createEffect(() => {
    const context = gridRenderer();
    if (context) {
      setStatus(context.status);
      setError(context.error ?? null);
    } else {
      setStatus("loading");
      setError(null);
    }
  }, [gridRenderer]);

  return (
    <StatusRow
      variant="ghost"
      icon={Gpu}
      title="Create Grid Renderer"
      status={status}
      error={error}
    />
  );
};

export default CreateRendererGridStatus;
