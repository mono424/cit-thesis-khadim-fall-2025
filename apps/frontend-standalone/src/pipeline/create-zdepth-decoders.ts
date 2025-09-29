import { GlobalState } from "~/lib/state";
import { ZdepthApi } from "@mono424/zdepth-wasm";
import { Accessor } from "solid-js";
import { useFps } from "shared";

export type ZDepthFrame = ReturnType<ZdepthApi["decompress"]>;
export type ZDepthDecoder = (data: Uint8Array) => ZDepthFrame | null;

export interface ZDepthDecoders {
  decoders: ZDepthDecoder[];
  stats: {
    avgFps: Accessor<number>;
    count: Accessor<number>;
  };
}

const api = new ZdepthApi();

export async function createZDepthDecoders(state: GlobalState) {
  const { setZDepthDecoders, pushStartStalkerSessionTrigger } = state;

  const { avgFps, updateFps, startStalkerSession } = useFps({
    name: "zdepth-decoders",
  });
  pushStartStalkerSessionTrigger(startStalkerSession);
  const decoders: ZDepthDecoder[] = [];
  await api.init();

  for (let i = 0; i < state.config().depthCameraCount; i++) {
    const decoder: ZDepthDecoder = (
      compressedData: Uint8Array
    ): ZDepthFrame | null => {
      const result = api.decompress(compressedData);
      // console.log({
      //   compressedData: compressedData.length,
      //   result: result.data.length,
      // });
      if (result.data.length === 0) {
        return null;
      }
      updateFps();
      return result;
    };
    decoders.push(decoder);
  }

  setZDepthDecoders({
    decoders,
    stats: {
      avgFps,
      count: () => decoders.length,
    },
  });
}
