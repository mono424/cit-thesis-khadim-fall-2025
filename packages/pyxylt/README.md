XYLT 
====

small library to compute an acceleration structure for projecting distorted depth images into pointclouds.
The code is heavily inspired by the Azure Kinect SDK.

Building
--------

- use conan

for c++ and python bindings:
```conan create . --build missing --build outdated```

for wasm artifact first copy docs/wasm_profile to ~/.conan2/profiles/wasm, then:
```conan create . --build missing --build outdated -pr wasm```
