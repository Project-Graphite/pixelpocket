# --- Emulator: compile the C++ core to WebAssembly ---
# "emulator" is the gb-emulator folder, passed in by compose.yml and CI (.build-contexts)
FROM emscripten/emsdk:4.0.15 AS wasm
WORKDIR /src
COPY --from=emulator CMakeLists.txt ./
COPY --from=emulator include ./include
COPY --from=emulator src ./src
COPY --from=emulator scripts ./scripts
RUN sh scripts/build-wasm.sh /out

FROM scratch AS wasm-out
COPY --from=wasm /out/ /

# --- Native build and tests ---
FROM ubuntu:24.04 AS emulator-test

RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential cmake \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /src
COPY --from=emulator CMakeLists.txt ./
COPY --from=emulator include ./include
COPY --from=emulator src ./src
COPY --from=emulator tests ./tests

RUN cmake -B build -DCMAKE_BUILD_TYPE=Release \
    && cmake --build build -j"$(nproc)" \
    && ctest --test-dir build --output-on-failure \
    && touch /tests-passed

# Runs the headless emulator (pass a ROM path as an argument)
ENTRYPOINT ["/src/build/gb-emulator"]

# --- Build stage ---
FROM node:22-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
COPY --from=wasm /out/ ./public/emulator/
COPY --from=emulator-test /tests-passed /tmp/emulator-tests-passed
RUN npm run build

# --- Serve stage ---
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
