# Thesis Final Apps

Two application architectures for real-time depth data visualization:

## 1. Standalone

Frontend-only app that connects directly to Zenoh, decodes ZDepth data, converts to point clouds, and renders 3D via WebGPU.

**Run:** `pnpm dev:standalone`

## 2. Streaming

Backend-frontend architecture where the backend connects to Zenoh, processes depth data, renders point clouds, and streams images via WebRTC to the frontend. Frontend can send camera updates back to backend.

**Run:** `pnpm dev:streaming`

Both apps visualize depth data as 3D point clouds with real-time camera control.

## Docker: Build & Run

Build images from repo root:

```bash
# Standalone frontend (Nginx)
docker build -f Dockerfile.frontend-standalone -t thesis-frontend-standalone .

# Streaming frontend (Nginx)
docker build -f Dockerfile.frontend-streaming -t thesis-frontend-streaming .

# Backend (Python)
docker build -f Dockerfile.backend-streaming -t thesis-backend-streaming .
```

**Note:** The backend streaming service requires a Zenoh configuration file. Create `apps/backend-streaming/config/zenoh_config.json5` based on `apps/backend-streaming/config/zenoh_config.json5.example` before running the backend container.

Run containers:

```bash
# Standalone frontend on http://localhost:8001
docker run --rm -p 8001:80 thesis-frontend-standalone

# Streaming frontend on http://localhost:8002
docker run --rm -p 8002:80 thesis-frontend-streaming

# Streaming backend on http://localhost:8080
docker run --rm -p 8080:8080 thesis-backend-streaming
```

Notes on upstream URLs (Nginx proxy targets):

- Standalone app (`apps/frontend-standalone/nginx.conf`)

  - Proxy for `/_zenoh` defaults to `http://host.docker.internal:10000`.
  - Change this to your Zenoh Gateway URL if different.
  - Example:
    ```nginx
    # apps/frontend-standalone/nginx.conf
    location = /_zenoh { proxy_pass http://host.docker.internal:10000; }
    location /_zenoh/ { proxy_pass http://host.docker.internal:10000; }
    ```

- Streaming app (`apps/frontend-streaming/nginx.conf`)
  - Proxy for `/_` defaults to `http://host.docker.internal:8080/` (path-stripping to upstream root).
  - Point this to your backend streaming service (if backend runs in Docker, use its container name instead of `host.docker.internal`).
  - Example:
    ```nginx
    # apps/frontend-streaming/nginx.conf
    location = /_ { proxy_pass http://host.docker.internal:8080/; }
    location /_/ { proxy_pass http://host.docker.internal:8080/; }
    ```

Make sure to rebuild the container after changing the nginx.conf file.
