import bcrypt from 'bcryptjs';

/**
 * Password hashing.
 *
 * bcrypt, unlike the SHA-256 used for share and refresh tokens, is slow on
 * purpose: a password has little entropy, so a leaked hash must be expensive
 * to brute force. Cost 12 is about 250 ms per hash - unnoticeable at login,
 * prohibitive for an attacker trying millions of guesses.
 */
export const BCRYPT_COST = 12;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_COST);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/**
 * A valid cost-12 hash of 32 random bytes that were discarded after hashing.
 *
 * When the e-mail at login is unknown, the password is still compared against
 * this hash. Otherwise an unknown address would be answered ~250 ms faster than
 * a wrong password, and response time alone would reveal which accounts exist.
 * Precomputed so that importing this module does not block for a hash.
 */
export const DUMMY_HASH = '$2b$12$SVuUCjcou2fVMdo3/3GsvejyLLy8gToZKGbiTJWBGMDqK0JWcvQXG';
