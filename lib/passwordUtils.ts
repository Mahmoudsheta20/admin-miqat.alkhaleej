import crypto from "crypto";

/**
 * Hash a password using scrypt with a unique random salt
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

/**
 * Verify a plain password against a stored salt:hash string
 */
export function verifyPassword(
  password: string,
  storedHash: string | null | undefined
): boolean {
  if (!storedHash) return false;

  const parts = storedHash.split(":");
  if (parts.length !== 2) {
    // Fallback for direct matching if any legacy unhashed password exists
    return password === storedHash;
  }

  const [salt, key] = parts;
  try {
    const keyBuffer = Buffer.from(key, "hex");
    const derivedKey = crypto.scryptSync(password, salt, 64);
    return crypto.timingSafeEqual(keyBuffer, derivedKey);
  } catch {
    return false;
  }
}

/**
 * Generate a friendly, unambiguous temporary password (e.g. MQ-8B7K2X)
 */
export function generateTemporaryPassword(prefix = "MQ"): string {
  // Avoid confusing characters: 0, O, 1, I, l
  const charset = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  let randomPart = "";
  for (let i = 0; i < 6; i++) {
    const idx = crypto.randomInt(0, charset.length);
    randomPart += charset[idx];
  }
  return `${prefix}-${randomPart}`;
}
