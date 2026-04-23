# Segurança — checklist de melhorias (ICER)

Este arquivo é um “to‑do” para revisar e implementar segurança por etapas.

## Já implementado

- **Bloqueio de tentativas de login (IP + utilizador)**
  - 3 falhas (janela 15 min) → bloqueio temporário (15 min)
  - 9 falhas → login “fora do ar” (24h) para aquele IP/utilizador
  - Painel de admin para ver bloqueios ativos (aba **Bloqueios**)

## Próximos itens (recomendado)

### 1) CSRF (crítico se usa cookie de sessão)

**Objetivo**: impedir ações “forjadas” em `POST/PUT/DELETE` quando o navegador envia cookies automaticamente.

- **Backend**
  - Criar endpoint para obter token CSRF (ex.: `GET /api/auth/csrf`)
  - Guardar token por sessão (ou usar double‑submit cookie)
  - Exigir header `X-CSRF-Token` em rotas mutáveis:
    - `/api/admin/*`
    - `/api/data/*`
    - `PUT/POST` de `/api/public-workspace/*` (quando houver mutação)
  - Responder `403` com `message: "csrf_required"` ou `"csrf_invalid"`
- **Frontend**
  - Buscar token no bootstrap (ou no primeiro request autenticado)
  - Injetar automaticamente o header `X-CSRF-Token` em `fetchJson`/cliente API

### 2) 2FA (TOTP) para administradores

**Objetivo**: mesmo com senha vazada, impedir acesso sem o código do autenticador.

- **Banco (users)**
  - `totp_enabled: boolean`
  - `totp_secret_enc: string` (segredo criptografado no servidor)
  - `totp_verified_at: string (ISO)` e `totp_recovery_codes_hash: string[]` (opcional)
- **Backend**
  - Rotas:
    - `POST /api/auth/2fa/setup` → cria segredo + retorna QR/otpauth
    - `POST /api/auth/2fa/verify` → confirma código e ativa
    - `POST /api/auth/2fa/disable` → desativa (exigir senha/2FA)
  - Alterar login:
    - Se `role==="admin"` e `totp_enabled` → retornar `message: "2fa_required"` (sem criar sessão)
    - Confirmar 2FA em endpoint próprio e só então criar sessão/cookie
- **Frontend**
  - `LoginModal` com 2 etapas: **senha** → **código 2FA**
  - Tela de “Ativar 2FA” e exibir **códigos de recuperação** (se adotado)

### 3) Controles de sessão (hardening)

- **Rotação de sessão**:
  - Ao fazer login (novo token)
  - Ao trocar senha / alterar role (invalidar sessões antigas)
- **Revogar sessões**:
  - Ação admin para “encerrar sessões” de um utilizador (útil em incidentes)
- **Cookies**:
  - Em produção já usa `secure: true`. Considerar `sameSite: "strict"` onde possível.

### 4) Melhorar política de senha

- **Regras**: mínimo (já existe), mas considerar:
  - proibir senhas muito comuns (lista curta)
  - exigir força maior para admins (ex.: 12+)
- **Reset de senha seguro**:
  - tokens expiram rápido
  - registrar em audit log

### 5) Auditoria e alertas (observabilidade)

- **Logs úteis**:
  - mudanças de role
  - reset de senha
  - desativar conta
  - desbloqueios manuais / limpeza de bloqueios
  - eventos de CSRF e 2FA
- **Alertas** (opcional):
  - notificar admin quando houver 9+ tentativas / `login_unavailable`

### 6) Administração de bloqueios

- **Ações no painel “Bloqueios”**
  - botão “Desbloquear” por IP/utilizador
  - botão “Desbloquear tudo” (com confirmação)
  - filtro por tipo (IP vs Utilizador) e busca

### 7) Proteção contra enumeração de contas

- Garantir resposta uniforme para:
  - “email não existe” vs “senha errada”
- Evitar mensagens detalhadas em login (manter genéricas)

## Ordem sugerida de implementação

1. **CSRF**
2. **2FA (admins)**
3. Rotação/revogação de sessão
4. Política de senha + auditoria
5. Ferramentas de desbloqueio + alertas

