import { createEffect, createSignal, type Component } from "solid-js";
import { createZenohClient } from "./services/zenoh/client";
import { createGlobalState } from "./lib/state";
import StatusGraph from "./components/status-graph";
import { initPipeline, startPipeline } from "./pipeline";
import { createGridOptions } from "./services/renderer";
import { RecordButton } from "shared";
import { setAppName } from "shared";
import "shared/styles.css";
import { Layout } from "shared";

setAppName("standalone");

const maxBufferDeltaNs = 10 * 1000 * 1000; // 10ms
const maxBufferSize = 20;

const App: Component = () => {
  const [metricSeconds] = createSignal(60);
  const canvas = <canvas class="w-full h-full bg-black" />;
  const state = createGlobalState({
    colorCameraCount: 0,
    depthCameraCount: 4,
    maxBufferSize,
    maxBufferDeltaNs,
    canvas: canvas as HTMLCanvasElement,
    gridOptions: createGridOptions({}),
  });

  createEffect(() => {
    const initializeAndFetch = async () => {
      const zenohClient = await createZenohClient();
      state.setZenohClient(zenohClient);
      await initPipeline(state);
      await startPipeline(state);
    };
    initializeAndFetch();
  }, [state]);

  return (
    <Layout
      title="ARTEKMed Standalone"
      action={
        <RecordButton
          startStalkerSessionTriggers={state.startStalkerSessionTriggers}
          seconds={metricSeconds}
        />
      }
      sidebar={<StatusGraph state={state} />}
    >
      {canvas}
    </Layout>
  );
};

export default App;
