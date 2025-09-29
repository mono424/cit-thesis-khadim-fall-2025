import time
import threading
from typing import Callable, Any
from dataclasses import dataclass, field
from rich.console import Console

@dataclass
class MetricsData:
    """Data structure for metrics recording"""
    time: int
    duration: int
    session_name: str
    event_name: str
    event_start_time: int
    event_duration: int|None
    fps: float|None = None
    custom_data: dict[str, Any] = field(default_factory=dict)

class FPSCounter:
    def __init__(self, console: Console, name: str, interval: int = 3, 
                 metrics_callback: Callable[[str], None] | None = None):
        if interval <= 0:
            raise ValueError("Interval must be a positive number.")
        self._console = console
        self._name = name
        self.interval = interval
        self._count = 0
        self._lock = threading.Lock()
        self._running = False
        self._thread = None
        self._metrics_callback = metrics_callback
        self._recording_metrics = False
        self._metrics_data: list[MetricsData] = []
        self._session_start_time = 0
        self._session_name = ""

    def _is_shutdown_requested(self):
        """Check if shutdown is requested, avoiding circular imports"""
        try:
            from core.shutdown import is_shutdown_requested
            return is_shutdown_requested()
        except ImportError:
            return False
    
    def _run_reporter(self):
        self._console.log(f"[FPS REPORT] {self._name} | Thread started.")
        while self._running and not self._is_shutdown_requested():
            # Wait for the specified interval, but check shutdown periodically
            for _ in range(int(self.interval * 10)):
                if not self._running or self._is_shutdown_requested():
                    self._console.log(f"[FPS REPORT] {self._name} | Thread stopping due to shutdown.")
                    return
                time.sleep(0.1)

            with self._lock:
                current_count = self._count
                self._count = 0

            fps = current_count / self.interval
            self._console.log(f"[FPS REPORT] {self._name} | Frames: {current_count}, FPS: {fps:.2f}")
            
            if self._recording_metrics:
                current_time = int(time.time() * 1000)
                event_start_time = current_time - (self.interval * 1000)
                
                metrics = MetricsData(
                    time=current_time,
                    duration=self.interval * 1000,
                    session_name=self._session_name,
                    event_name="fps",
                    event_start_time=event_start_time,
                    event_duration=None,
                    fps=fps
                )
                self._metrics_data.append(metrics)

    def increment(self):
        with self._lock:
            self._count += 1
    
    def emit_event(self, event_name: str, data: dict[str, Any]):
        """Emit a custom event with arbitrary data (like frontend's emitEvent)"""
        if not self._recording_metrics:
            return
            
        current_time = int(time.time() * 1000)
        metrics = MetricsData(
            time=current_time,
            duration=1000,  # 1 second for custom events
            session_name=self._session_name,
            event_name=event_name,
            event_start_time=current_time - 1000,
            event_duration=None,
            custom_data=data
        )
        self._metrics_data.append(metrics)

    def start(self):
        if self._running:
            self._console.log(f"[FPS REPORT] {self._name} | Already running.")
            return

        self._running = True
        self._thread = threading.Thread(target=self._run_reporter, daemon=True)
        self._thread.start()
        
    def stop(self):
        if not self._running:
            self._console.log(f"[FPS REPORT] {self._name} | Not running.")
            return
            
        self._running = False
        self._console.log(f"[FPS REPORT] {self._name} | Thread stopped.")

    def __enter__(self):
        self.start()
        return self

    def __exit__(self):
        self.stop()
    
    def record_metrics(self, seconds: int):
        """Start recording metrics for the specified duration in seconds"""
        if self._recording_metrics:
            self._console.log(f"[FPS REPORT] {self._name} | Already recording metrics.")
            return
            
        self._session_start_time = int(time.time() * 1000)
        self._session_name = f"streaming_webrtc_{self._session_start_time}"
        self._recording_metrics = True
        self._metrics_data.clear()
        
        self._console.log(f"[FPS REPORT] {self._name} | Started recording metrics for {seconds} seconds.")
        
        # Schedule stopping the recording
        def stop_recording():
            # Sleep in small intervals to check for shutdown
            for _ in range(seconds * 10):  # Check every 0.1 seconds
                if self._is_shutdown_requested():
                    break
                time.sleep(0.1)
            self._stop_recording()
            
        recording_thread = threading.Thread(target=stop_recording, daemon=True)
        recording_thread.start()
    
    def _stop_recording(self):
        """Stop recording metrics and send data via callback"""
        if not self._recording_metrics:
            return
            
        self._recording_metrics = False
        
        # Convert metrics data to CSV format
        csv_data = self._metrics_to_csv()
        
        self._console.log(f"[FPS REPORT] {self._name} | Stopped recording. Collected {len(self._metrics_data)} data points.")
        
        # Send data via callback if available
        if self._metrics_callback and csv_data:
            self._metrics_callback(csv_data)
        
        self._metrics_data.clear()
    
    def _metrics_to_csv(self) -> str:
        """Convert metrics data to CSV format"""
        if not self._metrics_data:
            return ""
        
        # Collect all unique keys from custom_data across all metrics
        all_custom_keys = set()
        for metrics in self._metrics_data:
            if metrics.custom_data and len(metrics.custom_data) > 0:
                all_custom_keys.update(metrics.custom_data.keys())
        all_custom_keys = sorted(all_custom_keys)  # Consistent ordering
        
        # Build CSV header
        header_fields = [
            '"time"', '"duration"', '"sessionName"', '"eventName"', '"eventStartTime"', '"eventDuration"'
        ]
        
        # Add FPS column if any metrics have FPS data
        has_fps = any(metrics.fps is not None for metrics in self._metrics_data)
        if has_fps:
            header_fields.append('"fps"')
        
        # Add custom data columns
        for key in all_custom_keys:
            header_fields.append(f'"{key}"')
        
        header = ','.join(header_fields)
        
        # CSV rows
        rows = []
        for metrics in self._metrics_data:
            row_fields = [
                f'"{metrics.time}"',
                f'"{metrics.duration}"',
                f'"{metrics.session_name}"',
                f'"{metrics.event_name}"',
                f'"{metrics.event_start_time}"',
                f'"{metrics.event_duration or "null"}"'
            ]
            
            # Add FPS value if FPS column exists
            if has_fps:
                fps_value = f"{metrics.fps:.2f}" if metrics.fps is not None else "null"
                row_fields.append(f'"{fps_value}"')
            
            # Add custom data values in consistent order
            for key in all_custom_keys:
                value = "null"
                if metrics.custom_data and len(metrics.custom_data) > 0 and key in metrics.custom_data:
                    value = metrics.custom_data[key]
                row_fields.append(f'"{value}"')
            
            rows.append(','.join(row_fields))
        
        return header + "\n" + "\n".join(rows)
