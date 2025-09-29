import {
  MapSchema,
  CDRSchemaSequenceValue,
  CDRSchemaDictionaryField,
  CDRSchemaDictionaryValue,
  CDRSchemaIntValue,
  CDRSchemaUintValue,
  CDRSchemaStringValue,
} from "@mono424/cdr-ts";

type MockVideoStreamPacketSchema = CDRSchemaDictionaryValue<{
  stamp_s: CDRSchemaDictionaryField<CDRSchemaIntValue>;
  stamp_ns: CDRSchemaDictionaryField<CDRSchemaUintValue>;
  frame_id: CDRSchemaDictionaryField<CDRSchemaStringValue>;
  data: CDRSchemaDictionaryField<CDRSchemaSequenceValue<CDRSchemaUintValue>>;
}>;

export type CameraPacketMessage = MapSchema<MockVideoStreamPacketSchema>;

export const mockVideoStreamPacketSchema: MockVideoStreamPacketSchema = {
  type: "dictionary",
  items: {
    stamp_s: { index: 0, value: { type: "int", len: 32 } },
    stamp_ns: { index: 1, value: { type: "uint", len: 32, format: "number" } },
    frame_id: { index: 2, value: { type: "string" } },
    data: {
      index: 3,
      value: {
        type: "sequence",
        itemSchema: { type: "uint", len: 8, format: "number" },
      },
    },
  },
};
