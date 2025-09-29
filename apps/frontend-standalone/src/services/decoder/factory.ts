import { ScrcpyVideoCodecId } from "@yume-chan/scrcpy";
import {
  DecoderDataMessage,
  DecoderFrameResult,
  DecoderInitMessage,
  DecoderResultMessageData,
  OnFrameHandler,
} from "./decoder";
import { SharedArrayBufferWorkerProps } from "./shared_array_buffer";

type ControlledPromise<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: any) => void;
};

function createControlledPromise<T>(): ControlledPromise<T> {
  let resolve: (value: T) => void;
  let reject: (reason?: any) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve: resolve!, reject: reject! };
}

export const createDecoderWorker = (
  onFrame: OnFrameHandler,
  {
    skipFrames = false,
    sharedBuffer,
  }: { skipFrames?: boolean; sharedBuffer: SharedArrayBufferWorkerProps }
) => {
  const worker = new Worker(new URL("./worker.ts", import.meta.url), {
    type: "module",
  });

  worker.postMessage({
    type: "init",
    codec: ScrcpyVideoCodecId.H264,
    skipFrames,
  } as DecoderInitMessage);

  worker.addEventListener("message", (e) => {
    const { type, frame, error } = e.data as DecoderResultMessageData;
    if (type === "error") {
      onFrame({ error });
    } else if (type === "frame") {
      onFrame(frame);
    } else if (type === "empty-frame") {
      onFrame(null);
    }
  });

  return {
    onData: (data: Uint8Array) => {
      sharedBuffer.bufferView.set(data, 0);
      worker.postMessage({
        type: "data",
        data: sharedBuffer.global.buffer,
        bufferOffset: sharedBuffer.bufferOffset,
        dataSize: data.length,
      } as DecoderDataMessage);
    },
  };
};

export function createPromisedDecoderWorker(
  skipFrames: boolean = false,
  sharedBuffer: SharedArrayBufferWorkerProps,
  {
    onFrameHook,
    onError,
  }: {
    onFrameHook?: () => void;
    onError?: (error: Error) => void;
  } = {}
) {
  const promiseQueue: ControlledPromise<DecoderFrameResult>[] = [];

  const onFrame = async (frame: DecoderFrameResult) => {
    promiseQueue.shift()?.resolve(frame);
  };

  const decoder = createDecoderWorker(onFrame, { skipFrames, sharedBuffer });

  return async (data: Uint8Array) => {
    const promise = createControlledPromise<DecoderFrameResult>();
    promiseQueue.push(promise);
    decoder.onData(data);
    const result = await promise.promise;
    if (!result) {
      return null;
    }

    if ("error" in result) {
      onError?.(new Error(result.error));
      return null;
    }

    onFrameHook?.();
    return result;
  };
}
