from typing import TypeVar, Generic, Callable
from threading import Lock
from .sorted_buffer import (
    SortedBuffer,
    SortedBufferEntry,
    SortedBufferGetResult,
)

T = TypeVar("T")


class TetrisEngineState(Generic[T]):
    def __init__(self, size: int):
        self.skipped = {"total": 0, "buffers": [0] * size}
        self.completed = 0


class TetrisEngine(Generic[T]):
    def __init__(
        self,
        size: int,
        max_buffer_size: int,
        max_index_value_delta: int,
        on_complete_row: Callable[[list[SortedBufferGetResult[T]]], None],
        remove_lower_index_values_on_complete_row: bool,
    ):
        self.buffer_lock = Lock()
        self.size = size
        self.max_buffer_size = max_buffer_size
        self.max_index_value_delta = max_index_value_delta
        self.on_complete_row = on_complete_row
        self.remove_lower_index_values_on_complete_row = (
            remove_lower_index_values_on_complete_row
        )
        self.buffers = [SortedBuffer[T](max_buffer_size) for _ in range(size)]
        self.state = TetrisEngineState[T](size)
        self.fps_counter = None # Attached only to be accesed by webrtc server

    def _check_complete_row(self, e_index_value: int):
        row_result: List[SortedBufferGetResult[T]] = []
        for buffer in self.buffers:
            result = buffer.get(e_index_value, self.max_index_value_delta)
            if result is None:
                return
            row_result.append(result)

        for i, buffer in enumerate(self.buffers):
            remove_result = buffer.remove(
                row_result[i].index, self.remove_lower_index_values_on_complete_row
            )
            skipped = remove_result.count - 1
            self.state.skipped["buffers"][i] += skipped
            self.state.skipped["total"] += skipped

        self.state.completed += 1
        self.on_complete_row(row_result)

    def insert(self, buffer_index: int, e: SortedBufferEntry[T]) -> int:
        if not 0 <= buffer_index < self.size:
            raise ValueError("Invalid buffer index")
        with self.buffer_lock:
            index = self.buffers[buffer_index].insert(e)
            self._check_complete_row(e.index_value)
            return index

    def get_buffers(self) -> list[SortedBuffer[T]]:
        return self.buffers

    def get_state(self) -> TetrisEngineState[T]:
        return self.state

    def set_metrics_callback(self, callback):
        if self.fps_counter:
            self.fps_counter._metrics_callback = callback
    
    def record_metrics(self, seconds: int):
        if self.fps_counter:
            self.fps_counter.record_metrics(seconds)