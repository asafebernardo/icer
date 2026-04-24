# Uploads e deploy (ICER)

Este documento explica **onde** a aplicação grava ficheiros enviados pelos utilizadores e **como evitar** que um deploy apague ou substitua esses dados.

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
