init:
	/usr/local/bin/python3 -m venv .venv

activate:
	source ./.venv/bin/activate

install:
	/usr/local/bin/pip3 install -e .

build:
	/usr/local/bin/python3 src/streaming/pyzdepth/extension_zdepth.py build

run:
	/usr/local/bin/python3 run.py

test:
	/usr/local/bin/python3 src/tetris_buffer/test_engine.py