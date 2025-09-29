import { Joystick } from "lucide-solid";
import { Component, createEffect, createSignal } from "solid-js";
import { StatusRow, Status } from "shared";
import { GlobalState } from "~/lib/state";

const CreateCameraStatus: Component<{
  renderCamera: GlobalState["renderCamera"];
}> = ({ renderCamera }) => {
  const [status, setStatus] = createSignal<Status>("loading");
  const [error, setError] = createSignal<string | null>(null);

  createEffect(() => {
    const context = renderCamera();
    if (context) {
      setStatus(context.status);
      setError(context.error ?? null);
    } else {
      setStatus("loading");
      setError(null);
    }
  }, [renderCamera]);

  return (
    <StatusRow
      variant="ghost"
      icon={Joystick}
      title="Create Browser Camera"
      status={status}
      error={error}
    />
  );
};

export default CreateCameraStatus;
