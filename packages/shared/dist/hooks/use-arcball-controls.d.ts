import { Camera } from '..';
export interface ArcballControls {
    init: (element: HTMLCanvasElement | HTMLVideoElement) => void;
    resetView: () => void;
    zoomToFit: () => void;
}
export declare function useArcballControls(camera: Camera): ArcballControls;
