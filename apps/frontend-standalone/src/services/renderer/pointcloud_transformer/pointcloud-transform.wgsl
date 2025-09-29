struct TransformParams {
    // Camera extrinsics for transforming from camera space to world space
    rotation: vec4<f32>,    // quaternion (x, y, z, w)
    translation: vec3<f32>, // origin-to-camera vector + manual offset
    padding: f32,           // alignment padding
};

@group(0) @binding(0) var<storage, read> InputPositions: array<vec4<f32>>;
@group(0) @binding(1) var<storage, read_write> OutputPositions: array<vec4<f32>>;
@group(0) @binding(2) var<uniform> params: TransformParams;

// Normalize quaternion to ensure valid rotation
fn normalize_quaternion(q: vec4<f32>) -> vec4<f32> {
    let length = sqrt(q.x * q.x + q.y * q.y + q.z * q.z + q.w * q.w);
    if (length < 0.0001) {
        // Return identity quaternion if invalid
        return vec4<f32>(0.0, 0.0, 0.0, 1.0);
    }
    return q / length;
}

// Convert quaternion to rotation matrix with proper normalization
fn quaternion_to_matrix(q_input: vec4<f32>) -> mat3x3<f32> {
    let q = normalize_quaternion(q_input);
    let x = q.x;
    let y = q.y;
    let z = q.z;
    let w = q.w;
    
    let x2 = x * x;
    let y2 = y * y;
    let z2 = z * z;
    let xy = x * y;
    let xz = x * z;
    let yz = y * z;
    let wx = w * x;
    let wy = w * y;
    let wz = w * z;
    
    return mat3x3<f32>(
        vec3<f32>(1.0 - 2.0 * (y2 + z2), 2.0 * (xy - wz), 2.0 * (xz + wy)),
        vec3<f32>(2.0 * (xy + wz), 1.0 - 2.0 * (x2 + z2), 2.0 * (yz - wx)),
        vec3<f32>(2.0 * (xz - wy), 2.0 * (yz + wx), 1.0 - 2.0 * (x2 + y2))
    );
}

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let index = global_id.x;
    
    // Bounds check
    if (index >= arrayLength(&InputPositions)) {
        return;
    }
    
    let input_position = InputPositions[index];
    
    // Skip invalid points (w component should be 1.0 for valid points)
    if (input_position.w < 0.5) {
        OutputPositions[index] = input_position;
        return;
    }
    
    let camera_point = input_position.xyz;
    
    // Check if we have valid extrinsics
    let quaternion_magnitude = sqrt(params.rotation.x * params.rotation.x + 
                                   params.rotation.y * params.rotation.y + 
                                   params.rotation.z * params.rotation.z + 
                                   params.rotation.w * params.rotation.w);
    
    var world_point: vec3<f32>;
    if (quaternion_magnitude > 0.001) {
        // Step 1: Apply inverse rotation to transform from camera space to world space
        // Conjugate quaternion for inverse rotation (negate x, y, z components)
        let inv_rotation = vec4<f32>(-params.rotation.x, -params.rotation.y, -params.rotation.z, params.rotation.w);
        let rot_matrix = quaternion_to_matrix(inv_rotation);
        let rotated_point = rot_matrix * camera_point;
        
        // Step 2: Apply translation (origin-to-camera vector + manual offset)
        // This moves the pointcloud by the vector from origin [0,0,0] to camera position
        world_point = rotated_point + params.translation;
    } else {
        // No valid extrinsics, just apply translation (move by origin-to-camera vector)
        world_point = camera_point + params.translation;
    }
    
    // Output transformed position
    OutputPositions[index] = vec4<f32>(world_point, input_position.w);
} 