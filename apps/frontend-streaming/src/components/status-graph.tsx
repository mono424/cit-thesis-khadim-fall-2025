import { type Component } from "solid-js";
import WebrtcClientStatus from "./status/webrtc-client-status";
import { DollyCamCard, Pipeline } from "shared";
import { GlobalState } from "../lib/state";
import CreateCameraStatus from "./status/create-camera";

const App: Component<{ state: GlobalState }> = ({ state }) => {
  return (
    <>
      <Pipeline>
        <WebrtcClientStatus webrtcClient={state.webrtcClient} />
        <CreateCameraStatus renderCamera={state.renderCamera} />
      </Pipeline>
      <DollyCamCard camera={() => state?.renderCamera()?.camera ?? null} />
      <div class="py-2 italic text-xs text-center text-gray-600/50">
        Bachelor Thesis - Khadim Fall
      </div>
    </>
  );
};

export default App;
