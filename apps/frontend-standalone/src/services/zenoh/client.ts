import { Config, Session, Subscriber } from "@eclipse-zenoh/zenoh-ts";
import { streamCamera, StreamCameraHandler } from "./handler/stream-camera";
import { getCameraDescription } from "./handler/get-camera-description";
import { DeviceContextReplyMessage } from "./schemas/device_context_reply";
import { streamCameraDepth } from "./handler/stream-camera-depth";

export interface ZenohClient {
  session: Session;
  streamCamera: (
    cameraIndex: number,
    handler: StreamCameraHandler
  ) => Promise<Subscriber>;
  streamCameraDepth: (
    cameraIndex: number,
    handler: StreamCameraHandler
  ) => Promise<Subscriber>;
  getCameraDescription: (
    cameraIndex: number
  ) => Promise<DeviceContextReplyMessage>;
}

export const createZenohClient = async (): Promise<ZenohClient> => {
  let config = new Config(
    import.meta.env.VITE_ZENOH_URL ?? `${window.location.origin}/_zenoh`
  );
  const session = await Session.open(config);

  return {
    session,
    streamCamera: (cameraIndex, handler) =>
      streamCamera(session, cameraIndex, handler),
    streamCameraDepth: (cameraIndex, handler) =>
      streamCameraDepth(session, cameraIndex, handler),
    getCameraDescription: async (
      cameraIndex: number
    ): Promise<DeviceContextReplyMessage> =>
      getCameraDescription(session, cameraIndex),
  };
};
