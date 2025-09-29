import { Gpu } from "lucide-solid";
import { Component, createEffect, createSignal } from "solid-js";
import { StatusRow, Status } from "shared";
import { GlobalState } from "~/lib/state";

const DepthProcessorStatus: Component<{
  depthProcessor: GlobalState["depthProcessor"];
}> = ({ depthProcessor }) => {
  const [status, setStatus] = createSignal<Status>("loading");

  createEffect(() => {
    if (depthProcessor()) {
      setStatus("active");
    }
  }, [depthProcessor]);

  const fps = () =>
    (depthProcessor()?.stats?.avgFps() ?? 0) /
    (depthProcessor()?.stats?.count() ?? 1);

  return (
    <StatusRow
      variant="card"
      icon={Gpu}
      title="Depth Processor"
      status={status}
      fps={fps}
    />
  );
};

export default DepthProcessorStatus;
