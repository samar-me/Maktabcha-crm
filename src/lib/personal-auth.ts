const PIN_STORAGE_KEY = "maktabcha_pin_hash";
const PIN_SALT = "maktabcha_crm_secure_salt_v1";

/**
 * Derives a SHA-256 hash from a 4-digit PIN with a fixed application salt.
 */
export async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`${PIN_SALT}:${pin.trim()}`);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function hasSavedPin(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const hash = localStorage.getItem(PIN_STORAGE_KEY);
    return !!hash && hash.length === 64;
  } catch {
    return false;
  }
}

export async function savePinHash(pin: string): Promise<void> {
  if (typeof window === "undefined") return;
  const hash = await hashPin(pin);
  localStorage.setItem(PIN_STORAGE_KEY, hash);
}

export async function verifyPin(pin: string): Promise<boolean> {
  if (typeof window === "undefined") return false;
  try {
    const storedHash = localStorage.getItem(PIN_STORAGE_KEY);
    if (!storedHash) return false;
    const computedHash = await hashPin(pin);
    return computedHash === storedHash;
  } catch {
    return false;
  }
}

export function clearPin(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(PIN_STORAGE_KEY);
}
