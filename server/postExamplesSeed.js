/** Marca posts gerados por `npm run seed:post-examples` (idempotente). */
export const POST_EXAMPLES_SEED_TAG = "post_examples_v1";

export const POST_EXAMPLES_ID_MIN = 93001;
export const POST_EXAMPLES_ID_MAX = 93150;

/** Categorias do mosaico /Eventos — posts de exemplo destas categorias não são semeados. */
export const POST_EVENTOS_EXAMPLE_CATEGORIES = new Set([
  "culto_dominical",
  "ceia",
  "oracao",
  "batismo",
  "acao_de_gracas",
  "encontro_de_casais",
  "encontro_feminino",
  "encontro_masculino",
  "encontro_de_jovens",
  "dia_das_maes",
  "dia_das_pais",
  "natal",
  "pascoa",
  "conferencias",
  "clube_biblico",
  "estudos_biblicos",
]);

const THUMBS = {
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

/** Posts de demonstração — apenas Informações (notícias). Eventos não recebe exemplos. */
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

  add("noticias", 2026, "Boas-vindas à nova área de Posts", "Conheça o mosaico por categorias e anos.", 1, 10);
  add("noticias", 2026, "Horário especial de junho", "Confira os cultos e encontros deste mês.", 6, 2);
  add("noticias", 2025, "Retrospectiva 2025", "Momentos marcantes da ICER Chapecó.", 12, 28);
  add("noticias", 2025, "Campanha de arrecadação", "Saiba como participar da ação social.", 8, 14);

  return rows;
}

function parsePostBody(row) {
  try {
    return JSON.parse(row.body_json || "{}");
  } catch {
    return {};
  }
}

function isEventosExamplePostBody(body) {
  const cat = String(body?.categoria || "")
    .trim()
    .toLowerCase();
  if (!POST_EVENTOS_EXAMPLE_CATEGORIES.has(cat)) return false;
  if (body?._seed_tag === POST_EXAMPLES_SEED_TAG) return true;
  const tags = Array.isArray(body?.tags) ? body.tags : [];
  return tags.some((t) => String(t).trim().toLowerCase() === "exemplo");
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
      const body = parsePostBody(row);
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

/**
 * Remove apenas posts de exemplo das categorias do mosaico /Eventos.
 * @param {import("mongodb").Db} db
 */
export async function removeEventPostExamples(db) {
  const coll = db.collection("posts");
  const cursor = coll.find({}, { projection: { id: 1, body_json: 1 } });
  const toDelete = [];
  for await (const row of cursor) {
    const body = parsePostBody(row);
    if (isEventosExamplePostBody(body)) {
      toDelete.push(row.id);
    }
  }
  if (!toDelete.length) return { deleted: 0 };
  const r = await coll.deleteMany({ id: { $in: toDelete } });
  return { deleted: r.deletedCount ?? 0 };
}
