/**
 * Remove dados de demonstração antigos (localStorage) deixados por versões
 * anteriores que usavam `demoExamples.js`.
 */
const SEED_KEY = "icer_demo_seed_v6";

const DEMO_POST_IDS = new Set([
  92001, 92002, 92003, 92004, 92005, 92006, 92007, 92008, 92009,
]);

const DEMO_USER_EMAILS = new Set(
  [
    "maria.silva@exemplo.com",
    "joao.pereira@exemplo.com",
    "ana.costa@exemplo.com",
    "pedro.santos@exemplo.com",
    "lucia.ferreira@exemplo.com",
    "ricardo.mendes@exemplo.com",
    "pastor@exemplo.com",
  ].map((e) => e.toLowerCase()),
);

export function purgeLegacyDemoStorage() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(SEED_KEY);

    const postsRaw = localStorage.getItem("posts");
    if (postsRaw) {
      const posts = JSON.parse(postsRaw);
      if (Array.isArray(posts)) {
        const next = posts.filter((p) => !DEMO_POST_IDS.has(p.id));
        if (next.length !== posts.length) {
          localStorage.setItem("posts", JSON.stringify(next));
        }
      }
    }

    const usersRaw = localStorage.getItem("users");
    if (usersRaw) {
      const users = JSON.parse(usersRaw);
      if (Array.isArray(users)) {
        const next = users.filter(
          (u) => !DEMO_USER_EMAILS.has(String(u.email || "").toLowerCase()),
        );
        if (next.length !== users.length) {
          localStorage.setItem("users", JSON.stringify(next));
        }
      }
    }
  } catch {
    /* ignore */
  }
}
