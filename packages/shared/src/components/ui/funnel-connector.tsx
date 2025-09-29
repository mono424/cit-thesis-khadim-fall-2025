import { Component } from "solid-js";
import { cn } from "../../lib/utils";

interface FunnelConnectorProps {
  variant: "1-to-2" | "2-to-1" | "1-to-1";
}

export const FunnelConnector: Component<FunnelConnectorProps> = ({
  variant = "1-to-2",
}: FunnelConnectorProps) => {
  if (variant === "1-to-1") {
    return (
      <div class="flex flex-col items-center my-2">
        <div class="w-2 h-2 border-2 border-gray-600 rounded-full z-10"></div>
      </div>
    );
  }

  return (
    <div
      class={cn(
        "flex flex-col items-center my-2",
        variant === "2-to-1" && "flex-col-reverse"
      )}
    >
      <div class="w-2 h-2 border-2 border-gray-600 rounded-full z-10"></div>
      <div class="w-[2px] h-4 my-[-2px] bg-gray-800 rounded-full"></div>
      <div class="flex justify-center w-full">
        <div class="w-1/2 h-[2px] mx-[-2px] bg-gray-800"></div>
      </div>
      <div class="flex justify-center items-center w-full px-1 mt-[-1px]">
        <div class="w-[2px] h-4 bg-gray-800 rounded-full"></div>
        <div class="w-1/2"></div>
        <div class="w-[2px] h-4 bg-gray-800 rounded-full"></div>
      </div>
      <div class="flex justify-center items-center w-full px-[10px] mt-[-2px]">
        <div class="w-2 h-2 border-2 border-gray-600 rounded-full z-10"></div>
        <div class="w-1/2"></div>
        <div class="w-2 h-2 border-2 border-gray-600 rounded-full z-10"></div>
      </div>
    </div>
  );
};
