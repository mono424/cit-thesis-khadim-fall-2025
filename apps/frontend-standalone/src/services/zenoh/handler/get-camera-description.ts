import { Encoding, Reply, Session } from "@eclipse-zenoh/zenoh-ts";
import { CameraPacketMessage } from "../schemas/mock_video_stream_message";
import { parseCDRBytes } from "@mono424/cdr-ts";
import {
  DeviceContextReplyMessage,
  deviceContextReplySchema,
} from "../schemas/device_context_reply";

export type ParsedCameraPacket = CameraPacketMessage & {
  nalData: Uint8Array<ArrayBuffer>;
};

export type StreamRawCameraHandler = (data: Uint8Array) => void;

export const getCameraDescription = async (
  session: Session,
  cameraIndex: number
): Promise<DeviceContextReplyMessage> => {
  const topic = `${
    import.meta.env.VITE_ARTEKMED_TOPIC_PREFIX
  }/k4a_capture_multi/rpc/sensor/camera${cameraIndex
    .toString()
    .padStart(2, "0")}/describe`;
  const queryPromise = (
    await session.get(topic, {
      encoding: Encoding.APPLICATION_CDR,
    })
  )?.receive();

  const reply = await queryPromise;

  if (reply instanceof Reply) {
    const parsed = parseCDRBytes(
      reply.result().payload().toBytes(),
      deviceContextReplySchema,
      { maxSequenceSize: 10000 }
    );
    return parsed.payload;
  }
  throw new Error(`No data found for camera ${cameraIndex}`);
};
