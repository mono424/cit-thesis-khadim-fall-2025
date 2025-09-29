import { createTetrisEngine } from "@mono424/tetris-ts";
import { GlobalState } from "~/lib/state";
import { ZDepthFrame } from "./create-zdepth-decoders";
import { Accessor, createSignal } from "solid-js";
import { useFps } from "shared";

function seperateColorAndDepth(row: TetrisBufferRow, depthOffset: number) {
  const colorImages = row.slice(0, depthOffset) as ImageBitmap[];
  const depthImages = (row.slice(depthOffset) as ZDepthFrame[]).map(
    (item) => item.data
  );
  return { colorImages, depthImages };
}

export type TetrisBufferRow = (ImageBitmap | ZDepthFrame)[];
export type TetrisBufferInstance = ReturnType<typeof createTetrisEngine<any>>;

export interface TetrisBuffer {
  instance: TetrisBufferInstance | null;
  status: "loading" | "active" | "error";
  error?: string;
  stats: {
    avgFps: Accessor<number>;
    bufferLengths: Accessor<number[]>;
  } | null;
}

export async function createTetrisBuffer(state: GlobalState) {
  const {
    setTetrisBuffer,
    depthProcessor,
    cameraDepthStreams,
    pointcloudTransformer,
    pushStartStalkerSessionTrigger,
  } = state;

  try {
    const totalCameraCount =
      state.config().colorCameraCount + state.config().depthCameraCount;

    const { avgFps, updateFps, startStalkerSession, emitEvent } = useFps({
      name: "tetris-buffer",
    });
    pushStartStalkerSessionTrigger(startStalkerSession);
    const [bufferLengths, setBufferLengths] = createSignal<number[]>(
      Array.from({ length: totalCameraCount }, () => 0)
    );

    const instance = createTetrisEngine<any>({
      maxBufferSize: state.config().maxBufferSize,
      maxIndexValueDelta: state.config().maxBufferDeltaNs,
      removeLowerIndexValuesOnCompleteRow: true,
      size: totalCameraCount,
      onCompleteRow: async (data) => {
        updateFps();

        const offset = cameraDepthStreams()?.offset;
        if (offset === undefined) {
          setTetrisBuffer({
            instance: null,
            status: "error",
            error: "Depth camera offset not found",
            stats: null,
          });
          return;
        }

        const row = data.map((item) => item.result.value) as TetrisBufferRow;
        const { colorImages, depthImages } = seperateColorAndDepth(row, offset);
        const depthProcessorInstance = depthProcessor()?.processor;
        const pointcloudTransformerInstance =
          pointcloudTransformer()?.transformer;
        if (depthProcessorInstance && pointcloudTransformerInstance) {
          depthProcessorInstance.processAll(depthImages);
          pointcloudTransformerInstance.processAll();
        }
      },
    });

    const intervalId = setInterval(() => {
      setBufferLengths(
        instance.getBuffers().map((buffer, i) => buffer.length())
      );

      const { skipped, completed } = instance.getState();
      emitEvent("buffer_status", {
        completed_sets_total: completed,
        skipped_items_total: skipped.total,
        ...skipped.buffers.reduce(
          (acc, buffer, i) => ({
            ...acc,
            [`skipped_items_buffer_${i}`]: buffer,
          }),
          {}
        ),
      });
    }, 1000);

    setTetrisBuffer({
      instance,
      status: "active",
      stats: {
        avgFps,
        bufferLengths,
      },
    });

    return () => {
      clearInterval(intervalId);
    };
  } catch (error) {
    setTetrisBuffer({
      instance: null,
      status: "error",
      error: error instanceof Error ? error.message : "Unknown error",
      stats: null,
    });
  }
}
