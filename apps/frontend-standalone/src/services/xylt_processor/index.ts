import { createSignal, createEffect } from "solid-js";
import { useXylt, XyltModule } from "./xylt-loader";
import { CameraModel } from "../zenoh/schemas/device_context_reply";

export interface IntrinsicsData {
  fov_x: number;
  fov_y: number;
  c_x: number;
  c_y: number;
  width: number;
  height: number;
}

export interface XYTableInfo {
  width: number;
  height: number;
  dataLength: number;
  data: number[];
}

export interface XyltProcessorResult {
  intrinsicsData: IntrinsicsData;
  xyTableData: XYTableInfo;
}

// Simplified service for managing WASM module access
class XyltModuleManager {
  private static instance: XyltModuleManager | null = null;
  private xyltLoader = useXylt();
  private module: XyltModule | null = null;
  private isInitialized = false;

  private constructor() {}

  static getInstance(): XyltModuleManager {
    if (!XyltModuleManager.instance) {
      XyltModuleManager.instance = new XyltModuleManager();
    }
    return XyltModuleManager.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized && this.module) {
      return;
    }

    try {
      this.module = await this.xyltLoader.initialize();
      this.isInitialized = true;
      console.log("XYLT Module loaded:", this.module);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load XYLT";
      throw new Error(message);
    }
  }

  async createXYLookupTable(
    intrinsics: IntrinsicsData
  ): Promise<XyltProcessorResult> {
    // Ensure module is initialized
    await this.initialize();

    if (!this.module) {
      throw new Error("XYLT module not loaded");
    }

    try {
      // Create XYLT intrinsics object
      const xyltIntrinsics = new this.module.IntrinsicParameters();

      // Set the intrinsic parameters
      xyltIntrinsics.fov_x = intrinsics.fov_x;
      xyltIntrinsics.fov_y = intrinsics.fov_y;
      xyltIntrinsics.c_x = intrinsics.c_x;
      xyltIntrinsics.c_y = intrinsics.c_y;
      xyltIntrinsics.width = intrinsics.width;
      xyltIntrinsics.height = intrinsics.height;

      console.log("Using intrinsics:", intrinsics);

      // Create XY lookup table
      const xyTablePtr = new this.module.XYTableDataPtr();
      const success = this.module.create_xy_lookup_table(
        xyltIntrinsics,
        xyTablePtr
      );

      console.log("create_xy_lookup_table returned:", success);

      if (success && xyTablePtr.get()) {
        const tableData = xyTablePtr.get();
        const dataLength = tableData.data.size();

        console.log(
          `XY table created: ${tableData.width}x${tableData.height}, data length: ${dataLength}`
        );

        // Validate the data structure
        const expectedLength = tableData.width * tableData.height * 2;
        if (dataLength !== expectedLength) {
          console.warn(
            `Data length mismatch: expected ${expectedLength}, got ${dataLength}`
          );
        }

        // Extract data safely with bounds checking
        const data: number[] = [];

        try {
          const vectorData = tableData.data;

          for (let i = 0; i < dataLength; i++) {
            const value = vectorData.get(i);
            data.push(value);
          }
        } catch (error) {
          console.error(
            `Error extracting data at index ${data.length}:`,
            error
          );
          throw new Error(`Failed to extract XY table data: ${error}`);
        }

        const xyTableInfo: XYTableInfo = {
          width: tableData.width,
          height: tableData.height,
          dataLength: dataLength,
          data: data,
        };

        console.log("XY Table extraction completed successfully");

        return {
          intrinsicsData: intrinsics,
          xyTableData: xyTableInfo,
        };
      } else {
        throw new Error(
          "Failed to create XY lookup table - function returned false or null pointer"
        );
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Error creating XY lookup table";
      throw new Error(message);
    }
  }

  isModuleLoaded(): boolean {
    return this.isInitialized && this.module !== null;
  }
}

export class XyltProcessorService {
  private moduleManager = XyltModuleManager.getInstance();

  async initialize(): Promise<void> {
    return this.moduleManager.initialize();
  }

  async createXYLookupTable(
    intrinsics: IntrinsicsData
  ): Promise<XyltProcessorResult> {
    return this.moduleManager.createXYLookupTable(intrinsics);
  }

  isModuleLoaded(): boolean {
    return this.moduleManager.isModuleLoaded();
  }
}

// Factory function to create a new service instance
export function createXyltProcessorService(): XyltProcessorService {
  return new XyltProcessorService();
}
