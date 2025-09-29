/// https://github.com/TUM-CAMP-NARVIS/tcn_schema/blob/main/src/dds/custom/tcnart_msgs/msg/VideoStream.idl

import {
  MapSchema,
  CDRSchemaSequenceValue,
  CDRSchemaDictionaryField,
  CDRSchemaDictionaryValue,
  CDRSchemaUintValue,
  CDRSchemaFloatValue,
} from "@mono424/cdr-ts";
import {
  headerSchema,
  HeaderSchema,
  rigidTransformSchema,
  RigidTransformSchema,
} from "./shared";

type VideoStreamMessageSchema = CDRSchemaDictionaryValue<{
  header: CDRSchemaDictionaryField<HeaderSchema>;
  pose: CDRSchemaDictionaryField<RigidTransformSchema>;
  camera_focal_length: CDRSchemaDictionaryField<
    CDRSchemaSequenceValue<CDRSchemaFloatValue>
  >;
  camera_principal_point: CDRSchemaDictionaryField<
    CDRSchemaSequenceValue<CDRSchemaFloatValue>
  >;
  camera_radial_distortion: CDRSchemaDictionaryField<
    CDRSchemaSequenceValue<CDRSchemaFloatValue>
  >;
  camera_tangential_distortion: CDRSchemaDictionaryField<
    CDRSchemaSequenceValue<CDRSchemaFloatValue>
  >;
  image_bytes: CDRSchemaDictionaryField<CDRSchemaUintValue>;
  image: CDRSchemaDictionaryField<CDRSchemaSequenceValue<CDRSchemaUintValue>>;
}>;

export const videoStreamMessageSchema: VideoStreamMessageSchema = {
  type: "dictionary",
  items: {
    header: { index: 0, value: headerSchema },
    pose: { index: 1, value: rigidTransformSchema },
    camera_focal_length: {
      index: 2,
      value: {
        type: "sequence",
        size: 2,
        itemSchema: { type: "float", len: 32 },
      },
    },
    camera_principal_point: {
      index: 3,
      value: {
        type: "sequence",
        size: 2,
        itemSchema: { type: "float", len: 32 },
      },
    },
    camera_radial_distortion: {
      index: 4,
      value: {
        type: "sequence",
        size: 3,
        itemSchema: { type: "float", len: 32 },
      },
    },
    camera_tangential_distortion: {
      index: 5,
      value: {
        type: "sequence",
        size: 2,
        itemSchema: { type: "float", len: 32 },
      },
    },
    image_bytes: {
      index: 6,
      value: { type: "uint", len: 64, format: "number" },
    },
    image: {
      index: 7,
      value: {
        type: "sequence",
        itemSchema: { type: "uint", len: 8, format: "number" },
      },
    },
  },
};

export type VideoStreamMessage = MapSchema<VideoStreamMessageSchema>;
