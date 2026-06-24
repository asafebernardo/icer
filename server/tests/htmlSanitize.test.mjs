import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { sanitizePostBody, sanitizeRichHtml } from "../htmlSanitize.js";

describe("htmlSanitize", () => {
  it("remove script e handlers de evento", () => {
    const dirty =
      '<p>Olá</p><script>alert("xss")</script><img src=x onerror="alert(1)">';
    const clean = sanitizeRichHtml(dirty);
    assert.ok(!clean.includes("<script"));
    assert.ok(!clean.includes("onerror"));
    assert.ok(clean.includes("Olá"));
  });

  it("mantém formatação básica e links seguros", () => {
    const dirty =
      '<p><strong>ICER</strong></p><a href="https://example.com">site</a>';
    const clean = sanitizeRichHtml(dirty);
    assert.match(clean, /<strong>ICER<\/strong>/);
    assert.match(clean, /href="https:\/\/example\.com"/);
    assert.match(clean, /rel="noopener noreferrer"/);
  });

  it("sanitizePostBody só altera conteudo", () => {
    const body = {
      titulo: "Título",
      conteudo: '<p>ok</p><script>x</script>',
      tags: ["a"],
    };
    const next = sanitizePostBody(body);
    assert.equal(next.titulo, "Título");
    assert.deepEqual(next.tags, ["a"]);
    assert.ok(!String(next.conteudo).includes("<script"));
  });
});
