from PySide6 import QtWidgets, QtAsyncio
from core.state import GlobalState

class UiWindow(QtWidgets.QWidget):
    def __init__(self, state: GlobalState):
        super().__init__()
        self.resize(1280, 960)
        self.setWindowTitle("ARTEKMed Web Streaming")
        self._running = True

        # ==================== INIT CANVAS ====================
        layout = QtWidgets.QHBoxLayout()
        if state.render_method == "onscreen":
            layout.addWidget(state.canvas, 1)
        self.setLayout(layout)
        self.show()

    def closeEvent(self, event):
        self._running = False
        app = QtWidgets.QApplication.instance()
        if app:
            app.quit()
        event.accept()

def run_ui(state: GlobalState):
    ui_window = UiWindow(state)
    QtAsyncio.run(state.render_loop.render_loop())
