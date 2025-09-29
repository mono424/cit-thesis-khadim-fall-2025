import { GlobalState } from "~/lib/state";
import { IntrinsicsData } from "~/services/xylt_processor";
import { CameraModel } from "~/services/zenoh/schemas/device_context_reply";

export interface DepthXyltState {
  lookupTables: Float32Array[] | null;
  status: "loading" | "success" | "error";
  error?: string;
}

function camModelToIntrinsics(camModel: CameraModel): IntrinsicsData {
  const intrinsics = {
    fov_x: camModel.focal_length[0],
    fov_y: camModel.focal_length[1],
    c_x: camModel.principal_point[0],
    c_y: camModel.principal_point[1],
    width: Number(camModel.image_width),
    height: Number(camModel.image_height),
  };

  return intrinsics;
}

export async function createDepthXylt(state: GlobalState) {
  const { xyltProcessor, cameraDescriptions, setDepthXylt } = state;

  setDepthXylt({
    lookupTables: null,
    status: "loading",
  });

  try {
    const xyltProcessorService = xyltProcessor()?.service;
    if (!xyltProcessorService) {
      throw new Error("No Xylt processor");
    }

    const descriptions = cameraDescriptions()?.cameras;
    if (!descriptions) {
      throw new Error("No camera descriptions");
    }

    const depthCameraIntrinsics = descriptions.map((d) =>
      camModelToIntrinsics(d.depth_parameters)
    );

    const xyLookupTables = await Promise.all(
      depthCameraIntrinsics.map((i) =>
        xyltProcessorService.createXYLookupTable(i)
      )
    );

    setDepthXylt({
      lookupTables: xyLookupTables.map(
        (t) => new Float32Array(t.xyTableData.data)
      ),
      status: "success",
    });
  } catch (error) {
    setDepthXylt({
      lookupTables: null,
      status: "error",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
