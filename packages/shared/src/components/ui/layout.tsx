import { ChevronDown, ChevronUp } from "lucide-solid";
import { cn } from "../..";
import { createEffect, createSignal, JSX } from "solid-js";

export const Layout = ({
  title,
  action,
  sidebar,
  children,
}: {
  title: string;
  action: JSX.Element;
  sidebar: JSX.Element;
  children: JSX.Element;
}) => {
  const [menuToggled, setMenuToggled] = createSignal(false);
  return (
    <div class="h-screen w-screen grid grid-cols-8 md:grid-rows-[auto_1fr] grid-rows-[auto_1fr] bg-[#030712] p-2 gap-2">
      <div
        class={cn(
          "bg-[#10141E] border-[#292B34] border md:col-span-2 col-span-8 rounded-xl min-h-0 overflow-hidden",
          menuToggled() ? "h-auto" : "h-14 md:!h-auto"
        )}
      >
        <div class="flex items-center justify-between text-white text-sm text-left py-3 px-4 border-b border-[#292B34]">
          <h1>{title}</h1>
          <div class="flex gap-1">
            {action}
            <button
              onClick={() => setMenuToggled(!menuToggled())}
              class="border border-[#292B34] rounded-md px-2 py-1 hover:bg-gray-800 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed md:hidden"
            >
              {menuToggled() ? (
                <ChevronUp size={14} />
              ) : (
                <ChevronDown size={14} />
              )}
            </button>
          </div>
        </div>
        <div
          class={cn(
            "transition-all duration-300",
            menuToggled()
              ? "overflow-y-auto h-[calc(100vh-3rem)] p-2"
              : "h-0 p-0 overflow-hidden md:!overflow-y-auto md:!h-[calc(100vh-3rem)] md:!p-2"
          )}
        >
          {sidebar}
        </div>
      </div>
      <div class="md:col-span-6 col-span-8 min-h-0 overflow-hidden h-full">
        <div class="border-[#292B34] border h-full w-full rounded-md overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
};
