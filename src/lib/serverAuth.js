/** Autenticação real via API Node (`server/index.js`). Ative com `VITE_USE_SERVER_AUTH=true`. */

export function isServerAuthEnabled() {
  return import.meta.env.VITE_USE_SERVER_AUTH === "true";
}

export async function fetchJson(path, opts = {}) {
  const headers = { Accept: "application/json", ...opts.headers };
  const body = opts.body;
  if (body && !(body instanceof FormData) && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }
  const res = await fetch(`/api${path}`, {
    credentials: "include",
    ...opts,
    headers,
    body:
      body && !(body instanceof FormData)
        ? typeof body === "string"
          ? body
          : JSON.stringify(body)
        : body,
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
    const err = new Error(data?.message || res.statusText || "Erro");
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}
