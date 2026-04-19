/**
 * Palavra-passe nunca em texto plano: apenas PBKDF2-SHA256 com sal aleatório.
 * Adequado ao browser; produção com API deve usar o mesmo critério no servidor.
 */

const PBKDF2_ITERATIONS = 120_000;
const SALT_BYTES = 16;
const DERIVED_BITS = 256;

function uint8ToBase64(buf) {
  let s = "";
  const chunk = 8192;
  const u = new Uint8Array(buf);
  for (let i = 0; i < u.length; i += chunk) {
    s += String.fromCharCode.apply(null, u.subarray(i, i + chunk));
  }
  return btoa(s);
}

function base64ToUint8(b64) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    out[i] = bin.charCodeAt(i);
  }
  return out;
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let x = 0;
  for (let i = 0; i < a.length; i++) {
    x |= a[i] ^ b[i];
  }
  return x === 0;
}

/**
 * @param {string} plainPassword
 * @returns {Promise<{ hash: string, salt: string }>} valores em base64
 */
export async function hashPassword(plainPassword) {
  const enc = new TextEncoder().encode(plainPassword);
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc,
    { name: "PBKDF2" },
    false,
    ["deriveBits"],
  );
  const derived = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    DERIVED_BITS,
  );
  return {
    hash: uint8ToBase64(new Uint8Array(derived)),
    salt: uint8ToBase64(salt),
  };
}

/**
 * @param {string} plainPassword
 * @param {string} saltBase64
 * @param {string} hashBase64
 */
export async function verifyPassword(plainPassword, saltBase64, hashBase64) {
  const salt = base64ToUint8(saltBase64);
  const expected = base64ToUint8(hashBase64);
  const enc = new TextEncoder().encode(plainPassword);
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc,
    { name: "PBKDF2" },
    false,
    ["deriveBits"],
  );
  const derived = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    DERIVED_BITS,
  );
  return timingSafeEqual(new Uint8Array(derived), expected);
}
