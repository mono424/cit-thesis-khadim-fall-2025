from typing import List, TypeVar, Generic, NamedTuple

T = TypeVar('T')


class SortedBufferEntry(NamedTuple):
    value: T
    index_value: int


class SortedBufferGetResult(NamedTuple):
    result: SortedBufferEntry[T]
    delta: int
    index: int


class RemoveResult(NamedTuple):
    count: int


class SortedBuffer(Generic[T]):
    def __init__(self, max_size: int):
        self.max_size = max_size
        self.array: List[SortedBufferEntry[T]] = []

    def __len__(self):
        return len(self.array)

    def _location_of(self, e_index_val: int, start: int, end: int) -> int:
        pivot = start + (end - start) // 2
        if pivot >= len(self.array) or self.array[pivot].index_value == e_index_val:
            return pivot
        if end - start <= 1:
            return pivot if self.array[pivot].index_value < e_index_val else pivot + 1
        if self.array[pivot].index_value > e_index_val:
            return self._location_of(e_index_val, pivot + 1, end)
        else:
            return self._location_of(e_index_val, start, pivot)

    def insert(self, e: SortedBufferEntry[T]) -> int:
        location = self._location_of(e.index_value, 0, len(self.array))
        self.array.insert(location, e)
        if len(self.array) > self.max_size:
            self.array.pop()
        return location

    def get(self, index_value: int, delta: int) -> SortedBufferGetResult[T] | None:
        loc = self._location_of(index_value, 0, len(self.array))
        res = None
        for i in [loc, loc - 1, loc + 1]:
            if 0 <= i < len(self.array):
                item = self.array[i]
                item_delta = abs(item.index_value - index_value)
                if item_delta <= delta:
                    if res is None or res.delta > item_delta:
                        res = SortedBufferGetResult(result=item, delta=item_delta, index=i)
        return res

    def remove(self, index: int, delete_lower_index_values: bool) -> RemoveResult:
        if delete_lower_index_values:
            removed_count = len(self.array) - index
            del self.array[index:len(self.array)]
            return RemoveResult(count=removed_count)
        else:
            self.array.pop(index)
            return RemoveResult(count=1)