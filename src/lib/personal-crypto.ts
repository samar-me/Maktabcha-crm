import "server-only";

import crypto from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(crypto.scrypt);

/**
 * Hash a 4-digit PIN with a random salt using Node.js scrypt (server-side only).
 */
export async function hashPin(pin: string, salt: string): Promise<string> {
  const derivedKey = (await scryptAsync(pin, salt, 64)) as Buffer;
  return derivedKey.toString("hex");
}

/**
 * Generate a cryptographically random salt.
 */
export function generateSalt(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Constant-time PIN verification using timingSafeEqual.
 */
export async function verifyPinWithHash(
  candidatePin: string,
  storedHash: string,
  storedSalt: string
): Promise<boolean> {
  try {
    const candidateHash = await hashPin(candidatePin, storedSalt);
    const candidateBuffer = Buffer.from(candidateHash, "hex");
    const storedBuffer = Buffer.from(storedHash, "hex");

    if (candidateBuffer.length !== storedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(candidateBuffer, storedBuffer);
  } catch {
    return false;
  }
}
