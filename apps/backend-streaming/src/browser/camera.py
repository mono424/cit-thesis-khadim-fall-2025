from core.state import GlobalState
import numpy as np

class RemoteCamera:
    def __init__(self, state: GlobalState):
        self.state = state
        self.view_matrix = np.eye(4, dtype=np.float32)
        self.projection_matrix = np.eye(4, dtype=np.float32)

    def update(self, view_matrix: np.ndarray, projection_matrix: np.ndarray):
        self.view_matrix = view_matrix
        self.projection_matrix = projection_matrix

    def get_view_matrix(self) -> np.ndarray:
        return self.view_matrix
            
    def get_projection_matrix(self) -> np.ndarray:
        return self.projection_matrix

def init_remote_camera(state: GlobalState):
    state.set_remote_camera(RemoteCamera(state))