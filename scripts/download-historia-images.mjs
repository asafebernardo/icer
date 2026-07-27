#!/usr/bin/env node
/**
 * Baixa imagens de domínio público do Wikimedia Commons para a timeline História.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, "../public/images/historia");

const FILES = [
  "File:Dublin_c1831_from_the_Phoenix_Park.JPG",
  "File:JohnNelsonDarby.jpg",
  "File:George_Muller_portrait.jpg",
  "File:DUBLIN(1837)_p049_THE_COLLEGE_OF_SURGEONS.jpg",
  "File:Baghdad, Iraq (1816-1820).jpg",
  "File:The Last Supper - Schnorr.jpg",
  "File:The Times newspaper 1788.jpg",
  "File:Old letter.jpg",
  "File:Elberfeld - St. Laurentius (1898).jpg",
  "File:Rio de Janeiro, Brazil, from Sugar Loaf Mountain, ca. 1898.jpg",
  "File:Books - archive of old books.jpg",
  "File:1850 Tallis and Rapkin Map of the World - Geographicus - World-tallis-1850.jpg",
  "File:Bristol Cathedral from College Green, Bristol, UK - Diliff.jpg",
  "File:Funeral of George Müller (1805–1898) in Bristol.png",
  "File:Schnorr von Carolsfeld Bibel in Bildern 1860 015.png",
];

const OUT_NAMES = {
  "File:Dublin_c1831_from_the_Phoenix_Park.JPG": "dublin-1831.jpg",
  "File:JohnNelsonDarby.jpg": "john-nelson-darby.jpg",
  "File:George_Muller_portrait.jpg": "george-muller.jpg",
  "File:DUBLIN(1837)_p049_THE_COLLEGE_OF_SURGEONS.jpg": "dublin-1837.jpg",
  "File:Baghdad, Iraq (1816-1820).jpg": "bagda.jpg",
  "File:The Last Supper - Schnorr.jpg": "comunhao.jpg",
  "File:The Times newspaper 1788.jpg": "periodico.jpg",
  "File:Old letter.jpg": "carta.jpg",
  "File:Elberfeld - St. Laurentius (1898).jpg": "elberfeld.jpg",
  "File:Rio de Janeiro, Brazil, from Sugar Loaf Mountain, ca. 1898.jpg":
    "brasil-1896.jpg",
  "File:Books - archive of old books.jpg": "editora-livros.jpg",
  "File:1850 Tallis and Rapkin Map of the World - Geographicus - World-tallis-1850.jpg":
    "mapa-mundo.jpg",
  "File:Bristol Cathedral from College Green, Bristol, UK - Diliff.jpg":
    "bristol.jpg",
  "File:Funeral of George Müller (1805–1898) in Bristol.png":
    "bristol-muller-funeral.png",
  "File:Schnorr von Carolsfeld Bibel in Bildern 1860 015.png": "biblia-1860.png",
};

const UA = "icer-timeline/1.0 (historia; contact: local-dev)";

async function getUrl(title) {
  const params = new URLSearchParams({
    action: "query",
    prop: "imageinfo",
    iiprop: "url",
    format: "json",
    titles: title,
  });
  const res = await fetch(
    `https://commons.wikimedia.org/w/api.php?${params}`,
    { headers: { "User-Agent": UA } },
  );
  const data = await res.json();
  const page = Object.values(data.query.pages)[0];
  return page.imageinfo?.[0]?.url ?? null;
}

async function download(title) {
  const url = await getUrl(title);
  const outName = OUT_NAMES[title] ?? title.replace(/^File:/, "").replace(/\s+/g, "-");
  if (!url) {
    console.warn(`SKIP (sem URL): ${title}`);
    return false;
  }
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) {
    console.warn(`FAIL HTTP ${res.status}: ${title}`);
    return false;
  }
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(path.join(OUT_DIR, outName), buf);
  console.log(`OK ${outName}`);
  return true;
}

await mkdir(OUT_DIR, { recursive: true });
for (const title of FILES) {
  await download(title);
}
