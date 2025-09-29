import { onCleanup } from "solid-js";
import { Camera } from "..";
import { vec3 } from "wgpu-matrix";

export interface ArcballControls {
  init: (element: HTMLCanvasElement | HTMLVideoElement) => void;
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
  let element: HTMLCanvasElement | HTMLVideoElement | null = null;

  // Double tap detection
  let lastTapTime = 0;
  let tapCount = 0;
  let doubleTapTimeout: number | null = null;

  // Mouse event handlers
  const handleMouseDown = (event: Event) => {
    const mouseEvent = event as MouseEvent;
    mouseEvent.preventDefault();

    // Check if Cmd (Mac) or Ctrl (Windows/Linux) is pressed, or regular mouse button
    if (mouseEvent.metaKey || mouseEvent.ctrlKey || mouseEvent.button === 0) {
      isPanning = mouseEvent.metaKey || mouseEvent.ctrlKey;
      isMouseDown = true;
      lastMouseX = mouseEvent.clientX;
      lastMouseY = mouseEvent.clientY;
      if (element) {
        element.style.cursor = "grabbing";
      }
    }
  };

  const handleMouseMove = (event: Event) => {
    const mouseEvent = event as MouseEvent;
    if (!isMouseDown) return;

    const deltaX = mouseEvent.clientX - lastMouseX;
    const deltaY = mouseEvent.clientY - lastMouseY;

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

    lastMouseX = mouseEvent.clientX;
    lastMouseY = mouseEvent.clientY;
  };

  const handleMouseUp = () => {
    isMouseDown = false;
    isPanning = false;
    if (element) {
      element.style.cursor = "grab";
    }
  };

  const handleWheel = (event: Event) => {
    const wheelEvent = event as WheelEvent;
    wheelEvent.preventDefault();

    const zoomSpeed = 0.001;
    const zoomDelta = wheelEvent.deltaY * zoomSpeed;
    const currentDistance = camera.distance();
    camera.setLookAtDistance(currentDistance + zoomDelta);
  };

  const handleDoubleClick = (event: Event) => {
    const mouseEvent = event as MouseEvent;
    mouseEvent.preventDefault();

    // Double-click to reset view or zoom to fit
    if (mouseEvent.metaKey || mouseEvent.ctrlKey) {
      // Cmd/Ctrl + double-click: reset view
      resetView();
    } else {
      // Regular double-click: zoom to fit
      zoomToFit();
    }
  };

  // Touch event handlers
  const handleTouchStart = (event: Event) => {
    const touchEvent = event as TouchEvent;
    touchEvent.preventDefault();

    const currentTime = Date.now();

    if (touchEvent.touches.length === 1) {
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
        handleDoubleTap(touchEvent.touches[0]);
        tapCount = 0;
        if (doubleTapTimeout) {
          clearTimeout(doubleTapTimeout);
          doubleTapTimeout = null;
        }
      }

      lastTapTime = currentTime;

      // Start single touch rotation
      isMouseDown = true;
      lastMouseX = touchEvent.touches[0].clientX;
      lastMouseY = touchEvent.touches[0].clientY;
    } else if (touchEvent.touches.length === 2) {
      // Two-finger gesture
      const touch1 = touchEvent.touches[0];
      const touch2 = touchEvent.touches[1];

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

  const handleTouchMove = (event: Event) => {
    const touchEvent = event as TouchEvent;
    touchEvent.preventDefault();

    if (touchEvent.touches.length === 1 && isMouseDown && !isPanning) {
      // Single finger rotation
      const deltaX = touchEvent.touches[0].clientX - lastMouseX;
      const deltaY = touchEvent.touches[0].clientY - lastMouseY;

      const rotationSpeed = 0.005;
      const xAngle = deltaX * rotationSpeed;
      const yAngle = deltaY * rotationSpeed;

      camera.rotateAroundPivotPoint(xAngle, yAngle);

      lastMouseX = touchEvent.touches[0].clientX;
      lastMouseY = touchEvent.touches[0].clientY;
    } else if (touchEvent.touches.length === 2 && isPanning) {
      const touch1 = touchEvent.touches[0];
      const touch2 = touchEvent.touches[1];

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

  const handleTouchEnd = (event: Event) => {
    const touchEvent = event as TouchEvent;
    touchEvent.preventDefault();

    if (touchEvent.touches.length < 2) {
      isPanning = false;
    }
    if (touchEvent.touches.length === 0) {
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
  const init = (elem: HTMLCanvasElement | HTMLVideoElement) => {
    element = elem;

    // Mouse events
    element.addEventListener("mousedown", handleMouseDown);
    element.addEventListener("mousemove", handleMouseMove);
    element.addEventListener("mouseup", handleMouseUp);
    element.addEventListener("mouseleave", handleMouseUp);
    element.addEventListener("wheel", handleWheel);
    element.addEventListener("dblclick", handleDoubleClick);

    // Touch events
    element.addEventListener("touchstart", handleTouchStart);
    element.addEventListener("touchmove", handleTouchMove);
    element.addEventListener("touchend", handleTouchEnd);
    element.addEventListener("touchcancel", handleTouchEnd);

    // Keyboard events (on document for global access)
    document.addEventListener("keydown", handleKeyDown);

    // Set initial cursor
    element.style.cursor = "grab";

    // Cleanup function
    onCleanup(() => {
      if (element) {
        element.removeEventListener("mousedown", handleMouseDown);
        element.removeEventListener("mousemove", handleMouseMove);
        element.removeEventListener("mouseup", handleMouseUp);
        element.removeEventListener("mouseleave", handleMouseUp);
        element.removeEventListener("wheel", handleWheel);
        element.removeEventListener("dblclick", handleDoubleClick);
        element.removeEventListener("touchstart", handleTouchStart);
        element.removeEventListener("touchmove", handleTouchMove);
        element.removeEventListener("touchend", handleTouchEnd);
        element.removeEventListener("touchcancel", handleTouchEnd);
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
