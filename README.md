# Thesis Final Apps

Two application architectures for real-time depth data visualization:

## 1. Standalone

Frontend-only app that connects directly to Zenoh, decodes ZDepth data, converts to point clouds, and renders 3D via WebGPU.

**Run:** `pnpm dev:standalone`

## 2. Streaming

Backend-frontend architecture where the backend connects to Zenoh, processes depth data, renders point clouds, and streams images via WebRTC to the frontend. Frontend can send camera updates back to backend.

**Run:** `pnpm dev:streaming`

Both apps visualize depth data as 3D point clouds with real-time camera control.
