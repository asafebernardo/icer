# syntax=docker/dockerfile:1
# Produção: API Node + frontend estático (dist). Segredos (Mongo, senhas) só em runtime
# (variáveis do EasyPanel / orchestrator), nunca em ARG/ENV abaixo.
#
# Arranque: docker compose up -d --build  (ver docker-compose.yml)
# Build isolado: DOCKER_BUILDKIT=1 docker build .
# - cache npm entre builds
# - uma só instalação de dependências (prune no fim)
# - frontend sem reconversão WebP (use npm run images:webp:public no dev/CI se precisar)

FROM node:20-alpine AS builder
WORKDIR /app

# Evita downloads pesados de devDependencies durante o build da imagem.
# Sem --ignore-scripts: argon2/sharp precisam dos binários nativos.
ENV CI=true \
    HUSKY=0 \
    PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 \
    MONGODB_MEMORY_SERVER_SKIP_DOWNLOAD=1

RUN apk add --no-cache libc6-compat python3 make g++

COPY package.json package-lock.json ./
# `npm ci` corre `prepare` → precisa deste ficheiro (CI=true faz o script sair logo).
COPY scripts/prepare.mjs ./scripts/prepare.mjs
RUN --mount=type=cache,target=/root/.npm \
    npm ci

# Só o necessário para `vite build` — alterações em server/ não invalidam esta camada.
COPY index.html vite.config.js jsconfig.json postcss.config.js tailwind.config.js components.json manifest.json ./
COPY src ./src
COPY public ./public
COPY shared ./shared

ARG VITE_USE_SERVER_AUTH=true
ENV VITE_USE_SERVER_AUTH=${VITE_USE_SERVER_AUTH}

RUN npm run build:app && npm prune --omit=dev

FROM node:20-alpine AS runner
WORKDIR /app

RUN apk add --no-cache libc6-compat \
    && mkdir -p /data/uploads /app/logs

ENV NODE_ENV=production
ENV HOST=0.0.0.0
# Porta canónica da app no container. No EasyPanel: proxy 80→3001 e healthcheck nesta porta.
ENV PORT=3001
ENV ICER_UPLOAD_DIR=/data/uploads

COPY package.json package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY server ./server
COPY shared ./shared
COPY scripts/migrate-uploads-to-drive.mjs ./scripts/migrate-uploads-to-drive.mjs
COPY --from=builder /app/dist ./dist

EXPOSE 3001

# Evita reinícios se o painel probe a porta errada; usa o PORT do runtime.
HEALTHCHECK --interval=20s --timeout=5s --start-period=45s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3001)+'/health').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# Preferir `node` directo (não `npm start`) — SIGTERM do orchestrator não gera "npm error".
CMD ["node", "server/index.js"]
