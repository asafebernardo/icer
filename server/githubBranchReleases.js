/**
 * Lista commits no GitHub como “versões” (histórico linear no branch predefinido do repo).
 * Predefinição: repositório público ICER (sobrescreva com ICER_GITHUB_REPO).
 * Opcional: ICER_GITHUB_COMMITS_BRANCH (senão usa o default_branch da API).
 * Opcional: ICER_GITHUB_TOKEN (privado ou rate limit). ICER_GITHUB_DISABLED=1 evita chamadas HTTP.
 */

/** URL usada quando `ICER_GITHUB_REPO` não está definido. */
export const DEFAULT_ICER_GITHUB_REPO_RAW =
  "https://github.com/asafebernardo/icer";

const GH_BASE = "https://api.github.com";
const MAX_COMMITS = 100;
const FETCH_TIMEOUT_MS = 20_000;

/**
 * @param {string} raw
 * @returns {{ owner: string; repo: string; full: string } | null}
 */
export function parseGithubRepo(raw) {
  let t = String(raw || "").trim();
  if (!t) return null;
  if (t.startsWith("https://github.com/")) t = t.slice("https://github.com/".length);
  if (t.startsWith("http://github.com/")) t = t.slice("http://github.com/".length);
  t = t.replace(/^\/+/, "").replace(/\.git$/i, "");
  const parts = t.split("/").filter(Boolean);
  if (parts.length !== 2) return null;
  return { owner: parts[0], repo: parts[1], full: `${parts[0]}/${parts[1]}` };
}

/**
 * @param {string} pathWithQuery
 * @param {string} [token]
 */
async function githubFetch(pathWithQuery, token) {
  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": "ICER-site-releases/1.0",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const r = await fetch(`${GH_BASE}${pathWithQuery}`, {
      headers,
      signal: ctrl.signal,
    });
    const text = await r.text();
    let body = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = { message: text || "invalid_json" };
    }
    if (!r.ok) {
      const msg =
        typeof body?.message === "string" ? body.message : `HTTP ${r.status}`;
      const err = new Error(msg);
      err.status = r.status;
      throw err;
    }
    return body;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * @param {unknown} c
 * @param {string} htmlUrl
 */
function mapCommitVersion(c, htmlUrl) {
  const fullSha = typeof c?.sha === "string" ? c.sha : "";
  const subject = String(c?.commit?.message || "")
    .split("\n")[0]
    .trim();
  return {
    sha: fullSha ? fullSha.slice(0, 7) : "",
    full_sha: fullSha,
    subject,
    date: c?.commit?.author?.date || "",
    author: c?.commit?.author?.name || "",
    commit_html_url: fullSha ? `${htmlUrl}/commit/${fullSha}` : "",
  };
}

/**
 * @returns {Promise<{
 *   configured: boolean;
 *   using_default_repo: boolean;
 *   repo: string | null;
 *   html_url: string | null;
 *   error: string | null;
 *   default_branch: string | null;
 *   commits_branch: string | null;
 *   commit_versions: Array<{
 *     sha: string;
 *     full_sha: string;
 *     subject: string;
 *     date: string;
 *     author: string;
 *     commit_html_url: string;
 *   }>;
 * }>}
 */
export async function fetchGithubBranchReleases() {
  const rawEnv = String(process.env.ICER_GITHUB_REPO || "").trim();
  const usingDefaultRepo = !rawEnv;
  const rawSource = rawEnv || DEFAULT_ICER_GITHUB_REPO_RAW;
  const parsed = parseGithubRepo(rawSource);

  const empty = (extra = {}) => ({
    configured: true,
    using_default_repo: usingDefaultRepo,
    repo: parsed?.full || rawSource,
    html_url: parsed ? `https://github.com/${parsed.full}` : null,
    error: null,
    default_branch: null,
    commits_branch: null,
    commit_versions: [],
    ...extra,
  });

  if (/^(1|true|yes)$/i.test(String(process.env.ICER_GITHUB_DISABLED || "").trim())) {
    if (!parsed) {
      return empty({ repo: rawSource, html_url: null });
    }
    return empty();
  }

  if (!parsed) {
    return {
      configured: true,
      using_default_repo: usingDefaultRepo,
      repo: rawSource,
      html_url: null,
      error: "ICER_GITHUB_REPO inválido — use owner/repo ou https://github.com/owner/repo",
      default_branch: null,
      commits_branch: null,
      commit_versions: [],
    };
  }

  const { owner, repo, full } = parsed;
  const htmlUrl = `https://github.com/${full}`;
  const token = String(process.env.ICER_GITHUB_TOKEN || "").trim();

  try {
    /** @type {unknown} */
    const repoMeta = await githubFetch(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
      token,
    );
    const defaultBranch =
      typeof repoMeta?.default_branch === "string" && repoMeta.default_branch
        ? repoMeta.default_branch
        : "main";
    const branchOverride = String(process.env.ICER_GITHUB_COMMITS_BRANCH || "").trim();
    const commitsBranch = branchOverride || defaultBranch;

    /** @type {unknown} */
    const list = await githubFetch(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/commits?sha=${encodeURIComponent(commitsBranch)}&per_page=${MAX_COMMITS}`,
      token,
    );

    if (!Array.isArray(list)) {
      return {
        configured: true,
        using_default_repo: usingDefaultRepo,
        repo: full,
        html_url: htmlUrl,
        error: "Resposta inesperada da API GitHub (commits).",
        default_branch: defaultBranch,
        commits_branch: commitsBranch,
        commit_versions: [],
      };
    }

    const commit_versions = list.map((c) => mapCommitVersion(c, htmlUrl));

    return {
      configured: true,
      using_default_repo: usingDefaultRepo,
      repo: full,
      html_url: htmlUrl,
      error: null,
      default_branch: defaultBranch,
      commits_branch: commitsBranch,
      commit_versions,
    };
  } catch (e) {
    const msg = e?.name === "AbortError" ? "Timeout ao contactar GitHub." : String(e?.message || e);
    return {
      configured: true,
      using_default_repo: usingDefaultRepo,
      repo: full,
      html_url: htmlUrl,
      error: msg,
      default_branch: null,
      commits_branch: null,
      commit_versions: [],
    };
  }
}
