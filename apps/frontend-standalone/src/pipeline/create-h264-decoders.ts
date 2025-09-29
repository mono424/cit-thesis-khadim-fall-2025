import { Accessor } from "solid-js";
import { Status } from "~/components/ui/status-row";
import { GlobalState } from "~/lib/state";
import { createPromisedDecoderWorker } from "~/services/decoder";
import { createSharedArrayBuffer } from "~/services/decoder/shared_array_buffer";
import { useFps } from "shared";

export type H264Decoder = ReturnType<typeof createPromisedDecoderWorker>;

export type H264Decoders = {
  decoders: H264Decoder[];
  status: Status;
  error?: string;
  stats: {
    avgFps: Accessor<number>;
    count: Accessor<number>;
  };
};

export async function createH264Decoders(state: GlobalState) {
  const { h264Decoders, setH264Decoders, pushStartStalkerSessionTrigger } =
    state;

  const { avgFps, updateFps, startStalkerSession } = useFps({
    name: "h264-decoders",
  });
  pushStartStalkerSessionTrigger(startStalkerSession);

  const sharedBuffer = createSharedArrayBuffer({
    workerCount: state.config().colorCameraCount,
    workerBufferSize: 1024 * 1024 * 14, // 20MB
  });

  const decoders = Array.from(
    { length: state.config().colorCameraCount },
    (_, i) =>
      createPromisedDecoderWorker(false, sharedBuffer[i], {
        onFrameHook: () => {
          updateFps();
        },
        onError: (e) => {
          const current = h264Decoders();
          if (!current) return;
          console.error("Decoder worker", e);
          setH264Decoders({
            ...current,
            status: "error",
            error: e.message,
          });
        },
      })
  );

  setH264Decoders({
    decoders,
    status: "active",
    stats: {
      avgFps: avgFps,
      count: () => state.config().colorCameraCount,
    },
  });
}
