import { Sample, Session, Subscriber } from "@eclipse-zenoh/zenoh-ts";
import { parseCDRBytes } from "@mono424/cdr-ts";
import {
  VideoStreamMessage,
  videoStreamMessageSchema,
} from "../schemas/video_stream_message";

export type StreamCameraHandler = (data: VideoStreamMessage) => void;

export const streamCameraDepth = async (
  session: Session,
  cameraIndex: number,
  handler: StreamCameraHandler
): Promise<Subscriber> => {
  const topic = `${import.meta.env.VITE_ARTEKMED_TOPIC_PREFIX.replace(
    "loc/pcpd",
    "testing"
  )}/camera${cameraIndex
    .toString()
    .padStart(2, "0")}/str/vid/depth_image_bitstream`;
  const subscriber = await session.declareSubscriber(topic, {
    handler: async (sample: Sample) => {
      const parsed = parseCDRBytes(
        sample.payload().toBytes(),
        videoStreamMessageSchema,
        {
          maxSequenceSize: 1024 * 1024 * 15, // 15MB
        }
      );

      handler(parsed.payload);
    },
  });
  return subscriber;
};
