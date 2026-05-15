/**
 * Descobre onde um ficheiro `/api/files/:id` aparece na base (postagens, eventos, etc.).
 * @param {import("mongodb").Db} db
 * @param {number} fileId
 * @returns {Promise<Array<{ kind: string; id: number | string; label: string; href: string | null; meta?: string | null }>>}
 */
export async function findFileReferences(db, fileId) {
  const id = Number(fileId);
  if (!Number.isFinite(id) || id <= 0) return [];

  const needle = `/api/files/${id}`;
  const esc = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const rx = new RegExp(esc);

  /** @type {Array<{ kind: string; id: number | string; label: string; href: string | null; meta?: string | null }>} */
  const refs = [];

  function labelFromBodyJson(bodyJson, fallback) {
    try {
      const b = JSON.parse(String(bodyJson || "{}"));
      if (b && typeof b === "object") {
        const t = String(b.titulo || b.title || b.nome || "").trim();
        if (t) return t.slice(0, 160);
      }
    } catch {
      /* ignore */
    }
    return fallback;
  }

  const posts = await db
    .collection("posts")
    .find({ body_json: { $regex: esc } }, { projection: { id: 1, body_json: 1, is_draft: 1 } })
    .limit(80)
    .toArray();
  for (const p of posts) {
    const titulo = labelFromBodyJson(p.body_json, "");
    refs.push({
      kind: "post",
      id: p.id,
      label: titulo ? `Postagem: ${titulo}` : `Postagem #${p.id}`,
      href: `/Postagens/editar/${p.id}`,
      meta: p.is_draft === true ? "rascunho" : null,
    });
  }

  const eventos = await db
    .collection("eventos")
    .find({ body_json: { $regex: esc } }, { projection: { id: 1, body_json: 1 } })
    .limit(80)
    .toArray();
  for (const e of eventos) {
    const titulo = labelFromBodyJson(e.body_json, "");
    refs.push({
      kind: "evento",
      id: e.id,
      label: titulo ? `Evento: ${titulo}` : `Evento #${e.id}`,
      href: `/Evento/${e.id}`,
      meta: null,
    });
  }

  const materiais = await db
    .collection("materiais")
    .find({ body_json: { $regex: esc } }, { projection: { id: 1, body_json: 1 } })
    .limit(80)
    .toArray();
  for (const m of materiais) {
    const titulo = labelFromBodyJson(m.body_json, "");
    refs.push({
      kind: "material",
      id: m.id,
      label: titulo ? `Material: ${titulo}` : `Material #${m.id}`,
      href: "/Recursos",
      meta: "Edição em Recursos / cadastros",
    });
  }

  const fotos = await db
    .collection("fotos_galeria")
    .find({ body_json: { $regex: esc } }, { projection: { id: 1, body_json: 1 } })
    .limit(80)
    .toArray();
  for (const f of fotos) {
    const titulo = labelFromBodyJson(f.body_json, "");
    refs.push({
      kind: "foto_galeria",
      id: f.id,
      label: titulo ? `Galeria: ${titulo}` : `Foto galeria #${f.id}`,
      href: "/Admin?tab=cadastros-opcoes",
      meta: "Área Cadastros no admin",
    });
  }

  const users = await db
    .collection("users")
    .find({ avatar_url: { $regex: esc } }, { projection: { id: 1, email: 1, full_name: 1 } })
    .limit(50)
    .toArray();
  for (const u of users) {
    refs.push({
      kind: "user_avatar",
      id: u.id,
      label: `Avatar: ${u.full_name || u.email || `utilizador #${u.id}`}`,
      href: "/Admin?tab=members",
      meta: null,
    });
  }

  const kvRows = await db.collection("app_kv").find({}).project({ _id: 0, key: 1, value: 1 }).toArray();
  for (const kv of kvRows) {
    try {
      const blob = JSON.stringify(kv.value);
      if (blob && rx.test(blob)) {
        refs.push({
          kind: "app_kv",
          id: kv.key,
          label: `Configuração: ${kv.key}`,
          href: "/Admin?tab=site",
          meta: "Chave em app_kv (site, Google, etc.)",
        });
      }
    } catch {
      /* ignore */
    }
  }

  return refs;
}
