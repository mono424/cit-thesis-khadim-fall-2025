import {
  CDRSchemaDictionaryField,
  CDRSchemaDictionaryValue,
  CDRSchemaIntValue,
  CDRSchemaUintValue,
  CDRSchemaStringValue,
  CDRSchemaFloatValue,
} from "@mono424/cdr-ts";

// https://github.com/TUM-CAMP-NARVIS/tcn_schema/blob/main/src/dds/custom/tcnart_msgs/msg/Types.idl#L94
export type Vector3Schema = CDRSchemaDictionaryValue<{
  x: CDRSchemaDictionaryField<CDRSchemaFloatValue>;
  y: CDRSchemaDictionaryField<CDRSchemaFloatValue>;
  z: CDRSchemaDictionaryField<CDRSchemaFloatValue>;
}>;

export const vector3Schema: Vector3Schema = {
  type: "dictionary",
  items: {
    x: { index: 0, value: { type: "float", len: 64 } }, // double
    y: { index: 1, value: { type: "float", len: 64 } }, // double
    z: { index: 2, value: { type: "float", len: 64 } }, // double
  },
};

// https://github.com/TUM-CAMP-NARVIS/tcn_schema/blob/main/src/dds/custom/tcnart_msgs/msg/Types.idl#L87
export type QuaternionSchema = CDRSchemaDictionaryValue<{
  x: CDRSchemaDictionaryField<CDRSchemaFloatValue>;
  y: CDRSchemaDictionaryField<CDRSchemaFloatValue>;
  z: CDRSchemaDictionaryField<CDRSchemaFloatValue>;
  w: CDRSchemaDictionaryField<CDRSchemaFloatValue>;
}>;

export const quaternionSchema: QuaternionSchema = {
  type: "dictionary",
  items: {
    x: { index: 0, value: { type: "float", len: 64 } }, // double
    y: { index: 1, value: { type: "float", len: 64 } }, // double
    z: { index: 2, value: { type: "float", len: 64 } }, // double
    w: { index: 3, value: { type: "float", len: 64 } }, // double
  },
};

// https://github.com/TUM-CAMP-NARVIS/tcn_schema/blob/main/src/dds/custom/tcnart_msgs/msg/Types.idl#L126
export type RigidTransformSchema = CDRSchemaDictionaryValue<{
  translation: CDRSchemaDictionaryField<Vector3Schema>;
  rotation: CDRSchemaDictionaryField<QuaternionSchema>;
}>;

export const rigidTransformSchema: RigidTransformSchema = {
  type: "dictionary",
  items: {
    translation: { index: 0, value: vector3Schema },
    rotation: { index: 1, value: quaternionSchema },
  },
};

// https://github.com/TUM-CAMP-NARVIS/tcn_schema/blob/2ebeb1b8d265aeaa16e759ac8beed9c09b526788/src/dds/ros2/builtin_interfaces/msg/Time_.idl#L4
export type TimeSchema = CDRSchemaDictionaryValue<{
  sec: CDRSchemaDictionaryField<CDRSchemaIntValue>;
  nanosec: CDRSchemaDictionaryField<CDRSchemaUintValue>;
}>;

export const timeSchema: TimeSchema = {
  type: "dictionary",
  items: {
    sec: { index: 0, value: { type: "int", len: 32 } }, // ROS Time.sec
    nanosec: {
      index: 1,
      value: { type: "uint", len: 32, format: "number" },
    }, // ROS Time.nanosec
  },
};

// https://github.com/TUM-CAMP-NARVIS/tcn_schema/blob/main/src/dds/ros2/std_msgs/msg/Header.idl
export type HeaderSchema = CDRSchemaDictionaryValue<{
  stamp: CDRSchemaDictionaryField<TimeSchema>;
  frame_id: CDRSchemaDictionaryField<CDRSchemaStringValue>;
}>;

export const headerSchema: HeaderSchema = {
  type: "dictionary",
  items: {
    stamp: { index: 0, value: timeSchema },
    frame_id: { index: 1, value: { type: "string" } },
  },
};
