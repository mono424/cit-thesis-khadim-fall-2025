import asyncio
import os
import numpy as np
from PIL import Image
from performance.fps_counter import FPSCounter
from aiortc import RTCPeerConnection, RTCSessionDescription, VideoStreamTrack, RTCConfiguration
from aiohttp import web
import av # PyAV is used by aiortc for encoding
from core.state import GlobalState
from core.shutdown import is_shutdown_requested

# --- aiortc Video Track ---
class WgpuVideoStreamTrack(VideoStreamTrack):
    """A video track that streams frames from our WGPU renderer."""
    def __init__(self, state: GlobalState):
        super().__init__()
        if state.console is None:
            raise ValueError("Console is not initialized")
        self.state = state
        self.fps_counter = FPSCounter(console=state.console, name="WebRTCStream")
        self.fps_counter.start()
        self.state.console.log(f"Initialized WgpuVideoStreamTrack")
        self.last_frame = None

    async def recv(self):
        # Check if shutdown was requested
        if is_shutdown_requested():
            return None
            
        pts, time_base = await self.next_timestamp()

        # Get the latest rendered frame
        frame_data = self.state.renderer.draw_frame()

        if frame_data is None:
            return self.last_frame

        # Create a PyAV VideoFrame and convert RGBA to YUV420P for WebRTC
        rgba_frame = av.VideoFrame.from_ndarray(frame_data, format="rgba")
        rgba_frame.pts = pts
        rgba_frame.time_base = time_base

        frame = rgba_frame.reformat(
            format="yuv420p",
            dst_color_range=1,
            dst_colorspace=1,
            interpolation=Image.Resampling.LANCZOS,
            width=rgba_frame.width,
            height=rgba_frame.height,
        )

        self.fps_counter.increment()
        self.last_frame = frame
        return frame

class WebRTCServer:
    """WebRTC server for streaming video and handling signaling."""
    
    def __init__(self, state: GlobalState):
        if state.console is None:
            raise ValueError("Console is not initialized")
        self.state = state
        self.pcs = set()
        self.latest_camera_matrix = None
        self.app = None
        self.camera_data_channel = None  # Store the single camera data channel
        self.metrics_queue = []  # Queue for metrics data
        self._setup_app()
        self.metrics_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "shared")
        
        # Create metrics callback for sending CSV data
        def send_metrics_callback(csv_data: str):
            self.queue_csv_data(csv_data, "Remote Camera")
            
        self._camera_fps = FPSCounter(console=state.console, name="Remote Camera", 
                                     metrics_callback=send_metrics_callback)
        self._camera_fps.start()
    
    def _setup_app(self):
        """Set up the aiohttp web application with routes."""
        self.app = web.Application()
        self.app.on_shutdown.append(self._on_shutdown)
        self.app.router.add_post("/offer", self._offer)
    
    async def _on_shutdown(self, app):
        """Clean up peer connections on shutdown."""
        coros = [pc.close() for pc in self.pcs]
        await asyncio.gather(*coros)
        self.pcs.clear()
    
    async def _offer(self, request):
        """Handle WebRTC offer and create answer."""
        params = await request.json()
        offer = RTCSessionDescription(sdp=params["sdp"], type=params["type"])
        configuration = RTCConfiguration(
            iceServers=[],
        )
        pc = RTCPeerConnection(configuration)
        self.pcs.add(pc)

        @pc.on("connectionstatechange")
        async def on_connectionstatechange():
            if pc.connectionState == "failed":
                await pc.close()
                self.pcs.discard(pc)
                
        @pc.on("datachannel")
        def on_datachannel(channel):
            self.state.console.log(f"Data channel '{channel.label}' created!")
            self.camera_data_channel = channel  # Store the single camera data channel
            
            @channel.on("close")
            def on_close():
                self.camera_data_channel = None
                self.state.console.log(f"Data channel '{channel.label}' closed!")

            @channel.on("message")
            def on_message(message):
                if not isinstance(message, bytes):
                    self.state.console.log(f"Invalid message type: {type(message)}")
                    return

                if len(message) == 128:
                    self._camera_fps.increment()
                    combined_array = np.frombuffer(message, dtype=np.float32)
                    self.state.remote_camera.update(combined_array[:16], combined_array[16:])
                elif len(message) == 8:
                    canvas_size = np.frombuffer(message, dtype=np.int32)
                    if self.state.canvas is None:
                        self.state.console.log(f"Canvas is not initialized")
                        return
                    self.state.canvas.set_logical_size(*canvas_size)
                    self.state.console.log(f"Canvas size updated: {canvas_size[0]}x{canvas_size[1]}")
                elif len(message) == 4:
                    seconds_to_record = int(np.frombuffer(message, dtype=np.int32)[0])
                    self.state.console.log(f"Starting metrics recording for {seconds_to_record} seconds")

                    # delete all files in metrics directory
                    try:
                        os.makedirs(self.metrics_dir, exist_ok=True)
                        for file in os.listdir(self.metrics_dir):
                                os.remove(os.path.join(self.metrics_dir, file))
                        self.state.console.log(f"Deleted all files in metrics directory")
                    except Exception as e:
                        self.state.console.log(f"Error deleting files in metrics directory: {e}")
                    
                    # Set up metrics callbacks for components that need them
                    if self.state.tetris_buffer and hasattr(self.state.tetris_buffer, 'set_metrics_callback'):
                        self.state.tetris_buffer.set_metrics_callback(
                            lambda csv: self.queue_csv_data(csv, "Tetris Buffer")
                        )
                    if self.state.pointcloud_transformer and hasattr(self.state.pointcloud_transformer, 'set_metrics_callback'):
                        self.state.pointcloud_transformer.set_metrics_callback(
                            lambda csv: self.queue_csv_data(csv, "Pointcloud Transformer")
                        )
                    if self.state.depth_processor and hasattr(self.state.depth_processor, 'set_metrics_callback'):
                        self.state.depth_processor.set_metrics_callback(
                            lambda csv: self.queue_csv_data(csv, "Depth Processor")
                        )
                    if hasattr(self.state, 'render_loop') and hasattr(self.state.render_loop, 'set_metrics_callback'):
                        self.state.render_loop.set_metrics_callback(
                            lambda csv: self.queue_csv_data(csv, "Render Loop")
                        )
                    
                    # Start recording metrics for all components
                    if hasattr(self.state.tetris_buffer, 'record_metrics'):
                        self.state.tetris_buffer.record_metrics(seconds_to_record)
                    if hasattr(self.state.pointcloud_transformer, 'record_metrics'):
                        self.state.pointcloud_transformer.record_metrics(seconds_to_record)
                    if hasattr(self.state.depth_processor, 'record_metrics'):
                        self.state.depth_processor.record_metrics(seconds_to_record)
                    if hasattr(self.state, 'render_loop') and hasattr(self.state.render_loop, 'record_metrics'):
                        self.state.render_loop.record_metrics(seconds_to_record)
                    
                    # Also record camera FPS metrics
                    self._camera_fps.record_metrics(seconds_to_record)
                else:
                    self.state.console.log(f"Invalid message length: {len(message)}")

        await pc.setRemoteDescription(offer)
        
        video_track = WgpuVideoStreamTrack(self.state)
        pc.addTrack(video_track)
        
        answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)

        return web.json_response({
            "sdp": pc.localDescription.sdp,
            "type": pc.localDescription.type,
        })
    
    def queue_csv_data(self, csv_data: str, component_name: str = ""):
        if csv_data:
            self.metrics_queue.append({
                "component": component_name,
                "data": csv_data
            })
            with open(os.path.join(self.metrics_dir, f"{component_name}.csv"), "a") as f:
                _ =f.write(csv_data)
            self.state.console.log(f"Queued CSV data for {component_name} ({len(csv_data)} chars)")
            # Schedule the async method to run in the event loop
            self._process_metrics_queue()
    
    def _process_metrics_queue(self):
        if not self.camera_data_channel or not self.metrics_queue:
            return
            
        try:
            if self.camera_data_channel.readyState == "open":
                while self.metrics_queue:
                    metrics_item = self.metrics_queue.pop(0)
                    message = f"METRICS:{metrics_item['component']}:{metrics_item['data']}\n"
                    try:
                        self.camera_data_channel.send(message)
                        self.state.console.log(f"Sent CSV data for {metrics_item['component']} via camera channel")
                            
                    except Exception as send_error:
                        self.state.console.log(f"Error sending individual message: {send_error}")
                        self.metrics_queue.insert(0, metrics_item)
                        break
                        
            else:
                self.state.console.log("Camera data channel is not open, keeping metrics in queue")
        except Exception as e:
            self.state.console.log(f"Error processing metrics queue: {e}")
    
    def run(self):
        """Run the aiohttp web server with shutdown monitoring."""
        try:
            self.state.console.log("WebRTC server starting on http://0.0.0.0:8093")
            
            # Create an event loop for this thread
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            
            # Run the server with periodic shutdown checking
            loop.run_until_complete(self._run_with_shutdown_monitoring())
            
        except Exception as e:
            self.state.console.log(f"WebRTC server error: {e}")
            import traceback
            traceback.print_exc()
        finally:
            self.state.console.log("WebRTC server stopped")
            
    async def _run_with_shutdown_monitoring(self):
        """Run the web server with shutdown monitoring."""
        # Create the server
        runner = web.AppRunner(self.app, handle_signals=False)
        await runner.setup()
        
        site = web.TCPSite(runner, "0.0.0.0", 8093)
        await site.start()
        
        self.state.console.log("WebRTC server started, monitoring for shutdown...")
        
        # Monitor for shutdown
        try:
            while not is_shutdown_requested():
                await asyncio.sleep(0.1)
        finally:
            self.state.console.log("WebRTC server shutdown requested")
            await runner.cleanup()

def init_webrtc(state: GlobalState):
    webrtc_server = WebRTCServer(state)
    state.set_webrtc_server(webrtc_server)

def run_webrtc(state: GlobalState):
    state.webrtc_server.run()