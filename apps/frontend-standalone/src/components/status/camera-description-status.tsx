import { FileVideoCamera } from "lucide-solid";
import { Component, createEffect, createSignal } from "solid-js";
import { StatusRow, Status } from "shared";
import { GlobalState } from "~/lib/state";

const CameraDescriptionStatus: Component<{
  cameraDescriptions: GlobalState["cameraDescriptions"];
}> = ({ cameraDescriptions }) => {
  const [status, setStatus] = createSignal<Status>("loading");
  const [error, setError] = createSignal<string | null>(null);

  createEffect(() => {
    const descriptions = cameraDescriptions();
    if (descriptions) {
      setStatus(descriptions.status);
      setError(descriptions.error ?? null);
    } else {
      setStatus("loading");
      setError(null);
    }
  }, [cameraDescriptions]);

  return (
    <StatusRow
      variant="ghost"
      icon={FileVideoCamera}
      title="Camera Descriptions"
      status={status}
      error={error}
    />
  );
};

export default CameraDescriptionStatus;
