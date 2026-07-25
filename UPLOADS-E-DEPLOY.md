# Uploads e deploy (ICER)

Este documento explica **onde** a aplicação grava ficheiros enviados pelos utilizadores, **como evitar** que um deploy apague ou substitua esses dados, e **como reduzir o tempo de build**.

## Deploy rápido (Docker / EasyPanel)

O `Dockerfile` está optimizado para builds mais curtos:

- **`npm run build:app`** no build (só Vite) — sem reconverter imagens WebP em cada deploy.
- **Uma instalação** de dependências + `npm prune` (em vez de dois `npm ci`).
- **Cache de camadas**: alterações só em `server/` não rebuilam o frontend.
- **Contexto menor** via `.dockerignore` (testes, e2e, docs, etc.).

No painel de build, active BuildKit se disponível: `DOCKER_BUILDKIT=1`.

### Arranque / EasyPanel (evitar SIGTERM em loop)

O checklist de startup a imprimir e a seguir um `npm error … signal SIGTERM` **não é crash da API**: o processo foi parado de fora (redeploy, restart ou healthcheck a falhar).

Confirme no painel:

1. **Start command:** `node server/index.js` (não `npm start` — o npm reporta SIGTERM como “error” mesmo em paragem normal).
2. **`NODE_ENV=production`** e **`HOST=0.0.0.0`** (já vêm no `Dockerfile`; não force `development` no runtime).
3. **`PORT=3001`** no container; o proxy público (80/443) aponta para `3001`. Se `PORT=80` e o healthcheck continua em `3001`, o orchestrator mata o container em ciclo.
4. **Healthcheck:** `GET /health` ou `GET /api/health` na **mesma** porta do `PORT`.

### Imagens WebP

Converta assets estáticos **uma vez** no desenvolvimento e faça commit dos `.webp`:

```bash
npm run images:webp:public
```

Ou corra localmente antes do deploy se adicionou JPG/PNG novos em `public/`.

### Arranque mais rápido após deploy

No primeiro deploy com base MongoDB já migrada, pode desactivar a migração de categorias no arranque:

```bash
ICER_RUN_POST_CATEGORY_MIGRATION=false
```

Isto reduz o tempo até o `/health` responder quando há muitos posts. A migração é idempotente — só é necessária quando mudam categorias no código.

## Onde ficam os ficheiros

- Com autenticação no servidor (`VITE_USE_SERVER_AUTH=true`), a API Node grava media (imagens, PDF, etc.) em disco.
- O caminho padrão é a pasta **`server/uploads/`**, relativa ao diretório de trabalho do processo Node (normalmente a raiz do projeto).
- Pode ser alterado pela variável de ambiente **`ICER_UPLOAD_DIR`** (caminho absoluto ou relativo; o servidor resolve com `path.resolve`).

Os metadados (URLs, registos) continuam na **MongoDB**; só o binário fica no disco.

## Por que o deploy “apaga” os uploads

Se o fluxo de deploy **substitui a árvore inteira** da aplicação no servidor (FTP/SFTP, `rsync`, cópia de ZIP, pipeline que apaga e extrai de novo, etc.), a pasta `server/uploads` é tratada como parte do código e **é sobrescrita** por uma pasta vazia ou antiga do pacote de deploy. O resultado é perda de ficheiros já enviados.

O `.dockerignore` do projeto já exclui `server/uploads` da **imagem** Docker, mas isso não protege contra um sync genérico para a VM que inclua `server/uploads`.

## Soluções recomendadas

### 1. Diretório de uploads fora da pasta deployada (recomendado)

No servidor, no `.env` do Node:

```bash
ICER_UPLOAD_DIR=/var/lib/icer/uploads
```

- Crie o diretório uma vez: `sudo mkdir -p /var/lib/icer/uploads` e ajuste dono/grupo ao utilizador que corre o Node.
- **Não** inclua `/var/lib/icer/uploads` no pacote ou comando de deploy; só o código vai para a pasta da app.

Assim, cada novo deploy atualiza só o código; os ficheiros permanecem no volume persistente.

### 2. Excluir `server/uploads` do sync

Se mantiver o caminho por defeito dentro do projeto, configure o teu `rsync` (ou equivalente) para **não** enviar nem apagar essa pasta no destino, por exemplo:

```bash
rsync -avz --exclude 'server/uploads/' ./ utilizador@servidor:/caminho/da/app/
```

- Com `--delete`, confirme que exclusões estão corretas; caso contrário ficheiros só no servidor podem ser removidos.

### 3. Docker

Monte um **volume** (nomeado ou bind mount) no caminho definido por `ICER_UPLOAD_DIR`, ou mapeie explicitamente `server/uploads` para um volume, para que novas imagens não destruam o conteúdo.

## Git e repositório

A pasta `server/uploads/` está no **`.gitignore`**: não deve ir para o Git como dados de runtime (evita ruído e não “empurra” uploads entre ambientes).

## Referências no projeto

- `env.example` — comentário sobre `ICER_UPLOAD_DIR` em produção.
- `server/index.js` — leitura de `ICER_UPLOAD_DIR`.
- `.dockerignore` — exclusão de `server/uploads` na build da imagem.

## Hospedagem geral

Para Nginx, systemd, CyberPanel e resto do guia de hospedagem, vê **[GUIA-HOSPEDAGEM.md](./GUIA-HOSPEDAGEM.md)** (se existir no teu checkout) e **[DEPLOY.md](./DEPLOY.md)**.
