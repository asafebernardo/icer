# Guia de desenvolvimento e hospedagem — ICER

Este documento explica como correr o projeto no **computador local** e como **publicar** num VPS ou alojamento com painel (ex.: CyberPanel), com API Node + SQLite e frontend estático (Vite).

---

## Arquitetura em produção

| Peça | Função |
|------|--------|
| **Pasta `dist/`** | Site React compilado (`npm run build`). O Nginx/OpenLiteSpeed/Apache serve estes ficheiros. |
| **Node (`server/index.js`)** | API em `http://127.0.0.1:PORT` (ex.: 3001). Autenticação, dados em SQLite, uploads privados. |
| **SQLite** | Ficheiro `server/data/app.db` — criado/atualizado quando o Node arranca (não é um serviço separado). |
| **Reverse proxy** | O domínio público encaminha `/api` para o Node; o resto é ficheiros estáticos ou `index.html` (SPA). |

---

## Desenvolvimento local

1. Copie `env.example` para `.env` ou `.env.local` e ajuste.
2. Com login real no servidor (`VITE_USE_SERVER_AUTH=true`):

   **Um terminal (recomendado):**

   ```bash
   npm run dev:all
   ```

   Isto inicia o **Express** (API + SQLite em `server/data/app.db`) e o **Vite** em paralelo.

   **Alternativa — dois terminais:**

   ```bash
   npm run dev:server
   ```

   ```bash
   npm run dev
   ```

3. `npm run dev` **sozinho** só abre o frontend; sem o Node não há API nem atualização da base local.

O Vite, com `VITE_USE_SERVER_AUTH=true`, encaminha `/api` para `http://127.0.0.1:3001` (ou `VITE_DEV_API_URL` / `PORT` definidos no ambiente).

---

## Variáveis de ambiente (resumo)

Consulte também **`env.example`** na raiz do projeto.

| Onde | Variáveis típicas |
|------|-------------------|
| **Build do frontend** (`VITE_*`) | `VITE_USE_SERVER_AUTH=true` para o browser falar com `/api` no mesmo domínio. |
| **Runtime do Node** | `PORT` ou `ICER_SERVER_PORT` (porta interna, ex.: `3001`). |
| **Primeiro administrador** | `ICER_ADMIN_EMAIL`, `ICER_ADMIN_FULL_NAME`, `ICER_ADMIN_PASSWORD` — só criam utilizador se a tabela `users` estiver vazia. |
| **Opcional** | `ICER_UPSTREAM_API` se ainda reencaminhar parte do tráfego para uma API externa (ex.: Base44). |

---

## Hospedar em produção — checklist

1. **Código no servidor** — `git clone` / `git pull` ou cópia dos ficheiros; na pasta do projeto: `npm install`.
2. **Ficheiro `.env`** no servidor (mesmo conteúdo lógico que em desenvolvimento, com valores de produção). Ver `env.example`.
3. **Build do site:**

   ```bash
   npm run build
   ```

   Gera a pasta **`dist/`**. As variáveis `VITE_*` ficam **fixas** no JavaScript compilado — o build tem de ser feito **com** o `.env` de produção já correto.

4. **Manter o Node sempre a correr** — use **systemd** (Linux), PM2, ou o gestor do painel. O comando é o da raiz do projeto:

   ```bash
   node server/index.js
   ```

   (ou `npm run start:server`).

5. **Servidor web (CyberPanel / Nginx / OLS / Apache):**
   - **Document root** do site → pasta **`dist/`**.
   - **Reverse proxy:** pedidos a **`/api`** (e `/api/...`) → `http://127.0.0.1:PORT` (a mesma porta do Node).
   - **Fallback SPA:** rotas do React (`/login`, `/Dashboard`, etc.) devem devolver **`index.html`**, senão ao atualizar a página aparece 404.

6. **HTTPS** no domínio público — necessário para cookies de sessão **Secure** em produção (o Express já usa `trust proxy`).

7. **Permissões** — o utilizador do serviço Node precisa de **escrita** em `server/data/` e `server/private_uploads/` (criados em runtime).

---

## Exemplo: serviço systemd (Linux)

Ficheiro `/etc/systemd/system/icer-api.service` (ajuste caminhos e utilizador):

```ini
[Unit]
Description=ICER API (Express)
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/icer
Environment=NODE_ENV=production
EnvironmentFile=/var/www/icer/.env
ExecStart=/usr/bin/node server/index.js
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

Ativar:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now icer-api
```

---

## Exemplo: Nginx (proxy + SPA)

Conceito: servir ficheiros de `dist/` e enviar `/api` para o Node.

```nginx
location /api/ {
    proxy_pass http://127.0.0.1:3001;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

location / {
    root /var/www/icer/dist;
    try_files $uri $uri/ /index.html;
}
```

(Ajuste `root` e a porta `3001` ao seu ambiente.)

No **CyberPanel**, crie o site, defina o document root para `dist/` e configure o **reverse proxy** do prefixo `/api` para o endereço interno do Node (a interface exata depende da versão OLS/Nginx do painel).

---

## Testes da API (opcional)

Na máquina de desenvolvimento ou CI:

```bash
npm run test:server
```

Usa SQLite em memória e não depende do ficheiro `app.db` de produção.

---

## Ficheiros úteis no repositório

| Ficheiro | Conteúdo |
|----------|------------|
| `env.example` | Modelo de variáveis `.env` |
| `README.md` | Visão geral e scripts npm |
| `DEPLOY.md` | Apontador para este guia (compatibilidade) |

Se algo falhar após o deploy, confira: Node a correr, porta correta no proxy, `dist/` atualizado após cada `npm run build`, e HTTPS ativo.
