import { test, expect } from "@playwright/test";

const PUBLIC_PAGES = [
  "/Home",
  "/Cultos",
  "/Eventos",
  "/Informacoes",
  "/Historia",
  "/Agenda",
  "/Eventos/rotinas",
  "/accept-invite",
];

test.describe("Páginas públicas", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  for (const path of PUBLIC_PAGES) {
    test(`carrega ${path} sem erro`, async ({ page }) => {
      const errors = [];
      page.on("pageerror", (err) => errors.push(String(err)));
      const res = await page.goto(path, { waitUntil: "domcontentloaded" });
      expect(res?.ok()).toBeTruthy();
      const shell =
        path === "/accept-invite"
          ? page.locator("body")
          : page.locator("#main-content, main").first();
      await expect(shell).toBeVisible({ timeout: 20_000 });
      expect(errors).toEqual([]);
    });
  }

  test("raiz carrega Início (URL só domínio)", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/^https?:\/\/[^/]+\/?$/);
    await expect(
      page.getByRole("link", { name: "Início", exact: true }).first(),
    ).toBeVisible({ timeout: 15_000 });
  });

  test("/login legado redireciona para a Home", async ({ page }) => {
    await page.goto("/login");
    await expect(page).toHaveURL(/\/Home$/);
  });

  test("Contato redireciona para Informações (secção contacto)", async ({ page }) => {
    await page.goto("/Contato");
    await expect(page).toHaveURL(/\/Informacoes#contato$/);
    await expect(page.getByRole("heading", { name: "Fale conosco" })).toBeVisible({
      timeout: 15_000,
    });
  });

  test("Recursos redireciona para Aplicativos em Eventos", async ({ page }) => {
    await page.goto("/Recursos");
    await expect(page).toHaveURL(/\/Eventos\/categoria\/aplicativos$/);
    await expect(page.getByText("Aplicativos").first()).toBeVisible({
      timeout: 15_000,
    });
  });

  test("404 para rota inexistente", async ({ page }) => {
    await page.goto("/rota-inexistente-xyz");
    await expect(page.getByText(/não encontrad|404|pagina/i)).toBeVisible({
      timeout: 10_000,
    });
  });

  test("API pública responde via proxy", async ({ request }) => {
    const health = await request.get("/api/health");
    expect(health.ok()).toBeTruthy();
    const cfg = await request.get("/api/site-config");
    expect(cfg.ok()).toBeTruthy();
  });
});
