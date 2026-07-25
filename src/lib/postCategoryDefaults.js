/**
 * Categorias predefinidas de posts (mosaico /Posts).
 * Alinhado a `server/postCategoryDefaults.js` e `entities/Post.json`.
 */
export const DEFAULT_POST_CATEGORIES = [
  { value: "eventos", label: "Eventos" },
  { value: "culto_dominical", label: "Culto Dominical" },
  { value: "ceia", label: "Ceia" },
  { value: "oracao", label: "Oração" },
  { value: "clube_biblico", label: "Clube bíblico" },
  { value: "estudos_biblicos", label: "Estudos bíblicos" },
  { value: "acao_de_gracas", label: "Ação de graças" },
  { value: "dia_das_maes", label: "Dia das Mães" },
  { value: "dia_das_pais", label: "Dia dos Pais" },
  { value: "natal", label: "Natal" },
  { value: "pascoa", label: "Páscoa" },
  { value: "batismo", label: "Batismo" },
  { value: "encontro_de_casais", label: "Encontro de casais" },
  { value: "encontro_feminino", label: "Encontro Feminino" },
  { value: "encontro_masculino", label: "Encontro Masculino" },
  { value: "encontro_de_jovens", label: "Encontro de Jovens" },
  { value: "conferencias", label: "Conferências" },
];

/** Imagens cinematográficas do mosaico /Posts. */
export const DEFAULT_POST_CATEGORIA_MOSAIC_THUMBS = {
  culto_dominical: "/images/post-categories/culto-dominical.webp",
  ceia: "/images/post-categories/ceia.webp",
  oracao: "/images/post-categories/oracao.webp",
  batismo: "/images/post-categories/batismo.webp",
  acao_de_gracas: "/images/post-categories/acao-de-gracas.webp",
  encontro_de_casais: "/images/post-categories/encontro-de-casais.webp",
  encontro_feminino: "/images/post-categories/encontro-feminino.png",
  encontro_masculino: "/images/post-categories/encontro-masculino.png",
  encontro_de_jovens: "/images/post-categories/encontro-de-jovens.png",
  dia_das_maes: "/images/post-categories/dia-das-maes.webp",
  dia_das_pais: "/images/post-categories/dia-dos-pais.webp",
  natal: "/images/post-categories/natal.webp",
  pascoa: "/images/post-categories/pascoa.webp",
  conferencias:
    "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&h=450&fit=crop&q=85",
  clube_biblico:
    "https://images.unsplash.com/photo-1507692049790-de58290a4334?w=800&h=450&fit=crop&q=85",
  estudos_biblicos:
    "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800&h=450&fit=crop&q=85",
  eventos:
    "https://images.unsplash.com/photo-1511578314322-379afb476865?w=800&h=450&fit=crop&q=85",
};
