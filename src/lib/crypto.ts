import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // initialized vector
const SALT_LENGTH = 16;
const SCRYPT_N = 16384; // scrypt cost factor

/**
 * Derive a 256-bit AES key from a passphrase + salt using scrypt.
 * Same passphrase + same salt => same key, deterministically.
 */
export const deriveKey = (passphrase: string, salt: Buffer): Buffer =>
  crypto.scryptSync(passphrase, salt, KEY_LENGTH, { N: SCRYPT_N });

export const generateSalt = (): Buffer => crypto.randomBytes(SALT_LENGTH);

/**
 * Encrypt a plaintext string (typically JSON.stringify(data)) using a derived key.
 * Returns a single base64 string containing iv + authTag + ciphertext,
 * so it can be stored as one field on disk.
 */
export const encrypt = (plaintext: string, key: Buffer): string => {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  // Store as: iv + authTag + ciphertext, all base64-encoded together
  return Buffer.concat([iv, authTag, ciphertext]).toString("base64");
};

/**
 * Decrypt a base64 string produced by encrypt() back into the original plaintext.
 */
export const decrypt = (encoded: string, key: Buffer): string => {
  const data = Buffer.from(encoded, "base64");

  const iv = data.subarray(0, IV_LENGTH);
  const authTag = data.subarray(IV_LENGTH, IV_LENGTH + 16);
  const ciphertext = data.subarray(IV_LENGTH + 16);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const plaintext = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return plaintext.toString("utf8");
};

export const generateDataKey = (): Buffer => crypto.randomBytes(KEY_LENGTH);

/**
 * Generate a unique form ID. Not a secret — access is still gated by the
 * existing session/token model — just an unguessable-looking identifier
 * consistent with the rest of the app's ID/token style.
 */
export const generateFormId = (): string =>
  "form_" + crypto.randomBytes(16).toString("hex");

/**
 * Wrap (encrypt) a raw key using another key — same AES-GCM mechanism,
 * just encrypting key bytes instead of JSON text.
 */
export const wrapKey = (rawKey: Buffer, wrappingKey: Buffer): string =>
  encrypt(rawKey.toString("base64"), wrappingKey);

/**
 * Unwrap (decrypt) a previously wrapped key back into raw key bytes.
 */
export const unwrapKey = (wrapped: string, wrappingKey: Buffer): Buffer =>
  Buffer.from(decrypt(wrapped, wrappingKey), "base64");
