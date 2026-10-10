# PixelPocket Frontend

React single-page application for PixelPocket: the home page, the game library, uploads, accounts, the legal pages, and the in-browser player that runs the WebAssembly build of `gb-emulator`.

## Stack

- React 19 and React Router
- Vite (dev server and build)
- oxlint
- Plain CSS with design tokens (custom properties) for the light and dark themes
- Fonts served from the site itself through Fontsource: Archivo (variable, with a width axis) and Press Start 2P
- Icons from Phosphor (`@phosphor-icons/react`)
- The emulator core: `gb-emulator` compiled to WebAssembly with Emscripten

## Getting started

The player needs the emulator's WebAssembly files in `public/emulator/`. They are built from `../gb-emulator` with Docker, so Emscripten doesn't need to be installed:

```bash
npm install
npm run build:wasm   # once, and again after changing the emulator
npm run dev
```

The dev server runs at http://localhost:3000 and proxies `/api` requests to the Backend at http://localhost:5000. The Docker image builds the WebAssembly files itself (see `Dockerfile`).

## Scripts

| Script               | Description                                                  |
| -------------------- | ------------------------------------------------------------ |
| `npm run dev`        | Start the dev server                                         |
| `npm run build`      | Build static files into `dist/`                              |
| `npm run build:wasm` | Compile `gb-emulator` to WebAssembly into `public/emulator/` |
| `npm run preview`    | Serve the production build                                   |
| `npm run lint`       | Lint the source with oxlint                                  |

## Pages

| Path                      | Page                                                                 |
| ------------------------- | -------------------------------------------------------------------- |
| `/`                       | Home: start-up intro, the newest library games, what the site offers |
| `/library`                | The library: search, sort, pages                                     |
| `/my-games`               | Your uploads                                                         |
| `/games/new`              | Upload a game (admins choose the library or their own games)         |
| `/games/:id`              | Play                                                                 |
| `/games/:id/edit`         | Rename, change the cover, delete                                     |
| `/login`, `/signup`, `/forgot-password`, `/reset-password/:token`, `/account` | Accounts |
| `/privacy`, `/terms`      | Privacy policy and terms of service                                  |
| anything else             | Not found                                                            |

## Look and feel

The design is a 1990s game-shop wall: a cobalt shop-sign header over a pegboard wall (deep navy in dark mode), games hanging in stacks from die-cut tabs, and stickers for state ("New", "Saves progress", the save status on the play page). All colours, spacing and radii are tokens in `src/index.css`; light and dark themes follow the system until the visitor uses the toggle, and the choice is remembered.

- **The LCD:** the handheld screen with the animated pixel face (`Lcd`, `PixelFace`) appears on the home page, the account pages and empty states.
- **Start-up intro:** the home page plays a short boot animation (`Splash`) once per browser session. Any click or key skips it, and it never plays when reduced motion is requested.
- **Motion:** stepped, LCD-like frames (`--step`), and none at all with reduced motion.

## The player

- **Timing:** the emulator runs one Game Boy frame per 1/59.73 s of real time, whatever the screen's refresh rate.
- **Sound:** an AudioWorklet (`public/audio-worklet.js`) resamples the emulator's 44.1 kHz output and nudges the speed slightly to stay in sync without crackles. Browsers only allow it on HTTPS or `localhost`.
- **Input:** keyboard (arrows or WASD, X/K = A, Z/J = B, Enter = Start, Shift or Backspace = Select, P = pause, F = full screen), gamepads, and on-screen buttons on touch screens (multi-touch, D-pad diagonals, sliding between A and B).
- **Saves:** battery saves are checked every few seconds and uploaded once they stop changing, and also when the game is paused, the tab is hidden or the page closes. Guests' saves stay in the browser's local storage.

## Structure

```
Frontend/
├── public/            theme.js, audio-worklet.js, favicon (the logo), emulator/ (built)
├── nginx.conf         nginx for the Docker image, with security-headers.conf (CSP and more)
└── src/
    ├── components/    Header, Footer, Logo, Lcd, Splash, game cards, stickers, touch controls,
    │                  legal page layout, form fields, route guards
    ├── config/        Site settings (contact email)
    ├── context/       Auth state
    ├── emulator/      Core loading, frame loop, audio, input, save sync, palettes
    ├── pages/         Home, Library, Play, upload and edit, account, privacy, terms, not found
    └── services/      API client, ROM header reader
```

## Configuration

Copy `.env.example` to `.env` to override settings.

| Variable       | Default   | Description                 |
| -------------- | --------- | --------------------------- |
| `VITE_API_URL` | `/api/v1` | Base URL of the Backend API |