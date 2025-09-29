import asyncio
import cv2
import numpy as np
from core.state import GlobalState
from performance.fps_counter import FPSCounter

FPS = 120

def prepare_cam_frame_texture(img_bgr):
    if img_bgr is None or not isinstance(img_bgr, np.ndarray) or img_bgr.ndim != 3:
        print("Received invalid frame from queue.")
        return None
    height, width, channels = img_bgr.shape
    if channels == 3:
        img_bgra = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2BGRA)
        bytes_per_pixel = 4
    else:
        print(f"Received frame with unexpected channel count: {channels}")
        return None
    
    img_bgra_contiguous = np.ascontiguousarray(img_bgra)
    aligned_bytes_per_row = (width * bytes_per_pixel + 255) & ~255

    data_layout = {
        "offset": 0,
        "bytes_per_row": aligned_bytes_per_row, # Use the ALIGNED value
        "rows_per_image": height,
    }
    copy_size = (width, height, 1) 
    return img_bgra_contiguous, data_layout, copy_size

class RenderLoop:
    def __init__(self, state: GlobalState):
        if state.console is None:
            raise ValueError("Console is not initialized")
        self._running = True
        self.state = state
        self.webrtc_runner = None
        self.fps_counter = FPSCounter(console=state.console, name="Render Loop")
        self.fps_counter.start()
    
    def stop(self):
        """Stop the render loop gracefully"""
        self._running = False
        self.state.console.log("Render loop stop requested")
        

    async def render_loop(self) -> None:
        # WebRTC server is started separately at pipeline level
        #self.renderer.resize(self.canvas)
        #self.canvas.draw_frame = self.renderer.render_frame

        while self._running and not self.state.should_exit:
            try:
                # colors = []
                # depths = []
                # # Keep previous frames if queue empty
                # if not hasattr(self, "_last_colors"):
                #     self._last_colors = [None, None, None, None]
                # if not hasattr(self, "_last_depths"):
                #     self._last_depths = [None, None, None, None]

                # for i in [0, 1, 2, 3]:
                #     cimg = None
                #     try:
                #         while True:
                #             cimg, cts = display_queues[i].get(block=False)
                #     except Exception:
                #         pass
                #     if cimg is None:
                #         cimg = self._last_colors[i]
                #     else:
                #         self._last_colors[i] = cimg

                #     dimg = None
                #     try:
                #         while True:
                #             dimg, dts = zdepth_decoded_queues[i].get(block=False)
                #     except Exception:
                #         pass
                #     if dimg is None:
                #         dimg = self._last_depths[i]
                #     else:
                #         self._last_depths[i] = dimg

                #     colors.append(cimg)
                #     depths.append(dimg)

                # # Debug queue sizes
                # # print(f"q color {[display_queues[i].qsize() for i in [0,1,2,3]]} depth {[zdepth_decoded_queues[i].qsize() for i in [0,1,2,3]]}")

                # self.state.renderer.camera_display_scene.set_color_images(colors)
                # self.state.renderer.camera_display_scene.set_depth_images(depths)
                # self.state.renderer.camera_display_scene.update_buffers()
                self.state.renderer.render_frame()
                self.fps_counter.increment()
            except Exception as e:
                self.state.console.log(f"Error during frame rendering: {e}")
                pass
            self.state.canvas.request_draw()
            #await asyncio.sleep(1 / FPS)
            
        
        # Cleanup WebRTC server when render loop ends
        if self.webrtc_runner:
            await self.webrtc_runner.cleanup()

    def set_metrics_callback(self, callback):
        if self.fps_counter:
            self.fps_counter._metrics_callback = callback
    
    def record_metrics(self, seconds: int):
        if self.fps_counter:
            self.fps_counter.record_metrics(seconds)

