import assert from "node:assert/strict";
import { describe, it, before, after } from "node:test";
import request from "supertest";

import {
  ADMIN_EMAIL,
  ADMIN_PASS,
  USER_EMAIL,
  USER_PASS,
  setupTestHarness,
  teardownTestHarness,
  getTestApp,
  loginAs,
} from "./testHarness.mjs";

describe("ICER — cobertura de API e funcionalidades", () => {
  /** @type {import("express").Express} */
  let app;

  before(async () => {
    await setupTestHarness();
    app = getTestApp();
  });

  after(async () => {
    await teardownTestHarness();
  });

  it("GET /health e GET /api/site-config (público)", async () => {
    const h = await request(app).get("/health").expect(200);
    assert.equal(h.text, "ok");
    const apiHealth = await request(app).get("/api/health").expect(200);
    assert.equal(apiHealth.body.ok, true);
    const cfg = await request(app).get("/api/site-config").expect(200);
    assert.equal(typeof cfg.body, "object");
  });

  it("métricas da Home: POST view e GET resumo", async () => {
    await request(app).post("/api/metrics/home-views").expect(200);
    const sum = await request(app).get("/api/metrics/home-views-summary").expect(200);
    assert.ok(sum.body.total_views >= 1);
    assert.ok(sum.body.unique_ips >= 1);
  });

  it("admin: site-config, public-workspace, métricas e servidor", async () => {
    const agent = request.agent(app);
    const csrf = await loginAs(agent, ADMIN_EMAIL, ADMIN_PASS);

    const cfgPut = await agent
      .put("/api/admin/site-config")
      .set("X-CSRF-Token", csrf)
      .send({ site_title: "ICER Test" })
      .expect(200);
    assert.equal(cfgPut.body.ok, true);

    const ws = await agent
      .put("/api/admin/public-workspace")
      .set("X-CSRF-Token", csrf)
      .send({ agenda_sugestoes: { titulo: ["Sugestão teste"] } })
      .expect(200);
    assert.ok(ws.body);

    await agent.post("/api/metrics/home-views").expect(200);
    const metrics = await agent.get("/api/admin/metrics/home-views").expect(200);
    assert.ok(metrics.body.total_views >= 1);
    assert.ok(Array.isArray(metrics.body.rows));

    const ttl = await agent.get("/api/admin/session-ttl").expect(200);
    assert.ok(Number.isFinite(ttl.body.ttl_minutes));

    const blocks = await agent.get("/api/admin/login-blocks").expect(200);
    assert.ok(Array.isArray(blocks.body.rows));

    const retention = await agent.get("/api/admin/audit-log-retention").expect(200);
    assert.ok(retention.body.retention);

    const info = await agent.get("/api/admin/server-info").expect(200);
    assert.ok(info.body);
  });

  it("grupos de permissão: criar, editar e apagar", async () => {
    const agent = request.agent(app);
    const csrf = await loginAs(agent, ADMIN_EMAIL, ADMIN_PASS);
    const list0 = await agent.get("/api/admin/permission-groups").expect(200);
    assert.ok(Array.isArray(list0.body));

    const created = await agent
      .post("/api/admin/permission-groups")
      .set("X-CSRF-Token", csrf)
      .send({ name: "Grupo Teste", description: "E2E" })
      .expect(201);
    const gid = created.body.id;
    assert.ok(gid);

    await agent
      .put(`/api/admin/permission-groups/${gid}`)
      .set("X-CSRF-Token", csrf)
      .send({ name: "Grupo Teste Atualizado" })
      .expect(200);

    await agent.delete(`/api/admin/permission-groups/${gid}`).set("X-CSRF-Token", csrf).expect(200);
  });

  it("CRUD completo: posts, materiais e galeria", async () => {
    const agent = request.agent(app);
    const csrf = await loginAs(agent, USER_EMAIL, USER_PASS);

    const post = await agent
      .post("/api/data/posts")
      .set("X-CSRF-Token", csrf)
      .send({ titulo: "Post cobertura", descricao: "texto", visibility: "public" })
      .expect(201);
    const postId = post.body.id;

    const gotPost = await request(app).get(`/api/data/posts/${postId}`).expect(200);
    assert.equal(gotPost.body.titulo, "Post cobertura");

    await agent
      .put(`/api/data/posts/${postId}`)
      .set("X-CSRF-Token", csrf)
      .send({ titulo: "Post editado", descricao: "ok", visibility: "public" })
      .expect(200);

    const mat = await agent
      .post("/api/data/materiais")
      .set("X-CSRF-Token", csrf)
      .send({
        titulo: "Material cobertura",
        descricao: "d",
        tipo: "pdf",
        categoria: "estudo",
        arquivo_url: "",
        imagem_url: "",
      })
      .expect(201);
    const matId = mat.body.id;
    await agent
      .put(`/api/data/materiais/${matId}`)
      .set("X-CSRF-Token", csrf)
      .send({
        titulo: "Material editado",
        descricao: "d",
        tipo: "pdf",
        categoria: "estudo",
        arquivo_url: "",
        imagem_url: "",
      })
      .expect(200);

    const foto = await agent
      .post("/api/data/fotos-galeria")
      .set("X-CSRF-Token", csrf)
      .send({ titulo: "Foto teste", ano: 2026, imagem_url: "" })
      .expect(201);
    const fotoId = foto.body.id;
    await agent
      .put(`/api/data/fotos-galeria/${fotoId}`)
      .set("X-CSRF-Token", csrf)
      .send({ titulo: "Foto editada", ano: 2026, imagem_url: "" })
      .expect(200);

    await agent.delete(`/api/data/posts/${postId}`).set("X-CSRF-Token", csrf).expect(204);
    await agent.delete(`/api/data/materiais/${matId}`).set("X-CSRF-Token", csrf).expect(204);
    await agent.delete(`/api/data/fotos-galeria/${fotoId}`).set("X-CSRF-Token", csrf).expect(204);
  });

  it("eventos em massa: bulk-runs e bulk-schedules", async () => {
    const agent = request.agent(app);
    const csrf = await loginAs(agent, ADMIN_EMAIL, ADMIN_PASS);

    const ev = await agent
      .post("/api/data/eventos")
      .set("X-CSRF-Token", csrf)
      .send({
        titulo: "Bulk ev",
        data: "2035-03-01",
        categoria: "culto",
        local: "Sede",
      })
      .expect(201);

    const run = await agent
      .post("/api/admin/eventos/bulk-runs")
      .set("X-CSRF-Token", csrf)
      .send({
        batch_id: "batch-test-001",
        titulo: "Lote teste",
        created_event_ids: [ev.body.id],
      })
      .expect(201);
    assert.ok(run.body.id);

    const runs = await agent.get("/api/admin/eventos/bulk-runs").expect(200);
    assert.ok(runs.body.items.some((r) => r.id === run.body.id));

    const sched = await agent
      .post("/api/admin/eventos/bulk-schedules")
      .set("X-CSRF-Token", csrf)
      .send({
        nome: "Rotina teste",
        payload: {
          titulo: "Culto semanal",
          categoria: "culto",
          repeatMode: "weekly",
          weekday: "0",
          startDate: "2035-01-01",
          endDate: "2035-12-31",
        },
      })
      .expect(201);
    const schedId = sched.body.id;

    await agent
      .put(`/api/admin/eventos/bulk-schedules/${schedId}`)
      .set("X-CSRF-Token", csrf)
      .send({ nome: "Rotina atualizada" })
      .expect(200);

    const one = await agent.get(`/api/admin/eventos/bulk-schedules/${schedId}`).expect(200);
    assert.equal(one.body.nome, "Rotina atualizada");

    const all = await agent.get("/api/admin/eventos/bulk-schedules").expect(200);
    assert.ok(Array.isArray(all.body.items));

    await agent
      .delete(`/api/admin/eventos/bulk-schedules/${schedId}`)
      .set("X-CSRF-Token", csrf)
      .expect(200);
  });

  it("convite: criar, aceitar e rejeitar token inválido", async () => {
    const agent = request.agent(app);
    const csrf = await loginAs(agent, ADMIN_EMAIL, ADMIN_PASS);
    const inviteEmail = `invite-${Date.now()}@test.icer`;

    const inv = await agent
      .post("/api/admin/users/invite")
      .set("X-CSRF-Token", csrf)
      .send({ email: inviteEmail, expires_days: 7 })
      .expect(201);
    assert.ok(inv.body.invite_token);

    await request(app)
      .post("/api/auth/accept-invite")
      .send({
        token: inv.body.invite_token,
        password: "InvitePass12!",
        full_name: "Convidado Teste",
      })
      .expect(200);

    const invited = request.agent(app);
    await invited
      .post("/api/auth/login")
      .send({ email: inviteEmail, password: "InvitePass12!" })
      .expect(200);
    const me = await invited.get("/api/auth/me").expect(200);
    assert.equal(me.body.email, inviteEmail);

    await request(app)
      .post("/api/auth/accept-invite")
      .send({ token: "token-invalido-xyz", password: "InvitePass12!" })
      .expect(400);
  });

  it("PUT /api/users/me e sessões ativas (admin)", async () => {
    const agent = request.agent(app);
    const csrf = await loginAs(agent, ADMIN_EMAIL, ADMIN_PASS);

    const updated = await agent
      .put("/api/users/me")
      .set("X-CSRF-Token", csrf)
      .send({ full_name: "Admin Test Atualizado" })
      .expect(200);
    assert.equal(updated.body.full_name, "Admin Test Atualizado");

    const sessions = await agent.get("/api/admin/sessions/active").expect(200);
    assert.ok(Array.isArray(sessions.body));
    assert.ok(sessions.body.length >= 1);
  });

  it("Google login: forget-hint e rotas protegidas sem auth", async () => {
    await request(app).post("/api/auth/google-login/forget-hint").expect(200);
    await request(app).get("/api/admin/users").expect(401);
    await request(app).get("/api/admin/server-info").expect(401);
  });

  it("PUT session-ttl e audit-log-retention (admin)", async () => {
    const agent = request.agent(app);
    const csrf = await loginAs(agent, ADMIN_EMAIL, ADMIN_PASS);

    const ttlPut = await agent
      .put("/api/admin/session-ttl")
      .set("X-CSRF-Token", csrf)
      .send({ ttl_minutes: 120 })
      .expect(200);
    assert.equal(ttlPut.body.ttl_minutes, 120);

    const retPut = await agent
      .put("/api/admin/audit-log-retention")
      .set("X-CSRF-Token", csrf)
      .send({ retention: "90" })
      .expect(200);
    assert.equal(retPut.body.retention, "90");
  });
});
