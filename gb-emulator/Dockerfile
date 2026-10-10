# Two builds of the emulator:
#   wasm / wasm-out  The WebAssembly core used by the website
#                    docker build --target wasm-out --output type=local,dest=<dir> .
#   test (default)   The native core (headless, no SDL2) with its test suite;
#                    a failing test fails the image build.

# --- WebAssembly ---
FROM emscripten/emsdk:4.0.15 AS wasm
WORKDIR /src
COPY CMakeLists.txt ./
COPY include ./include
COPY src ./src
COPY scripts ./scripts
RUN sh scripts/build-wasm.sh /out

FROM scratch AS wasm-out
COPY --from=wasm /out/ /

# --- Native build and tests ---
FROM ubuntu:24.04 AS test

RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential cmake \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /src
COPY CMakeLists.txt ./
COPY include ./include
COPY src ./src
COPY tests ./tests

RUN cmake -B build -DCMAKE_BUILD_TYPE=Release \
    && cmake --build build -j"$(nproc)" \
    && ctest --test-dir build --output-on-failure

# Runs the headless emulator (pass a ROM path as an argument)
ENTRYPOINT ["/src/build/gb-emulator"]
