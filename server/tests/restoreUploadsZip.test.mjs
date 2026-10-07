import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  collectFileNameHintsFromValue,
  matchRestoredFile,
  restoredNameCandidates,
} from "../restoreUploadsZip.js";

describe("restoreUploadsZip rematch", () => {
  it("sugere basename do storage_path e o nome original", () => {
    const names = restoredNameCandidates({
      id: 12,
      storage_path: "/old/uploads/abc123.webp",
      original_name: "culto.jpg",
    });
    assert.ok(names.includes("abc123.webp"));
    assert.ok(names.includes("culto.jpg"));
    assert.ok(names.includes("icer-12-culto.jpg"));
  });

  it("liga pelo prefixo icer-<id>- mesmo com nome diferente", () => {
    const onDisk = new Map([
      ["icer-9-foto-antiga.webp", "/data/icer-9-foto-antiga.webp"],
    ]);
    const found = matchRestoredFile(
      { id: 9, original_name: "outra.png" },
      onDisk,
    );
    assert.equal(found, "/data/icer-9-foto-antiga.webp");
  });

  it("liga pelo nome original quando não há storage_path (Drive)", () => {
    const onDisk = new Map([["boletim.pdf", "/data/boletim.pdf"]]);
    const found = matchRestoredFile(
      { id: 3, storage_path: null, original_name: "Boletim.pdf" },
      onDisk,
    );
    assert.equal(found, "/data/boletim.pdf");
  });

  it("liga pelo nome sem extensão quando só há um candidato", () => {
    const onDisk = new Map([["culto-domingo.webp", "/data/culto-domingo.webp"]]);
    const found = matchRestoredFile(
      { id: 44, storage_path: null, original_name: "culto-domingo.jpg" },
      onDisk,
    );
    assert.equal(found, "/data/culto-domingo.webp");
  });

  it("liga pelo nome do anexo no post quando o original_name da base é outro", () => {
    const onDisk = new Map([["encontro-jovens.jpg", "/data/encontro-jovens.jpg"]]);
    const found = matchRestoredFile(
      { id: 1010, storage_path: null, original_name: "abc123.webp" },
      onDisk,
      ["encontro-jovens.jpg"],
    );
    assert.equal(found, "/data/encontro-jovens.jpg");
  });

  it("liga pelo título do evento sem acentos nem extensão", () => {
    const onDisk = new Map([["culto-de-jovens.webp", "/data/culto-de-jovens.webp"]]);
    const found = matchRestoredFile(
      { id: 88, storage_path: null, original_name: "xyz.bin" },
      onDisk,
      ["Culto de Jovens"],
    );
    assert.equal(found, "/data/culto-de-jovens.webp");
  });

  it("recolhe nomes de anexos e títulos ligados a /api/files/:id", () => {
    const hints = collectFileNameHintsFromValue({
      titulo: "Vigília",
      imagem_url: "/api/files/9",
      anexos: [{ url: "/api/files/12", name: "foto-culto.jpg" }],
    });
    assert.ok(hints.get(9)?.has("Vigília"));
    assert.ok(hints.get(12)?.has("foto-culto.jpg"));
    assert.ok(hints.get(12)?.has("Vigília"));
  });
});
