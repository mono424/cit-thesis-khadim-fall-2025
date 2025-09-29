struct Uniforms {
    transformMatrix: mat4x4<f32>,
    projectionMatrix: mat4x4<f32>,
}

struct VertexOutput {
    @builtin(position) clip_position: vec4<f32>,
    @location(0) color: vec3<f32>,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

@vertex
fn main(
    @location(0) position: vec3<f32>,    // Axis line vertex position (world space)
    @location(1) color: vec3<f32>        // Color for this axis (RGB for XYZ)
) -> VertexOutput {
    var output: VertexOutput;
    output.color = color;
    
    // Transform to clip space
    let world_position = vec4<f32>(position, 1.0);
    output.clip_position = uniforms.projectionMatrix * uniforms.transformMatrix * world_position;
    return output;
} 