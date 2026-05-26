# ICER

Vite + React frontend. When using the ICER API (`VITE_USE_SERVER_AUTH=true`), media files (images, PDFs, videos) are stored in **`server/uploads/`** on the server, while **MongoDB** stores only the records and file URLs.

## Development

1. Copy `env.example` to `.env` and configure it (including **`MONGODB_URI`** and optionally `MONGODB_DB_NAME`).
2. With server authentication enabled (`VITE_USE_SERVER_AUTH=true`):
   - **Single terminal:** `npm run dev:all` — starts both **Express** (API + MongoDB) and **Vite** simultaneously.
   - **Or two terminals:** run `npm run dev:server` and `npm run dev`.

Note: running `npm run dev` alone starts only the frontend. The API requires an accessible MongoDB instance configured in `MONGODB_URI` when running `dev:server` or `dev:all`.

## Production

See **[DEPLOYMENT-GUIDE.md](./DEPLOYMENT-GUIDE.md)** (API proxy `/api`, SPA fallback, systemd, deployment checklist).

## Scripts

- `npm run dev` — Vite frontend only
- `npm run dev:all` — Vite + Node API (MongoDB + media storage in `server/uploads/`)
- `npm run dev:server` / `npm run start:server` — Node API only
- `npm run build` — generates static `dist/`
- `npm run test:server` — API integration tests (`mongodb-memory-server`, `supertest`)
