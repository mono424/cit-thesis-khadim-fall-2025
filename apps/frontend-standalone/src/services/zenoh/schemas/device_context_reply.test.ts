import { expect, test } from "@jest/globals";
import { parseCDRString } from "@mono424/cdr-ts";
import sample from "./samples/sample_device_context_reply.json";
import { deviceContextReplySchema } from "./device_context_reply";

test("device context reply: quick structure check", () => {
  const parsed = parseCDRString(sample.payload, deviceContextReplySchema, {
    maxSequenceSize: 4000,
  });
  const payload = parsed.payload;

  // Top-level fields
  expect(typeof payload.name).toBe("string");
  expect(typeof payload.is_valid).toBe("boolean");
  expect(typeof payload.depth_units_per_meter).toBe("number");
  expect(typeof payload.frame_rate).toBe("number");
  expect(typeof payload.sensor_type).toBe("string");
  expect(typeof payload.serial_number).toBe("string");
  expect(typeof payload.timestamp_offset).toBe("number");
  expect(typeof payload.value).toBe("object");

  // Camera sensor value (main nested fields)
  const v = payload.value;
  expect(typeof v.name).toBe("string");
  expect(typeof v.serial_number).toBe("string");
  expect(typeof v.depth_enabled).toBe("boolean");
  expect(typeof v.color_enabled).toBe("boolean");
  expect(typeof v.infrared_enabled).toBe("boolean");
  expect(typeof v.depth_descriptor_topic).toBe("string");
  expect(typeof v.infrared_descriptor_topic).toBe("string");
  expect(typeof v.depth_parameters).toBe("object");
  expect(typeof v.color_descriptor_topic).toBe("string");
  expect(typeof v.color_parameters).toBe("object");
  expect(typeof v.camera_pose).toBe("object");
  expect(typeof v.color2depth_transform).toBe("object");
  expect(typeof v.frame_rate).toBe("number");
  expect(Array.isArray(v.raw_calibration)).toBe(true);
  expect(typeof v.depth_units_per_meter).toBe("number");
  expect(typeof v.timestamp_offset_ns).toBe("number");

  // Validate top-level fields
  expect(parsed).toBeDefined();
  expect(parsed.payload.name).toBe("camera01");
  expect(parsed.payload.is_valid).toBe(true);
  expect(parsed.payload.depth_units_per_meter).toBe(1000);
  expect(parsed.payload.frame_rate).toBe(1);
  expect(parsed.payload.sensor_type).toBe("azure_kinect_sensor");
  expect(parsed.payload.serial_number).toBe("000545792212");
  expect(parsed.payload.timestamp_offset).toBe(1064074726);

  // Validate nested camera sensor value
  expect(parsed.payload.value).toBeDefined();
  const cameraSensor = parsed.payload.value;

  // Camera sensor basic fields
  expect(cameraSensor.name).toBe("");
  expect(cameraSensor.serial_number).toBe("");
  expect(cameraSensor.depth_enabled).toBe(true);
  expect(cameraSensor.color_enabled).toBe(true);
  expect(cameraSensor.infrared_enabled).toBe(false);
  expect(cameraSensor.depth_descriptor_topic).toBe("");
  expect(cameraSensor.infrared_descriptor_topic).toBe("");
  expect(cameraSensor.color_descriptor_topic).toBe("");
  expect(cameraSensor.frame_rate).toBe(0);
  expect(cameraSensor.depth_units_per_meter).toBe(0);
  expect(cameraSensor.timestamp_offset_ns).toBe(0);

  // Validate depth parameters
  expect(cameraSensor.depth_parameters).toBeDefined();
  const depthParams = cameraSensor.depth_parameters;
  expect(depthParams.image_width).toBe(320);
  expect(depthParams.image_height).toBe(288);
  expect(depthParams.focal_length).toEqual([
    36893488147418093000, -36893488147418093000,
  ]);
  expect(depthParams.principal_point).toEqual([0, -0]);
  expect(depthParams.tangential_coefficients).toEqual([
    -36893488147418093000, 0,
  ]);
  expect(depthParams.radial_coefficients).toEqual([
    2, 2, 2, -36893488147418093000, 0, 2, 0, 0,
  ]);

  // Validate color parameters
  expect(cameraSensor.color_parameters).toBeDefined();
  const colorParams = cameraSensor.color_parameters;
  expect(colorParams.image_width).toBe(2048);
  expect(colorParams.image_height).toBe(1536);
  expect(colorParams.focal_length).toEqual([1.0842021724855044e-19, -2]);
  expect(colorParams.principal_point).toEqual([-2, 36893488147418093000]);
  expect(colorParams.tangential_coefficients).toEqual([
    -0, 36893488147418093000,
  ]);
  expect(colorParams.radial_coefficients).toEqual([
    1.0842021724855044e-19, -36893488147418093000, -36893488147418093000,
    -1.0842021724855044e-19, -2, 0, 0, 0,
  ]);

  // Validate camera pose
  expect(cameraSensor.camera_pose).toBeDefined();
  const cameraPose = cameraSensor.camera_pose;
  expect(cameraPose.translation).toBeDefined();
  expect(cameraPose.translation.x).toBe(-2);
  expect(cameraPose.translation.y).toBe(1.0842021724855044e-19);
  expect(cameraPose.translation.z).toBe(1.0842021724855044e-19);
  expect(cameraPose.rotation).toBeDefined();
  expect(cameraPose.rotation.x).toBe(-1.0842021724855044e-19);
  expect(cameraPose.rotation.y).toBe(-1.0842021724855044e-19);
  expect(cameraPose.rotation.z).toBe(36893488147418093000);
  expect(cameraPose.rotation.w).toBe(2);

  // Validate color2depth transform
  expect(cameraSensor.color2depth_transform).toBeDefined();
  const color2depthTransform = cameraSensor.color2depth_transform;
  expect(color2depthTransform.translation).toBeDefined();
  expect(color2depthTransform.translation.x).toBe(-0);
  expect(color2depthTransform.translation.y).toBe(-2);
  expect(color2depthTransform.translation.z).toBe(-1.0842021724855044e-19);
  expect(color2depthTransform.rotation).toBeDefined();
  expect(color2depthTransform.rotation.x).toBe(36893488147418093000);
  expect(color2depthTransform.rotation.y).toBe(0);
  expect(color2depthTransform.rotation.z).toBe(1.0842021724855044e-19);
  expect(color2depthTransform.rotation.w).toBe(-1.0842021724855044e-19);

  // Validate raw calibration data
  expect(cameraSensor.raw_calibration).toBeDefined();
  expect(Array.isArray(cameraSensor.raw_calibration)).toBe(true);
  expect(cameraSensor.raw_calibration.length).toBeGreaterThan(0);

  // Check that raw_calibration contains valid byte values (0-255)
  cameraSensor.raw_calibration.forEach((byte) => {
    const byteValue = Number(byte);
    expect(byteValue).toBeGreaterThanOrEqual(0);
    expect(byteValue).toBeLessThanOrEqual(255);
    expect(Number.isInteger(byteValue)).toBe(true);
  });
});
