import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  resolveTargetPostCategory,
  mergeWorkspacePostCategories,
} from "../postCategoryMigration.js";

describe("resolveTargetPostCategory", () => {
  it("mantém categoria válida", () => {
    assert.equal(
      resolveTargetPostCategory({ categoria: "culto_dominical" }),
      "culto_dominical",
    );
  });

  it("mapeia alias culto → culto_dominical", () => {
    assert.equal(resolveTargetPostCategory({ categoria: "culto" }), "culto_dominical");
  });

  it("mapeia legado devocional → estudos_biblicos", () => {
    assert.equal(
      resolveTargetPostCategory({ categoria: "devocional" }),
      "estudos_biblicos",
    );
  });

  it("desconhecido explícito → limpar", () => {
    assert.equal(resolveTargetPostCategory({ categoria: "foo" }), "");
  });

  it("não infere a partir de tags", () => {
    assert.equal(
      resolveTargetPostCategory({ tags: ["Natal", "2024"] }),
      null,
    );
  });

  it("sem categoria nem tag reconhecível → null", () => {
    assert.equal(resolveTargetPostCategory({ titulo: "Olá" }), null);
    assert.equal(resolveTargetPostCategory({ tags: ["geral"] }), null);
  });
});

describe("mergeWorkspacePostCategories", () => {
  it("preenche defaults quando vazio", () => {
    const merged = mergeWorkspacePostCategories([]);
    assert.ok(merged.length >= 15);
    assert.ok(merged.some((c) => c.value === "conferencias"));
  });

  it("usa rótulos predefinidos (ignora custom no workspace)", () => {
    const merged = mergeWorkspacePostCategories([
      { value: "noticias", label: "News", order: 0 },
      { value: "culto_dominical", label: "Domingo", order: 1 },
    ]);
    assert.ok(merged.some((c) => c.value === "conferencias"));
    assert.equal(
      merged.find((c) => c.value === "noticias")?.label,
      "Notícias",
    );
  });
});
