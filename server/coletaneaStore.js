import { packLyrics } from "../shared/coletaneaVoices.js";
import { withNumbers } from "../shared/coletaneaCatalog.js";
import { nextSeq } from "./sequences.js";
import { nowIso } from "./security.js";
import {
  isDeletedRow,
  markRowSoftDeleted,
  notDeletedFilter,
} from "./softDelete.js";

export const COLETANEA_COLLECTION = "coletanea_musicas";
const TEXT_MAX = 20000;

export function validateSong(input) {
  const titulo = String(input?.titulo ?? "").trim();
  const letraPack = packLyrics(input?.letra, input?.vozesLetra);
  const refraoPack = packLyrics(
    String(input?.refrao ?? "").replace(/^(?:refr[aã]o|coro)\s*:?\s*\n+/i, ""),
    input?.vozesRefrao,
  );
  const letra = letraPack.text;
  const refrao = refraoPack.text;

  if (!titulo || titulo.length > 200) {
    return { error: "titulo_invalido" };
  }
  if (!letra || letra.length > TEXT_MAX || refrao.length > TEXT_MAX) {
    return { error: "letra_invalida" };
  }
  const refraoPrimeiro = Boolean(input?.refraoPrimeiro) && Boolean(refrao);
  const cronologica = Boolean(input?.cronologica) && Boolean(refrao);
  return {
    value: {
      titulo,
      letra,
      refrao,
      cronologica,
      refraoPrimeiro,
      vozesLetra: letraPack.marks,
      vozesRefrao: refraoPack.marks,
    },
  };
}

function rowToSong(row) {
  let body = {};
  try {
    body = JSON.parse(row?.body_json || "{}");
    if (!body || typeof body !== "object") body = {};
  } catch {
    body = {};
  }
  return {
    id: row.id,
    titulo: String(body.titulo ?? ""),
    letra: String(body.letra ?? ""),
    refrao: String(body.refrao ?? ""),
    cronologica: Boolean(body.cronologica),
    refraoPrimeiro: Boolean(body.refraoPrimeiro),
    vozesLetra: Array.isArray(body.vozesLetra) ? body.vozesLetra : [],
    vozesRefrao: Array.isArray(body.vozesRefrao) ? body.vozesRefrao : [],
  };
}

async function readActiveSongs(db) {
  const rows = await db
    .collection(COLETANEA_COLLECTION)
    .find(notDeletedFilter(), { projection: { _id: 0 } })
    .toArray();
  return rows.map(rowToSong);
}

export async function listColetaneaSongs(db) {
  return withNumbers(await readActiveSongs(db));
}

export async function getColetaneaSong(db, id) {
  const songs = await listColetaneaSongs(db);
  return songs.find((song) => song.id === id) ?? null;
}

export async function createColetaneaSong(db, input, ownerUserId) {
  const checked = validateSong(input);
  if (checked.error) return checked;
  const now = nowIso();
  const id = await nextSeq(db, COLETANEA_COLLECTION);
  await db.collection(COLETANEA_COLLECTION).insertOne({
    id,
    owner_user_id: ownerUserId ?? null,
    body_json: JSON.stringify(checked.value),
    deleted_at: null,
    created_at: now,
    updated_at: now,
  });
  return { song: await getColetaneaSong(db, id) };
}

export async function updateColetaneaSong(db, id, input) {
  const checked = validateSong(input);
  if (checked.error) return checked;
  const row = await db
    .collection(COLETANEA_COLLECTION)
    .findOne({ id }, { projection: { _id: 0, deleted_at: 1 } });
  if (!row || isDeletedRow(row)) return { error: "nao_encontrada" };
  await db.collection(COLETANEA_COLLECTION).updateOne(
    { id },
    {
      $set: {
        body_json: JSON.stringify(checked.value),
        updated_at: nowIso(),
      },
    },
  );
  return { song: await getColetaneaSong(db, id) };
}

export async function deleteColetaneaSong(db, id, actorUserId) {
  const marked = await markRowSoftDeleted(db, COLETANEA_COLLECTION, { id }, actorUserId);
  if (!marked.ok) return { error: "nao_encontrada" };
  return { ok: true };
}
