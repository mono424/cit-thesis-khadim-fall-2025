from core.state import GlobalState
#from PySide6 import QtWidgets

def init_canvas(state: GlobalState):
    if state.render_method == "onscreen":
        #app = QtWidgets.QApplication([])
        #from wgpu.gui.auto import WgpuCanvas
        #state.set_canvas(WgpuCanvas(size=(1280, 960), title="wgpu onscreen canvas"))
        raise ValueError("Onscreen rendering is disabled")
    else:
        from wgpu.gui.offscreen import WgpuCanvas
        state.set_canvas(WgpuCanvas(size=(1280, 960), title="wgpu offscreen canvas"))