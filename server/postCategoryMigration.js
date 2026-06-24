import {
  DEFAULT_POST_CATEGORIES,
  sanitizePostCategorias,
} from "./postCategoryDefaults.js";
import { nowIso } from "./security.js";
import { log, color } from "./log.js";

const VALID_CATEGORY_KEYS = new Set(
  DEFAULT_POST_CATEGORIES.map((c) => c.value),
);

const LABEL_TO_VALUE = Object.fromEntries(
  DEFAULT_POST_CATEGORIES.map((c) => [c.label.toLowerCase(), c.value]),
);

/** Aliases legados → categorias actuais do mosaico /Posts. */
const CATEGORY_ALIASES = {
  culto: "culto_dominical",
  "culto dominical": "culto_dominical",
  ceia: "ceia",
  oracao: "oracao",
  oração: "oracao",
  batismo: "batismo",
  acao_de_gracas: "acao_de_gracas",
  "acao de gracas": "acao_de_gracas",
  "ação de graças": "acao_de_gracas",
  encontro_de_casais: "encontro_de_casais",
  "encontro de casais": "encontro_de_casais",
  dia_das_maes: "dia_das_maes",
  "dia das maes": "dia_das_maes",
  "dia das mães": "dia_das_maes",
  dia_das_pais: "dia_das_pais",
  "dia dos pais": "dia_das_pais",
  natal: "natal",
  pascoa: "pascoa",
  páscoa: "pascoa",
  conferencias: "conferencias",
  conferências: "conferencias",
  conferencia: "conferencias",
  conferência: "conferencias",
  clube_biblico: "clube_biblico",
  "clube biblico": "clube_biblico",
  "clube bíblico": "clube_biblico",
  estudos_biblicos: "estudos_biblicos",
  "estudos biblicos": "estudos_biblicos",
  "estudos bíblicos": "estudos_biblicos",
  estudo: "estudos_biblicos",
  estudos: "estudos_biblicos",
  noticias: "noticias",
  notícias: "noticias",
  noticia: "noticias",
  devocional: "estudos_biblicos",
  reflexao: "estudos_biblicos",
  reflexão: "estudos_biblicos",
  aviso: "noticias",
  avisos: "noticias",
  testemunho: "noticias",
  testemunhos: "noticias",
};

function stripAccents(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function normalizeToken(value) {
  return stripAccents(String(value || "").trim().toLowerCase());
}

function resolveFromToken(token) {
  const key = normalizeToken(token);
  if (!key) return null;
  if (VALID_CATEGORY_KEYS.has(key)) return key;
  if (CATEGORY_ALIASES[key]) return CATEGORY_ALIASES[key];

  const spaced = normalizeToken(String(token || "").replace(/_/g, " "));
  if (CATEGORY_ALIASES[spaced]) return CATEGORY_ALIASES[spaced];

  const fromLabel = LABEL_TO_VALUE[String(token || "").trim().toLowerCase()];
  if (fromLabel && VALID_CATEGORY_KEYS.has(fromLabel)) return fromLabel;

  const fromLabelPlain = LABEL_TO_VALUE[normalizeToken(token)];
  if (fromLabelPlain && VALID_CATEGORY_KEYS.has(fromLabelPlain)) return fromLabelPlain;

  return null;
}

/**
 * Normaliza `categoria` explícita em posts (body_json). Não infere a partir de tags.
 * @param {Record<string, unknown> | null | undefined} body
 * @returns {string | null} slug válido, `""` para limpar inválido, `null` = não alterar
 */
export function resolveTargetPostCategory(body) {
  const rawCat = String(body?.categoria ?? "").trim();
  if (!rawCat) return null;

  const direct = resolveFromToken(rawCat);
  if (direct) return direct;
  return "";
}

function normalizeStoredPostCategoria(value) {
  const slug = normalizeToken(value);
  return slug && VALID_CATEGORY_KEYS.has(slug) ? slug : "";
}

/**
 * Funde categorias guardadas no workspace com a lista predefinida actual.
 * @param {unknown} existing
 */
export function mergeWorkspacePostCategories(existing) {
  if (!Array.isArray(existing) || existing.length === 0) {
    return sanitizePostCategorias(null);
  }

  const merged = DEFAULT_POST_CATEGORIES.map((def, order) => ({
    value: def.value,
    label: def.label,
    order,
  }));

  return sanitizePostCategorias(merged);
}

/**
 * Actualiza `post_categorias` no workspace público (idempotente).
 * @param {import("mongodb").Db} db
 */
export async function mergePostCategoriesWorkspace(db) {
  const KEY = "public_workspace_v1";
  const row = await db.collection("app_kv").findOne({ key: KEY });
  const cur = row?.value && typeof row.value === "object" ? row.value : {};
  const merged = mergeWorkspacePostCategories(cur.post_categorias);
  const prevJson = JSON.stringify(cur.post_categorias ?? null);
  const nextJson = JSON.stringify(merged);
  if (prevJson === nextJson) {
    return { workspaceUpdated: false, count: merged.length };
  }

  const now = nowIso();
  await db.collection("app_kv").updateOne(
    { key: KEY },
    {
      $set: {
        key: KEY,
        value: { ...cur, post_categorias: merged },
        updated_at: now,
      },
    },
    { upsert: true },
  );
  return { workspaceUpdated: true, count: merged.length };
}

/**
 * Normaliza `categoria` em posts (body_json). Idempotente.
 * @param {import("mongodb").Db} db
 */
export async function migratePostsCategories(db) {
  const coll = db.collection("posts");
  let scanned = 0;
  let updated = 0;
  let skipped = 0;
  const ops = [];

  for await (const row of coll.find({}, { projection: { id: 1, body_json: 1 } })) {
    scanned += 1;
    let body;
    try {
      body = JSON.parse(row.body_json || "{}");
    } catch {
      skipped += 1;
      continue;
    }
    if (!body || typeof body !== "object") {
      skipped += 1;
      continue;
    }

    const target = resolveTargetPostCategory(body);
    if (target === null) {
      skipped += 1;
      continue;
    }

    const current = normalizeStoredPostCategoria(body.categoria);
    if (target === current) {
      skipped += 1;
      continue;
    }

    const nextBody = { ...body };
    if (target) {
      nextBody.categoria = target;
    } else {
      delete nextBody.categoria;
    }
    ops.push({
      updateOne: {
        filter: { id: row.id },
        update: {
          $set: {
            body_json: JSON.stringify(nextBody),
            updated_at: nowIso(),
          },
        },
      },
    });
    updated += 1;

    if (ops.length >= 200) {
      await coll.bulkWrite(ops);
      ops.length = 0;
    }
  }

  if (ops.length) await coll.bulkWrite(ops);
  return { scanned, updated, skipped };
}

/**
 * Migração completa: workspace + posts. Executada no arranque da API.
 * @param {import("mongodb").Db} db
 */
export async function migratePostCategories(db) {
  const workspace = await mergePostCategoriesWorkspace(db);
  const posts = await migratePostsCategories(db);

  if (workspace.workspaceUpdated) {
    log.success(
      `Migração posts: workspace actualizado (${color.brightYellow(String(workspace.count))} categorias).`,
    );
  }

  if (posts.updated > 0) {
    log.success(
      `Migração posts: ${color.brightYellow(String(posts.updated))} publicação(ões) com categoria normalizada (${posts.scanned} analisadas).`,
    );
  } else if (posts.scanned > 0) {
    log.info(
      color.dim(
        `Migração posts: ${posts.scanned} publicação(ões) já compatíveis (nenhuma alteração).`,
      ),
    );
  } else {
    log.info(color.dim("Migração posts: nenhuma publicação na base de dados."));
  }

  return { workspace, posts };
}
