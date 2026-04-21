/**
 * Secções da Home sem imagem de fundo:
 * — tema claro: cinza muito suave + toque de cartão (branco azulado);
 * — tema escuro: azul institucional escuro.
 */
export const homeSectionSolidFallback =
  "border-b border-border/80 bg-gradient-to-b from-card via-muted/25 to-muted/40 dark:border-on-brand/10 dark:bg-brand-surface-dark dark:bg-gradient-to-b dark:from-brand-surface-dark dark:via-brand-surface-dark dark:to-brand-surface-dark";

/** No claro mantém texto padrão; no escuro força texto sobre o azul */
export const homeSectionSolidContent =
  "dark:text-on-brand dark:[&_.text-muted-foreground]:text-on-brand/[0.82] dark:[&_.text-foreground]:text-on-brand";
