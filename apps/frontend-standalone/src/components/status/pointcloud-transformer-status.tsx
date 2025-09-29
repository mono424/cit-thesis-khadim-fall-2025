import { Gpu } from "lucide-solid";
import { Component, createEffect, createSignal } from "solid-js";
import { StatusRow, Status } from "shared";
import { GlobalState } from "~/lib/state";

const PointCloudTransformerStatus: Component<{
  pointcloudTransformer: GlobalState["pointcloudTransformer"];
}> = ({ pointcloudTransformer }) => {
  const [status, setStatus] = createSignal<Status>("loading");

  createEffect(() => {
    if (pointcloudTransformer()) {
      setStatus("active");
    }
  }, [pointcloudTransformer]);

  const fps = () =>
    (pointcloudTransformer()?.stats?.avgFps() ?? 0) /
    (pointcloudTransformer()?.stats?.count() ?? 1);

  return (
    <StatusRow
      variant="card"
      icon={Gpu}
      title="Pointcloud Transformer"
      status={status}
      fps={fps}
    />
  );
};

export default PointCloudTransformerStatus;
