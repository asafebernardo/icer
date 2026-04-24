import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it, before, after } from "node:test";
import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";

import { createApplication } from "../createApp.js";
import { openDbFromUri, closeDb } from "../db.js";
import { hashPassword } from "../auth.js";
import { nowIso } from "../security.js";
import { nextSeq } from "../sequences.js";

const ADMIN_EMAIL = "admin@test.icer";
const ADMIN_PASS = "AdminPassword12!";
const USER_EMAIL = "user@test.icer";
const USER_PASS = "UserPassword12!";

async function getCsrf(agent) {
  const r = await agent.get("/api/auth/csrf").expect(200);
  return String(r.body.csrf_token || "");
}

describe("ICER API", () => {
  /** @type {import("mongodb").Db} */
  let db;
  /** @type {import("express").Express} */
  let app;
  /** @type {string} */
  let uploadDir;
  /** @type {MongoMemoryServer} */
  let memoryServer;

  before(async () => {
    memoryServer = await MongoMemoryServer.create();
    const uri = memoryServer.getUri();
    const dbName = `icer_test_${Date.now()}`;
    uploadDir = path.join(os.tmpdir(), `icer-api-test-${Date.now()}`);
    fs.mkdirSync(uploadDir, { recursive: true });
    db = await openDbFromUri(uri, dbName);

    const now = nowIso();
    const adminHash = await hashPassword(ADMIN_PASS);
    const userHash = await hashPassword(USER_PASS);
    const id1 = await nextSeq(db, "users");
    const id2 = await nextSeq(db, "users");
    await db.collection("users").insertMany([
      {
        id: id1,
        email: ADMIN_EMAIL,
        full_name: "Admin Test",
        role: "admin",
        funcao: "",
        password_hash: adminHash,
        created_at: now,
        updated_at: now,
      },
      {
        id: id2,
        email: USER_EMAIL,
        full_name: "User Test",
        role: "admin",
        funcao: "",
        password_hash: userHash,
        created_at: now,
        updated_at: now,
      },
    ]);

    app = createApplication(db, {
      uploadDir,
      enableUpstreamProxy: false,
      loginRateLimit: false,
      enforceSingleSession: false,
    });
  });

  after(async () => {
    await closeDb();
    if (memoryServer) await memoryServer.stop();
  });

  it("GET /api/health", async () => {
    const res = await request(app).get("/api/health").expect(200);
    assert.equal(res.body.ok, true);
    assert.ok(res.body.time);
  });

  it("POST /api/auth/login recusa credenciais inválidas", async () => {
    await request(app)
      .post("/api/auth/login")
      .send({ email: ADMIN_EMAIL, password: "wrong-password" })
      .expect(401);
  });

  it("GET /api/auth/me sem sessão → 401", async () => {
    await request(app).get("/api/auth/me").expect(401);
  });

  it("fluxo admin: login, me, menu-effective, admin/users", async () => {
    const agent = request.agent(app);
    await agent
      .post("/api/auth/login")
      .send({ email: ADMIN_EMAIL, password: ADMIN_PASS })
      .expect(200);

    const me = await agent.get("/api/auth/me").expect(200);
    assert.equal(me.body.email, ADMIN_EMAIL);
    assert.equal(me.body.role, "admin");

    const menu = await agent.get("/api/auth/menu-effective").expect(200);
    assert.equal(menu.body.eventos.create, true);

    const users = await agent.get("/api/admin/users").expect(200);
    assert.ok(Array.isArray(users.body));
    assert.ok(users.body.length >= 2);
    const adminRow = users.body.find((u) => u.email === ADMIN_EMAIL);
    assert.ok(adminRow);
    assert.ok(
      typeof adminRow.last_login_at === "string" && adminRow.last_login_at.length > 5,
    );
  });

  it("GET /api/admin/users/:id/audit-log (admin)", async () => {
    const agent = request.agent(app);
    await agent
      .post("/api/auth/login")
      .send({ email: ADMIN_EMAIL, password: ADMIN_PASS })
      .expect(200);
    const users = await agent.get("/api/admin/users").expect(200);
    const adminRow = users.body.find((u) => u.email === ADMIN_EMAIL);
    assert.ok(adminRow);
    const res = await agent
      .get(`/api/admin/users/${adminRow.id}/audit-log?limit=50`)
      .expect(200);
    assert.ok(Array.isArray(res.body));
    assert.ok(res.body.some((row) => row.action === "auth.login"));
  });

  it("GET /api/admin/audit-log (global, admin)", async () => {
    const agent = request.agent(app);
    await agent
      .post("/api/auth/login")
      .send({ email: ADMIN_EMAIL, password: ADMIN_PASS })
      .expect(200);
    const res = await agent.get("/api/admin/audit-log?limit=20&skip=0").expect(200);
    assert.ok(Array.isArray(res.body.rows));
    assert.equal(typeof res.body.total, "number");
    assert.ok(res.body.total >= 1);
    assert.ok(res.body.rows.length >= 1);
  });

  it("segundo administrador pode criar evento, postagem e material", async () => {
    const agent = request.agent(app);
    await agent
      .post("/api/auth/login")
      .send({ email: USER_EMAIL, password: USER_PASS })
      .expect(200);
    const csrf = await getCsrf(agent);

    const menu = await agent.get("/api/auth/menu-effective").expect(200);
    assert.equal(menu.body.eventos.create, true);
    assert.equal(menu.body.postagens.create, true);

    const ev = await agent
      .post("/api/data/eventos")
      .set("X-CSRF-Token", csrf)
      .send({
        titulo: "X",
        data: "2030-01-01",
        categoria: "culto",
        local: "Igreja",
      })
      .expect(201);
    assert.ok(ev.body.id);

    const post = await agent
      .post("/api/data/posts")
      .set("X-CSRF-Token", csrf)
      .send({ titulo: "P", descricao: "d" })
      .expect(201);
    assert.ok(post.body.id);

    const mat = await agent
      .post("/api/data/materiais")
      .set("X-CSRF-Token", csrf)
      .send({
        titulo: "Mat teste",
        descricao: "d",
        tipo: "pdf",
        categoria: "estudo",
        arquivo_url: "",
        imagem_url: "",
      })
      .expect(201);
    assert.ok(mat.body.id);
  });

  it("GET públicos de listagens (sem auth)", async () => {
    await request(app).get("/api/data/eventos").expect(200);
    await request(app).get("/api/data/posts").expect(200);
    await request(app).get("/api/data/materiais").expect(200);
    await request(app).get("/api/data/fotos-galeria").expect(200);
  });

  it("GET /api/public-workspace e POST dismiss-destaque (sem sessão)", async () => {
    const ws = await request(app).get("/api/public-workspace").expect(200);
    assert.ok(Array.isArray(ws.body.evento_destaque_dismissed_ids));

    await request(app)
      .post("/api/public-workspace/dismiss-destaque")
      .send({ id: "42" })
      .expect(200);

    const ws2 = await request(app).get("/api/public-workspace").expect(200);
    assert.ok(ws2.body.evento_destaque_dismissed_ids.includes("42"));
  });

  it("PUT /api/public-workspace/agenda-sugestoes (utilizador com edição em eventos)", async () => {
    const agent = request.agent(app);
    await agent
      .post("/api/auth/login")
      .send({ email: USER_EMAIL, password: USER_PASS })
      .expect(200);
    const csrf = await getCsrf(agent);
    const res = await agent
      .put("/api/public-workspace/agenda-sugestoes")
      .set("X-CSRF-Token", csrf)
      .send({
        agenda_sugestoes: {
          titulo: ["A", "B"],
          preletor: ["X"],
        },
      })
      .expect(200);
    assert.ok(res.body.agenda_sugestoes?.titulo?.includes("A"));
  });

  it("POST /api/data/contatos (público)", async () => {
    const res = await request(app)
      .post("/api/data/contatos")
      .send({
        nome: "N",
        email: "n@example.com",
        assunto: "oracao",
        mensagem: "texto",
      })
      .expect(201);
    assert.ok(res.body.id);
  });

  it("segundo administrador acede a GET /api/admin/users", async () => {
    const agent = request.agent(app);
    await agent
      .post("/api/auth/login")
      .send({ email: USER_EMAIL, password: USER_PASS })
      .expect(200);
    const res = await agent.get("/api/admin/users").expect(200);
    assert.ok(Array.isArray(res.body));
    assert.ok(res.body.length >= 2);
  });

  it("outro administrador pode editar evento criado por outro admin", async () => {
    const admin = request.agent(app);
    await admin
      .post("/api/auth/login")
      .send({ email: ADMIN_EMAIL, password: ADMIN_PASS })
      .expect(200);
    const csrfAdmin = await getCsrf(admin);

    const ev = await admin
      .post("/api/data/eventos")
      .set("X-CSRF-Token", csrfAdmin)
      .send({
        titulo: "Culto admin",
        data: "2031-06-15",
        categoria: "culto",
        local: "Sede",
      })
      .expect(201);
    const evId = ev.body.id;

    const user = request.agent(app);
    await user
      .post("/api/auth/login")
      .send({ email: USER_EMAIL, password: USER_PASS })
      .expect(200);
    const csrfUser = await getCsrf(user);

    const upd = await user
      .put(`/api/data/eventos/${evId}`)
      .set("X-CSRF-Token", csrfUser)
      .send({
        titulo: "Editado pelo segundo admin",
        data: "2031-06-15",
        categoria: "culto",
        local: "Sede",
      })
      .expect(200);
    assert.equal(upd.body.titulo, "Editado pelo segundo admin");
  });

  it("logout limpa sessão", async () => {
    const agent = request.agent(app);
    await agent
      .post("/api/auth/login")
      .send({ email: ADMIN_EMAIL, password: ADMIN_PASS })
      .expect(200);
    const csrf = await getCsrf(agent);
    await agent.post("/api/auth/logout").set("X-CSRF-Token", csrf).expect(200);
    await agent.get("/api/auth/me").expect(401);
  });

  it("admin PUT /api/data/menu-permissions", async () => {
    const agent = request.agent(app);
    await agent
      .post("/api/auth/login")
      .send({ email: ADMIN_EMAIL, password: ADMIN_PASS })
      .expect(200);
    const csrf = await getCsrf(agent);
    const payload = { "99": { home: { create: false, edit: true, delete: true } } };
    await agent.put("/api/data/menu-permissions").set("X-CSRF-Token", csrf).send(payload).expect(200);
    const back = await agent.get("/api/data/menu-permissions").expect(200);
    assert.deepEqual(back.body["99"].home.create, false);
  });

  it("POST /api/auth/login corpo inválido → 400", async () => {
    await request(app).post("/api/auth/login").send({ email: "nope" }).expect(400);
  });

  it("POST /api/files (admin) e GET /api/files/:id", async () => {
    const agent = request.agent(app);
    await agent
      .post("/api/auth/login")
      .send({ email: ADMIN_EMAIL, password: ADMIN_PASS })
      .expect(200);
    const csrf = await getCsrf(agent);
    const res = await agent
      .post("/api/files")
      .set("X-CSRF-Token", csrf)
      .attach("file", Buffer.from("hello"), "hello.txt")
      .expect(201);
    assert.ok(res.body.id);
    const id = res.body.id;
    const getRes = await agent.get(`/api/files/${id}`).expect(200);
    assert.equal(getRes.text, "hello");
  });

  it("GET /api/files/:id sem sessão (ficheiro público no site)", async () => {
    const agent = request.agent(app);
    await agent
      .post("/api/auth/login")
      .send({ email: ADMIN_EMAIL, password: ADMIN_PASS })
      .expect(200);
    const csrf = await getCsrf(agent);
    const res = await agent
      .post("/api/files")
      .set("X-CSRF-Token", csrf)
      .attach("file", Buffer.from("visitante"), "v.txt")
      .expect(201);
    const id = res.body.id;
    const anon = await request(app).get(`/api/files/${id}`).expect(200);
    assert.equal(anon.text, "visitante");
  });

  it("outro administrador pode apagar evento criado por outro admin", async () => {
    const admin = request.agent(app);
    await admin
      .post("/api/auth/login")
      .send({ email: ADMIN_EMAIL, password: ADMIN_PASS })
      .expect(200);
    const csrfAdmin = await getCsrf(admin);
    const ev = await admin
      .post("/api/data/eventos")
      .set("X-CSRF-Token", csrfAdmin)
      .send({
        titulo: "Para apagar",
        data: "2032-01-01",
        categoria: "culto",
        local: "L",
      })
      .expect(201);
    const evId = ev.body.id;

    const user = request.agent(app);
    await user
      .post("/api/auth/login")
      .send({ email: USER_EMAIL, password: USER_PASS })
      .expect(200);
    const csrfUser = await getCsrf(user);
    await user.delete(`/api/data/eventos/${evId}`).set("X-CSRF-Token", csrfUser).expect(204);
  });

  it("POST /api/admin/users (admin)", async () => {
    const agent = request.agent(app);
    await agent
      .post("/api/auth/login")
      .send({ email: ADMIN_EMAIL, password: ADMIN_PASS })
      .expect(200);
    const csrf = await getCsrf(agent);
    const res = await agent
      .post("/api/admin/users")
      .set("X-CSRF-Token", csrf)
      .send({
        email: "extra@test.icer",
        full_name: "Extra",
        password: "ExtraPassword12!",
      })
      .expect(201);
    assert.ok(res.body.id);
  });

  it("DELETE /api/admin/users/:id — admin elimina utilizador normal", async () => {
    const agent = request.agent(app);
    await agent
      .post("/api/auth/login")
      .send({ email: ADMIN_EMAIL, password: ADMIN_PASS })
      .expect(200);
    const csrf = await getCsrf(agent);
    const users = await agent.get("/api/admin/users").expect(200);
    const userRow = users.body.find((u) => u.email === USER_EMAIL);
    assert.ok(userRow);
    await agent.delete(`/api/admin/users/${userRow.id}`).set("X-CSRF-Token", csrf).expect(200);
    const after = await agent.get("/api/admin/users").expect(200);
    assert.ok(!after.body.some((u) => u.email === USER_EMAIL));
  });

  it("DELETE /api/admin/users/:id — não pode eliminar a própria conta", async () => {
    const agent = request.agent(app);
    await agent
      .post("/api/auth/login")
      .send({ email: ADMIN_EMAIL, password: ADMIN_PASS })
      .expect(200);
    const csrf = await getCsrf(agent);
    const me = await agent.get("/api/auth/me").expect(200);
    const res = await agent.delete(`/api/admin/users/${me.body.id}`).set("X-CSRF-Token", csrf).expect(400);
    assert.equal(res.body.message, "cannot_delete_self");
  });

  it("GET /api/admin/backup/info sem sessão → 401", async () => {
    await request(app).get("/api/admin/backup/info").expect(401);
  });

  it("GET /api/admin/backup/info e export ZIP (admin)", async () => {
    const agent = request.agent(app);
    await agent
      .post("/api/auth/login")
      .send({ email: ADMIN_EMAIL, password: ADMIN_PASS })
      .expect(200);
    const csrf = await getCsrf(agent);
    const info = await agent.get("/api/admin/backup/info").expect(200);
    assert.equal(info.body.backup_version, 1);
    assert.ok(info.body.mongo_collections);
    assert.ok(Number.isFinite(info.body.files_total));

    const g0 = await agent.get("/api/admin/integrations/google").expect(200);
    assert.equal(g0.body.enabled, false);

    await agent
      .put("/api/admin/integrations/google")
      .set("X-CSRF-Token", csrf)
      .send({
        enabled: true,
        client_id: "123.apps.googleusercontent.com",
        drive_export_folder_id: "folderABC",
        notes: "teste",
      })
      .expect(200);

    const g1 = await agent.get("/api/admin/integrations/google").expect(200);
    assert.equal(g1.body.enabled, true);
    assert.equal(g1.body.client_id, "123.apps.googleusercontent.com");
    assert.equal(g1.body.client_secret_set, false);

    const binaryParser = (res, cb) => {
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => cb(null, Buffer.concat(chunks)));
      res.on("error", (e) => cb(e));
    };
    const zip = await agent
      .get("/api/admin/backup/export")
      .buffer(true)
      .parse(binaryParser)
      .expect(200);
    const buf = zip.body;
    assert.ok(buf.length > 8);
    assert.equal(buf[0], 0x50);
    assert.equal(buf[1], 0x4b);
  });
});
