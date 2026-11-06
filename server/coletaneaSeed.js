import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { nowIso } from "./security.js";
import { COLETANEA_COLLECTION, validateSong } from "./coletaneaStore.js";

const filePath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "coletanea-songs.json",
);

/**
 * Na primeira arranque com a coleção vazia, copia o catálogo da coletânea.
 * Não repõe músicas se a coleção já tiver registos, mesmo apagados.
 */
export async function seedColetaneaSongs(db) {
  const count = await db.collection(COLETANEA_COLLECTION).countDocuments();
  if (count > 0) return { inserted: 0, skipped: true };

  const raw = JSON.parse(await readFile(filePath, "utf8"));
  if (!Array.isArray(raw)) return { inserted: 0, skipped: false };

  const now = nowIso();
  const docs = [];
  let maxId = 0;
  for (const item of raw) {
    const checked = validateSong(item);
    const id = Number(item?.id);
    if (checked.error || !Number.isInteger(id) || id < 1) continue;
    maxId = Math.max(maxId, id);
    docs.push({
      id,
      owner_user_id: null,
      body_json: JSON.stringify(checked.value),
      deleted_at: null,
      created_at: now,
      updated_at: now,
    });
  }

  if (docs.length) {
    await db.collection(COLETANEA_COLLECTION).insertMany(docs);
    await db.collection("_sequences").updateOne(
      { _id: COLETANEA_COLLECTION },
      { $max: { seq: maxId } },
      { upsert: true },
    );
  }
  return { inserted: docs.length, skipped: false };
}
