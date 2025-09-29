import { createSignal } from "solid-js";
import { createStalker, generateSessionName, StalkerSession } from "..";

export type StartStalkerSessionTrigger = ({
  seconds,
  stalker,
}: {
  seconds: number;
  stalker: ReturnType<typeof createStalker>;
}) => Promise<void>;

export const useFps = ({ name }: { name: string }) => {
  const [history, setHistory] = createSignal<number[]>([]);
  const [fps, setFps] = createSignal(0);
  const [avgFps, setAvgFps] = createSignal(0);
  const [frameCount, setFrameCount] = createSignal(0);
  const [lastFrameTime, setLastFrameTime] = createSignal(0);
  const [lastFrameTimestamp, setLastFrameTimestamp] = createSignal(0);
  const [pendingFrames, setPendingFrames] = createSignal(0);

  const [stalkerSession, setStalkerSession] =
    createSignal<StalkerSession | null>(null);

  const startStalkerSession: StartStalkerSessionTrigger = async ({
    stalker,
    seconds,
  }: {
    stalker: ReturnType<typeof createStalker>;
    seconds: number;
  }) => {
    if (stalkerSession()) {
      throw new Error("Stalker session already started");
    }

    const session = stalker.startSession(generateSessionName(name));
    setStalkerSession(session);

    return new Promise((resolve) =>
      setTimeout(() => {
        setStalkerSession(null);
        session.endSession();
        resolve();
      }, seconds * 1000)
    );
  };

  const _setFps = (currentFps: number) => {
    setHistory((prev) => [...prev, currentFps].slice(-100));
    setFps(currentFps);
    setAvgFps(history().reduce((a, b) => a + b, 0) / history().length);

    const sSession = stalkerSession();
    if (sSession) {
      sSession.addEvent("fps", { fps: currentFps });
    }
  };

  let locked: Promise<void> = new Promise((resolve) => resolve());
  const updateFps = async (timestamp: number = performance.now()) => {
    await locked;
    locked = new Promise<void>((resolve) => {
      const now = performance.now();
      const delta = now - lastFrameTime();

      if (delta < 50) {
        setPendingFrames((prev) => prev + 1);
        resolve();
        return;
      }

      const totalFrames = 1 + pendingFrames();
      setPendingFrames(0);
      setFrameCount((prev) => prev + totalFrames);

      const currentFps = (1000 / delta) * totalFrames;
      _setFps(currentFps);
      setLastFrameTime(now);
      setLastFrameTimestamp(timestamp);

      resolve();
    });
  };

  const emitEvent = (event: string, data: Record<string, number>) => {
    const sSession = stalkerSession();
    if (sSession) {
      sSession.addEvent(event, data);
    }
  };

  return {
    fps,
    avgFps,
    frameCount,
    lastFrameTime,
    lastFrameTimestamp,
    updateFps,
    setFps: _setFps,
    startStalkerSession,
    emitEvent,
  };
};
