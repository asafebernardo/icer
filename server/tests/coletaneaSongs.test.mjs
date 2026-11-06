import assert from "node:assert/strict";
import test from "node:test";

import { validateSong } from "../coletaneaStore.js";

test("rejeita título vazio", () => {
  const result = validateSong({ titulo: "  ", letra: "Amém" });
  assert.equal(result.error, "titulo_invalido");
});

test("aceita letra e refrão cronológico", () => {
  const result = validateSong({
    titulo: "Cantai",
    letra: "Primeira estrofe",
    refrao: "Aleluia",
    cronologica: true,
    refraoPrimeiro: true,
  });
  assert.equal(result.value.titulo, "Cantai");
  assert.equal(result.value.letra, "Primeira estrofe");
  assert.equal(result.value.refrao, "Aleluia");
  assert.equal(result.value.cronologica, true);
  assert.equal(result.value.refraoPrimeiro, true);
});

test("refrão vazio desliga a cronologia", () => {
  const result = validateSong({
    titulo: "A",
    letra: "B",
    refrao: "  ",
    cronologica: true,
    refraoPrimeiro: true,
  });
  assert.equal(result.value.cronologica, false);
  assert.equal(result.value.refraoPrimeiro, false);
  assert.equal(result.value.refrao, "");
});

test("rejeita letra vazia", () => {
  const result = validateSong({ titulo: "Cantai", letra: "   " });
  assert.equal(result.error, "letra_invalida");
});
