import fs from "node:fs";
import path from "node:path";

/**
 * Soma o tamanho de todos os ficheiros regulares sob `dirPath` (recursivo).
 * Pastas em falta ou vazias → bytes 0, files 0.
 * @param {string} dirPath
 * @returns {{ bytes: number; files: number }}
 */
export function directoryFileStats(dirPath) {
  let bytes = 0;
  let files = 0;
  try {
    const st = fs.statSync(dirPath);
    if (st.isFile()) {
      return { bytes: st.size, files: 1 };
    }
    if (!st.isDirectory()) {
      return { bytes: 0, files: 0 };
    }
  } catch {
    return { bytes: 0, files: 0 };
  }

  const walk = (p) => {
    let entries;
    try {
      entries = fs.readdirSync(p, { withFileTypes: true });
    } catch {
      return;
    }
    for (const ent of entries) {
      const full = path.join(p, ent.name);
      try {
        if (ent.isDirectory()) {
          walk(full);
        } else if (ent.isFile()) {
          bytes += fs.statSync(full).size;
          files += 1;
        }
      } catch {
        /* permissões, ligações quebradas */
      }
    }
  };
  walk(dirPath);
  return { bytes, files };
}
