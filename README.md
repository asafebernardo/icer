# ICER

Vite + React frontend. When using the ICER API (`VITE_USE_SERVER_AUTH=true`), media files are stored on **disk** (`server/uploads/`) or **Google Drive** (`ICER_STORAGE=drive`). **MongoDB** keeps only records and `/api/files/:id` URLs.

## Development

1. Copy `env.example` to `.env` and configure it (including **`MONGODB_URI`** and optionally `MONGODB_DB_NAME`).
2. With server authentication enabled (`VITE_USE_SERVER_AUTH=true`):
   - **Single terminal:** `npm run dev:all` — starts both **Express** (API + MongoDB) and **Vite** simultaneously.
   - **Or two terminals:** run `npm run dev:server` and `npm run dev`.

Note: running `npm run dev` alone starts only the frontend. The API requires an accessible MongoDB instance configured in `MONGODB_URI` when running `dev:server` or `dev:all`.

## Production (Docker)

The Node server serves the API **and** the SPA (`dist/`). Deploy as **Docker Compose**, not as a static Nginx site.

1. Copy `env.example` to `.env` and set MongoDB, `ICER_PUBLIC_BASE_URL`, and the other runtime secrets.
2. Build and start:

```bash
docker compose up -d --build
```

The app listens on **http://localhost:3001** (`/health` and `/api/health` should return 200). Uploads persist in the `icer_uploads` volume.

On EasyPanel / Coolify / Dokploy, create the service as **Docker Compose** (not Nginx) and proxy the public domain to port **3001**.

## Scripts

- `npm run dev` — Vite frontend only
- `npm run dev:all` — Vite + Node API (MongoDB + media em disco ou Google Drive)
- `npm run dev:server` / `npm run start:server` — Node API only
- `npm run build` — generates static `dist/`
- `npm run test:server` — API integration tests (`mongodb-memory-server`, `supertest`)
