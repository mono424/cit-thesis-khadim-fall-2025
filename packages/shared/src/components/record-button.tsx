import { createStalker } from "..";
import { Component, createSignal } from "solid-js";
import { DownloadMetricsButton } from "./download-metrics-button";
import { StartStalkerSessionTrigger } from "..";

export const RecordButton: Component<{
  seconds: () => number;
  startStalkerSessionTriggers: () => StartStalkerSessionTrigger[];
  serverCsv?: () => string;
  onStartMetricRecording?: () => void;
}> = ({
  startStalkerSessionTriggers,
  serverCsv,
  onStartMetricRecording,
  seconds,
}) => {
  const [isRunning, setIsRunning] = createSignal(false);
  const [clientCsv, setClientCsv] = createSignal("");

  const start = async () => {
    setIsRunning(true);
    setClientCsv("");
    const stalker = await createStalker((csv) => {
      setClientCsv((prev) => (prev ? `${prev}\n${csv}` : csv));
    });
    onStartMetricRecording?.();
    await Promise.all(
      startStalkerSessionTriggers().map((t) =>
        t({ seconds: seconds(), stalker })
      )
    );
    setIsRunning(false);
  };

  const csv = () => {
    const client = clientCsv();
    const server = serverCsv?.();
    if (!server) {
      return client;
    }
    return `-- Client Metrics --\n${client}\n\n-- Server Metrics --\n${server}`;
  };

  return (
    <div class="flex gap-2">
      <button
        disabled={isRunning()}
        onClick={start}
        class="border border-[#292B34] rounded-md px-2 py-1 hover:bg-gray-800 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isRunning() ? "Recording..." : "Record Metrics"}
      </button>
      <DownloadMetricsButton
        disabled={() => isRunning() || !clientCsv()}
        getMetricsCsv={csv}
      />
    </div>
  );
};
