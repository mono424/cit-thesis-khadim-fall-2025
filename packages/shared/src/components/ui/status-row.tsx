import {
  Check,
  Loader,
  LucideIcon,
  X,
  Settings,
  ArrowDown,
  Bomb,
  Circle,
} from "lucide-solid";
import { Accessor, Component, JSX } from "solid-js";
import { cn } from "../../lib/utils";

export type Status = "success" | "error" | "loading" | "active" | "neutral";

interface StatusRowProps {
  icon: LucideIcon;
  title: string;
  status: Accessor<Status>;
  variant: "ghost" | "card";
  error?: Accessor<string | null>;
  fps?: Accessor<number>;
  customStat?: Accessor<string>;
  children?: JSX.Element;
}

export const StatusRow: Component<StatusRowProps> = ({
  icon: Icon,
  title,
  status,
  variant = "ghost",
  fps,
  customStat,
  error,
  children,
}: StatusRowProps) => {
  return (
    <div
      class={cn(
        "flex flex-col items-center text-gray-400 text-xs p-2 flex-grow cursor-default",
        variant === "card" && "bg-gray-800 rounded-md",
        variant === "ghost" && "border-gray-800 border rounded-md"
      )}
      title={error?.() ?? ""}
    >
      <div class="flex items-center gap-2 w-full">
        <Icon size={14} />
        <span class="flex-grow">{title}</span>
        {status() === "success" && <Check size={14} class="text-green-500" />}
        {status() === "error" && <X size={14} class="text-red-500" />}
        {status() === "loading" && (
          <Loader size={16} class="text-gray-500 animate-spin" />
        )}
        {status() === "active" && (
          <Settings size={14} class="text-blue-500 animate-spin" />
        )}
        {status() === "neutral" && <Circle size={14} class="text-gray-500" />}
      </div>
      {children}
      {status() === "error" && error?.() != "" && (
        <div class="text-red-500 text-xs mt-2 py-1 px-2 w-full border border-red-500/20 rounded-full flex flex-start gap-2 items-center overflow-hidden">
          <Bomb size={14} class="text-red-500 flex-shrink-0" />
          <span class="truncate">{error?.() ?? ""}</span>
        </div>
      )}
      {(fps || customStat) && (
        <div
          class={cn(
            "flex items-center gap-2 justify-center overflow-hidden transition-all duration-300",
            status() === "loading" ? "h-0 mt-0" : "h-7 mt-2"
          )}
        >
          {customStat && (
            <span class="text-white/50 text-xs border border-white/10 px-3 py-1 rounded-full flex items-center gap-1 font-mono">
              {customStat()}
            </span>
          )}
          {fps && (
            <span class="text-white/50 text-xs border border-white/10 px-3 py-1 rounded-full flex items-center gap-1 font-mono">
              {fps().toFixed(0)} <ArrowDown size={12} />
            </span>
          )}
        </div>
      )}
    </div>
  );
};
