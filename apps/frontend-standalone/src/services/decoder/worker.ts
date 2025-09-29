import {
  createDecoderRaw,
  DecoderInitProps,
  DecoderInstance,
  DecoderWorkerMessage,
} from "./decoder";

let instance: DecoderInstance | null = null;

self.addEventListener("message", (e) => {
  const message = e.data as DecoderWorkerMessage;
  if (message.type === "data") {
    const lInstance = instance;
    if (!lInstance) {
      console.error("Decoder not initialized");
      return;
    }
    lInstance.onData(
      new Uint8Array(message.data, message.bufferOffset, message.dataSize)
    );
  } else {
    instance = createDecoderRaw({
      ...e.data,
      callback: (val) => {
        postMessage(val);
      },
      onError: (e) => {
        postMessage({
          type: "error",
          error: e.message,
          frame: null,
        });
      },
    } as DecoderInitProps);
  }
});
