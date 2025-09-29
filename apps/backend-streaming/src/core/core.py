import os
import sys
import zenoh

from core.state import GlobalState
from core.pipeline import init_pipeline, start_pipeline

def run_core(state: GlobalState):
    with state.console.status("[bold green]Working on tasks...") as status:
        try:
            z = zenoh.open(zenoh.Config.from_json5(state.zenoh_config))
            state.set_z(z)
            state.console.log("Connected to Zenoh")
        except Exception as e:
            state.console.log(f"Error connecting to Zenoh: {e}", style="bold red")
            return
    status.stop()
    init_pipeline(state)
    start_pipeline(state)