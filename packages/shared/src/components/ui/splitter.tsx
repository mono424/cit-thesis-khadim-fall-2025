import { Component, JSX } from "solid-js";

export const Splitter: Component<{ children: JSX.Element }> = ({
  children,
}) => {
  return <div class="flex justify-evenly w-full gap-2">{children}</div>;
};
