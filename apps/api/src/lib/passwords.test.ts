import { describe, expect, it } from 'vitest';
import { BCRYPT_COST, DUMMY_HASH, hashPassword, verifyPassword } from './passwords.js';

describe('passwords', () => {
  it('stores a salted bcrypt hash, never the password itself', async () => {
    const hash = await hashPassword('slaptazodis123');

    expect(hash).not.toContain('slaptazodis123');
    expect(hash).toMatch(new RegExp(`^\\$2[aby]\\$${BCRYPT_COST}\\$`));
    // A random salt: the same password hashes differently every time.
    expect(await hashPassword('slaptazodis123')).not.toBe(hash);
  });

  it('accepts the right password and rejects a wrong one', async () => {
    const hash = await hashPassword('slaptazodis123');

    expect(await verifyPassword('slaptazodis123', hash)).toBe(true);
    expect(await verifyPassword('Slaptazodis123', hash)).toBe(false);
  });

  it('has a dummy hash with the same cost, so an unknown e-mail takes as long as a wrong password', async () => {
    expect(DUMMY_HASH).toMatch(new RegExp(`^\\$2[aby]\\$${BCRYPT_COST}\\$`));
    expect(await verifyPassword('slaptazodis123', DUMMY_HASH)).toBe(false);
  });
});
