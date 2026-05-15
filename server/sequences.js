/**
 * IDs numéricos monotónicos por coleção (compatível com a API SQLite anterior).
 * @param {import("mongodb").Db} db
 * @param {string} name — ex.: "users", "posts"
 */
export async function nextSeq(db, name) {
  const col = db.collection("_sequences");
  await col.updateOne({ _id: name }, { $inc: { seq: 1 } }, { upsert: true });
  const doc = await col.findOne({ _id: name });
  return doc.seq;
}
