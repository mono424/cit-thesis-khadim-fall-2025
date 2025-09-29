import { GlobalState } from "~/lib/state";
import { CameraSensor } from "~/services/zenoh/schemas/device_context_reply";

export type CameraDescriptions = {
  cameras: CameraSensor[] | null;
  status: "loading" | "success" | "error";
  error?: string;
};

export async function gatherCameraDescriptions(state: GlobalState) {
  const { zenohClient, setCameraDescriptions } = state;

  const result: CameraDescriptions = {
    status: "loading",
    cameras: null,
  };

  setCameraDescriptions(result);

  const client = zenohClient();
  if (!client) {
    result.status = "error";
    result.error = "No Zenoh client";
    setCameraDescriptions({ ...result });
    return;
  }

  try {
    const descriptions = await Promise.all([
      client.getCameraDescription(1),
      client.getCameraDescription(2),
      client.getCameraDescription(3),
      client.getCameraDescription(4),
    ]);
    result.cameras = descriptions.map((d) => d.value);
    result.status = "success";
  } catch (error) {
    result.status = "error";
    result.error =
      error instanceof Error ? error.message : "Unknown fetch error";
  }
  setCameraDescriptions({ ...result });
}
