# syntax=docker/dockerfile:1
# Produção: API Node + frontend estático (dist). Segredos (Mongo, senhas) só em runtime
# (variáveis do EasyPanel / orchestrator), nunca em ARG/ENV abaixo.

FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Apenas flags públicas do Vite (entram no bundle). Não coloque senhas aqui.
ARG VITE_USE_SERVER_AUTH=true
ENV VITE_USE_SERVER_AUTH=${VITE_USE_SERVER_AUTH}

RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY server ./server
COPY --from=builder /app/dist ./dist

EXPOSE 3001

CMD ["node", "server/index.js"]
