@group(0) @binding(0) var<storage, read> depthBuffer: array<f32>;
@group(0) @binding(1) var myTexture: texture_2d<f32>;
@group(0) @binding(2) var mySampler: sampler;

@fragment
fn main(@location(0) uv: vec2<f32>) -> @location(0) vec4<f32> {
    // Just show the texture, no depth overlay
    return textureSample(myTexture, mySampler, uv);
}