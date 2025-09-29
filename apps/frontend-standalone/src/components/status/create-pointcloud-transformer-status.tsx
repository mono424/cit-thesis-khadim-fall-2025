import { Gpu } from "lucide-solid";
import { Component, createEffect, createSignal } from "solid-js";
import { StatusRow, Status } from "shared";
import { GlobalState } from "~/lib/state";

const CreatePointcloudTransformerStatus: Component<{
  pointcloudTransformer: GlobalState["pointcloudTransformer"];
}> = ({ pointcloudTransformer }) => {
  const [status, setStatus] = createSignal<Status>("loading");
  const [error, setError] = createSignal<string | null>(null);

  createEffect(() => {
    const context = pointcloudTransformer();
    if (context) {
      setStatus(context.status);
      setError(context.error ?? null);
    } else {
      setStatus("loading");
      setError(null);
    }
  }, [pointcloudTransformer]);

  return (
    <StatusRow
      variant="ghost"
      icon={Gpu}
      title="Create Pointcloud Transformer"
      status={status}
      error={error}
    />
  );
};

export default CreatePointcloudTransformerStatus;
