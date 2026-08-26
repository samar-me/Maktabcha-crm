import crypto from "crypto";

const SCRYPT_KEY_LENGTH = 64;
const SCRYPT_OPTIONS: crypto.ScryptOptions = {
  N: 16384,
  r: 8,
  p: 1,
  maxmem: 32 * 1024 * 1024,
};

/**
 * Generate a student-friendly 6-digit numeric password (e.g., "482731")
 */
export function generateStudentNumericPassword(digits = 6): string {
  const min = Math.pow(10, digits - 1);
  const max = Math.pow(10, digits) - 1;
  const num = crypto.randomInt(min, max + 1);
  return num.toString();
}

/**
 * Generate a short 6-character alphanumeric connection code for Telegram groups (e.g., "K7M4P2")
 */
export function generateGroupConnectCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // excludes ambiguous 0, O, 1, I
  let code = "";
  for (let i = 0; i < 6; i++) {
    const idx = crypto.randomInt(0, chars.length);
    code += chars[idx];
  }
  return code;
}

/**
 * Generate a cryptographically secure random public token for assignments (e.g., "asn_7f8a9b2c...")
 */
export function generatePublicAssignmentToken(): string {
  return "asn_" + crypto.randomBytes(16).toString("hex");
}

/**
 * Generate a cryptographically secure random session token
 */
export function generateSessionToken(): string {
  return "sess_" + crypto.randomBytes(32).toString("hex");
}

/**
 * SHA-256 hash a token for safe database indexing and storage
 */
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Hash a student password with a unique random 32-byte salt using scrypt
 */
export async function hashStudentPassword(password: string): Promise<{ hash: string; salt: string }> {
  const salt = crypto.randomBytes(32).toString("hex");
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, SCRYPT_KEY_LENGTH, SCRYPT_OPTIONS, (err, derivedKey) => {
      if (err) return reject(err);
      resolve({
        hash: derivedKey.toString("hex"),
        salt,
      });
    });
  });
}

/**
 * Verify a student password against a stored scrypt hash and salt using constant-time comparison
 */
export async function verifyStudentPassword(
  password: string,
  storedSalt: string,
  storedHash: string
): Promise<boolean> {
  return new Promise((resolve) => {
    crypto.scrypt(password, storedSalt, SCRYPT_KEY_LENGTH, SCRYPT_OPTIONS, (err, derivedKey) => {
      if (err) return resolve(false);
      try {
        const storedBuffer = Buffer.from(storedHash, "hex");
        if (storedBuffer.length !== derivedKey.length) {
          return resolve(false);
        }
        const isValid = crypto.timingSafeEqual(storedBuffer, derivedKey);
        resolve(isValid);
      } catch {
        resolve(false);
      }
    });
  });
}
