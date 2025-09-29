import {
  MapSchema,
  CDRSchemaSequenceValue,
  CDRSchemaDictionaryField,
  CDRSchemaDictionaryValue,
  CDRSchemaUintValue,
  CDRSchemaStringValue,
  CDRSchemaFloatValue,
  CDRSchemaBooleanValue,
  CDRSchemaEnumValue,
} from "@mono424/cdr-ts";
import { rigidTransformSchema } from "./shared";

/// https://github.com/TUM-CAMP-NARVIS/tcn_schema/blob/main/src/dds/custom/tcnart_msgs/msg/CameraModel.idl
export enum CameraModelType {
  CAMERA_MODEL_NONE = 0,
  CAMERA_MODEL_PINHOLE = 1,
  CAMERA_MODEL_OPEN_CV = 2,
  CAMERA_MODEL_FULL_OPEN_CV = 3,
  CAMERA_MODEL_SENSOR_AZURE_KINECT = 4,
}

export type CameraModelSchema = CDRSchemaDictionaryValue<{
  camera_model: CDRSchemaDictionaryField<
    CDRSchemaEnumValue<typeof CameraModelType>
  >;
  image_width: CDRSchemaDictionaryField<CDRSchemaUintValue>;
  image_height: CDRSchemaDictionaryField<CDRSchemaUintValue>;
  focal_length: CDRSchemaDictionaryField<
    CDRSchemaSequenceValue<CDRSchemaFloatValue>
  >;
  principal_point: CDRSchemaDictionaryField<
    CDRSchemaSequenceValue<CDRSchemaFloatValue>
  >;
  tangential_coefficients: CDRSchemaDictionaryField<
    CDRSchemaSequenceValue<CDRSchemaFloatValue>
  >;
  radial_coefficients: CDRSchemaDictionaryField<
    CDRSchemaSequenceValue<CDRSchemaFloatValue>
  >;
}>;

export const cameraModelSchema: CameraModelSchema = {
  type: "dictionary",
  items: {
    camera_model: {
      index: 0,
      value: { type: "enum", enum: CameraModelType },
    },
    image_width: {
      index: 1,
      value: { type: "uint", len: 16, format: "number" },
    },
    image_height: {
      index: 2,
      value: { type: "uint", len: 16, format: "number" },
    },
    focal_length: {
      index: 3,
      value: {
        type: "sequence",
        size: 2,
        itemSchema: { type: "float", len: 64 },
      }, // double
    },
    principal_point: {
      index: 4,
      value: {
        type: "sequence",
        size: 2,
        itemSchema: { type: "float", len: 64 },
      }, // double
    },
    tangential_coefficients: {
      index: 5,
      value: {
        type: "sequence",
        size: 2,
        itemSchema: { type: "float", len: 64 },
      }, // double
    },
    radial_coefficients: {
      index: 6,
      value: {
        type: "sequence",
        size: 8,
        itemSchema: { type: "float", len: 64 },
      }, // double
    },
  },
};

export type CameraModel = MapSchema<CameraModelSchema>;

/// https://github.com/TUM-CAMP-NARVIS/tcn_schema/blob/main/src/dds/custom/pcpd_msgs/msg/CameraSensor.idl
export enum CameraSensorTypesEnum {
  GENERIC_RGBD = 0,
  KINECT_AZURE = 1,
  FEMTO_MEGA = 2,
}

export type CameraSensorSchema = CDRSchemaDictionaryValue<{
  name: CDRSchemaDictionaryField<CDRSchemaStringValue>;
  serial_number: CDRSchemaDictionaryField<CDRSchemaStringValue>;
  camera_type: CDRSchemaDictionaryField<
    CDRSchemaEnumValue<typeof CameraSensorTypesEnum>
  >;
  depth_enabled: CDRSchemaDictionaryField<CDRSchemaBooleanValue>;
  color_enabled: CDRSchemaDictionaryField<CDRSchemaBooleanValue>;
  infrared_enabled: CDRSchemaDictionaryField<CDRSchemaBooleanValue>;
  depth_descriptor_topic: CDRSchemaDictionaryField<CDRSchemaStringValue>;
  infrared_descriptor_topic: CDRSchemaDictionaryField<CDRSchemaStringValue>;
  depth_parameters: CDRSchemaDictionaryField<typeof cameraModelSchema>;
  color_descriptor_topic: CDRSchemaDictionaryField<CDRSchemaStringValue>;
  color_parameters: CDRSchemaDictionaryField<typeof cameraModelSchema>;
  camera_pose: CDRSchemaDictionaryField<typeof rigidTransformSchema>;
  color2depth_transform: CDRSchemaDictionaryField<typeof rigidTransformSchema>;
  frame_rate: CDRSchemaDictionaryField<CDRSchemaUintValue>;
  raw_calibration: CDRSchemaDictionaryField<
    CDRSchemaSequenceValue<CDRSchemaUintValue>
  >;
  depth_units_per_meter: CDRSchemaDictionaryField<CDRSchemaFloatValue>;
  timestamp_offset_ns: CDRSchemaDictionaryField<CDRSchemaUintValue>;
}>;

export const cameraSensorSchema: CameraSensorSchema = {
  type: "dictionary",
  items: {
    name: { index: 0, value: { type: "string" } },
    serial_number: { index: 1, value: { type: "string" } },
    camera_type: {
      index: 2,
      value: { type: "enum", enum: CameraSensorTypesEnum },
    },
    depth_enabled: { index: 4, value: { type: "boolean" } },
    color_enabled: { index: 5, value: { type: "boolean" } },
    infrared_enabled: { index: 6, value: { type: "boolean" } },
    depth_descriptor_topic: { index: 7, value: { type: "string" } },
    infrared_descriptor_topic: { index: 8, value: { type: "string" } },
    depth_parameters: { index: 9, value: cameraModelSchema },
    color_descriptor_topic: { index: 10, value: { type: "string" } },
    color_parameters: { index: 11, value: cameraModelSchema },
    camera_pose: { index: 12, value: rigidTransformSchema },
    color2depth_transform: { index: 13, value: rigidTransformSchema },
    frame_rate: {
      index: 14,
      value: { type: "uint", len: 32, format: "number" },
    },
    raw_calibration: {
      index: 15,
      value: {
        type: "sequence",
        itemSchema: { type: "uint", len: 8, format: "number" },
      },
    },
    depth_units_per_meter: { index: 16, value: { type: "float", len: 32 } }, // float
    timestamp_offset_ns: {
      index: 17,
      value: { type: "uint", len: 64, format: "number" },
    },
  },
};

export type CameraSensor = MapSchema<CameraSensorSchema>;

/// https://github.com/TUM-CAMP-NARVIS/tcn_schema/blob/main/src/dds/custom/pcpd_msgs/rpc/ServiceController.idl
export enum RPCResponseStatus {
  RPC_STATUS_SUCCESS = 0,
  RPC_STATUS_ERROR = 1,
}

export type DeviceContextReplySchema = CDRSchemaDictionaryValue<{
  name: CDRSchemaDictionaryField<CDRSchemaStringValue>;
  is_valid: CDRSchemaDictionaryField<CDRSchemaBooleanValue>;
  depth_units_per_meter: CDRSchemaDictionaryField<CDRSchemaFloatValue>;
  frame_rate: CDRSchemaDictionaryField<CDRSchemaUintValue>;
  sensor_type: CDRSchemaDictionaryField<CDRSchemaStringValue>;
  serial_number: CDRSchemaDictionaryField<CDRSchemaStringValue>;
  timestamp_offset: CDRSchemaDictionaryField<CDRSchemaUintValue>;
  value: CDRSchemaDictionaryField<typeof cameraSensorSchema>;
  // status: CDRSchemaDictionaryField<
  //   CDRSchemaEnumValue<typeof RPCResponseStatus>
  // >;
}>;

export const deviceContextReplySchema: DeviceContextReplySchema = {
  type: "dictionary",
  items: {
    name: { index: 0, value: { type: "string" } },
    is_valid: { index: 1, value: { type: "boolean" } },
    depth_units_per_meter: { index: 2, value: { type: "float", len: 32 } },
    frame_rate: {
      index: 3,
      value: { type: "uint", len: 32, format: "number" },
    },
    sensor_type: { index: 4, value: { type: "string" } },
    serial_number: { index: 5, value: { type: "string" } },
    timestamp_offset: {
      index: 6,
      value: { type: "uint", len: 64, format: "number" },
    },
    value: { index: 7, value: cameraSensorSchema },
    // status: { index: 8, value: { type: "enum", enum: RPCResponseStatus } },
  },
};

export type DeviceContextReplyMessage = MapSchema<DeviceContextReplySchema>;
