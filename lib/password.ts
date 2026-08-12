import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const parameters = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

export function hashPassword(password: string) {
  if (password.length < 14) throw new Error("Password must contain at least 14 characters.");
  const salt = randomBytes(16);
  const derived = scryptSync(password, salt, 64, parameters);
  return `scrypt$${parameters.N}$${parameters.r}$${parameters.p}$${salt.toString("base64url")}$${derived.toString("base64url")}`;
}

export function verifyPassword(password: string, encoded: string) {
  try {
    const [algorithm, n, r, p, saltValue, hashValue] = encoded.split("$");
    if (algorithm !== "scrypt" || !n || !r || !p || !saltValue || !hashValue) return false;
    const expected = Buffer.from(hashValue, "base64url");
    const actual = scryptSync(password, Buffer.from(saltValue, "base64url"), expected.length, { N: Number(n), r: Number(r), p: Number(p), maxmem: parameters.maxmem });
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}
