import { ScrcpyVideoCodecId } from "@yume-chan/scrcpy";
import { WebCodecsVideoDecoder } from "@yume-chan/scrcpy-decoder-webcodecs";
import { parseNALUnitType, splitNALUnits } from "./utils";

export type DecoderFrameResult = ImageBitmap | { error: string } | null;

export type OnFrameHandler = (frame: DecoderFrameResult) => void;

export type Size = { width: number; height: number };

export type ErrorData = {
  type: "error";
  error: string;
  frame: null;
};

export type DecoderResultMessageData = FrameData | EmptyFrameData | ErrorData;

export type FrameData = {
  type: "frame";
  frame: ImageBitmap;
  error: null;
};

export type EmptyFrameData = {
  type: "empty-frame";
  frame: null;
  error: null;
};

export type DecoderInstance = {
  onData: (data: Uint8Array) => void;
};

export type DecoderCallbackValue = {
  type: "frame" | "empty-frame";
  frame: ImageBitmap | null;
};

export interface DecoderInitProps {
  codec: ScrcpyVideoCodecId;
  skipFrames?: boolean;
  callback: (value: DecoderCallbackValue) => void;
  onError?: (error: Error) => void;
}

export type DecoderWorkerMessage = DecoderInitMessage | DecoderDataMessage;

export type DecoderInitMessage = DecoderInitProps & {
  type: "init";
};

export type DecoderDataMessage = {
  type: "data";
  data: SharedArrayBuffer;
  bufferOffset: number;
  dataSize: number;
};

export class CustomRenderer {
  size: Size;
  callback: (frame: ImageBitmap, size: Size) => void;
  constructor(callback: (frame: ImageBitmap, size: Size) => void) {
    this.callback = callback;
    this.size = { width: 1280, height: 720 };
  }

  async draw(frame: VideoFrame): Promise<void> {
    const bitmap = await createImageBitmap(frame);
    this.callback(bitmap, this.size);
  }

  setSize(width: number, height: number): void {
    this.size = { width, height };
  }
}

export const createDecoder = (
  onFrame: OnFrameHandler,
  {
    skipFrames = false,
    onError,
  }: { skipFrames?: boolean; onError?: (error: Error) => void } = {}
) => {
  return createDecoderRaw({
    codec: ScrcpyVideoCodecId.H264,
    skipFrames,
    callback: (value) => {
      onFrame(value.frame);
    },
    onError,
  });
};

export const createDecoderRaw = ({
  codec,
  skipFrames,
  callback,
  onError,
}: DecoderInitProps): DecoderInstance => {
  const renderer = new CustomRenderer((frame) =>
    callback({
      type: "frame",
      frame,
    })
  );
  const decoder = new WebCodecsVideoDecoder({ codec, renderer });
  let decoderWriter = decoder.writable.getWriter();
  let configured = false;
  let sps: Uint8Array<ArrayBuffer> | null = null;
  let pps: Uint8Array<ArrayBuffer> | null = null;
  let emittedSkippedFrames = 0;

  const emitSkippedFrames = () => {
    const skippedFrames = decoder.framesSkipped - emittedSkippedFrames;
    if (skippedFrames > 0) {
      console.log("Emitting skipped frames", skippedFrames);
      emittedSkippedFrames = decoder.framesSkipped;
      for (let i = 0; i < skippedFrames; i++) {
        callback({
          type: "empty-frame",
          frame: null,
        });
      }
    }
  };

  const errorHandler =
    onError ??
    ((e: Error) => {
      console.error("Error writing configuration", e);
    });

  const onSingleNALData = (data: Uint8Array) => {
    const [nalType] = parseNALUnitType(data);

    if (!configured) {
      if (nalType === 7) {
        sps = new Uint8Array(data);
      } else if (nalType === 8) {
        pps = new Uint8Array(data);
      }

      if (sps && pps) {
        console.log(`Got SPS, PPS, configuring decoder...`);
        // sps = Uint8Array.from(
        //   atob("AAAAAWdkADKsKyAEABg2AiAAAH0AAB1MEIA="),
        //   (c) => c.charCodeAt(0)
        // );
        // pps = Uint8Array.from(atob("AAAAAWjrjyw="), (c) => c.charCodeAt(0));
        decoderWriter
          .write({
            type: "configuration",
            data: Uint8Array.from([...sps, ...pps]),
          })
          .catch(errorHandler);
        console.log("SPS: ", btoa(String.fromCharCode(...sps)));
        console.log("PPS: ", btoa(String.fromCharCode(...pps)));
        configured = true;
      }
      callback({
        type: "empty-frame",
        frame: null,
      });
      return;
    }

    if (nalType === 7 || nalType === 8) {
      return;
    }

    if (skipFrames) {
      emitSkippedFrames();
      decoderWriter
        .write({
          type: "data",
          keyframe: nalType === 5,
          data,
        })
        .catch(errorHandler);
    } else {
      decoderWriter
        .write({
          type: "data",
          keyframe: nalType === 5,
          data,
        })
        .catch(errorHandler);
    }
  };

  const onData = (data: Uint8Array) => {
    const nalUnits = splitNALUnits(data);
    for (const nal of nalUnits) {
      onSingleNALData(nal);
    }
  };

  return {
    onData,
  };
};
