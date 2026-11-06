import { withCsrfHeaderAsync } from "@/lib/csrf";

async function request(path, options = {}) {
  const response = await fetch(path, {
    credentials: "same-origin",
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {}),
    },
  });

  if (response.status === 204) return null;

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || data.message || "erro_interno");
    error.status = response.status;
    throw error;
  }
  return data;
}

async function mutate(path, options) {
  const headers = await withCsrfHeaderAsync({
    "Content-Type": "application/json",
    ...(options.headers || {}),
  });
  return request(path, { ...options, headers });
}

export function listSongs() {
  return request("/api/coletanea/songs");
}

export function getSong(id) {
  return request(`/api/coletanea/songs/${id}`);
}

export function createSong(song) {
  return mutate("/api/admin/coletanea/songs", {
    method: "POST",
    body: JSON.stringify(song),
  });
}

export function updateSong(id, song) {
  return mutate(`/api/admin/coletanea/songs/${id}`, {
    method: "PUT",
    body: JSON.stringify(song),
  });
}

export async function deleteSong(id) {
  const headers = await withCsrfHeaderAsync();
  return request(`/api/admin/coletanea/songs/${id}`, { method: "DELETE", headers });
}

export function messageForSongError(error) {
  switch (error?.message) {
    case "titulo_invalido":
      return "Informe o título (até 200 caracteres).";
    case "letra_invalida":
      return "Informe a letra da música.";
    case "nao_encontrada":
      return "Não encontrado.";
    case "auth_required":
    case "admin_required":
      return "Esta ação é do painel administrativo.";
    case "csrf_required":
    case "csrf_invalid":
      return "A sessão expirou. Atualize a página e tente de novo.";
    default:
      return "Não foi possível concluir esta ação.";
  }
}
