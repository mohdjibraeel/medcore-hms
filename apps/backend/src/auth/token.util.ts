import { randomBytes, randomInt, createHash } from 'crypto';

/** Generates a 6-digit numeric OTP, e.g. "042917". */
export function generateOtp(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, '0');
}

/** Generates a high-entropy raw token (for refresh tokens / reset links). */
export function generateRawToken(): string {
  return randomBytes(32).toString('hex');
}

/** Fast hash for already-random secrets (refresh tokens, reset tokens). */
export function sha256(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}