import { Sample, Session, Subscriber } from "@eclipse-zenoh/zenoh-ts";
import { CameraPacketMessage } from "../schemas/mock_video_stream_message";

export type ParsedCameraPacket = CameraPacketMessage & {
  nalData: Uint8Array<ArrayBuffer>;
};

export type StreamRawCameraHandler = (data: Uint8Array) => void;

export const streamRawCamera = async (
  session: Session,
  cameraIndex: number,
  handler: StreamRawCameraHandler
): Promise<Subscriber> => {
  const topic = `${
    import.meta.env.VITE_ARTEKMED_TOPIC_PREFIX
  }/k4a_capture_multi/rpc/sensor/camera${cameraIndex
    .toString()
    .padStart(2, "0")}/describe`;
  const subscriber = await session.declareSubscriber(topic, {
    handler: async (sample: Sample) => {
      handler(sample.payload().toBytes());
    },
  });
  return subscriber;
};
