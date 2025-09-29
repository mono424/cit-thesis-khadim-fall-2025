import { Download, Loader } from "lucide-solid";
import { Component, createSignal } from "solid-js";

export const DownloadMetricsButton: Component<{
  getMetricsCsv: () => string;
  disabled: () => boolean;
}> = ({ getMetricsCsv, disabled }) => {
  const [isDownloading, setIsDownloading] = createSignal(false);

  const downloadCsv = () => {
    setIsDownloading(true);

    try {
      const csvData = getMetricsCsv();

      if (!csvData) {
        console.warn("No metrics data available to download");
        return;
      }

      const blob = new Blob([csvData], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);

      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `metrics_${new Date().toISOString().replace(/[:.]/g, "-")}.csv`
      );
      link.style.visibility = "hidden";

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading metrics:", error);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <button
      disabled={isDownloading() || disabled()}
      onClick={downloadCsv}
      class="border border-[#292B34] rounded-md px-2 py-1 hover:bg-gray-800 cursor-pointer flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isDownloading() ? (
        <Loader size={16} class="animate-spin" />
      ) : (
        <Download size={16} />
      )}
    </button>
  );
};
