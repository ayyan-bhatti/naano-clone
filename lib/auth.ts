/**
 * Demo password handling.
 *
 * This is NOT authentication. There is no server, no salt per user, no key
 * stretching and no session token - anyone with devtools can read the store and
 * change the role. What it does do is avoid the one thing that would be
 * indefensible even in a demo: keeping the password in plain text where a
 * reviewer opening localStorage can read it.
 *
 * SHA-256 comes from the Web Crypto API, which is built into the browser - no
 * dependency, and no key. It needs a secure context (https or localhost); if it
 * is unavailable we fall back to a non-cryptographic digest so the demo still
 * works rather than dead-ending at the sign-up form.
 */

const PREFIX = 'vouch:v1:';

function fallbackDigest(input: string): string {
  // FNV-1a over two offset passes. Not secure - and not pretending to be. It
  // exists so an insecure-context browser can still complete the demo flow.
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < input.length; i += 1) {
    h1 ^= input.charCodeAt(i);
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= input.charCodeAt(input.length - 1 - i);
    h2 = Math.imul(h2, 0x85ebca6b);
  }
  return `fb${(h1 >>> 0).toString(16).padStart(8, '0')}${(h2 >>> 0).toString(16).padStart(8, '0')}`;
}

export async function hashPassword(password: string): Promise<string> {
  const input = `${PREFIX}${password}`;

  if (typeof crypto !== 'undefined' && crypto.subtle) {
    try {
      const bytes = new TextEncoder().encode(input);
      const digest = await crypto.subtle.digest('SHA-256', bytes);
      return Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    } catch {
      /* insecure context - fall through */
    }
  }

  return fallbackDigest(input);
}

/** Constant-ish time compare. Overkill here, but free and correct. */
export function digestsMatch(a: string | undefined, b: string): boolean {
  if (!a || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export interface PasswordCheck {
  ok: boolean;
  message?: string;
}

export function checkPasswordStrength(password: string): PasswordCheck {
  if (password.length < 8) return { ok: false, message: 'Use at least 8 characters' };
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    return { ok: false, message: 'Mix in at least one letter and one number' };
  }
  return { ok: true };
}

/** 0-4, for the strength meter. */
export function passwordScore(password: string): number {
  if (!password) return 0;
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password) && /[^a-zA-Z0-9]/.test(password)) score += 1;
  return Math.min(4, score);
}
