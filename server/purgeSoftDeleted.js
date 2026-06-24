import fs from "node:fs";
import path from "node:path";

import { log, color } from "./log.js";
import { nowIso } from "./security.js";
import {
  SOFT_DELETE_COLLECTIONS,
  purgeDueFilter,
} from "./softDelete.js";

/**
 * @param {import("mongodb").Db} db
 * @param {string} uploadDir
 * @param {(row: Record<string, unknown>) => string | null} resolveDiskPath
 */
export async function purgeSoftDeletedRecords(db, uploadDir, resolveDiskPath) {
  const now = nowIso();
  const filter = purgeDueFilter(now);
  let total = 0;

  for (const collection of SOFT_DELETE_COLLECTIONS) {
    if (collection === "files") {
      const rows = await db.collection("files").find(filter).toArray();
      for (const row of rows) {
        const diskPath = resolveDiskPath(row);
        if (diskPath) {
          try {
            fs.unlinkSync(diskPath);
          } catch (err) {
            log.warn(
              `${color.brightYellow("[purge]")} ficheiro em disco id=${color.bold(String(row.id))}: ${color.dim(String(err?.message || err))}`,
            );
          }
        }
        try {
          const cacheDir = path.join(uploadDir, "_cache");
          if (fs.existsSync(cacheDir)) {
            const pref = `${row.id}-`;
            for (const name of fs.readdirSync(cacheDir)) {
              if (name.startsWith(pref)) {
                try {
                  fs.unlinkSync(path.join(cacheDir, name));
                } catch {
                  /* ignore */
                }
              }
            }
          }
        } catch {
          /* ignore */
        }
      }
    }

    if (collection === "users") {
      const users = await db.collection("users").find(filter, { projection: { id: 1 } }).toArray();
      const ids = users.map((u) => u.id).filter((id) => id != null);
      if (ids.length) {
        await db.collection("sessions").deleteMany({ user_id: { $in: ids } });
        await db.collection("user_invites").deleteMany({ user_id: { $in: ids } });
      }
    }

    const r = await db.collection(collection).deleteMany(filter);
    if (r.deletedCount > 0) {
      total += r.deletedCount;
      log.info(
        `${color.brightYellow("[purge]")} ${color.bold(String(r.deletedCount))} registo(s) eliminado(s) de ${color.cyan(collection)}.`,
      );
    }
  }

  return { deleted: total };
}
