import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
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
});
