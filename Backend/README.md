# PixelPocket Backend

API service behind PixelPocket: accounts, the game library, uploads, cover images and save files. Metadata is stored in MongoDB and files in S3-compatible object storage (MinIO).

## Stack

- Node.js, Express 4
- MongoDB with Mongoose
- MinIO (any S3-compatible store) through the AWS SDK
- JWT authentication in an httpOnly cookie, bcryptjs
- multer for uploads, sharp for cover images
- Security middleware: helmet, express-rate-limit, express-mongo-sanitize, xss-clean
- Logging with morgan (development)

## Getting started

The easiest way is the root `docker-compose.yml`, which also starts MongoDB and MinIO. To run the Backend on its own, with MongoDB and MinIO already running:

```bash
npm install
cp config.env.example config.env   # then fill in the secrets
npm start
```

The server runs at http://localhost:5000 (`PORT`) and restarts when files change.

## Configuration

Outside Docker, settings are read from `config.env` in this folder. In Docker, `docker-compose.yml` passes them in from the root `.env`.

| Variable                | Description                                          |
| ----------------------- | ---------------------------------------------------- |
| `NODE_ENV`              | `development` or `production`                        |
| `PORT`                  | Port to listen on (default 5000)                     |
| `DATABASE_LOCAL`        | MongoDB connection string                            |
| `JWT_SECRET`            | Secret used to sign tokens                           |
| `JWT_EXPIRES_IN`        | Token lifetime, e.g. `90d`                           |
| `JWT_COOKIE_EXPIRES_IN` | Cookie lifetime in days                              |
| `FRONTEND_URL`          | Public site URL, used in password reset links        |
| `EMAIL_HOST` and others | SMTP for password reset emails; without it, in development, emails are printed in the log |
| `S3_ENDPOINT`           | Object storage URL, e.g. `http://minio:9000`; any S3-compatible store works |
| `S3_BUCKET`             | Bucket name (default `pixelpocket`)                  |
| `S3_ACCESS_KEY`         | Storage account with access to that bucket only      |
| `S3_SECRET_KEY`         | Its secret                                           |

## Scripts

| Script                 | Description                                                                  |
| ---------------------- | ---------------------------------------------------------------------------- |
| `npm start`            | Run with nodemon, restarting on changes                                      |
| `npm run start:prod`   | Run with `NODE_ENV=production`                                               |
| `npm run create-admin` | Create an admin, or promote an existing user (the only way to make an admin) |

## API

All routes are under `/api/v1`.

**Accounts** (`/users`): `POST signup`, `POST login`, `POST logout`, `GET session`, `POST forgotPassword`, `PATCH resetPassword/:token`; logged in: `PATCH updateMe`, `PATCH updateMyPassword`, `DELETE deleteMe` (erases the account together with the user's uploads and saves).

**Games** (`/games`):

| Route                       | Who                               | What                                            |
| --------------------------- | --------------------------------- | ----------------------------------------------- |
| `GET /games`                | anyone                            | The library; `?scope=mine` for your own uploads. Supports `search`, `sort` (`title`, `-title`, `createdAt`, `-createdAt`), `page`, `limit` (max 48) |
| `POST /games`               | logged in                         | Upload (multipart: `rom`, optional `cover`, `title`, `description`). Admins add to the library unless `destination=mine`; everyone else uploads to their own games |
| `GET /games/:id`            | anyone who can open it            | Game details                                    |
| `PATCH /games/:id`          | owner, or an admin for the library | Change `title` and `description`               |
| `DELETE /games/:id`         | same                              | Delete the game, its files and its saves        |
| `GET /games/:id/rom`        | anyone who can open it            | The ROM file                                    |
| `GET/PUT/DELETE /games/:id/cover` | read: anyone who can open it; change: as above | Cover image (PUT is multipart `cover`) |
| `GET/PUT/DELETE /games/:id/save`  | logged in                  | Your battery save for the game (raw bytes)      |

Library games can be opened by everyone. Private games can only be opened by their owner; for anyone else, admins included, they don't exist (404).

## Security

- **Roles:** signup and profile updates ignore `role`; admins are made only with `scripts/createAdmin.js` on the server. The role is read from the database on every request.
- **Uploads:** ROMs are checked by content (Nintendo logo, header checksum, supported cartridge type, size), never by file name. Cover images must be real JPEG, PNG or WebP files; they are decoded with a pixel limit (against decompression bombs) and re-encoded to WebP, which drops metadata and anything hidden in the file. Multipart requests have tight limits on size, files and fields.
- **Files:** object keys are generated by the server. Storage has no public access; the Backend checks access on every download and uses a storage account limited to one bucket.
- **Queries:** `utils/apiFeatures.js` only filters, sorts and selects whitelisted fields, and searches with escaped text, so query strings can't reach hidden fields or run expensive regular expressions.
- **Requests:** state-changing requests from another website are refused (Origin check) on top of the `SameSite` cookie. Logins, signups, password resets, uploads and saves each have their own rate limit. Tokens must be HS256.
- **Quotas:** a user can keep up to 50 games and 256 MB.

## Structure

```
Backend/
├── server.js          Entry point: env, DB and storage connection, listen
├── app.js             Express app and middleware
├── controllers/       Request handlers (auth, users, games, saves, errors)
├── models/            Mongoose models (User, Game, Save)
├── routes/            Route definitions
├── scripts/           Server-side tools (createAdmin.js)
└── utils/             AppError, catchAsync, API features, storage, ROM and image checks, Origin check, email
```
