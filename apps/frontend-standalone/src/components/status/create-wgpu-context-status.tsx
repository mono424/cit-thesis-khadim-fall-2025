import { Gpu } from "lucide-solid";
import { Component, createEffect, createSignal } from "solid-js";
import { StatusRow, Status } from "shared";
import { GlobalState } from "~/lib/state";

const CreateWgpuContextStatus: Component<{
  wgpuContext: GlobalState["wgpuContext"];
}> = ({ wgpuContext }) => {
  const [status, setStatus] = createSignal<Status>("loading");
  const [error, setError] = createSignal<string | null>(null);

  createEffect(() => {
    const context = wgpuContext();
    if (context) {
      setStatus(context.status);
      setError(context.error ?? null);
    } else {
      setStatus("loading");
      setError(null);
    }
  }, [wgpuContext]);

  return (
    <StatusRow
      variant="ghost"
      icon={Gpu}
      title="Setup WebGPU Context"
      status={status}
      error={error}
    />
  );
};

export default CreateWgpuContextStatus;
