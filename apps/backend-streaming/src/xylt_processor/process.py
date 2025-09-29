from core.state import GlobalState
from streaming.zenoh_cdr import CameraModel
from xylt import create_xy_lookup_table, XYTableData, IntrinsicParameters
import numpy as np

def camModelToIntrinsics(camModel: CameraModel) -> IntrinsicParameters:
    intrinsics = IntrinsicParameters()
    intrinsics.fov_x = float(camModel.focal_length[0])
    intrinsics.fov_y = float(camModel.focal_length[1])
    intrinsics.c_x = float(camModel.principal_point[0])
    intrinsics.c_y = float(camModel.principal_point[1])
    intrinsics.width = int(camModel.image_width)
    intrinsics.height = int(camModel.image_height)
    return intrinsics


def init_depth_xylt(state: GlobalState) -> None:
    if state.console is None:
        raise RuntimeError("Console not initialized")
    if state.camera_descriptions is None:
        raise RuntimeError("Camera descriptions not initialized")
    
    state.console.log("Creating XYLookupTables for depth cameras...")
    xy_lookup_tables: list[np.ndarray] = []
    
    for i in range(state.depth_camera_count):
        depth_cameras = state.camera_descriptions[i].depth_parameters
        intrinsics = camModelToIntrinsics(depth_cameras)
        print(f"Camera {i} intrinsics: fov_x={intrinsics.fov_x}, fov_y={intrinsics.fov_y}, c_x={intrinsics.c_x}, c_y={intrinsics.c_y}, width={intrinsics.width}, height={intrinsics.height}")
        
        # Use the fixed C++ implementation
        xy_lookup_table = XYTableData()
        success = create_xy_lookup_table(intrinsics, xy_lookup_table)
        
        if not success:
            raise RuntimeError(f"Failed to create XY lookup table for camera {i}")
        if xy_lookup_table.width == 0 or xy_lookup_table.height == 0 or len(xy_lookup_table.data) == 0:
            raise RuntimeError(f"XY lookup table for camera {i} is empty despite success=True")
            
        xylt_arr = np.array(xy_lookup_table.data, dtype=np.float32)
        xy_lookup_tables.append(xylt_arr)
        print(f"Camera {i}: Generated XY lookup table with {len(xylt_arr)} values using C++ implementation")
    
    state.set_depth_xylt(xy_lookup_tables)
    state.console.log("XYLookupTables created successfully")
    