struct Uniforms {
    transformationMatrix: mat4x4<f32>,
    projectionMatrix: mat4x4<f32>,
    normalMatrix: mat3x3<f32>,
    lightPositions: array<vec3<f32>, 4>, // LIGHT_COUNT = 4
}

struct VertexOutput {
    @builtin(position) clip_position: vec4<f32>,
    @location(0) interpolatedTextureCoords: vec2<f32>,
    @location(1) transformedNormal: vec3<f32>,
    @location(2) lightDirection0: vec3<f32>,
    @location(3) lightDirection1: vec3<f32>,
    @location(4) lightDirection2: vec3<f32>,
    @location(5) lightDirection3: vec3<f32>,
    @location(6) cameraDirection: vec3<f32>,
    @location(7) vertColor: vec4<f32>,
    @location(8) world_position: vec3<f32>,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

@vertex
fn main(
    @location(0) position: vec4<f32>,
    @location(1) normal: vec4<f32>,
    @location(2) textureCoords: vec4<f32>
) -> VertexOutput {
    var output: VertexOutput;
    
    // Skip rendering points with zero depth (invalid points)
    if (position.z == 0.0) {
        // Position off-screen to cull invalid points
        output.clip_position = vec4<f32>(10.0, 10.0, 10.0, 1.0);
        output.world_position = vec3<f32>(0.0, 0.0, 0.0);
        output.interpolatedTextureCoords = textureCoords.xy;
        output.transformedNormal = vec3<f32>(0.0, 0.0, 0.0);
        output.lightDirection0 = vec3<f32>(0.0, 0.0, 0.0);
        output.lightDirection1 = vec3<f32>(0.0, 0.0, 0.0);
        output.lightDirection2 = vec3<f32>(0.0, 0.0, 0.0);
        output.lightDirection3 = vec3<f32>(0.0, 0.0, 0.0);
        output.cameraDirection = vec3<f32>(0.0, 0.0, 0.0);
        output.vertColor = vec4<f32>(1.0, 1.0, 1.0, 1.0);
        return output;
    }
    
    // Transformed vertex position
    let transformedPosition4 = uniforms.transformationMatrix * position;
    let transformedPosition = transformedPosition4.xyz / transformedPosition4.w;
    
    // Transformed normal vector
    output.transformedNormal = uniforms.normalMatrix * normal.xyz;
    
    // Direction to the lights
    output.lightDirection0 = normalize(uniforms.lightPositions[0] - transformedPosition);
    output.lightDirection1 = normalize(uniforms.lightPositions[1] - transformedPosition);
    output.lightDirection2 = normalize(uniforms.lightPositions[2] - transformedPosition);
    output.lightDirection3 = normalize(uniforms.lightPositions[3] - transformedPosition);
    
    // Direction to the camera
    output.cameraDirection = -transformedPosition;
    
    // Transform the position
    output.clip_position = uniforms.projectionMatrix * transformedPosition4;
    
    // Texture coordinates
    output.interpolatedTextureCoords = textureCoords.xy;
    
    // Default vertex color (white)
    output.vertColor = vec4<f32>(1.0, 1.0, 1.0, 1.0);
    
    // Output world position
    output.world_position = position.xyz;
    
    return output;
}