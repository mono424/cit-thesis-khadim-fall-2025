import { Gpu } from "lucide-solid";
import { Component, createEffect, createSignal } from "solid-js";
import { StatusRow, Status } from "shared";
import { GlobalState } from "~/lib/state";

const CreateDepthProcessorStatus: Component<{
  depthProcessor: GlobalState["depthProcessor"];
}> = ({ depthProcessor }) => {
  const [status, setStatus] = createSignal<Status>("loading");
  const [error, setError] = createSignal<string | null>(null);

  createEffect(() => {
    const context = depthProcessor();
    if (context) {
      setStatus(context.status);
      setError(context.error ?? null);
    } else {
      setStatus("loading");
      setError(null);
    }
  }, [depthProcessor]);

  return (
    <StatusRow
      variant="ghost"
      icon={Gpu}
      title="Create Depth Processor (Pointcloud)"
      status={status}
      error={error}
    />
  );
};

export default CreateDepthProcessorStatus;
