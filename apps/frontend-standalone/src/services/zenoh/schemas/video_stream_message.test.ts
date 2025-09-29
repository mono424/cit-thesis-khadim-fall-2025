import { expect, test } from "@jest/globals";
import { parseCDRString } from "@mono424/cdr-ts";
import sample from "./samples/sample_video_stream.json";
import { videoStreamMessageSchema } from "./video_stream_message";

test("parseCDRBytes with valid data", () => {
  const parsed = parseCDRString(sample.payload, videoStreamMessageSchema, {
    maxSequenceSize: 1024 * 1024 * 15, // 15MB
  });

  expect(parsed.header.representationIdentifier).toEqual(256);
  expect(parsed.header.representationOptions).toEqual(0);

  expect(parsed.payload.header.stamp.nanosec).toEqual(543331401);
  expect(parsed.payload.header.stamp.sec).toEqual(1749203785);
  expect(parsed.payload.header.frame_id).toEqual("camera01");

  expect(parsed.payload.pose.translation.x).toBe(1.0842021724855044e-19);
  expect(parsed.payload.pose.translation.y).toBe(-1.0842021724855044e-19);
  expect(parsed.payload.pose.translation.z).toBe(-36893488147419103000);

  expect(parsed.payload.pose.rotation.x).toBe(-36893488147419103000);
  expect(parsed.payload.pose.rotation.y).toBe(0);
  expect(parsed.payload.pose.rotation.z).toBe(36893488147419103000);
  expect(parsed.payload.pose.rotation.w).toBe(1.0842021724855044e-19);

  expect(parsed.payload.camera_focal_length[0]).toBe(965.5166625976562);
  expect(parsed.payload.camera_focal_length[1]).toBe(965.4364013671875);

  expect(parsed.payload.camera_principal_point[0]).toBe(1017.4891357421875);
  expect(parsed.payload.camera_principal_point[1]).toBe(769.8952026367188);

  expect(parsed.payload.camera_radial_distortion[0]).toBe(0.5537176728248596);
  expect(parsed.payload.camera_radial_distortion[1]).toBe(-2.70536208152771);
  expect(parsed.payload.camera_radial_distortion[2]).toBe(1.5680779218673706);

  expect(parsed.payload.camera_tangential_distortion[0]).toBe(
    0.0005469124298542738
  );
  expect(parsed.payload.camera_tangential_distortion[1]).toBe(
    -0.00007956710032885894
  );

  expect(parsed.payload.image_bytes).toBe(122487);
  expect(parsed.payload.image).toHaveLength(122487);
});
