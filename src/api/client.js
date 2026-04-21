import { appParams } from "@/lib/app-params";
import { isServerAuthEnabled } from "@/lib/serverAuth";

const ACCESS_STORAGE = "icer_access_token";

function getAppId() {
  return (
    appParams.appId ||
    import.meta.env.VITE_APP_ID ||
    ""
  );
}

function getToken() {
  if (appParams.token) return appParams.token;
  if (typeof window === "undefined") return null;
  return (
    localStorage.getItem(ACCESS_STORAGE) ||
    localStorage.getItem("token")
  );
}

function useServerEntities() {
  return isServerAuthEnabled();
}

function buildBaseHeaders(extra = {}) {
  const headers = {
    Accept: "application/json",
    "X-App-Id": String(getAppId()),
    ...extra,
  };
  if (typeof window !== "undefined") {
    headers["X-Origin-URL"] = window.location.href;
  }
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const fv = appParams.functionsVersion || import.meta.env.VITE_APP_FUNCTIONS_VERSION;
  if (fv) headers["X-Functions-Version"] = String(fv);
  return headers;
}

async function parseBody(res) {
  if (res.status === 204 || res.status === 205) return null;
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function request(method, path, { body, headers: headerOverrides } = {}) {
  const isForm = body instanceof FormData;
  const headers = buildBaseHeaders(headerOverrides);
  if (!isForm) headers["Content-Type"] = "application/json";

  const res = await fetch(`/api${path}`, {
    method,
    headers,
    credentials: "include",
    body:
      body === undefined
        ? undefined
        : isForm
          ? body
          : JSON.stringify(body),
  });
  const data = await parseBody(res);
  if (!res.ok) {
    const message =
      (data && (data.message || data.detail)) || res.statusText || "Request failed";
    const err = new Error(message);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

function createEntityHandler(appId, entityName) {
  const baseURL = `/apps/${appId}/entities/${entityName}`;
  return {
    list(sort, limit, skip, fields) {
      const params = new URLSearchParams();
      if (sort) params.set("sort", sort);
      if (limit != null) params.set("limit", String(limit));
      if (skip != null) params.set("skip", String(skip));
      if (fields)
        params.set("fields", Array.isArray(fields) ? fields.join(",") : fields);
      const q = params.toString();
      return request("GET", `${baseURL}${q ? `?${q}` : ""}`);
    },
    filter(query, sort, limit, skip, fields) {
      const params = new URLSearchParams();
      params.set("q", JSON.stringify(query));
      if (sort) params.set("sort", sort);
      if (limit != null) params.set("limit", String(limit));
      if (skip != null) params.set("skip", String(skip));
      if (fields)
        params.set("fields", Array.isArray(fields) ? fields.join(",") : fields);
      return request("GET", `${baseURL}?${params.toString()}`);
    },
    get(id) {
      return request("GET", `${baseURL}/${id}`);
    },
    create(data) {
      return request("POST", baseURL, { body: data });
    },
    update(id, data) {
      return request("PUT", `${baseURL}/${id}`, { body: data });
    },
    delete(id) {
      return request("DELETE", `${baseURL}/${id}`);
    },
  };
}

const SERVER_ENTITY_SLUG = {
  Post: "posts",
  Evento: "eventos",
  Material: "materiais",
  FotoGaleria: "fotos-galeria",
  Contato: "contatos",
};

function createLocalEntityHandler(slug) {
  const base = `/data/${slug}`;
  const h = {
    list(sort, limit, skip, fields) {
      const params = new URLSearchParams();
      if (sort) params.set("sort", sort);
      if (limit != null) params.set("limit", String(limit));
      if (skip != null) params.set("skip", String(skip));
      if (fields)
        params.set("fields", Array.isArray(fields) ? fields.join(",") : fields);
      const q = params.toString();
      return request("GET", `${base}${q ? `?${q}` : ""}`);
    },
    filter(_query, sort, limit, skip, fields) {
      return h.list(sort, limit, skip, fields);
    },
    get(id) {
      return request("GET", `${base}/${id}`);
    },
    create(data) {
      return request("POST", base, { body: data });
    },
    update(id, data) {
      return request("PUT", `${base}/${id}`, { body: data });
    },
    delete(id) {
      return request("DELETE", `${base}/${id}`);
    },
  };
  return h;
}

function serverUserEntity() {
  return {
    list() {
      return request("GET", "/admin/users");
    },
    filter() {
      return request("GET", "/admin/users");
    },
    async get(id) {
      const arr = await request("GET", "/admin/users");
      if (!Array.isArray(arr)) return null;
      return arr.find((u) => String(u.id) === String(id)) ?? null;
    },
    create() {
      throw new Error("Crie utilizadores no painel ou convide com e-mail.");
    },
    update(id, data) {
      return request("PUT", `/admin/users/${id}`, { body: data });
    },
    delete() {
      throw new Error("Remoção de conta não suportada aqui.");
    },
  };
}

function createEntitiesModule(appId) {
  return new Proxy(
    {},
    {
      get(_, entityName) {
        if (typeof entityName !== "string" || entityName === "then") {
          return undefined;
        }
        return createEntityHandler(appId, entityName);
      },
    },
  );
}

function createServerEntitiesModule(appId) {
  return new Proxy(
    {},
    {
      get(_, entityName) {
        if (typeof entityName !== "string" || entityName === "then") {
          return undefined;
        }
        if (entityName === "User") return serverUserEntity();
        const slug = SERVER_ENTITY_SLUG[entityName];
        if (slug) return createLocalEntityHandler(slug);
        return createEntityHandler(appId, entityName);
      },
    },
  );
}

function createIntegrationsModule(appId) {
  return new Proxy(
    {},
    {
      get(_, packageName) {
        if (typeof packageName !== "string" || packageName === "then") {
          return undefined;
        }
        return new Proxy(
          {},
          {
            get(_, endpointName) {
              if (typeof endpointName !== "string" || endpointName === "then") {
                return undefined;
              }
              return async (data) => {
                const hasFile =
                  data &&
                  typeof data === "object" &&
                  Object.values(data).some((v) => v instanceof File);
                let body = data;
                if (hasFile) {
                  body = new FormData();
                  Object.keys(data).forEach((key) => {
                    const v = data[key];
                    if (v instanceof File) body.append(key, v, v.name);
                    else if (v !== null && typeof v === "object")
                      body.append(key, JSON.stringify(v));
                    else body.append(key, v);
                  });
                }
                const path =
                  packageName === "Core"
                    ? `/apps/${appId}/integration-endpoints/Core/${endpointName}`
                    : `/apps/${appId}/integration-endpoints/installable/${packageName}/integration-endpoints/${endpointName}`;
                return request("POST", path, { body });
              };
            },
          },
        );
      },
    },
  );
}

function createServerIntegrationsModule(appId) {
  return new Proxy(
    {},
    {
      get(_, packageName) {
        if (typeof packageName !== "string" || packageName === "then") {
          return undefined;
        }
        return new Proxy(
          {},
          {
            get(_, endpointName) {
              if (packageName === "Core" && endpointName === "UploadFile") {
                return async (data) => {
                  const file = data?.file;
                  if (!(file instanceof File) && !(file instanceof Blob)) {
                    throw new Error("Ficheiro em falta");
                  }
                  const fd = new FormData();
                  fd.append("file", file);
                  const res = await fetch("/api/files", {
                    method: "POST",
                    body: fd,
                    credentials: "include",
                  });
                  const text = await res.text();
                  let parsed = {};
                  try {
                    parsed = text ? JSON.parse(text) : {};
                  } catch {
                    parsed = {};
                  }
                  if (!res.ok) {
                    throw new Error(parsed.message || res.statusText || "Upload falhou");
                  }
                  const file_url =
                    parsed.url ||
                    (parsed.id != null ? `/api/files/${parsed.id}` : null);
                  if (!file_url) throw new Error("Resposta sem URL");
                  return { file_url };
                };
              }
              const fallback = createIntegrationsModule(appId)[packageName]?.[
                endpointName
              ];
              if (typeof fallback === "function") return fallback;
              return async () => {
                throw new Error(
                  `Integração ${packageName}/${endpointName} indisponível em modo servidor.`,
                );
              };
            },
          },
        );
      },
    },
  );
}

function randomInvitePassword() {
  const chars =
    "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const buf = new Uint8Array(14);
  crypto.getRandomValues(buf);
  return Array.from(buf, (b) => chars[b % chars.length]).join("");
}

function createUsersModule(appId) {
  return {
    inviteUser(user_email, role) {
      if (role !== "user" && role !== "admin") {
        throw new Error(
          `Invalid role: "${role}". Role must be either "user" or "admin".`,
        );
      }
      return request("POST", `/apps/${appId}/runtime/users/invite-user`, {
        body: { user_email, role },
      });
    },
  };
}

function createServerUsersModule() {
  return {
    inviteUser(user_email, role) {
      if (role !== "user" && role !== "admin") {
        throw new Error(
          `Invalid role: "${role}". Role must be either "user" or "admin".`,
        );
      }
      const email = String(user_email || "")
        .toLowerCase()
        .trim();
      const password = randomInvitePassword();
      const full_name = email.includes("@")
        ? email.split("@")[0]
        : email || "Utilizador";
      return request("POST", "/admin/users", {
        body: {
          email,
          full_name,
          role: role || "user",
          password,
        },
      }).then((res) => ({ ...res, temp_password: password }));
    },
  };
}

function clientModules() {
  const id = getAppId();
  const server = useServerEntities();
  return {
    entities: server ? createServerEntitiesModule(id) : createEntitiesModule(id),
    integrations: server
      ? createServerIntegrationsModule(id)
      : createIntegrationsModule(id),
    users: server ? createServerUsersModule() : createUsersModule(id),
  };
}

export const api = new Proxy(
  {},
  {
    get(_, prop) {
      if (prop === "setToken") {
        return (newToken) => {
          if (typeof window === "undefined") return;
          if (newToken) localStorage.setItem(ACCESS_STORAGE, newToken);
          else localStorage.removeItem(ACCESS_STORAGE);
        };
      }
      const mod = clientModules();
      return mod[prop];
    },
  },
);
