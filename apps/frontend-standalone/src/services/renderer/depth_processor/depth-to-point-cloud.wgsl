override calculate_normals: bool = false;

@group(0) @binding(0) var InputImage: texture_2d<u32>;
@group(0) @binding(1) var XYLookupTable: texture_2d<f32>;
@group(0) @binding(2) var<storage, read_write> OutputPositionImage: array<vec4<f32>>;
@group(0) @binding(3) var<storage, read_write> OutputTexCoordImage: array<vec4<f32>>;
@group(0) @binding(4) var<storage, read_write> OutputNormalImage: array<vec4<f32>>;

struct Uniforms {
    depth_dim: vec2<f32>,
    color_dim: vec2<f32>,
    color_focal: vec2<f32>,
    color_principal: vec2<f32>,
    depth_to_color_tf: mat4x4<f32>,
    depth_scale: f32,
    needs_projection: f32,
    image_origin: f32,
    padding: f32,
    color_distortion: array<vec4<f32>, 2>,
};

@group(0) @binding(5) var<uniform> uniforms: Uniforms;

fn isValidDepth(value: f32) -> bool {
    return value > 0.0;
}

@compute @workgroup_size(32, 32)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let texel = vec2<i32>(global_id.xy);
    let size = vec2<i32>(i32(uniforms.depth_dim.x), i32(uniforms.depth_dim.y));

    if (texel.x < size.x && texel.y < size.y) {
        let index = u32(texel.y * size.x + texel.x);

        let px = f32(texel.x);
        let py = f32(texel.y);

        let nd = f32(textureLoad(InputImage, texel, 0).r);
        let xy = textureLoad(XYLookupTable, texel, 0).xy;

        let depth = uniforms.depth_scale * nd;
        // kinect depth images and lookup tables have their origin in the upper-left corner
        // therefore the coordinates will be computed in y-down/x-right semantics
        // also z-dimension does not correspond with opengl semantics
        // therefore, we negate the y-axis and the z-axis which effectively is a 180 deg rotation around the x-axis
        let xyz = vec4<f32>(xy.x * depth, -xy.y * depth, -depth, 1.0);
        OutputPositionImage[index] = xyz;

        let centerPosition = xyz.xyz;
        //Extra option to calculate normals using a north,south,west,east crossing
        if (calculate_normals) {
            let NORMAL_CALCULATION_DEPTH_THRESHOLD = 0.2;
            
            //Assuming upper left corner as 0,0 here, if this is not true it does not matter anyway for the normal
            let xyNorth = textureLoad(XYLookupTable, vec2<i32>(texel.x, texel.y - 1), 0).xy;
            let xySouth = textureLoad(XYLookupTable, vec2<i32>(texel.x, texel.y + 1), 0).xy;
            let xyWest = textureLoad(XYLookupTable, vec2<i32>(texel.x - 1, texel.y), 0).xy;
            let xyEast = textureLoad(XYLookupTable, vec2<i32>(texel.x + 1, texel.y), 0).xy;
            //Note: out-of-bounds accesses in GLSL Compute Shaders always return 0
            let dNorth = f32(textureLoad(InputImage, vec2<i32>(texel.x, texel.y - 1), 0).r) * uniforms.depth_scale;
            let dSouth = f32(textureLoad(InputImage, vec2<i32>(texel.x, texel.y + 1), 0).r) * uniforms.depth_scale;
            let dWest = f32(textureLoad(InputImage, vec2<i32>(texel.x - 1, texel.y), 0).r) * uniforms.depth_scale;
            let dEast = f32(textureLoad(InputImage, vec2<i32>(texel.x + 1, texel.y), 0).r) * uniforms.depth_scale;

            var valid = true;

            if (isValidDepth(dNorth) && abs(dNorth - depth) <= NORMAL_CALCULATION_DEPTH_THRESHOLD &&
                isValidDepth(dSouth) && abs(dSouth - depth) <= NORMAL_CALCULATION_DEPTH_THRESHOLD &&
                isValidDepth(dWest) && abs(dWest - depth) <= NORMAL_CALCULATION_DEPTH_THRESHOLD &&
                isValidDepth(dEast) && abs(dEast - depth) <= NORMAL_CALCULATION_DEPTH_THRESHOLD) {
                let northXYZ = vec3<f32>(xyNorth.x * dNorth, -xyNorth.y * dNorth, -dNorth);
                let southXYZ = vec3<f32>(xySouth.x * dSouth, -xySouth.y * dSouth, -dSouth);    
                let westXYZ = vec3<f32>(xyWest.x * dWest, -xyWest.y * dWest, -dWest);    
                let eastXYZ = vec3<f32>(xyEast.x * dEast, -xyEast.y * dEast, -dEast);

                let normal = normalize(cross(westXYZ - eastXYZ, southXYZ - northXYZ));

                OutputNormalImage[index] = vec4<f32>(normal, 0.0);
            } else {
                OutputNormalImage[index] = vec4<f32>(0.0, 0.0, 0.0, 0.0);
            }
        }

        if (uniforms.needs_projection > 0.0) {
            var trans: vec4<f32>;

            let col0 = uniforms.depth_to_color_tf[0].xyz;
            let col1 = uniforms.depth_to_color_tf[1].xyz;
            let col2 = uniforms.depth_to_color_tf[2].xyz;
            let col3 = uniforms.depth_to_color_tf[3].xyz;

            trans.x = col0.x * xyz.x + col1.x * xyz.y + col2.x * xyz.z + col3.x;
            trans.y = col0.y * xyz.x + col1.y * xyz.y + col2.y * xyz.z + col3.y;
            trans.z = col0.z * xyz.x + col1.z * xyz.y + col2.z * xyz.z + col3.z;

            // from k4a sdk transformation_project_internal
            let cx = uniforms.color_principal.x;
            let cy = uniforms.color_principal.y;
            let fx = uniforms.color_focal.x;
            let fy = uniforms.color_focal.y;
            let k1 = uniforms.color_distortion[0].x;
            let k2 = uniforms.color_distortion[0].y;
            let k3 = uniforms.color_distortion[1].x;
            let k4 = uniforms.color_distortion[1].y;
            let k5 = uniforms.color_distortion[1].z;
            let k6 = uniforms.color_distortion[1].w;
            let codx = 0.0; // center of distortion is set to 0 for Brown Conrady model
            let cody = 0.0;
            let p1 = uniforms.color_distortion[0].z;
            let p2 = uniforms.color_distortion[0].w;

            let xp = -trans.x / trans.z - codx;
            let yp = trans.y / trans.z - cody; // flip on y-axis due to coordinate change image vs. opengl

            let xp2 = xp * xp;
            let yp2 = yp * yp;
            let xyp = xp * yp;
            let rs = xp2 + yp2;

            let rss = rs * rs;
            let rsc = rss * rs;
            let a = 1.0 + k1 * rs + k2 * rss + k3 * rsc;
            let b = 1.0 + k4 * rs + k5 * rss + k6 * rsc;
            var bi: f32;
            if (b != 0.0) {
                bi = 1.0 / b;
            } else {
                bi = 1.0;
            }
            let d = a * bi;

            var xp_d = xp * d;
            var yp_d = yp * d;

            let rs_2xp2 = rs + 2.0 * xp2;
            let rs_2yp2 = rs + 2.0 * yp2;

            xp_d += rs_2xp2 * p2 + 2.0 * xyp * p1;
            yp_d += rs_2yp2 * p1 + 2.0 * xyp * p2;

            let xp_d_cx = xp_d + codx;
            let yp_d_cy = yp_d + cody;

            let u = xp_d_cx * fx + cx;
            let v = yp_d_cy * fy + cy;

            OutputTexCoordImage[index] = vec4<f32>(u / uniforms.color_dim.x, v / uniforms.color_dim.y, 0.0, 1.0);

        } else {
            OutputTexCoordImage[index] = vec4<f32>(px / uniforms.depth_dim.x, py / uniforms.depth_dim.y, 0.0, 1.0);
        }
    }
}