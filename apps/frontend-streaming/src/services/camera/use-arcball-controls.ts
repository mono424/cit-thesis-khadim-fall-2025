import { onCleanup } from "solid-js";
import { Camera } from "./arcball";
import { vec3 } from "wgpu-matrix";

export interface ArcballControls {
  init: (videoElement: HTMLVideoElement) => void;
  resetView: () => void;
  zoomToFit: () => void;
}

export function useArcballControls(camera: Camera): ArcballControls {
  // Mouse/touch control state
  let isMouseDown = false;
  let isPanning = false;
  let lastMouseX = 0;
  let lastMouseY = 0;
  let touchStartDistance = 0;
  let initialDistance = 0;
  let initialTouchX = 0;
  let initialTouchY = 0;
  let videoElement: HTMLVideoElement | null = null;

  // Double tap detection
  let lastTapTime = 0;
  let tapCount = 0;
  let doubleTapTimeout: number | null = null;

  // Mouse event handlers
  const handleMouseDown = (event: MouseEvent) => {
    event.preventDefault();

    // Check if Cmd (Mac) or Ctrl (Windows/Linux) is pressed, or regular mouse button
    if (event.metaKey || event.ctrlKey || event.button === 0) {
      isPanning = event.metaKey || event.ctrlKey;
      isMouseDown = true;
      lastMouseX = event.clientX;
      lastMouseY = event.clientY;
      if (videoElement) {
        videoElement.style.cursor = "grabbing";
      }
    }
  };

  const handleMouseMove = (event: MouseEvent) => {
    if (!isMouseDown) return;

    const deltaX = event.clientX - lastMouseX;
    const deltaY = event.clientY - lastMouseY;

    if (isPanning) {
      // Pan mode: translate the camera (move up/down/left/right)
      camera.panCamera(deltaX, deltaY);
    } else {
      // Rotate mode: rotate around pivot point
      const rotationSpeed = 0.005;
      const xAngle = deltaX * rotationSpeed;
      const yAngle = deltaY * rotationSpeed;
      camera.rotateAroundPivotPoint(xAngle, yAngle);
    }

    lastMouseX = event.clientX;
    lastMouseY = event.clientY;
  };

  const handleMouseUp = () => {
    isMouseDown = false;
    isPanning = false;
    if (videoElement) {
      videoElement.style.cursor = "grab";
    }
  };

  const handleWheel = (event: WheelEvent) => {
    event.preventDefault();

    const zoomSpeed = 0.001;
    const zoomDelta = event.deltaY * zoomSpeed;
    const currentDistance = camera.distance();
    camera.setLookAtDistance(currentDistance + zoomDelta);
  };

  const handleDoubleClick = (event: MouseEvent) => {
    event.preventDefault();

    // Double-click to reset view or zoom to fit
    if (event.metaKey || event.ctrlKey) {
      // Cmd/Ctrl + double-click: reset view
      resetView();
    } else {
      // Regular double-click: zoom to fit
      zoomToFit();
    }
  };

  // Touch event handlers
  const handleTouchStart = (event: TouchEvent) => {
    event.preventDefault();

    const currentTime = Date.now();

    if (event.touches.length === 1) {
      // Single touch - check for double tap
      tapCount++;

      if (doubleTapTimeout) {
        clearTimeout(doubleTapTimeout);
        doubleTapTimeout = null;
      }

      if (tapCount === 1) {
        doubleTapTimeout = window.setTimeout(() => {
          tapCount = 0;
        }, 300);
      } else if (tapCount === 2 && currentTime - lastTapTime < 300) {
        // Double tap detected
        handleDoubleTap(event.touches[0]);
        tapCount = 0;
        if (doubleTapTimeout) {
          clearTimeout(doubleTapTimeout);
          doubleTapTimeout = null;
        }
      }

      lastTapTime = currentTime;

      // Start single touch rotation
      isMouseDown = true;
      lastMouseX = event.touches[0].clientX;
      lastMouseY = event.touches[0].clientY;
    } else if (event.touches.length === 2) {
      // Two-finger gesture
      const touch1 = event.touches[0];
      const touch2 = event.touches[1];

      touchStartDistance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) +
          Math.pow(touch2.clientY - touch1.clientY, 2)
      );

      initialDistance = camera.distance();
      initialTouchX = (touch1.clientX + touch2.clientX) / 2;
      initialTouchY = (touch1.clientY + touch2.clientY) / 2;

      isPanning = true;
      isMouseDown = false; // Disable single touch rotation
      tapCount = 0; // Reset tap count on multi-touch
    }
  };

  const handleTouchMove = (event: TouchEvent) => {
    event.preventDefault();

    if (event.touches.length === 1 && isMouseDown && !isPanning) {
      // Single finger rotation
      const deltaX = event.touches[0].clientX - lastMouseX;
      const deltaY = event.touches[0].clientY - lastMouseY;

      const rotationSpeed = 0.005;
      const xAngle = deltaX * rotationSpeed;
      const yAngle = deltaY * rotationSpeed;

      camera.rotateAroundPivotPoint(xAngle, yAngle);

      lastMouseX = event.touches[0].clientX;
      lastMouseY = event.touches[0].clientY;
    } else if (event.touches.length === 2 && isPanning) {
      const touch1 = event.touches[0];
      const touch2 = event.touches[1];

      // Calculate current distance for pinch-to-zoom
      const currentDistance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) +
          Math.pow(touch2.clientY - touch1.clientY, 2)
      );

      // Calculate zoom based on pinch distance
      const scaleMultiplier = touchStartDistance / currentDistance;
      const newDistance = Math.max(
        0.5,
        Math.min(50.0, initialDistance * scaleMultiplier)
      );

      camera.setLookAtDistance(newDistance);

      // Calculate current center point for potential panning
      const currentTouchX = (touch1.clientX + touch2.clientX) / 2;
      const currentTouchY = (touch1.clientY + touch2.clientY) / 2;

      // Two-finger rotation based on center point movement
      const deltaX = currentTouchX - initialTouchX;
      const deltaY = currentTouchY - initialTouchY;

      if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
        // Threshold to avoid jitter
        const rotationSpeed = 0.002;
        const xAngle = deltaX * rotationSpeed;
        const yAngle = deltaY * rotationSpeed;

        camera.rotateAroundPivotPoint(xAngle, yAngle);

        // Update initial values for smooth continuous gestures
        initialTouchX = currentTouchX;
        initialTouchY = currentTouchY;
      }
    }
  };

  const handleTouchEnd = (event: TouchEvent) => {
    event.preventDefault();

    if (event.touches.length < 2) {
      isPanning = false;
    }
    if (event.touches.length === 0) {
      isMouseDown = false;
    }
  };

  const handleDoubleTap = (touch: Touch) => {
    // Double tap to zoom to fit
    zoomToFit();
  };

  // Keyboard event handlers
  const handleKeyDown = (event: KeyboardEvent) => {
    // Only handle if no input is focused
    if (
      document.activeElement?.tagName === "INPUT" ||
      document.activeElement?.tagName === "TEXTAREA"
    ) {
      return;
    }

    const rotationSpeed = 0.1;
    const zoomSpeed = 0.5;

    switch (event.code) {
      case "ArrowUp":
      case "KeyW":
        event.preventDefault();
        camera.rotateAroundPivotPoint(0, -rotationSpeed);
        break;
      case "ArrowDown":
      case "KeyS":
        event.preventDefault();
        camera.rotateAroundPivotPoint(0, rotationSpeed);
        break;
      case "ArrowLeft":
      case "KeyA":
        event.preventDefault();
        camera.rotateAroundPivotPoint(-rotationSpeed, 0);
        break;
      case "ArrowRight":
      case "KeyD":
        event.preventDefault();
        camera.rotateAroundPivotPoint(rotationSpeed, 0);
        break;
      case "Equal": // Plus key
      case "NumpadAdd":
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          const currentDistance = camera.distance();
          camera.setLookAtDistance(Math.max(0.5, currentDistance - zoomSpeed));
        }
        break;
      case "Minus":
      case "NumpadSubtract":
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          const currentDistance = camera.distance();
          camera.setLookAtDistance(Math.min(50.0, currentDistance + zoomSpeed));
        }
        break;
      case "Digit0":
      case "Numpad0":
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          resetView();
        }
        break;
      case "KeyR":
        event.preventDefault();
        resetView();
        break;
      case "KeyF":
        event.preventDefault();
        zoomToFit();
        break;
    }
  };

  // Utility functions
  const resetView = () => {
    // Reset to initial camera position
    camera.setContext({
      eye: vec3.fromValues(5, 3, -5),
      lookAt: vec3.fromValues(0, 0, 0),
      up: vec3.fromValues(0, 0, -1),
      fov: Math.PI / 3,
      aspect: 1.0,
      near: 0.1,
      far: 50.0,
    });
  };

  const zoomToFit = () => {
    // Set a good default distance for viewing point clouds
    camera.setLookAtDistance(8);
  };

  // Initialize function to bind event listeners
  const init = (video: HTMLVideoElement) => {
    videoElement = video;

    // Mouse events
    videoElement.addEventListener("mousedown", handleMouseDown);
    videoElement.addEventListener("mousemove", handleMouseMove);
    videoElement.addEventListener("mouseup", handleMouseUp);
    videoElement.addEventListener("mouseleave", handleMouseUp);
    videoElement.addEventListener("wheel", handleWheel);
    videoElement.addEventListener("dblclick", handleDoubleClick);

    // Touch events
    videoElement.addEventListener("touchstart", handleTouchStart);
    videoElement.addEventListener("touchmove", handleTouchMove);
    videoElement.addEventListener("touchend", handleTouchEnd);
    videoElement.addEventListener("touchcancel", handleTouchEnd);

    // Keyboard events (on document for global access)
    document.addEventListener("keydown", handleKeyDown);

    // Set initial cursor
    videoElement.style.cursor = "grab";

    // Cleanup function
    onCleanup(() => {
      if (videoElement) {
        videoElement.removeEventListener("mousedown", handleMouseDown);
        videoElement.removeEventListener("mousemove", handleMouseMove);
        videoElement.removeEventListener("mouseup", handleMouseUp);
        videoElement.removeEventListener("mouseleave", handleMouseUp);
        videoElement.removeEventListener("wheel", handleWheel);
        videoElement.removeEventListener("dblclick", handleDoubleClick);
        videoElement.removeEventListener("touchstart", handleTouchStart);
        videoElement.removeEventListener("touchmove", handleTouchMove);
        videoElement.removeEventListener("touchend", handleTouchEnd);
        videoElement.removeEventListener("touchcancel", handleTouchEnd);
      }
      document.removeEventListener("keydown", handleKeyDown);

      if (doubleTapTimeout) {
        clearTimeout(doubleTapTimeout);
      }
    });
  };

  return {
    init,
    resetView,
    zoomToFit,
  };
}
