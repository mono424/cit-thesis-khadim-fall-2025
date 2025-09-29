export interface SharedArrayBufferOptions {
  workerCount: number;
  workerBufferSize: number;
}

export interface SharedArrayBufferProps {
  options: SharedArrayBufferOptions;
  buffer: SharedArrayBuffer;
}

export interface SharedArrayBufferWorkerProps {
  global: SharedArrayBufferProps;
  bufferView: Uint8Array;
  workerIndex: number;
  bufferOffset: number;
}

export const createSharedArrayBuffer = (
  options: SharedArrayBufferOptions
): SharedArrayBufferWorkerProps[] => {
  const buffer = new SharedArrayBuffer(
    options.workerBufferSize * options.workerCount
  );

  const globalProps: SharedArrayBufferProps = {
    options,
    buffer,
  };

  const workerProps: SharedArrayBufferWorkerProps[] = [];
  for (let i = 0; i < options.workerCount; i++) {
    const bufferOffset = i * options.workerBufferSize;
    workerProps.push({
      global: globalProps,
      bufferView: new Uint8Array(
        buffer,
        bufferOffset,
        options.workerBufferSize
      ),
      workerIndex: i,
      bufferOffset,
    });
  }

  return workerProps;
};
