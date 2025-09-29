import { Vec3 } from 'wgpu-matrix';
interface CameraContext {
    eye: Vec3;
    lookAt: Vec3;
    up: Vec3;
    fov: number;
    aspect: number;
    near: number;
    far: number;
}
export declare function createCamera(): {
    setContext: (patch: Partial<CameraContext>) => void;
    viewMatrix: import('solid-js').Accessor<Float32Array<ArrayBufferLike>>;
    projectionMatrix: import('solid-js').Accessor<Float32Array<ArrayBufferLike>>;
    viewProjectionMatrix: import('solid-js').Accessor<Float32Array<ArrayBufferLike>>;
    rotateAroundPivotPoint: (xAngle: number, yAngle: number) => void;
    setLookAtDistance: (newDistance: number) => void;
    distance: import('solid-js').Accessor<number>;
    panCamera: (deltaX: number, deltaY: number) => void;
};
export type Camera = ReturnType<typeof createCamera>;
export {};
