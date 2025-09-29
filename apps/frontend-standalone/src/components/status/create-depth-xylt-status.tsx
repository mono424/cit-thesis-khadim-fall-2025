import { Table } from "lucide-solid";
import { Component, createEffect, createSignal } from "solid-js";
import { StatusRow, Status } from "shared";
import { GlobalState } from "~/lib/state";

const CreateDepthXyltStatus: Component<{
  depthXylt: GlobalState["depthXylt"];
}> = ({ depthXylt }) => {
  const [status, setStatus] = createSignal<Status>("loading");
  const [error, setError] = createSignal<string | null>(null);

  createEffect(() => {
    const context = depthXylt();
    if (context) {
      setStatus(context.status);
      setError(context.error ?? null);
    } else {
      setStatus("loading");
      setError(null);
    }
  }, [depthXylt]);

  return (
    <StatusRow
      variant="ghost"
      icon={Table}
      title="Create Depth XY Lookup Tables"
      status={status}
      error={error}
    />
  );
};

export default CreateDepthXyltStatus;
