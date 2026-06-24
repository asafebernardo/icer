/** Marca posts gerados por `npm run seed:post-examples` (idempotente). */
export const POST_EXAMPLES_SEED_TAG = "post_examples_v1";

export const POST_EXAMPLES_ID_MIN = 93001;
export const POST_EXAMPLES_ID_MAX = 93150;

const THUMBS = {
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
  noticias:
    "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&h=450&fit=crop&q=85",
};

function thumb(categoria) {
  return THUMBS[categoria] || THUMBS.noticias;
}

function pubSortAtFromBody(body, fallbackIso) {
  const iso = body?.data_publicacao;
  if (typeof iso === "string" && iso.trim()) {
    const t = Date.parse(iso.trim());
    if (!Number.isNaN(t)) return new Date(t);
  }
  const d =
    fallbackIso instanceof Date ? fallbackIso : new Date(String(fallbackIso));
  return Number.isNaN(d.getTime()) ? new Date(0) : d;
}

/**
 * @param {number} id
 * @param {object} spec
 */
function example(id, spec) {
  const body = {
    titulo: spec.titulo,
    descricao: spec.descricao,
    conteudo: `<p>${spec.descricao}</p>`,
    categoria: spec.categoria,
    data_publicacao: spec.data_publicacao,
    imagem_url: thumb(spec.categoria),
    imagens_urls: [thumb(spec.categoria)],
    publicado: true,
    status: "published",
    visibility: "public",
    tags: ["exemplo"],
    _seed_tag: POST_EXAMPLES_SEED_TAG,
  };
  const created_at = `${spec.data_publicacao}T12:00:00.000Z`;
  return {
    id,
    body,
    created_at,
    pub_sort_at: pubSortAtFromBody(body, created_at),
  };
}

/** Definições de posts de demonstração (várias categorias e anos). */
export function buildPostExamples() {
  let id = POST_EXAMPLES_ID_MIN;
  const nextId = () => {
    const cur = id;
    id += 1;
    return cur;
  };

  const rows = [];

  const add = (categoria, year, titulo, descricao, month = 6, day = 15) => {
    const mm = String(month).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    rows.push(
      example(nextId(), {
        categoria,
        titulo,
        descricao,
        data_publicacao: `${year}-${mm}-${dd}`,
      }),
    );
  };

  // Informações — lista contínua (notícias)
  add("noticias", 2026, "Boas-vindas à nova área de Posts", "Conheça o mosaico por categorias e anos.", 1, 10);
  add("noticias", 2026, "Horário especial de junho", "Confira os cultos e encontros deste mês.", 6, 2);
  add("noticias", 2025, "Retrospectiva 2025", "Momentos marcantes da ICER Chapecó.", 12, 28);
  add("noticias", 2025, "Campanha de arrecadação", "Saiba como participar da ação social.", 8, 14);

  // Oficiais — 2+ posts no mesmo ano para agrupar
  add("culto_dominical", 2026, "Culto dominical — março", "Louvor, palavra e comunhão.", 3, 9);
  add("culto_dominical", 2026, "Culto dominical — junho", "Celebração especial de meio de ano.", 6, 22);
  add("culto_dominical", 2025, "Culto de encerramento do ano", "Gratidão e renovação.", 12, 29);
  add("ceia", 2026, "Ceia — janeiro", "Memorial da ceia do Senhor.", 1, 26);
  add("ceia", 2026, "Ceia — julho", "Momento de reflexão e comunhão.", 7, 13);
  add("oracao", 2026, "Noite de oração", "Intercessão pela igreja e cidade.", 4, 18);

  // Festividade
  add("acao_de_gracas", 2026, "Ação de graças 2026", "Culto de gratidão pela colheita.", 5, 4);
  add("dia_das_maes", 2025, "Dia das Mães 2025", "Homenagem às mães da igreja.", 5, 11);
  add("dia_das_pais", 2025, "Dia dos Pais 2025", "Celebração com louvor e palavra.", 8, 10);
  add("natal", 2025, "Culto de Natal 2025", "O nascimento de Cristo em foco.", 12, 24);
  add("natal", 2025, "Cantata de Natal", "Apresentação das crianças e jovens.", 12, 20);
  add("natal", 2024, "Natal 2024 — retrospectiva", "Fotos e mensagem do culto.", 12, 25);
  add("pascoa", 2026, "Culto da Páscoa", "Ressurreição de Cristo.", 4, 5);
  add("pascoa", 2026, "Batismo na Páscoa", "Celebração com novos batismos.", 4, 6);

  // Encontros
  add("encontro_de_casais", 2026, "Encontro de casais — edição primavera", "Fortalecendo lares cristãos.", 3, 15);
  add("encontro_feminino", 2026, "Encontro feminino 2026", "Comunhão e estudo bíblico.", 2, 22);
  add("encontro_masculino", 2026, "Encontro masculino 2026", "Homens firmes na palavra.", 2, 28);
  add("encontro_de_jovens", 2026, "Encontro de jovens — março", "Adoração e discipulado.", 3, 8);
  add("encontro_de_jovens", 2026, "Encontro de jovens — outubro", "Missões e serviço.", 10, 12);

  // Especiais
  add("conferencias", 2026, "Conferência anual 2026", "Palestras e workshops.", 9, 6);
  add("conferencias", 2025, "Conferência 2025", "Edição anterior — mensagens disponíveis.", 9, 7);
  add("batismo", 2026, "Batismos de junho", "Celebração nas águas.", 6, 8);
  add("clube_biblico", 2026, "Clube bíblico — trimestre 1", "Estudo do livro de Atos.", 2, 5);
  add("clube_biblico", 2026, "Clube bíblico — trimestre 2", "Continuação do estudo em Atos.", 5, 3);
  add("estudos_biblicos", 2026, "Estudo bíblico semanal", "Série sobre o Sermão da Montanha.", 1, 15);

  return rows;
}

/**
 * Insere ou actualiza posts de exemplo (ids fixos 93001+).
 * @param {import("mongodb").Db} db
 */
export async function seedPostExamples(db) {
  const examples = buildPostExamples();
  const coll = db.collection("posts");
  const now = new Date().toISOString();
  let inserted = 0;
  let updated = 0;

  for (const row of examples) {
    const body_json = JSON.stringify(row.body);
    const existing = await coll.findOne({ id: row.id }, { projection: { id: 1 } });
    const doc = {
      id: row.id,
      owner_user_id: null,
      body_json,
      is_draft: false,
      visibility: "public",
      pub_sort_at: row.pub_sort_at,
      updated_at: now,
    };
    if (existing) {
      await coll.updateOne({ id: row.id }, { $set: doc });
      updated += 1;
    } else {
      await coll.insertOne({ ...doc, created_at: row.created_at });
      inserted += 1;
    }
  }

  const maxId = Math.max(...examples.map((r) => r.id));
  const seqCol = db.collection("_sequences");
  const seqDoc = await seqCol.findOne({ _id: "posts" });
  const curSeq = Number(seqDoc?.seq) || 0;
  if (maxId > curSeq) {
    await seqCol.updateOne(
      { _id: "posts" },
      { $set: { seq: maxId } },
      { upsert: true },
    );
  }

  return { inserted, updated, total: examples.length, ids: examples.map((r) => r.id) };
}

/**
 * Remove posts de exemplo gerados por este seed.
 * @param {import("mongodb").Db} db
 */
export async function removePostExamples(db) {
  const coll = db.collection("posts");
  const cursor = coll.find(
    {},
    { projection: { id: 1, body_json: 1 } },
  );
  const toDelete = [];
  for await (const row of cursor) {
    if (row.id >= POST_EXAMPLES_ID_MIN && row.id <= POST_EXAMPLES_ID_MAX) {
      toDelete.push(row.id);
      continue;
    }
    try {
      const body = JSON.parse(row.body_json || "{}");
      if (body?._seed_tag === POST_EXAMPLES_SEED_TAG) {
        toDelete.push(row.id);
      }
    } catch {
      /* ignore */
    }
  }
  if (!toDelete.length) return { deleted: 0 };
  const r = await coll.deleteMany({ id: { $in: toDelete } });
  return { deleted: r.deletedCount ?? 0 };
}
