import { GlobalState } from "~/lib/state";
import { useFps } from "shared";
import { createSignal } from "solid-js";

export interface WebRTCClient {
  dataChannelStatus?: "loading" | "active" | "error";
  pcStatus?: "loading" | "active" | "error";
  error?: string;
  peerConnection?: RTCPeerConnection;
  dataChannel?: RTCDataChannel;
  mediaStream?: MediaStream;
  stats?: {
    fps: () => number;
  };
  sendCameraMatrix?: (cameraMatrix: Float32Array) => void;
  sendCanvasSize?: (canvasSize: { width: number; height: number }) => void;
  startMetricRecording?: (
    seconds: number,
    callback: (csv: string) => void
  ) => void;
}

export async function createWebrtc(state: GlobalState) {
  const { setWebrtcClient, pushStartStalkerSessionTrigger } = state;
  const { avgFps, setFps, startStalkerSession } = useFps({
    name: "webrtc",
  });
  const [metricCallback, setMetricCallback] = createSignal<
    ((csv: string) => void) | null
  >(null);
  pushStartStalkerSessionTrigger(startStalkerSession);

  setWebrtcClient((prev) => ({
    ...prev,
    dataChannelStatus: "loading",
    pcStatus: "loading",
  }));

  const pc = new RTCPeerConnection();
  pc.addTransceiver("video", { direction: "recvonly" });

  let dataChannel: RTCDataChannel = pc.createDataChannel("camera", {
    ordered: false,
  });

  dataChannel.onclose = () => {
    setWebrtcClient((prev) => ({
      ...prev,
      dataChannelStatus: "error",
      error: "Data channel is closed",
    }));
  };
  dataChannel.onopen = () => {
    setWebrtcClient((prev) => ({
      ...prev,
      dataChannelStatus: "active",
    }));
  };

  dataChannel.onmessage = (event) => {
    console.log("Data channel message", event.data);
    const message = event.data;
    if (message.startsWith("METRICS:")) {
      const [_, componentName, ...csv] = message.split(":");
      const csvString = csv.join(":");
      metricCallback()?.(csvString);
      setMetricCallback(null);
    }
  };

  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);

  const connect = async () => {
    try {
      const response = await fetch("/_/offer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sdp: offer.sdp, type: offer.type }),
      });
      const answer = await response.json();
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
    } catch (error) {
      setWebrtcClient((prev) => ({
        ...prev,
        pcStatus: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      }));
    }
  };

  pc.ontrack = (event) => {
    setWebrtcClient((prev) => ({
      ...prev,
      mediaStream: event.streams[0] ?? null,
    }));
  };

  setInterval(() => {
    pc.getStats().then((stats) => {
      for (const stat of stats.values()) {
        if (stat.type !== "inbound-rtp") continue;
        const { framesPerSecond } = stat;
        if (framesPerSecond === undefined) continue;
        setFps(framesPerSecond);
      }
    });
  }, 100);

  pc.onconnectionstatechange = (event) => {
    console.log("Connection state changed to", pc.connectionState);
    if (pc.connectionState === "connected") {
      setWebrtcClient((prev) => ({
        ...prev,
        pcStatus: "active",
      }));
    } else if (pc.connectionState === "disconnected") {
      setWebrtcClient((prev) => ({
        ...prev,
        pcStatus: "error",
        error: "Peer connection failed",
      }));
    } else if (pc.connectionState === "failed") {
      setWebrtcClient((prev) => ({
        ...prev,
        pcStatus: "error",
        error: "Peer connection failed",
      }));
    }
  };

  let reconnectAttempts = 0;
  const maxReconnectAttempts = 30;
  let reconnectTimeout: NodeJS.Timeout | null = null;

  const reconnect = async () => {
    if (reconnectAttempts >= maxReconnectAttempts) {
      console.log("Max reconnect attempts reached");
      setWebrtcClient((prev) => ({
        ...prev,
        pcStatus: "error",
        error: "Max reconnect attempts reached",
      }));
      return;
    }

    reconnectAttempts++;
    console.log(
      `Reconnecting... Attempt ${reconnectAttempts}/${maxReconnectAttempts}`
    );

    setWebrtcClient((prev) => ({
      ...prev,
      dataChannelStatus: "loading",
      pcStatus: "loading",
      error: undefined,
    }));

    try {
      pc.close();
      await createWebrtc(state);
    } catch (error) {
      console.error("Reconnection failed:", error);
      reconnectTimeout = setTimeout(() => {
        reconnect();
      }, 5000);
    }
  };

  setInterval(() => {
    if (
      pc.connectionState === "failed" ||
      pc.connectionState === "disconnected"
    ) {
      if (reconnectTimeout === null) {
        reconnect();
      }
    } else if (pc.connectionState === "connected") {
      reconnectAttempts = 0;
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        reconnectTimeout = null;
      }
    }
  }, 3000);

  setWebrtcClient((prev) => ({
    ...prev,
    stats: {
      fps: avgFps,
    },
    peerConnection: pc,
    dataChannel,
    sendCameraMatrix: (cameraMatrix: Float32Array) => {
      if (dataChannel.readyState !== "open") {
        throw new Error("Data channel is not open");
      }
      dataChannel.send(cameraMatrix);
    },
    sendCanvasSize: (canvasSize: { width: number; height: number }) => {
      if (dataChannel.readyState !== "open") {
        throw new Error("Data channel is not open");
      }
      dataChannel.send(new Int32Array([canvasSize.width, canvasSize.height]));
    },
    startMetricRecording: (
      seconds: number,
      callback: (csv: string) => void
    ) => {
      setMetricCallback(() => callback);
      dataChannel.send(new Int32Array([seconds]));
    },
  }));

  connect();
}
