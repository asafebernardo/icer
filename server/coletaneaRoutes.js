import { requireAdmin } from "./auth.js";
import { clientIp, recordAudit } from "./auditLog.js";
import {
  createColetaneaSong,
  deleteColetaneaSong,
  getColetaneaSong,
  listColetaneaSongs,
  updateColetaneaSong,
} from "./coletaneaStore.js";

function songId(raw) {
  const id = Number(raw);
  return Number.isInteger(id) ? id : null;
}

function sendResult(res, result, successStatus = 200) {
  if (result?.error === "nao_encontrada") {
    res.status(404).json({ error: result.error });
    return;
  }
  if (result?.error) {
    res.status(400).json({ error: result.error });
    return;
  }
  res.status(successStatus).json(result.song);
}

export function mountColetaneaRoutes(app, db) {
  app.get("/api/coletanea/songs", async (_req, res) => {
    res.json(await listColetaneaSongs(db));
  });

  app.get("/api/coletanea/songs/:id", async (req, res) => {
    const id = songId(req.params.id);
    if (id == null) {
      res.status(400).json({ error: "id_invalido" });
      return;
    }
    const song = await getColetaneaSong(db, id);
    if (!song) {
      res.status(404).json({ error: "nao_encontrada" });
      return;
    }
    res.json(song);
  });

  app.post("/api/admin/coletanea/songs", requireAdmin, async (req, res) => {
    const result = await createColetaneaSong(db, req.body, req.user.id);
    if (!result.error) {
      await recordAudit(db, {
        userId: req.user.id,
        actorUserId: req.user.id,
        action: "data.coletanea_musicas.create",
        details: { resource_id: result.song?.id, titulo: result.song?.titulo },
        ip: clientIp(req),
      });
    }
    sendResult(res, result, 201);
  });

  app.put("/api/admin/coletanea/songs/:id", requireAdmin, async (req, res) => {
    const id = songId(req.params.id);
    if (id == null) {
      res.status(400).json({ error: "id_invalido" });
      return;
    }
    const result = await updateColetaneaSong(db, id, req.body);
    if (!result.error) {
      await recordAudit(db, {
        userId: req.user.id,
        actorUserId: req.user.id,
        action: "data.coletanea_musicas.update",
        details: { resource_id: id, titulo: result.song?.titulo },
        ip: clientIp(req),
      });
    }
    sendResult(res, result);
  });

  app.delete("/api/admin/coletanea/songs/:id", requireAdmin, async (req, res) => {
    const id = songId(req.params.id);
    if (id == null) {
      res.status(400).json({ error: "id_invalido" });
      return;
    }
    const existing = await getColetaneaSong(db, id);
    const result = await deleteColetaneaSong(db, id, req.user.id);
    if (result.error) {
      sendResult(res, result);
      return;
    }
    await recordAudit(db, {
      userId: req.user.id,
      actorUserId: req.user.id,
      action: "data.coletanea_musicas.delete_scheduled",
      details: { resource_id: id, titulo: existing?.titulo },
      ip: clientIp(req),
    });
    res.status(204).end();
  });
}
