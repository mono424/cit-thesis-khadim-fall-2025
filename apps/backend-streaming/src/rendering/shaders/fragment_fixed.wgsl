@group(0) @binding(0) var<storage, read> depthBuffer: array<f32>;
@group(0) @binding(1) var myTexture: texture_2d<f32>;
@group(0) @binding(2) var mySampler: sampler;


@fragment
fn main(@location(0) uv: vec2<f32>) -> @location(0) vec4<f32> {
  // Main content: texture sample
  var final_color = textureSample(myTexture, mySampler, uv);

  // Picture-in-picture: depth buffer visualization
  let pip_size = 0.4;
  let pip_padding = 0.05;
  
  if (uv.x > (1.0 - pip_size - pip_padding) && uv.y > (1.0 - pip_size - pip_padding)) {
    // Calculate pip UV coordinates
    let pip_uv_x = (uv.x - (1.0 - pip_size - pip_padding)) / pip_size;
    let pip_uv_y = (uv.y - (1.0 - pip_size - pip_padding)) / pip_size;
    
    // Convert pip UV to depth buffer coordinates
    let width: u32 = 320u;
    let height: u32 = 288u;
    let x: u32 = u32(pip_uv_x * f32(width));
    let y: u32 = u32(pip_uv_y * f32(height));
    let idx: u32 = y * width + x;

    if (idx >= arrayLength(&depthBuffer)) {
        final_color = vec4<f32>(1.0, 0.0, 1.0, 1.0); // Error color
    } else {
        let raw_num: f32 = depthBuffer[idx];
        // Assume raw depth is in millimeters; map 0..10m (0..10000mm) to 0..1
        let norm: f32 = clamp(raw_num / 10000.0, 0.0, 1.0);
        
        // Colormap: blue -> green -> yellow -> red
        var r: f32;
        var g: f32;
        var b: f32;
        
        if (norm < 0.25) {
            // Blue to cyan
            let t = norm * 4.0;
            r = 0.0;
            g = t;
            b = 1.0;
        } else if (norm < 0.5) {
            // Cyan to green
            let t = (norm - 0.25) * 4.0;
            r = 0.0;
            g = 1.0;
            b = 1.0 - t;
        } else if (norm < 0.75) {
            // Green to yellow
            let t = (norm - 0.5) * 4.0;
            r = t;
            g = 1.0;
            b = 0.0;
        } else {
            // Yellow to red
            let t = (norm - 0.75) * 4.0;
            r = 1.0;
            g = 1.0 - t;
            b = 0.0;
        }
        
        final_color = vec4<f32>(r, g, b, 1.0);
    }
  }

  return final_color;
}