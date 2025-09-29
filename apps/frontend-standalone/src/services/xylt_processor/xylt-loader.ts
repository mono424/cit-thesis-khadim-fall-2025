// XYLT WASM Module Loader - Runtime Dynamic Loading
export interface XyltModule {
  InternalError: new (message?: string) => Error;
  BindingError: new (message?: string) => Error;
  UnboundTypeError: new (message?: string) => Error;
  IntrinsicParameters: new (...args: any[]) => any;
  VectorFloat: new (...args: any[]) => any;
  XYTableData: new (...args: any[]) => any;
  XYTableDataPtr: new (...args: any[]) => any;
  create_xy_lookup_table: (arg0: any, arg1: any) => any;
}

class XyltLoader {
  private module: XyltModule | null = null;
  private initPromise: Promise<XyltModule> | null = null;

  async initialize(): Promise<XyltModule> {
    if (this.module) {
      return this.module;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this.loadModule();
    this.module = await this.initPromise;
    return this.module;
  }

  private async loadModule(): Promise<XyltModule> {
    try {
      // Method: Direct import from src directory
      // Import the WASM module directly
      const wasmModule = await import(
        "~/services/xylt_processor/wasm/xylt_wasm.js"
      );
      const XyltModuleFactory = wasmModule.default;

      if (!XyltModuleFactory) {
        throw new Error("XyltModule factory not found in module export");
      }

      // Initialize the module
      const module = await XyltModuleFactory();
      console.log("module", module);

      console.log("XYLT WASM module loaded successfully");
      return module as XyltModule;
    } catch (error) {
      console.error("Failed to load XYLT WASM module:", error);
      throw error;
    }
  }

  getModule(): XyltModule | null {
    return this.module;
  }

  isInitialized(): boolean {
    return this.module !== null;
  }
}

// Export singleton instance
export const xyltLoader = new XyltLoader();

// Hook for SolidJS components
export function useXylt() {
  return xyltLoader;
}
