struct Uniforms {
    transformationMatrix: mat4x4<f32>,
    projectionMatrix: mat4x4<f32>,
    normalMatrix: mat3x3<f32>,
    lightPositions: array<vec3<f32>, 4>, // LIGHT_COUNT = 4
}

struct LightingUniforms {
    ambientColor: vec4<f32>,
    diffuseColor: vec4<f32>,
    specularColor: vec4<f32>,
    shininess: f32,
    lightColors: array<vec4<f32>, 4>, // LIGHT_COUNT = 4
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
@group(0) @binding(1) var<uniform> lighting: LightingUniforms;
@group(0) @binding(2) var colorTexture: texture_2d<f32>;
@group(0) @binding(3) var depthTexture: texture_2d<f32>;
@group(0) @binding(4) var textureSampler: sampler;

@fragment
fn main(input: VertexOutput) -> @location(0) vec4<f32> {
    var finalAmbientColor = vec4<f32>(0.0, 0.0, 0.0, 1.0);
    
    // Color texture sampling (if available)
    //finalAmbientColor = textureSample(colorTexture, textureSampler, input.interpolatedTextureCoords);
    
    // TODO REMOVE CUSTOM COLOR MODE
    let pos = input.world_position;
    
    let x_color = clamp(pos.x, 0.0, 0.25);
    let y_color = clamp(pos.y, 0.0, 0.25);
    let z_color = clamp(pos.z, 0.0, 0.5);

    let color = vec3<f32>(
        1.0 - x_color - y_color,
        1.0 - x_color - y_color,
        z_color
    );

    finalAmbientColor = vec4<f32>(color, 1.0);
    // TODO REMOVE CUSTOM COLOR MODE

    // Color normal mode (alternative to texture)
    // finalAmbientColor = vec4<f32>(input.transformedNormal, 1.0) * 0.5 + 0.5;
    
    let finalDiffuseColor = lighting.diffuseColor;
    let finalSpecularColor = lighting.specularColor;
    
    // Ambient color
    var color_final = finalAmbientColor;
    
    // Create array of light directions for easier processing
    let lightDirections = array<vec3<f32>, 4>(
        input.lightDirection0,
        input.lightDirection1,
        input.lightDirection2,
        input.lightDirection3
    );
    
    // Normalize the transformed normal
    // let normalizedTransformedNormal = normalize(input.transformedNormal);
    
    // Add diffuse color for each light (commented out like in GLSL)
    // for (var i: i32 = 0; i < 4; i = i + 1) {
    //     let normalizedLightDirection = normalize(lightDirections[i]);
    //     let intensity = max(0.0, dot(normalizedTransformedNormal, normalizedLightDirection));
    //     color += vec4<f32>(
    //         finalDiffuseColor.rgb * lighting.lightColors[i].rgb * intensity,
    //         lighting.lightColors[i].a * finalDiffuseColor.a / 4.0  // Divide by LIGHT_COUNT
    //     );
    //     
    //     // Add specular color, if needed
    //     if (intensity > 0.001) {
    //         let reflection = reflect(-normalizedLightDirection, normalizedTransformedNormal);
    //         let specularity = pow(max(0.0, dot(normalize(input.cameraDirection), reflection)), lighting.shininess);
    //         color += vec4<f32>(
    //             finalSpecularColor.rgb * specularity,
    //             finalSpecularColor.a
    //         );
    //     }
    // }
    
    // Overwrite for testing (commented out like in GLSL)
    // let depth = f32(textureSample(depthTexture, textureSampler, input.interpolatedTextureCoords).r) / 65535.0;
    // color = vec4<f32>(depth, 0.0, 0.0, 0.5);
    
    return color_final;
}