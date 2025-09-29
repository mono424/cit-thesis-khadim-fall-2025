import { expect, test } from "@jest/globals";
import { splitNALUnits, parseNALUnitType } from "./utils";
import sample from "./sample.json";

test("nal units should be splitted by start code", () => {
  const data = new Uint8Array(sample.payload);
  const units = splitNALUnits(data);
  expect(units).toHaveLength(3);
  expect(parseNALUnitType(units[0])[0]).toBe(7);
  expect(parseNALUnitType(units[1])[0]).toBe(8);
  expect(parseNALUnitType(units[2])[0]).toBe(5);
});
