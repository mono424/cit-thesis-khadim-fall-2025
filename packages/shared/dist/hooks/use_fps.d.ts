import { createStalker } from '..';
export type StartStalkerSessionTrigger = ({ seconds, stalker, }: {
    seconds: number;
    stalker: ReturnType<typeof createStalker>;
}) => Promise<void>;
export declare const useFps: ({ name }: {
    name: string;
}) => {
    fps: import('solid-js').Accessor<number>;
    avgFps: import('solid-js').Accessor<number>;
    frameCount: import('solid-js').Accessor<number>;
    lastFrameTime: import('solid-js').Accessor<number>;
    lastFrameTimestamp: import('solid-js').Accessor<number>;
    updateFps: (timestamp?: number) => Promise<void>;
    setFps: (currentFps: number) => void;
    startStalkerSession: StartStalkerSessionTrigger;
    emitEvent: (event: string, data: Record<string, number>) => void;
};
