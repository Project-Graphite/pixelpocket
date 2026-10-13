# PixelPocket

PixelPocket is a web platform for playing Game Boy games directly in the browser. A visitor picks a title from a library, and it runs in place on the same page, powered by a custom Game Boy emulator compiled to WebAssembly.

## Repository layout

This repository is a monorepo with three top-level projects:

```
PixelPocket/
├── gb-emulator/   Game Boy emulator core (C++)
├── frontend/      Web application (React)
└── backend/       API service
```

Each folder is a self-contained project with its own build and its own README.

### gb-emulator

A Game Boy (DMG) emulator written in C++20: CPU, graphics, sound, timers, input, and cartridge support (ROM-only, MBC1, MBC3 with its real-time clock, and MBC5). It has no dependency on a windowing system or audio library at its core, which lets it run two ways:

- as a desktop application with an SDL2 window
- compiled to WebAssembly, inside the website

See [`gb-emulator/README.md`](gb-emulator/README.md) for the emulator's full feature list, build instructions, and test suite.

### Frontend

A React single-page application that is the public face of PixelPocket. It:

- opens on a home page with a short start-up animation of the handheld's screen, then the newest library games
- shows the platform library, plus each user's own games, with search, sorting and pages
- lets admins add games to the library and users upload `.gb` files to their private "My games", each with an optional cover image
- runs the selected game on a large on-page screen with the WebAssembly build of `gb-emulator`, with sound through the Web Audio API
- takes keyboard, gamepad and touch input; touch screens get Game Boy style on-screen buttons
- keeps battery saves in the player's account, so progress follows them to any device (guests' saves stay in their browser)
- has light and dark themes, works on phones, tablets and desktops, and includes a privacy policy and terms of service

### Backend

The API service behind the platform. It handles accounts (sign-up, login, password reset, admin roles), the game library and uploads, cover images, and save files. Uploads are checked before they are stored: ROMs must have a valid Game Boy header, and cover images are decoded and re-encoded so only the picture survives. Metadata lives in MongoDB; ROMs, covers and saves live in MinIO object storage.

## Architecture

```
                 ┌──────────────────────────────┐
  browser  ───►  │ Frontend (nginx)             │   static site + gb-emulator (WASM)
                 │   /api/*  ──────────────┐    │
                 └─────────────────────────┼────┘
                                           ▼
                 ┌──────────────────────────────┐      ┌──────────────────────┐
                 │ Backend (Express)            │ ───► │ MongoDB: users, game │
                 │ accounts, library, uploads,  │      │ details, save records│
                 │ saves                        │      └──────────────────────┘
                 │                              │      ┌──────────────────────┐
                 │                              │ ───► │ MinIO: ROMs, covers, │
                 └──────────────────────────────┘      │ save files (private) │
                                                       └──────────────────────┘
```

The emulator runs in the visitor's browser, so gameplay has no server round-trip once a game has loaded. Every file goes through the Backend, which checks who may read or change it; nothing in storage is public.

## Deployment

Each service has its own `Dockerfile` (`gb-emulator/` is built inside the Frontend image), and `compose.yml` at the root runs the whole platform:

| Service          | Image source         | Role                                                                  |
| ---------------- | -------------------- | --------------------------------------------------------------------- |
| `frontend`       | `frontend/`          | Compiles the emulator to WebAssembly, builds the React app, serves it with nginx, proxies `/api` |
| `backend`        | `backend/`           | Express API on port 5000 (internal)                                   |
| `mongo`          | `mongo:7`            | Database, data kept in the `mongo-data` volume                        |
| `minio`          | `chainguard/minio`   | File storage for ROMs, covers and saves, kept in the `minio-data` volume |
| `minio-init`     | `chainguard/minio`   | Runs once: creates the bucket and the Backend's restricted account    |
| `emulator-tests` | `frontend/` + `gb-emulator/` | Builds the native emulator and runs its tests (`test` profile)  |

```bash
cp .env.example .env        # then set the passwords and secrets in it
docker compose up -d --build
docker compose exec backend node scripts/createAdmin.js    # create the first admin account
```

The site is then at http://localhost:8080 (change with `WEB_PORT`). To build the emulator and run its tests:

```bash
docker compose --profile test run --rm emulator-tests
```

In production, [`deploy/pixelpocket/values.yaml`](https://github.com/project-graphite/platform/blob/main/deploy/pixelpocket/values.yaml) in `platform` runs the same services from prebuilt images (`ghcr.io/project-graphite/pixelpocket/frontend` and `backend`), with resource limits and health checks. It carries its own copy of `infra/minio`, so change both together. Its secrets are in the organisation's secrets repository: `MONGO_PASSWORD`, `MINIO_ROOT_PASSWORD`, `S3_SECRET_KEY`, `JWT_SECRET`, `EMAIL_HOST` and `EMAIL_FROM`, plus the optional `EMAIL_PORT`, `EMAIL_USERNAME` and `EMAIL_PASSWORD`.

## License

PixelPocket is released under the [MIT License](LICENSE).

Game Boy games are not part of this project. Users may only upload games they own or have the right to use.
