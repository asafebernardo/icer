import { test, expect } from "@playwright/test";

const PRIVATE_PAGES = ["/Dashboard", "/Admin", "/Historia", "/Postagens/nova"];

test.describe("Páginas autenticadas (admin)", () => {
  for (const path of PRIVATE_PAGES) {
    test(`carrega ${path} com sessão`, async ({ page }) => {
      const errors = [];
      page.on("pageerror", (err) => errors.push(String(err)));
      const res = await page.goto(path, { waitUntil: "domcontentloaded" });
      expect(res?.ok()).toBeTruthy();
      await expect(page.locator("body")).toBeVisible();
      expect(errors).toEqual([]);
    });
  }

  test("sessão válida: /api/auth/me", async ({ request }) => {
    const me = await request.get("/api/auth/me");
    expect(me.ok()).toBeTruthy();
    const body = await me.json();
    expect(body.role).toBe("admin");
    expect(body.email).toContain("@");
  });

  test("Postagens/nova e editar sem erro JavaScript", async ({ page }) => {
    const errors = [];
    page.on("pageerror", (err) => errors.push(String(err)));

    const nova = await page.goto("/Postagens/nova", {
      waitUntil: "domcontentloaded",
    });
    expect(nova?.ok()).toBeTruthy();
    await expect(page.locator("#main-content")).toBeVisible({ timeout: 15_000 });
    expect(errors).toEqual([]);

    const edit = await page.goto("/Postagens/editar/1", {
      waitUntil: "domcontentloaded",
    });
    expect(edit?.status()).toBeLessThan(500);
    expect(errors).toEqual([]);
  });

  test("navegação principal a partir da Home", async ({ page }) => {
    await page.goto("/Home");
    await expect(page).toHaveURL(/^https?:\/\/[^/]+\/?$/);
    await page.getByRole("link", { name: "Postagens", exact: true }).first().click();
    await expect(page.locator("#main-content")).toBeVisible({ timeout: 15_000 });
    await page.getByRole("link", { name: "Agenda", exact: true }).first().click();
    await expect(page.locator("#main-content")).toBeVisible({ timeout: 15_000 });
  });
});
