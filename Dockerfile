# syntax=docker/dockerfile:1
# Produção: API Node + frontend estático (dist). Segredos (Mongo, senhas) só em runtime
# (variáveis do EasyPanel / orchestrator), nunca em ARG/ENV abaixo.
#
# Build rápido: DOCKER_BUILDKIT=1 docker build .
# - cache npm entre builds
# - uma só instalação de dependências (prune no fim)
# - frontend sem reconversão WebP (use npm run images:webp:public no dev/CI se precisar)

FROM node:20-alpine AS builder
WORKDIR /app

# Evita downloads pesados de devDependencies durante o build da imagem.
ENV CI=true \
    HUSKY=0 \
    PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 \
    MONGODB_MEMORY_SERVER_SKIP_DOWNLOAD=1

COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --ignore-scripts

# Só o necessário para `vite build` — alterações em server/ não invalidam esta camada.
COPY index.html vite.config.js jsconfig.json postcss.config.js tailwind.config.js components.json manifest.json ./
COPY src ./src
COPY public ./public

ARG VITE_USE_SERVER_AUTH=true
ENV VITE_USE_SERVER_AUTH=${VITE_USE_SERVER_AUTH}

RUN npm run build:app && npm prune --omit=dev

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0

COPY package.json package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY server ./server
COPY --from=builder /app/dist ./dist

EXPOSE 3001

CMD ["node", "server/index.js"]
