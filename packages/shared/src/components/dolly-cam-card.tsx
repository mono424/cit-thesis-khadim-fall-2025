import { Box, CircleDotDashed, Play, Square } from "lucide-solid";
import { Accessor, Component, createSignal, onCleanup } from "solid-js";
import { StatusRow, Status } from ".";
import { Camera, cn } from "..";

export const DollyCamCard: Component<{
  camera: Accessor<Camera | null>;
}> = ({ camera }) => {
  const [status, setStatus] = createSignal<Status>("neutral");
  const [isAnimating, setIsAnimating] = createSignal(false);
  const [currentStep, setCurrentStep] = createSignal(0);

  let timeoutId: number | null = null;
  let cameraRef: Camera | null = null;
  const totalSteps = 10;
  const stepDelay = 1000;
  const rotationPerStep = (Math.PI * 2) / totalSteps;

  const performStep = (step: number) => {
    if (!isAnimating() || step >= totalSteps) {
      // Animation complete
      setIsAnimating(false);
      setStatus("neutral");
      setCurrentStep(0);
      return;
    }
    if (!cameraRef) cameraRef = camera();
    if (!cameraRef) return;
    cameraRef.rotateAroundPivotPoint(rotationPerStep, 0);
    setCurrentStep(step + 1);
    timeoutId = window.setTimeout(() => performStep(step + 1), stepDelay);
  };

  const startStepAnimation = () => {
    if (isAnimating()) return;
    cameraRef = camera();
    if (!cameraRef) return;

    setIsAnimating(true);
    setStatus("active");
    setCurrentStep(0);
    performStep(0);
  };

  const stopStepAnimation = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    setIsAnimating(false);
    setStatus("neutral");
    setCurrentStep(0);
    cameraRef = null;
  };

  onCleanup(() => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  });

  return (
    <StatusRow variant="card" icon={Box} title="Dolly Cam Test" status={status}>
      <div class="flex flex-col gap-4 items-center justify-center py-6">
        <div class="flex gap-2 bg-black/10 rounded-full p-4">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              class={cn(
                "w-3 h-3 rounded-full border",
                i < currentStep()
                  ? "bg-blue-200 border-blue-200" // Filled dot for completed steps
                  : "bg-transparent border-gray-400" // Empty dot for pending steps
              )}
            />
          ))}
        </div>
        <div class="flex gap-2">
          <button
            disabled={isAnimating()}
            onClick={startStepAnimation}
            class={cn(
              "text-white px-4 py-2 rounded-md disabled:bg-black/10 disabled:cursor-not-allowed flex items-center gap-2",
              isAnimating() ? "bg-black/10" : "bg-blue-600 hover:bg-blue-700"
            )}
          >
            <Play size={16} />
            Start Rotation
          </button>
          <button
            disabled={!isAnimating()}
            onClick={stopStepAnimation}
            class="bg-transparent hover:text-red-600 text-red-500 p-2 rounded-full disabled:text-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Square size={14} />
          </button>
        </div>
      </div>
    </StatusRow>
  );
};
