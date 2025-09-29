import math
from dataclasses import dataclass, field

from streaming.zenoh_cdr import CameraModel, CameraSensor, RigidTransform

@dataclass
class TransformParams:
    rotation: list[float] = field(default_factory=lambda: [0.0, 0.0, 0.0, 1.0]) # quaternion (x, y, z, w)
    translation: list[float] = field(default_factory=lambda: [0.0, 0.0, 0.0]) # vec3
    padding: float | None = 0.0 # alignment padding

def derive_transform_from_extrinsics(camera_pose: RigidTransform) -> TransformParams:
    rotation = [
        camera_pose.rotation.x,
        camera_pose.rotation.y,
        camera_pose.rotation.z,
        camera_pose.rotation.w,
    ]

    translation = [
        camera_pose.translation.x,
        camera_pose.translation.y,
        camera_pose.translation.z,
    ]

    return TransformParams(
        rotation=rotation,
        translation=translation,
        padding=0.0,
    )

def create_identity_transform(manual_offset: list[float] | None = None) -> TransformParams:
    return TransformParams(
        rotation=[0.0, 0.0, 0.0, 1.0],  # identity quaternion
        translation=manual_offset if manual_offset is not None else [0.0, 0.0, 0.0],
        padding=0.0,
    )

def extract_camera_models(camera_sensors: list[CameraSensor]) -> list[CameraModel]:
    return [sensor.depth_parameters for sensor in camera_sensors]

def validate_transform_params(params: TransformParams) -> bool:
    x, y, z, w = params.rotation
    magnitude = math.sqrt(x**2 + y**2 + z**2 + w**2)
    # Allow some tolerance for floating point precision
    return magnitude > 0.001 and abs(magnitude - 1.0) < 0.1

def normalize_quaternion(quaternion: list[float]) -> list[float]:
    x, y, z, w = quaternion
    magnitude = math.sqrt(x**2 + y**2 + z**2 + w**2)

    if magnitude < 0.0001:
        # Return identity quaternion if the magnitude is close to zero
        return [0.0, 0.0, 0.0, 1.0]

    return [x / magnitude, y / magnitude, z / magnitude, w / magnitude]

def create_normalized_transform_params(
    rotation: list[float],
    translation: list[float],
    padding: float | None = None
) -> TransformParams:
    return TransformParams(
        rotation=normalize_quaternion(rotation),
        translation=translation,
        padding=padding or 0.0,
    )

