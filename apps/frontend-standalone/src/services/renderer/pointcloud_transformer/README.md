# Pointcloud Transformer

This module provides GPU-accelerated pointcloud transformation using WebGPU compute shaders.

## Files

- **`index.ts`** - Main pointcloud transformer implementation with multi-camera support
- **`extrinsics-utils.ts`** - Utilities for deriving transform parameters from camera extrinsics
- **`pointcloud-transform.wgsl`** - WebGPU compute shader for transforming pointclouds

## Usage

### Method 1: Automatic Extrinsics Derivation

```typescript
import { newPointcloudTransformer } from "./pointcloud_transformer";

// Automatically derive transforms from camera extrinsics
const transformer = newPointcloudTransformer({
  device: gpuDevice,
  cameraSensors: [sensor1, sensor2], // CameraSensor[] with camera_pose
  manualOffsets: [
    [0, 0, 0],
    [1, 0, 0],
  ], // Optional manual offsets per camera
});
```

### Method 2: Explicit Transform Parameters

```typescript
// Manually specify transform parameters
const transformer = newPointcloudTransformer({
  device: gpuDevice,
  cameras: [camera1, camera2], // CameraModel[]
  transformParams: [
    {
      rotation: [0, 0, 0, 1], // quaternion (x, y, z, w)
      translation: [0, 0, 0], // vec3
    },
    {
      rotation: [0, 0, 0.707, 0.707], // 90° rotation around Z
      translation: [2, 0, 0], // 2 units in X direction
    },
  ],
});
```

### Processing Pointclouds

```typescript
// Process single camera
transformer.processSingle(0, inputPositions); // Float32Array of vec4 positions

// Process all cameras
transformer.processAll([inputPositions1, inputPositions2]);

// Update transform parameters at runtime
transformer.updateTransformParams(0, newTransformParams);

// Access output buffers
const outputBuffers = transformer.outputBuffers;
```

## Coordinate System Transformation

The shader transforms pointclouds from **camera space** to **world space**:

1. **Camera Extrinsics** (`camera_pose`) represent world-to-camera transformation
2. **Shader Transform** applies the inverse (camera-to-world) transformation:
   - Applies inverse rotation using quaternion conjugate
   - Applies translation to move pointcloud to world position

## Extrinsics Utilities

The `extrinsics-utils.ts` module provides:

- `deriveTransformFromExtrinsics()` - Convert camera extrinsics to transform parameters
- `createIdentityTransform()` - Create identity transformation
- `validateTransformParams()` - Validate quaternion and transform parameters
- `normalizeQuaternion()` - Normalize quaternion for valid rotation

## Performance

- Multi-camera support with per-camera GPU buffers
- Compute shader with workgroup size 64 for optimal GPU utilization
- FPS tracking for performance monitoring
- Efficient batch processing of multiple cameras
