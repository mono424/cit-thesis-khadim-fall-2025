const nALStartCodes = [
  [0, 0, 0, 1],
  [0, 0, 1],
];

export const removePrefix = (data: Uint8Array): Uint8Array => {
  for (const code of nALStartCodes) {
    if (
      data.length >= code.length &&
      data.slice(0, code.length).every((byte, index) => byte === code[index])
    ) {
      return data.slice(code.length);
    }
  }
  console.warn("No start code found, returning originAL data");
  return data;
};

// Helper function to get NAL unit type (assuming no start code prefix in data)
export const parseNALUnitType = (data: Uint8Array): [number, Uint8Array] => {
  const payload = removePrefix(data);
  if (payload.length > 0) {
    return [payload[0] & 0x0f, payload]; // Type is in the lower 5 bits of the first byte
  }
  return [0, payload];
};

export const splitNALUnits = (data: Uint8Array): Uint8Array[] => {
  const indices: number[] = [];
  for (let i = 0; i <= data.length - 3; i++) {
    if (data[i] === 0 && data[i + 1] === 0) {
      if (i + 3 < data.length && data[i + 2] === 0 && data[i + 3] === 1) {
        indices.push(i);
        i += 3;
      } else if (data[i + 2] === 1) {
        indices.push(i);
        i += 2;
      }
    }
  }

  const resultNALs: Uint8Array[] = [];
  for (let i = 0; i < indices.length; i++) {
    const startIndex = indices[i];
    const endIndex = i < indices.length - 1 ? indices[i + 1] : data.length;
    resultNALs.push(data.subarray(startIndex, endIndex));
  }

  return resultNALs;
};
