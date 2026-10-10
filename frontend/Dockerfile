# --- Emulator: compile the C++ core to WebAssembly ---
# "emulator" is the gb-emulator folder, passed in by docker-compose.yml and CI (.build-contexts)
FROM emscripten/emsdk:4.0.15 AS wasm
WORKDIR /src
COPY --from=emulator CMakeLists.txt ./
COPY --from=emulator include ./include
COPY --from=emulator src ./src
COPY --from=emulator scripts ./scripts
RUN sh scripts/build-wasm.sh /out

# --- Build stage ---
FROM node:22-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
COPY --from=wasm /out/ ./public/emulator/
RUN npm run build

# --- Serve stage ---
FROM nginx:1.31-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
