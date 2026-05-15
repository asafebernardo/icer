/**
 * Resolve foto a partir de um mapa nome → URL (`preletor_avatars`, `pastor_avatars`, etc.).
 */
export function resolveNameAvatarUrl(avatarMap, personName) {
  const map =
    avatarMap && typeof avatarMap === "object" ? avatarMap : {};
  const k = String(personName ?? "").trim();
  if (!k) return "";
  const exact = map[k];
  if (exact != null && String(exact).trim()) return String(exact).trim();
  const lower = Object.keys(map).find(
    (x) => String(x).trim().toLowerCase() === k.toLowerCase(),
  );
  return lower != null && map[lower] != null ? String(map[lower]).trim() : "";
}

export function resolvePreletorAvatarUrl(preletorAvatars, preletorName) {
  return resolveNameAvatarUrl(preletorAvatars, preletorName);
}

export function resolvePastorAvatarUrl(pastorAvatars, pastorName) {
  return resolveNameAvatarUrl(pastorAvatars, pastorName);
}
