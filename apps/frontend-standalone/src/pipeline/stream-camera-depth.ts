import { Subscriber } from "@eclipse-zenoh/zenoh-ts";
import { Accessor } from "solid-js";
import { GlobalState } from "~/lib/state";
import { useFps } from "shared";

export type CameraDepthStreams = {
  status: "loading" | "active" | "error";
  offset: number;
  error?: string;
  stats: {
    avgFps: Accessor<number>;
    count: Accessor<number>;
  };
};

export async function streamCameraDepth(state: GlobalState) {
  const {
    zenohClient,
    zDepthDecoders,
    tetrisBuffer,
    setCameraDepthStreams,
    pushStartStalkerSessionTrigger,
  } = state;

  const { avgFps, updateFps, startStalkerSession } = useFps({
    name: "stream-camera-depth",
  });
  pushStartStalkerSessionTrigger(startStalkerSession);

  const result: CameraDepthStreams = {
    status: "loading",
    offset: 0,
    stats: {
      avgFps: avgFps,
      count: () => 0,
    },
  };
  setCameraDepthStreams(result);

  const zenoh = zenohClient();
  const decoders = zDepthDecoders();
  const buffer = tetrisBuffer();
  if (!zenoh || !decoders || !buffer) {
    result.status = "error";
    result.error = "No Zenoh client or decoders or buffer";
    setCameraDepthStreams({ ...result });
    return;
  }

  let receivers: Promise<Subscriber>[] = [];

  const depthCameraOffset = state.config().colorCameraCount;
  for (let i = 0; i < state.config().depthCameraCount; i++) {
    receivers.push(
      zenoh.streamCameraDepth(i + 1, async (data) => {
        try {
          updateFps();
          const bitmap = await decoders.decoders[i](
            Uint8Array.from(data.image)
          );
          if (!bitmap) {
            return;
          }
          buffer.instance?.insert(depthCameraOffset + i, {
            indexValue: Number(data.header.stamp.nanosec),
            value: bitmap,
          });
        } catch (error) {
          console.error("Error processing camera stream data:", error);
        }
      })
    );
  }

  result.offset = depthCameraOffset;
  result.status = "active";
  result.stats.count = () => decoders.decoders.length;
  setCameraDepthStreams({ ...result });
}
