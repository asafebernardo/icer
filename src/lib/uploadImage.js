import { api } from "@/api/client";
import { isServerAuthEnabled } from "@/lib/auth";

/**
 * Com `VITE_USE_SERVER_AUTH=true`, imagens e documentos vão para `POST /api/files` (disco no servidor).
 * Com `VITE_LOCAL_IMAGE_UPLOAD=true`, as imagens ficam em data URL (base64) só no browser — útil para testes sem Mongo/API.
 */
export function isLocalImageUploadEnabled() {
  return import.meta.env.VITE_LOCAL_IMAGE_UPLOAD === "true";
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

/**
 * Desenha a imagem num canvas redimensionado (lado maior = maxSide).
 * @returns {Promise<HTMLCanvasElement | null>}
 */
async function renderScaledImageToCanvas(file, maxSide) {
  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return null;
  }
  const iw = bitmap.width;
  const ih = bitmap.height;
  let w = iw;
  let h = ih;
  if (w > maxSide || h > maxSide) {
    if (w >= h) {
      h = Math.round((ih * maxSide) / w);
      w = maxSide;
    } else {
      w = Math.round((iw * maxSide) / h);
      h = maxSide;
    }
  }
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return null;
  }
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  return canvas;
}

/**
 * Redimensiona e comprime para JPEG/WebP — data URLs grandes estouram a quota do localStorage (~5MB).
 * @param {File} file
 * @param {{ maxSide?: number; quality?: number }} [opts]
 */
export async function imageFileToCompressedDataUrl(file, opts = {}) {
  const maxSide = opts.maxSide ?? 1280;
  const quality = opts.quality ?? 0.78;
  const canvas = await renderScaledImageToCanvas(file, maxSide);
  if (!canvas) {
    return readFileAsDataURL(file);
  }
  let dataUrl;
  try {
    const webp = canvas.toDataURL("image/webp", quality);
    dataUrl = webp.startsWith("data:image/webp") ? webp : null;
  } catch {
    dataUrl = null;
  }
  if (!dataUrl) {
    dataUrl = canvas.toDataURL("image/jpeg", quality);
  }
  return dataUrl;
}

/**
 * Comprime para Blob (upload à API ou armazenamento binário).
 * @param {File} file
 * @param {{ maxSide?: number; quality?: number }} [opts]
 */
export async function imageFileToCompressedBlob(file, opts = {}) {
  const maxSide = opts.maxSide ?? 1920;
  const quality = opts.quality ?? 0.82;
  const canvas = await renderScaledImageToCanvas(file, maxSide);
  if (!canvas) {
    return file;
  }
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blobWebp) => {
        if (blobWebp) {
          resolve(blobWebp);
          return;
        }
        canvas.toBlob(
          (blobJpg) => {
            if (blobJpg) {
              resolve(blobJpg);
              return;
            }
            reject(new Error("toBlob falhou"));
          },
          "image/jpeg",
          quality,
        );
      },
      "image/webp",
      quality,
    );
  });
}

/**
 * Ficheiro comprimido pronto para `UploadFile` (menor tráfego e armazenamento no servidor).
 * @param {File} file
 * @param {{ maxSide?: number; quality?: number }} [opts]
 */
export async function imageFileToCompressedFile(file, opts = {}) {
  const blob = await imageFileToCompressedBlob(file, opts);
  if (blob instanceof File) {
    return blob;
  }
  const ext =
    blob.type.includes("webp") ? "webp" : /jpeg|jpg/i.test(blob.type) ? "jpg" : "jpg";
  const base = (file.name || "imagem").replace(/\.[^.]+$/, "");
  return new File([blob], `${base}.${ext}`, { type: blob.type || "image/jpeg" });
}

function parseUploadResponse(res) {
  const file_url =
    res?.file_url ||
    res?.url ||
    (typeof res === "string" ? res : null) ||
    res?.data?.file_url;
  if (!file_url) throw new Error("Resposta sem URL de ficheiro");
  return { file_url };
}

/**
 * Upload para `POST /api/files` (armazenamento privado no servidor Node).
 * @param {File | Blob} file
 */
async function uploadPrivateServerFile(file) {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/files", {
    method: "POST",
    credentials: "include",
    body: fd,
  });
  const text = await res.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text };
    }
  }
  if (!res.ok) {
    throw new Error(data?.message || res.statusText || "Upload falhou");
  }
  const url =
    data?.url ||
    (data?.id != null ? `/api/files/${data.id}` : null);
  if (!url) throw new Error("Resposta sem URL de ficheiro");
  return { file_url: url };
}

/** Com API Node + auth no servidor, os ficheiros vão para disco (`server/uploads`) e só metadados no MongoDB. */
function shouldUploadToServerDisk() {
  return isServerAuthEnabled();
}

/**
 * PDF e outros ficheiros (ex.: Material) — disco no servidor quando a API ICER está ativa.
 * @param {File | Blob} file
 */
export async function uploadIntegrationFile(file) {
  if (!file) throw new Error("Sem ficheiro");
  if (shouldUploadToServerDisk()) {
    return uploadPrivateServerFile(file);
  }
  const res = await api.integrations.Core.UploadFile({ file });
  return parseUploadResponse(res);
}

/**
 * Upload de imagem para entidades (eventos, postagens, admin, recursos…).
 * Em modo local devolve data URL comprimida; caso contrário envia ficheiro comprimido à API.
 */
export async function uploadImageFile(file) {
  if (!file) throw new Error("Sem ficheiro");
  if (!file.type.startsWith("image/")) {
    throw new Error("Indique um ficheiro de imagem.");
  }
  if (isLocalImageUploadEnabled()) {
    const file_url = await imageFileToCompressedDataUrl(file);
    return { file_url };
  }
  const fileToSend = await imageFileToCompressedFile(file).catch(() => file);
  if (shouldUploadToServerDisk()) {
    return uploadPrivateServerFile(fileToSend);
  }
  const res = await api.integrations.Core.UploadFile({ file: fileToSend });
  return parseUploadResponse(res);
}

/**
 * Para `siteConfig` / localStorage: tenta upload à API com ficheiro comprimido; se falhar,
 * usa data URL comprimida.
 */
export async function uploadImageForSiteConfig(file) {
  return imageFileToStorableUrl(file);
}

/**
 * Imagem para guardar em siteConfig / cartões (hero, logo, fundos, horários).
 * Tenta API com ficheiro comprimido; em modo local ou se a API falhar, data URL comprimida.
 */
export async function imageFileToStorableUrl(file) {
  if (!file?.type?.startsWith("image/")) {
    throw new Error("Indique um ficheiro de imagem.");
  }
  if (isLocalImageUploadEnabled()) {
    return imageFileToCompressedDataUrl(file);
  }
  try {
    const fileToSend = await imageFileToCompressedFile(file).catch(() => file);
    if (shouldUploadToServerDisk()) {
      return (await uploadPrivateServerFile(fileToSend)).file_url;
    }
    const res = await api.integrations.Core.UploadFile({ file: fileToSend });
    return parseUploadResponse(res).file_url;
  } catch {
    return imageFileToCompressedDataUrl(file);
  }
}
