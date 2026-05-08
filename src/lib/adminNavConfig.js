/** Itens extra do grupo Administração (ex.: aba Conteúdo no painel /Admin). */
export const DEFAULT_EXTRA_ADMIN_NAV_ITEMS = [
  { id: "content", label: "Conteúdo", requiresServerAuth: false },
];

const ADMINISTRACAO_BASE_ITEMS = [
  { id: "site", label: "Site", requiresServerAuth: true },
  { id: "login-blocks", label: "Bloqueios", requiresServerAuth: true },
  { id: "audit-log", label: "Logs", requiresServerAuth: true },
  { id: "2fa", label: "2FA (opcional)", requiresServerAuth: true },
];

/**
 * Grupos de navegação do painel admin (mesma ordem que o menu lateral).
 * @param {Array<{ id: string; label: string; requiresServerAuth?: boolean }>} [extraAdminItems]
 */
export function getAdminNavGroups(extraAdminItems = DEFAULT_EXTRA_ADMIN_NAV_ITEMS) {
  const extra = (extraAdminItems || []).map((item) => ({
    id: item.id,
    label: item.label,
    requiresServerAuth: item.requiresServerAuth ?? false,
  }));
  const administracaoItems = [
    ADMINISTRACAO_BASE_ITEMS[0],
    ...extra,
    ...ADMINISTRACAO_BASE_ITEMS.slice(1),
  ];

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

/** IDs de abas válidos para `?tab=` na rota /Admin */
export function getAdminTabIds(extraAdminItems = DEFAULT_EXTRA_ADMIN_NAV_ITEMS) {
  return new Set(
    getAdminNavGroups(extraAdminItems).flatMap((g) => g.items.map((i) => i.id)),
  );
}
