
import unittest
from unittest.mock import Mock

from tetris_buffer.engine import TetrisEngine
from tetris_buffer.sorted_buffer import SortedBufferEntry, SortedBufferGetResult


class TestTetrisEngine(unittest.TestCase):
    def test_align_perfectly(self):
        on_complete_row = Mock()

        engine = TetrisEngine[str](
            size=3,
            max_buffer_size=10,
            max_index_value_delta=0,
            remove_lower_index_values_on_complete_row=False,
            on_complete_row=on_complete_row,
        )

        engine.insert(0, SortedBufferEntry(value="example1", index_value=0))
        engine.insert(1, SortedBufferEntry(value="example2", index_value=0))
        engine.insert(2, SortedBufferEntry(value="example3", index_value=0))

        expected_call = [
            SortedBufferGetResult(
                delta=0, index=0, result=SortedBufferEntry(value="example1", index_value=0)
            ),
            SortedBufferGetResult(
                delta=0, index=0, result=SortedBufferEntry(value="example2", index_value=0)
            ),
            SortedBufferGetResult(
                delta=0, index=0, result=SortedBufferEntry(value="example3", index_value=0)
            ),
        ]

        on_complete_row.assert_called_once_with(unittest.mock.ANY)
        self.assertEqual(on_complete_row.call_args[0][0], expected_call)


        state = engine.get_state()
        self.assertEqual(state.skipped["total"], 0)
        self.assertEqual(state.completed, 1)

    def test_aligns_perfectly_with_noise(self):
        on_complete_row = Mock()

        engine = TetrisEngine[str](
            size=3,
            max_buffer_size=10,
            max_index_value_delta=0,
            remove_lower_index_values_on_complete_row=False,
            on_complete_row=on_complete_row,
        )

        engine.insert(0, SortedBufferEntry(value="example1", index_value=1))
        engine.insert(0, SortedBufferEntry(value="noise1", index_value=2))

        engine.insert(1, SortedBufferEntry(value="noise2", index_value=2))
        engine.insert(1, SortedBufferEntry(value="example2", index_value=1))

        engine.insert(2, SortedBufferEntry(value="noise3-1", index_value=0))
        engine.insert(2, SortedBufferEntry(value="noise3-2", index_value=3))
        engine.insert(2, SortedBufferEntry(value="example3", index_value=1))

        engine.insert(1, SortedBufferEntry(value="should-not-trigger-again", index_value=1))

        expected_call = [
            SortedBufferGetResult(
                delta=0, index=1, result=SortedBufferEntry(value="example1", index_value=1)
            ),
            SortedBufferGetResult(
                delta=0, index=1, result=SortedBufferEntry(value="example2", index_value=1)
            ),
            SortedBufferGetResult(
                delta=0, index=1, result=SortedBufferEntry(value="example3", index_value=1)
            ),
        ]
        
        on_complete_row.assert_called_once_with(unittest.mock.ANY)
        self.assertEqual(on_complete_row.call_args[0][0], expected_call)

        state = engine.get_state()
        self.assertEqual(state.skipped["total"], 0)
        self.assertEqual(state.completed, 1)

    def test_should_insert_in_the_correct_order(self):
        on_complete_row = Mock()

        engine = TetrisEngine[str](
            size=2,
            max_buffer_size=10,
            max_index_value_delta=0,
            remove_lower_index_values_on_complete_row=True,
            on_complete_row=on_complete_row,
        )

        self.assertEqual(engine.insert(0, SortedBufferEntry(value="number-2", index_value=2)), 0)
        self.assertEqual(engine.insert(0, SortedBufferEntry(value="number-5", index_value=5)), 0)
        self.assertEqual(engine.insert(0, SortedBufferEntry(value="number-1", index_value=1)), 2)
        self.assertEqual(engine.insert(0, SortedBufferEntry(value="number-4", index_value=4)), 1)
        self.assertEqual(engine.insert(0, SortedBufferEntry(value="number-3", index_value=3)), 2)

    def test_should_remove_items_when_buffer_size_is_exceeded(self):
        on_complete_row = Mock()

        engine = TetrisEngine[str](
            size=2,
            max_buffer_size=5,
            max_index_value_delta=0,
            remove_lower_index_values_on_complete_row=True,
            on_complete_row=on_complete_row,
        )

        for i in range(15):
            engine.insert(0, SortedBufferEntry(value=f"number-1-{i}", index_value=i))

        for i in range(11):
            engine.insert(1, SortedBufferEntry(value=f"number-2-{i}", index_value=i))
        
        expected_call = [
            SortedBufferGetResult(
                delta=0, index=4, result=SortedBufferEntry(value="number-1-10", index_value=10)
            ),
            SortedBufferGetResult(
                delta=0, index=0, result=SortedBufferEntry(value="number-2-10", index_value=10)
            ),
        ]

        self.assertEqual(on_complete_row.call_count, 1)
        self.assertEqual(on_complete_row.call_args_list[-1][0][0], expected_call)

    def test_should_remove_lower_index_values_on_complete_row(self):
        on_complete_row = Mock()

        engine = TetrisEngine[str](
            size=3,
            max_buffer_size=10,
            max_index_value_delta=0,
            remove_lower_index_values_on_complete_row=True,
            on_complete_row=on_complete_row,
        )

        engine.insert(0, SortedBufferEntry(value="example1", index_value=2))
        engine.insert(0, SortedBufferEntry(value="should-be-removed-1", index_value=0))

        engine.insert(1, SortedBufferEntry(value="should-be-removed-2", index_value=1))
        engine.insert(1, SortedBufferEntry(value="should-not-be-removed-2", index_value=3))
        engine.insert(1, SortedBufferEntry(value="example2", index_value=2))

        engine.insert(2, SortedBufferEntry(value="should-be-removed-3-1", index_value=0))
        engine.insert(2, SortedBufferEntry(value="should-be-removed-3-2", index_value=1))
        engine.insert(2, SortedBufferEntry(value="example3", index_value=2))

        on_complete_row.assert_called_once()
        self.assertEqual(len(engine.get_buffers()[0]), 0)
        self.assertEqual(len(engine.get_buffers()[1]), 1)
        self.assertEqual(len(engine.get_buffers()[2]), 0)

        state = engine.get_state()
        self.assertEqual(state.skipped["total"], 4)
        self.assertEqual(state.completed, 1)

    def test_should_find_row_with_delta_last_entry_in_the_middle(self):
        on_complete_row = Mock()

        engine = TetrisEngine[str](
            size=3,
            max_buffer_size=10,
            max_index_value_delta=5,
            remove_lower_index_values_on_complete_row=True,
            on_complete_row=on_complete_row,
        )

        engine.insert(0, SortedBufferEntry(value="example1", index_value=100))
        engine.insert(0, SortedBufferEntry(value="should-be-removed-1", index_value=10))

        engine.insert(1, SortedBufferEntry(value="should-be-removed-2", index_value=30))
        engine.insert(1, SortedBufferEntry(value="should-not-be-removed-2", index_value=204))
        engine.insert(1, SortedBufferEntry(value="example2", index_value=104))

        engine.insert(2, SortedBufferEntry(value="should-be-removed-3-1", index_value=18))
        engine.insert(2, SortedBufferEntry(value="should-be-removed-3-2", index_value=44))
        engine.insert(2, SortedBufferEntry(value="example3", index_value=102))

        expected_call = [
            SortedBufferGetResult(
                delta=2, index=0, result=SortedBufferEntry(value="example1", index_value=100)
            ),
            SortedBufferGetResult(
                delta=2, index=1, result=SortedBufferEntry(value="example2", index_value=104)
            ),
            SortedBufferGetResult(
                delta=0, index=0, result=SortedBufferEntry(value="example3", index_value=102)
            ),
        ]
        
        on_complete_row.assert_called_once_with(unittest.mock.ANY)
        self.assertEqual(on_complete_row.call_args[0][0], expected_call)

        self.assertEqual(len(engine.get_buffers()[0]), 0)
        self.assertEqual(len(engine.get_buffers()[1]), 1)
        self.assertEqual(len(engine.get_buffers()[2]), 0)

        state = engine.get_state()
        self.assertEqual(state.skipped["total"], 4)
        self.assertEqual(state.completed, 1)

    def test_should_find_row_with_delta_last_entry_at_the_end(self):
        on_complete_row = Mock()

        engine = TetrisEngine[str](
            size=3,
            max_buffer_size=10,
            max_index_value_delta=5,
            remove_lower_index_values_on_complete_row=True,
            on_complete_row=on_complete_row,
        )

        engine.insert(0, SortedBufferEntry(value="example1", index_value=100))
        engine.insert(0, SortedBufferEntry(value="should-be-removed-1", index_value=10))

        engine.insert(1, SortedBufferEntry(value="should-be-removed-2", index_value=30))
        engine.insert(1, SortedBufferEntry(value="should-not-be-removed-2", index_value=204))
        engine.insert(1, SortedBufferEntry(value="example2", index_value=102))

        engine.insert(2, SortedBufferEntry(value="should-be-removed-3-1", index_value=18))
        engine.insert(2, SortedBufferEntry(value="should-be-removed-3-2", index_value=44))
        engine.insert(2, SortedBufferEntry(value="example3", index_value=104))

        expected_call = [
            SortedBufferGetResult(
                delta=4, index=0, result=SortedBufferEntry(value="example1", index_value=100)
            ),
            SortedBufferGetResult(
                delta=2, index=1, result=SortedBufferEntry(value="example2", index_value=102)
            ),
            SortedBufferGetResult(
                delta=0, index=0, result=SortedBufferEntry(value="example3", index_value=104)
            ),
        ]
        
        on_complete_row.assert_called_once_with(unittest.mock.ANY)
        self.assertEqual(on_complete_row.call_args[0][0], expected_call)

        self.assertEqual(len(engine.get_buffers()[0]), 0)
        self.assertEqual(len(engine.get_buffers()[1]), 1)
        self.assertEqual(len(engine.get_buffers()[2]), 0)

        state = engine.get_state()
        self.assertEqual(state.skipped["total"], 4)
        self.assertEqual(state.completed, 1)

    def test_should_find_row_with_delta_last_entry_at_the_beginning(self):
        on_complete_row = Mock()

        engine = TetrisEngine[str](
            size=3,
            max_buffer_size=10,
            max_index_value_delta=5,
            remove_lower_index_values_on_complete_row=True,
            on_complete_row=on_complete_row,
        )

        engine.insert(0, SortedBufferEntry(value="example1", index_value=102))
        engine.insert(0, SortedBufferEntry(value="should-be-removed-1", index_value=10))
        engine.insert(1, SortedBufferEntry(value="should-be-removed-2", index_value=30))
        engine.insert(1, SortedBufferEntry(value="should-not-be-removed-2", index_value=204))
        engine.insert(1, SortedBufferEntry(value="example2", index_value=104))

        engine.insert(2, SortedBufferEntry(value="should-be-removed-3-1", index_value=18))
        engine.insert(2, SortedBufferEntry(value="should-be-removed-3-2", index_value=44))
        engine.insert(2, SortedBufferEntry(value="example3", index_value=100))

        expected_call = [
            SortedBufferGetResult(
                delta=2, index=0, result=SortedBufferEntry(value="example1", index_value=102)
            ),
            SortedBufferGetResult(
                delta=4, index=1, result=SortedBufferEntry(value="example2", index_value=104)
            ),
            SortedBufferGetResult(
                delta=0, index=0, result=SortedBufferEntry(value="example3", index_value=100)
            ),
        ]
        
        on_complete_row.assert_called_once_with(unittest.mock.ANY)
        self.assertEqual(on_complete_row.call_args[0][0], expected_call)
        self.assertEqual(len(engine.get_buffers()[0]), 0)
        self.assertEqual(len(engine.get_buffers()[1]), 1)
        self.assertEqual(len(engine.get_buffers()[2]), 0)

        state = engine.get_state()
        self.assertEqual(state.skipped["total"], 4)
        self.assertEqual(state.completed, 1)

if __name__ == "__main__":
    unittest.main()
