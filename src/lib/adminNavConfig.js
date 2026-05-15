/** Itens extra do grupo Administração (fundidos na lista e ordenados por etiqueta). */
export const DEFAULT_EXTRA_ADMIN_NAV_ITEMS = [];

const ADMINISTRACAO_BASE_ITEMS = [
  { id: "site", label: "Site", requiresServerAuth: true },
  {
    id: "google",
    label: "Google",
    requiresServerAuth: true,
    comingSoon: true,
  },
  { id: "server", label: "Servidor", requiresServerAuth: true },
  {
    id: "cadastros-opcoes",
    label: "Cadastros",
    requiresServerAuth: true,
  },
  { id: "login-blocks", label: "Bloqueios", requiresServerAuth: true },
  { id: "audit-log", label: "Logs", requiresServerAuth: true },
  { id: "2fa", label: "2FA", requiresServerAuth: true },
];

/**
 * Grupos de navegação do painel admin (mesma ordem que o menu lateral).
 * @param {Array<{ id: string; label: string; requiresServerAuth?: boolean; comingSoon?: boolean }>} [extraAdminItems]
 */
export function getAdminNavGroups(extraAdminItems = DEFAULT_EXTRA_ADMIN_NAV_ITEMS) {
  const extra = (extraAdminItems || []).map((item) => ({
    id: item.id,
    label: item.label,
    requiresServerAuth: item.requiresServerAuth ?? false,
    ...(item.comingSoon ? { comingSoon: true } : {}),
  }));
  const administracaoItems = [...ADMINISTRACAO_BASE_ITEMS, ...extra].sort((a, b) =>
    a.label.localeCompare(b.label, "pt", { sensitivity: "base", numeric: true }),
  );

  return [
    {
      id: "conta",
      label: "Conta",
      items: [
        { id: "profile", label: "Minha conta" },
        { id: "members", label: "Membros" },
      ],
    },
    {
      id: "administracao",
      label: "Administração",
      items: administracaoItems,
    },
  ];
}

/** IDs de abas selecionáveis para `?tab=` na rota /Admin (exclui itens `comingSoon`). */
export function getAdminTabIds(extraAdminItems = DEFAULT_EXTRA_ADMIN_NAV_ITEMS) {
  return new Set(
    getAdminNavGroups(extraAdminItems).flatMap((g) =>
      g.items.filter((i) => !i.comingSoon).map((i) => i.id),
    ),
  );
}
