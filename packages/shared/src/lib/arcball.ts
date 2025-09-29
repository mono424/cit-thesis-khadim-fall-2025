import { createSignal } from "solid-js";
import { Mat4, mat4, Vec3, vec3, Vec4, vec4 } from "wgpu-matrix";

interface CameraContext {
  eye: Vec3;
  lookAt: Vec3;
  up: Vec3;
  fov: number;
  aspect: number;
  near: number;
  far: number;
}

export function createCamera() {
  const [context, setContenxtInt] = createSignal<CameraContext>({
    eye: vec3.fromValues(5, 3, -5),
    lookAt: vec3.fromValues(0, 0, 0),
    up: vec3.fromValues(0, 0, -1),
    fov: Math.PI / 3,
    aspect: 1.0,
    near: 0.1,
    far: 50.0,
  });

  const [viewMatrix, setViewMatrix] = createSignal<Mat4>(mat4.create());
  const [projectionMatrix, setProjectionMatrix] = createSignal<Mat4>(
    mat4.create()
  );
  const [viewProjectionMatrix, setViewProjectionMatrix] = createSignal<Mat4>(
    mat4.create()
  );
  const [viewDirection, setViewDirection] = createSignal<Vec4>(vec4.create());
  const [rightVector, setRightVector] = createSignal<Vec4>(vec4.create());
  const [distance, setDistance] = createSignal<number>(0);

  const updateProjectionMatrix = () => {
    const { fov, aspect, near, far } = context();
    const projMatrix = mat4.perspective(fov, aspect, near, far);
    setProjectionMatrix(projMatrix);
  };

  const updateViewMatrix = () => {
    const { eye, lookAt, up } = context();
    const viewMatrix = mat4.lookAt(eye, lookAt, up);
    setViewMatrix(viewMatrix);

    const transposed = mat4.transpose(viewMatrix);
    setViewDirection(
      vec4.fromValues(transposed[8], transposed[9], transposed[10], 1)
    );
    setRightVector(
      vec4.fromValues(transposed[0], transposed[1], transposed[2], 1)
    );
  };

  const updateViewProjectionMatrix = () => {
    const viewProjMatrix = mat4.multiply(projectionMatrix(), viewMatrix());
    setViewProjectionMatrix(viewProjMatrix);
  };

  const setContext = (patch: Partial<CameraContext>) => {
    if (
      Object.keys(patch).every(
        (key) =>
          patch[key as keyof CameraContext] ===
          context()[key as keyof CameraContext]
      )
    ) {
      return;
    }
    setContenxtInt({
      ...context(),
      ...patch,
    });
    updateViewMatrix();
    updateProjectionMatrix();
    updateViewProjectionMatrix();
  };

  const rotateAroundPivotPoint = (xAngle: number, yAngle: number) => {
    const { eye, lookAt, up } = context();
    const position = vec4.fromValues(eye[0], eye[1], eye[2], 1);
    const pivot = vec4.fromValues(lookAt[0], lookAt[1], lookAt[2], 1);

    // Rotate around X Axis (horizontal mouse movement)
    const rotationMatrixX = mat4.rotate(mat4.identity(), up, xAngle);
    mat4.mul(rotationMatrixX, vec4.sub(position, pivot), position);
    vec4.add(position, pivot, position);

    // Rotate around Y Axis (vertical mouse movement)
    const rotationMatrixY = mat4.rotate(mat4.identity(), rightVector(), yAngle);
    mat4.mul(rotationMatrixY, vec4.sub(position, pivot), position);
    vec4.add(position, pivot, position);

    // Update Eye
    setContenxtInt({
      ...context(),
      eye: vec3.fromValues(position[0], position[1], position[2]),
    });

    updateViewMatrix();
    updateViewProjectionMatrix();
  };

  const updateDistance = () => {
    const { lookAt, eye } = context();
    setDistance(vec3.distance(lookAt, eye));
  };

  const setLookAtDistance = (newDistance: number) => {
    if (newDistance < 0.5) {
      // Minimum distance to prevent going inside point cloud
      return;
    }

    const { lookAt } = context();
    const newEye = vec3.add(
      lookAt,
      vec3.scale(vec3.normalize(viewDirection()), newDistance)
    );
    setContenxtInt({
      ...context(),
      eye: newEye,
    });

    updateDistance();
    updateViewMatrix();
    updateViewProjectionMatrix();
  };

  const panCamera = (deltaX: number, deltaY: number) => {
    const { eye, lookAt, up } = context();

    // Calculate right vector (cross product of view direction and up)
    const viewDir = vec3.normalize(vec3.subtract(lookAt, eye));
    const rightVector = vec3.normalize(vec3.cross(viewDir, up));
    const upVector = vec3.normalize(vec3.cross(rightVector, viewDir));

    // Calculate pan offset based on camera distance for consistent speed
    const distance = vec3.distance(eye, lookAt);
    const panSpeed = distance * 0.001; // Adjust this multiplier as needed

    // Calculate the pan offset in world space
    const rightOffset = vec3.scale(rightVector, deltaX * panSpeed);
    const upOffset = vec3.scale(upVector, -deltaY * panSpeed); // Invert Y for intuitive movement
    const totalOffset = vec3.add(rightOffset, upOffset);

    // Move both eye and lookAt by the same offset to maintain view direction
    const newEye = vec3.add(eye, totalOffset);
    const newLookAt = vec3.add(lookAt, totalOffset);

    setContenxtInt({
      ...context(),
      eye: newEye,
      lookAt: newLookAt,
    });

    updateViewMatrix();
    updateViewProjectionMatrix();
  };

  // Initialize matrices
  updateDistance();
  updateViewMatrix();
  updateProjectionMatrix();
  updateViewProjectionMatrix();

  return {
    setContext,
    viewMatrix,
    projectionMatrix,
    viewProjectionMatrix,
    rotateAroundPivotPoint,
    setLookAtDistance,
    distance,
    panCamera,
  };
}

export type Camera = ReturnType<typeof createCamera>;
