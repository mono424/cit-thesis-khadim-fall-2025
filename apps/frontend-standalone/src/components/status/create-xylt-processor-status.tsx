import { Cpu } from "lucide-solid";
import { Component, createEffect, createSignal } from "solid-js";
import { StatusRow, Status } from "shared";
import { GlobalState } from "~/lib/state";

const CreateXyltProcessorStatus: Component<{
  xyltProcessor: GlobalState["xyltProcessor"];
}> = ({ xyltProcessor }) => {
  const [status, setStatus] = createSignal<Status>("loading");
  const [error, setError] = createSignal<string | null>(null);

  createEffect(() => {
    const context = xyltProcessor();
    if (context) {
      setStatus(context.status);
      setError(context.error ?? null);
    } else {
      setStatus("loading");
      setError(null);
    }
  }, [xyltProcessor]);

  return (
    <StatusRow
      variant="ghost"
      icon={Cpu}
      title="Setup XYLT Processor"
      status={status}
      error={error}
    />
  );
};

export default CreateXyltProcessorStatus;
