import { TableRowsSplit } from "lucide-solid";
import { Component, createEffect, createSignal } from "solid-js";
import { StatusRow, Status } from "shared";
import { GlobalState } from "~/lib/state";
import { cn } from "~/lib/utils";

const TetrisBufferStatus: Component<{
  tetrisBuffer: GlobalState["tetrisBuffer"];
  config: GlobalState["config"];
}> = ({ tetrisBuffer, config }) => {
  const [status, setStatus] = createSignal<Status>("loading");
  const [error, setError] = createSignal<string | null>(null);

  createEffect(() => {
    const buffer = tetrisBuffer();
    if (buffer) {
      setStatus(buffer.status);
      setError(buffer.error ?? null);
    } else {
      setStatus("loading");
      setError(null);
    }
  }, [tetrisBuffer]);

  return (
    <StatusRow
      variant="ghost"
      icon={TableRowsSplit}
      title="Tetris Buffer"
      status={status}
      error={error}
      fps={() => tetrisBuffer()?.stats?.avgFps() ?? 0}
    >
      <div class="flex gap-2 text-white text-xs font-mono font-bold py-4 h-32">
        {tetrisBuffer()
          ?.stats?.bufferLengths()
          .map((l, i) => (
            <div class="p-1 flex flex-col gap-1.5 items-center w-7">
              {i < config().colorCameraCount ? "C" : "D"}
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  class={cn(
                    "w-1.5 h-1.5 flex-shrink-0",
                    l > i ? "bg-yellow-200" : "bg-white/10"
                  )}
                />
              ))}
              {l > 5 && <div class="text-white/30 text-xs">+{l - 5}</div>}
            </div>
          ))}
      </div>
    </StatusRow>
  );
};

export default TetrisBufferStatus;
