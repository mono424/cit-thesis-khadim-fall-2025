import { MapSchema } from "@mono424/cdr-ts";
import {
  CameraModel,
  CameraSensor,
} from "../../zenoh/schemas/device_context_reply";
import {
  RigidTransformSchema,
  Vector3Schema,
  QuaternionSchema,
} from "../../zenoh/schemas/shared";

// Types derived from CDR schemas
export type Vector3 = MapSchema<Vector3Schema>;
export type Quaternion = MapSchema<QuaternionSchema>;
export type RigidTransform = MapSchema<RigidTransformSchema>;

// Transform parameters structure matching WGSL TransformParams
export interface TransformParams {
  rotation: [number, number, number, number]; // quaternion (x, y, z, w)
  translation: [number, number, number]; // vec3
  padding?: number; // alignment padding
}

/**
 * Derive transform parameters from camera extrinsics (camera_pose)
 * Camera extrinsics represent the transformation from world space to camera space.
 * For pointcloud transformation, we need the inverse: camera space to world space.
 */
export function deriveTransformFromExtrinsics(
  cameraPose: RigidTransform
): TransformParams {
  // Camera pose gives us world-to-camera transform
  // For pointcloud transformation, we need camera-to-world transform (inverse)

  // The rotation quaternion in camera_pose transforms from world to camera
  // We need the inverse rotation (conjugate) for camera to world
  const rotation: [number, number, number, number] = [
    cameraPose.rotation.x,
    cameraPose.rotation.y,
    cameraPose.rotation.z,
    cameraPose.rotation.w,
  ];

  // The translation in camera_pose is the camera position in world coordinates
  // This is exactly what we need for the shader's translation parameter
  let translation: [number, number, number] = [
    cameraPose.translation.x,
    cameraPose.translation.y,
    cameraPose.translation.z,
  ];

  return {
    rotation,
    translation,
    padding: 0.0,
  };
}

/**
 * Create identity transform (no transformation)
 */
export function createIdentityTransform(
  manualOffset?: [number, number, number]
): TransformParams {
  return {
    rotation: [0, 0, 0, 1], // identity quaternion
    translation: manualOffset || [0, 0, 0],
    padding: 0.0,
  };
}

/**
 * Extract camera models from camera sensors
 */
export function extractCameraModels(
  cameraSensors: CameraSensor[]
): CameraModel[] {
  return cameraSensors.map((sensor) => sensor.depth_parameters);
}

/**
 * Validate transform parameters
 */
export function validateTransformParams(params: TransformParams): boolean {
  // Check quaternion magnitude (should be close to 1 for valid rotation)
  const [x, y, z, w] = params.rotation;
  const magnitude = Math.sqrt(x * x + y * y + z * z + w * w);

  // Allow some tolerance for floating point precision
  return magnitude > 0.001 && Math.abs(magnitude - 1.0) < 0.1;
}

/**
 * Normalize quaternion to ensure valid rotation
 */
export function normalizeQuaternion(
  quaternion: [number, number, number, number]
): [number, number, number, number] {
  const [x, y, z, w] = quaternion;
  const magnitude = Math.sqrt(x * x + y * y + z * z + w * w);

  if (magnitude < 0.0001) {
    // Return identity quaternion if invalid
    return [0, 0, 0, 1];
  }

  return [x / magnitude, y / magnitude, z / magnitude, w / magnitude];
}

/**
 * Create transform parameters with normalized quaternion
 */
export function createNormalizedTransformParams(
  rotation: [number, number, number, number],
  translation: [number, number, number],
  padding?: number
): TransformParams {
  return {
    rotation: normalizeQuaternion(rotation),
    translation,
    padding: padding || 0.0,
  };
}
