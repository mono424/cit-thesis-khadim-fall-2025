import { LucideIcon } from 'lucide-solid';
import { Accessor, Component, JSX } from 'solid-js';
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
export declare const StatusRow: Component<StatusRowProps>;
export {};
