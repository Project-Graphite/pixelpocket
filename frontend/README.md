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

The dev server runs at http://localhost:3000 and passes `/api` requests to the Backend at http://localhost:5000. The Docker image builds the WebAssembly files itself.

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
| `/login`, `/signup`, `/forgot-password`, `/reset-password/:token`, `/account` | Accounts         |
| `/privacy`, `/terms`      | Privacy policy and terms of service                                  |
| anything else             | Not found                                                            |

## Look and feel

The site looks like a 1990s game shop: games hang on a pegboard wall, and stickers mark new games, games that save progress, and the save status while playing. It has light and dark themes that follow the system setting until the visitor picks one with the toggle; the choice is remembered. The home page opens with a short start-up animation once per visit, which any click or key skips. Animations are turned off when the system asks for reduced motion.

## The player

- **Timing:** games run at the Game Boy's own speed (about 59.73 frames per second), whatever the screen's refresh rate.
- **Sound:** played through the Web Audio API. Browsers only allow it on HTTPS or `localhost`.
- **Input:** keyboard (arrows or WASD, X/K = A, Z/J = B, Enter = Start, Shift or Backspace = Select, P = pause, F = full screen), gamepads, and on-screen buttons on touch screens (multi-touch, D-pad diagonals, sliding between A and B).
- **Saves:** battery saves are stored a few seconds after they change, and when the game is paused, the tab is hidden or the page closes. Logged-in players' saves go to their account; guests' saves stay in the browser.

## Structure

```
frontend/
├── public/            theme.js, audio-worklet.js, favicon, emulator/ (built)
├── nginx.conf         nginx for the Docker image, with security-headers.conf (CSP and more)
└── src/
    ├── components/    Header, Footer, Logo, Lcd, Splash, game cards, stickers, touch controls,
    │                  legal page layout, form fields, route guards
    ├── config/        Site settings (contact email)
    ├── context/       Auth state
    ├── emulator/      Core loading, frame loop, audio, input, save sync, palettes
    ├── pages/         Home, Library, Play, upload and edit, account, admin, privacy, terms, not found
    └── services/      API client, ROM header reader
```

## Configuration

Copy `.env.example` to `.env` to override settings.

| Variable       | Default   | Description                 |
| -------------- | --------- | --------------------------- |
| `VITE_API_URL` | `/api/v1` | Base URL of the Backend API |