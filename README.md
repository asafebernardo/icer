# ICER
Desenvolvido o site da Igreja ICER.

https://github.com/user-attachments/assets/6ed22e9a-549e-44ba-9fd3-be124fee1008



Frontend Vite + React. Autenticação e ficheiros privados opcionais via `server/index.js` (Express + SQLite).

## Desenvolvimento

1. Copie `env.example` para `.env` e ajuste.
2. Com autenticação no servidor (`VITE_USE_SERVER_AUTH=true`):
   - **Um terminal:** `npm run dev:all` — sobe o **Express** (API + SQLite em `server/data/app.db`) e o **Vite** ao mesmo tempo.
   - **Ou dois terminais:** `npm run dev:server` e `npm run dev`.

Nota: `npm run dev` sozinho **só** inicia o frontend; o SQLite só é criado/atualizado quando o processo Node (`dev:server` ou `dev:all`) corre.

## Produção

Ver **[GUIA-HOSPEDAGEM.md](./GUIA-HOSPEDAGEM.md)** (proxy `/api`, SPA fallback, systemd, checklist).

## Scripts

- `npm run dev` — só Vite (frontend)
- `npm run dev:all` — Vite + API Node (backend e ficheiro SQLite)
- `npm run dev:server` / `npm run start:server` — só API Node
- `npm run build` — `dist/` estático
- `npm run test:server` — testes de integração da API (SQLite em memória, `supertest`)
