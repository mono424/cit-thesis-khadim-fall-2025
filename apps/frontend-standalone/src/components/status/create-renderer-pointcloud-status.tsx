import { Gpu } from "lucide-solid";
import { Component, createEffect, createSignal } from "solid-js";
import { StatusRow, Status } from "shared";
import { GlobalState } from "~/lib/state";

const CreateRendererPointcloudStatus: Component<{
  pointcloudRenderer: GlobalState["pointcloudRenderer"];
}> = ({ pointcloudRenderer }) => {
  const [status, setStatus] = createSignal<Status>("loading");
  const [error, setError] = createSignal<string | null>(null);

  createEffect(() => {
    const context = pointcloudRenderer();
    if (context) {
      setStatus(context.status);
      setError(context.error ?? null);
    } else {
      setStatus("loading");
      setError(null);
    }
  }, [pointcloudRenderer]);

  return (
    <StatusRow
      variant="ghost"
      icon={Gpu}
      title="Create Pointcloud Renderer"
      status={status}
      error={error}
    />
  );
};

export default CreateRendererPointcloudStatus;
