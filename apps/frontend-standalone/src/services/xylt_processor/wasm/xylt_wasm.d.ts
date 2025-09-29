// Type declarations for XYLT WASM module
declare module "~/services/xylt_processor/wasm/xylt_wasm.js" {
  interface XyltWasmModule {
    // Add your specific XYLT function signatures here
    // Example methods (replace with actual XYLT API):
    // compress(data: Uint8Array): Uint8Array;
    // decompress(data: Uint8Array): Uint8Array;
    [key: string]: any;
  }

  function XyltModule(options?: any): Promise<XyltWasmModule>;
  export default XyltModule;
}
