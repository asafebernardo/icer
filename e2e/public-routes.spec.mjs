import { test, expect } from "@playwright/test";

const PUBLIC_PAGES = [
  "/Home",
  "/Postagens",
  "/Recursos",
  "/Agenda",
  "/Eventos",
  "/Eventos/rotinas",
  "/accept-invite",
  "/login",
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
        path === "/accept-invite" || path === "/login"
          ? page.locator("body")
          : page.locator("#main-content, main").first();
      await expect(shell).toBeVisible({ timeout: 20_000 });
      expect(errors).toEqual([]);
      if (path === "/login") {
        await expect(
          page.getByRole("heading", { name: /ICER/i }).or(
            page.getByText(/palavra-passe|Entrar/i).first(),
          ),
        ).toBeVisible({ timeout: 10_000 });
      }
    });
  }

  test("raiz carrega Início (URL só domínio)", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/^https?:\/\/[^/]+\/?$/);
    await expect(
      page.getByRole("link", { name: "Início", exact: true }).first(),
    ).toBeVisible({ timeout: 15_000 });
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
