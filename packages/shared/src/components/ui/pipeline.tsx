import { Component, JSX } from "solid-js";

export const Pipeline: Component<{ children: JSX.Element }> = ({
  children,
}) => {
  return (
    <div class="flex flex-col justify-start flex-grow w-full gap-2">
      <div class="flex flex-col justify-start w-full gap-2">{children}</div>
      <div class="flex justify-center w-full flex-grow"></div>
    </div>
  );
};
