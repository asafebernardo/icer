import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it, before } from "node:test";
import request from "supertest";

import { createApplication } from "../createApp.js";
import { openDbMemory } from "../db.js";
import { hashPassword } from "../auth.js";
import { nowIso } from "../security.js";

const ADMIN_EMAIL = "admin@test.icer";
const ADMIN_PASS = "AdminPassword12";
const USER_EMAIL = "user@test.icer";
const USER_PASS = "UserPassword12";

describe("ICER API", () => {
  /** @type {import("better-sqlite3").Database} */
  let db;
  /** @type {import("express").Express} */
  let app;
  /** @type {string} */
  let uploadDir;

  before(async () => {
    uploadDir = path.join(os.tmpdir(), `icer-api-test-${Date.now()}`);
    fs.mkdirSync(uploadDir, { recursive: true });
    db = openDbMemory();
    const now = nowIso();
    const adminHash = await hashPassword(ADMIN_PASS);
    const userHash = await hashPassword(USER_PASS);
    db.prepare(
      `INSERT INTO users (email, full_name, role, password_hash, created_at, updated_at)
       VALUES (?, ?, 'admin', ?, ?, ?)`,
    ).run(ADMIN_EMAIL, "Admin Test", adminHash, now, now);
    db.prepare(
      `INSERT INTO users (email, full_name, role, password_hash, created_at, updated_at)
       VALUES (?, ?, 'user', ?, ?, ?)`,
    ).run(USER_EMAIL, "User Test", userHash, now, now);

    const rowUser = db.prepare(`SELECT id FROM users WHERE email = ?`).get(USER_EMAIL);
    const uid = String(rowUser.id);
    db.prepare(
      `INSERT INTO app_kv (key, value) VALUES ('menu_permissions', ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    ).run(
      JSON.stringify({
        [uid]: {
          eventos: { create: false, edit: true, delete: false },
          postagens: { create: false, edit: false, delete: false },
          materiais_tab: { create: true, edit: false, delete: false },
          galeria: { create: false, edit: false, delete: false },
        },
      }),
    );

    app = createApplication(db, {
      uploadDir,
      enableUpstreamProxy: false,
      loginRateLimit: false,
    });
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
  });

  it("utilizador sem permissões: não cria evento nem postagem; pode criar material", async () => {
    const agent = request.agent(app);
    await agent
      .post("/api/auth/login")
      .send({ email: USER_EMAIL, password: USER_PASS })
      .expect(200);

    const menu = await agent.get("/api/auth/menu-effective").expect(200);
    assert.equal(menu.body.eventos.create, false);
    assert.equal(menu.body.postagens.create, false);
    assert.equal(menu.body.materiais_tab.create, true);

    await agent
      .post("/api/data/eventos")
      .send({
        titulo: "X",
        data: "2030-01-01",
        categoria: "culto",
        local: "Igreja",
      })
      .expect(403);

    await agent
      .post("/api/data/posts")
      .send({ titulo: "P", descricao: "d" })
      .expect(403);

    const mat = await agent
      .post("/api/data/materiais")
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

  it("utilizador normal não acede a GET /api/admin/users", async () => {
    const agent = request.agent(app);
    await agent
      .post("/api/auth/login")
      .send({ email: USER_EMAIL, password: USER_PASS })
      .expect(200);
    await agent.get("/api/admin/users").expect(403);
  });

  it("admin cria evento e utilizador restrito não edita recurso alheio", async () => {
    const admin = request.agent(app);
    await admin
      .post("/api/auth/login")
      .send({ email: ADMIN_EMAIL, password: ADMIN_PASS })
      .expect(200);

    const ev = await admin
      .post("/api/data/eventos")
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

    await user
      .put(`/api/data/eventos/${evId}`)
      .send({
        titulo: "Hack",
        data: "2031-06-15",
        categoria: "culto",
        local: "Sede",
      })
      .expect(403);
  });

  it("logout limpa sessão", async () => {
    const agent = request.agent(app);
    await agent
      .post("/api/auth/login")
      .send({ email: ADMIN_EMAIL, password: ADMIN_PASS })
      .expect(200);
    await agent.post("/api/auth/logout").expect(200);
    await agent.get("/api/auth/me").expect(401);
  });

  it("admin PUT /api/data/menu-permissions", async () => {
    const agent = request.agent(app);
    await agent
      .post("/api/auth/login")
      .send({ email: ADMIN_EMAIL, password: ADMIN_PASS })
      .expect(200);
    const payload = { "99": { home: { create: false, edit: true, delete: true } } };
    await agent.put("/api/data/menu-permissions").send(payload).expect(200);
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
    const res = await agent
      .post("/api/files")
      .attach("file", Buffer.from("hello"), "hello.txt")
      .expect(201);
    assert.ok(res.body.id);
    const id = res.body.id;
    const getRes = await agent.get(`/api/files/${id}`).expect(200);
    assert.equal(getRes.text, "hello");
  });

  it("utilizador restrito não apaga evento de outrem", async () => {
    const admin = request.agent(app);
    await admin
      .post("/api/auth/login")
      .send({ email: ADMIN_EMAIL, password: ADMIN_PASS })
      .expect(200);
    const ev = await admin
      .post("/api/data/eventos")
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
    await user.delete(`/api/data/eventos/${evId}`).expect(403);
  });

  it("POST /api/admin/users (admin)", async () => {
    const agent = request.agent(app);
    await agent
      .post("/api/auth/login")
      .send({ email: ADMIN_EMAIL, password: ADMIN_PASS })
      .expect(200);
    const res = await agent
      .post("/api/admin/users")
      .send({
        email: "extra@test.icer",
        full_name: "Extra",
        role: "user",
        password: "ExtraPassword12",
      })
      .expect(201);
    assert.ok(res.body.id);
  });
});
