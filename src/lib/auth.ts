import argon2 from "argon2";

/**
 * Hash a passphrase for storage (used once, at setup time,
 * to create meta.respondentPassphraseHash).
 */
export const hashPassphrase = async (passphrase: string): Promise<string> =>
  argon2.hash(passphrase);

/**
 * Verify a passphrase attempt against the stored hash.
 * Used on every /r/<token> session login.
 */
export const verifyPassphrase = async (
  passphrase: string,
  hash: string,
): Promise<boolean> => {
  try {
    return await argon2.verify(hash, passphrase);
  } catch {
    // argon2.verify throws on malformed hash rather than returning false
    return false;
  }
};
