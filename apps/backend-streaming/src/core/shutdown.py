"""
Shutdown management module for graceful application termination.
Handles Ctrl+C and other termination signals across all threads.
"""
import signal
import threading
import time
from typing import Optional
from core.state import GlobalState

class ShutdownManager:
    """Manages application shutdown across all threads and components"""
    
    def __init__(self, state: GlobalState):
        self.state = state
        self._shutdown_event = threading.Event()
        self._signal_received = False
        self._original_sigint_handler = None
        self._original_sigterm_handler = None
        
    def setup_signal_handlers(self):
        """Setup signal handlers for graceful shutdown"""
        self._original_sigint_handler = signal.signal(signal.SIGINT, self._signal_handler)
        self._original_sigterm_handler = signal.signal(signal.SIGTERM, self._signal_handler)
        self.state.console.log("Shutdown signal handlers installed")
        
    def _signal_handler(self, signum, frame):
        """Handle shutdown signals (Ctrl+C, SIGTERM)"""
        signal_name = "SIGINT" if signum == signal.SIGINT else "SIGTERM"
        self.state.console.log(f"Received {signal_name} signal, initiating shutdown...")
        self._signal_received = True
        self.request_shutdown()
        
    def request_shutdown(self):
        """Request application shutdown"""
        if not self._shutdown_event.is_set():
            self.state.console.log("Shutdown requested")
            self.state.should_exit = True
            self._shutdown_event.set()
            
    def is_shutdown_requested(self) -> bool:
        """Check if shutdown has been requested"""
        return self._shutdown_event.is_set() or self.state.should_exit
        
    def wait_for_shutdown(self, timeout: Optional[float] = None) -> bool:
        """Wait for shutdown to be requested"""
        return self._shutdown_event.wait(timeout)
        
    def cleanup(self):
        """Restore original signal handlers"""
        if self._original_sigint_handler is not None:
            signal.signal(signal.SIGINT, self._original_sigint_handler)
        if self._original_sigterm_handler is not None:
            signal.signal(signal.SIGTERM, self._original_sigterm_handler)
        self.state.console.log("Signal handlers restored")

# Global shutdown manager instance
_shutdown_manager: Optional[ShutdownManager] = None

def init_shutdown_manager(state: GlobalState) -> ShutdownManager:
    """Initialize the global shutdown manager"""
    global _shutdown_manager
    _shutdown_manager = ShutdownManager(state)
    _shutdown_manager.setup_signal_handlers()
    return _shutdown_manager

def get_shutdown_manager() -> Optional[ShutdownManager]:
    """Get the global shutdown manager instance"""
    return _shutdown_manager

def is_shutdown_requested() -> bool:
    """Quick check if shutdown has been requested"""
    return _shutdown_manager.is_shutdown_requested() if _shutdown_manager else False
