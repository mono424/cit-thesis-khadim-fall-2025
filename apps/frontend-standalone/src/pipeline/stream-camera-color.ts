import { Subscriber } from "@eclipse-zenoh/zenoh-ts";
import { Accessor } from "solid-js";
import { GlobalState } from "~/lib/state";
import { useFps } from "shared";

export type CameraColorStreams = {
  status: "loading" | "active" | "error";
  error?: string;
  stats: {
    avgFps: Accessor<number>;
    count: Accessor<number>;
  };
};

export async function streamCameraColor(state: GlobalState) {
  const {
    zenohClient,
    h264Decoders,
    tetrisBuffer,
    setCameraColorStreams,
    pushStartStalkerSessionTrigger,
  } = state;

  const { avgFps, updateFps, startStalkerSession } = useFps({
    name: "stream-camera-color",
  });
  pushStartStalkerSessionTrigger(startStalkerSession);
  const result: CameraColorStreams = {
    status: "loading",
    stats: {
      avgFps: avgFps,
      count: () => 0,
    },
  };
  setCameraColorStreams(result);

  const zenoh = zenohClient();
  const { decoders } = h264Decoders() ?? {};
  const buffer = tetrisBuffer();
  if (!zenoh || !decoders || !buffer) {
    result.status = "error";
    result.error = "No Zenoh client or decoders or buffer";
    setCameraColorStreams({ ...result });
    return;
  }

  let receivers: Promise<Subscriber>[] = [];

  for (let i = 0; i < state.config().colorCameraCount; i++) {
    receivers.push(
      zenoh.streamCamera(i + 1, async (data) => {
        try {
          updateFps();
          const bitmap = await decoders[i](Uint8Array.from(data.image));
          if (!bitmap) {
            return;
          }
          buffer.instance?.insert(i, {
            indexValue: Number(data.header.stamp.nanosec),
            value: bitmap,
          });
        } catch (error) {
          console.error("Error processing camera stream data:", error);
        }
      })
    );
  }

  result.status = "active";
  result.stats.count = () => state.config().colorCameraCount;
  setCameraColorStreams({ ...result });
}
