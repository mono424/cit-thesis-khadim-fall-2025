from dataclasses import dataclass
from pycdr2 import IdlStruct
from pycdr2.types import int32, uint32, float64, float32, sequence, uint8, uint16, uint64, array
from enum import IntEnum


@dataclass
class Time(IdlStruct, typename="Time"):
    sec: int32
    nanosec: uint32


@dataclass
class Header(IdlStruct, typename="Header"):
    stamp: Time
    frame_id: str


@dataclass
class Vector3(IdlStruct, typename="Vector3"):
    x: float64
    y: float64
    z: float64


@dataclass
class Quaternion(IdlStruct, typename="Quaternion"):
    x: float64
    y: float64
    z: float64
    w: float64


@dataclass
class RigidTransform(IdlStruct, typename="RigidTransform"):
    translation: Vector3
    rotation: Quaternion


@dataclass
class VideoStreamMessage(IdlStruct, typename="VideoStreamMessage"):
    header: Header
    pose: RigidTransform
    camera_focal_length: array[float32, 2]
    camera_principal_point: array[float32, 2]
    camera_radial_distortion: array[float32, 3]
    camera_tangential_distortion: array[float32, 2]
    image_bytes: uint64
    image: sequence[uint8]


def parse_video_stream_message(data: bytes) -> VideoStreamMessage:
    return VideoStreamMessage.deserialize(data)


class CameraModelType(IntEnum):
    CAMERA_MODEL_NONE = 0
    CAMERA_MODEL_PINHOLE = 1
    CAMERA_MODEL_OPEN_CV = 2
    CAMERA_MODEL_FULL_OPEN_CV = 3
    CAMERA_MODEL_SENSOR_AZURE_KINECT = 4


@dataclass
class CameraModel(IdlStruct, typename="CameraModel"):
    camera_model: int32
    image_width: uint16
    image_height: uint16
    focal_length: array[float64, 2]
    principal_point: array[float64, 2]
    tangential_coefficients: array[float64, 2]
    radial_coefficients: array[float64, 8]


class CameraSensorTypesEnum(IntEnum):
    GENERIC_RGBD = 0
    KINECT_AZURE = 1
    FEMTO_MEGA = 2


@dataclass
class CameraSensor(IdlStruct, typename="CameraSensor"):
    name: str
    serial_number: str
    camera_type: int32
    unknown_field_index_3: int32
    depth_enabled: bool
    color_enabled: bool
    infrared_enabled: bool
    depth_descriptor_topic: str
    infrared_descriptor_topic: str
    depth_parameters: CameraModel
    color_descriptor_topic: str
    color_parameters: CameraModel
    camera_pose: RigidTransform
    color2depth_transform: RigidTransform
    frame_rate: uint32
    raw_calibration: sequence[uint8]
    depth_units_per_meter: float32
    timestamp_offset_ns: uint64


class RPCResponseStatus(IntEnum):
    RPC_STATUS_SUCCESS = 0
    RPC_STATUS_ERROR = 1


@dataclass
class DeviceContextReply(IdlStruct, typename="DeviceContextReply"):
    name: str
    is_valid: bool
    depth_units_per_meter: float32
    frame_rate: uint32
    sensor_type: str
    serial_number: str
    timestamp_offset: uint64
    value: CameraSensor


def parse_device_context_reply(data: bytes) -> DeviceContextReply:
    return DeviceContextReply.deserialize(data) 