# ICER

Frontend Vite + React. Com API ICER (`VITE_USE_SERVER_AUTH=true`), **media** (imagens, PDF, vídeo) fica em **`server/uploads/`** no servidor; **MongoDB** guarda só os registos e URLs.

## Desenvolvimento

1. Copie `env.example` para `.env` e ajuste (inclua **`MONGODB_URI`** e, se quiser, `MONGODB_DB_NAME`).
2. Com autenticação no servidor (`VITE_USE_SERVER_AUTH=true`):
   - **Um terminal:** `npm run dev:all` — sobe o **Express** (API + MongoDB) e o **Vite** ao mesmo tempo.
   - **Ou dois terminais:** `npm run dev:server` e `npm run dev`.

Nota: `npm run dev` sozinho **só** inicia o frontend; a API precisa de MongoDB acessível na `MONGODB_URI` quando corre `dev:server` ou `dev:all`.

Migração de dados antigos (SQLite → Mongo): `npm run migrate:sqlite-to-mongo -- --sqlite=server/data/app.db --uri=... --db=...`

## Produção

Ver **[GUIA-HOSPEDAGEM.md](./GUIA-HOSPEDAGEM.md)** (proxy `/api`, SPA fallback, systemd, checklist).

## Scripts

- `npm run dev` — só Vite (frontend)
- `npm run dev:all` — Vite + API Node (MongoDB + media em `server/uploads/`)
- `npm run dev:server` / `npm run start:server` — só API Node
- `npm run build` — `dist/` estático
- `npm run test:server` — testes de integração da API (`mongodb-memory-server`, `supertest`)
