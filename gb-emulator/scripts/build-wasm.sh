#!/bin/sh
# Builds the WebAssembly version of the emulator core with Emscripten.
# Usage: scripts/build-wasm.sh <output-dir>   (run inside the emscripten/emsdk image)
set -e
out="${1:-dist}"
emcmake cmake -S . -B build-wasm -DCMAKE_BUILD_TYPE=Release
cmake --build build-wasm -j"$(nproc)"
mkdir -p "$out"
cp build-wasm/gb.js build-wasm/gb.wasm "$out/"
