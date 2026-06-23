import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
} from 'node:crypto';

/**
 * Cifrado AES-256-GCM de PII y datos financieros (requisito BASE-GUIDE).
 * La clave maestra (32 bytes en hex) viene de AES_MASTER_KEY.
 * En producción la clave vive en Vault/HSM; en local en .env.
 *
 * Formato del ciphertext: iv(12) || authTag(16) || data  (todo en un Buffer).
 */
const ALGO = 'aes-256-gcm';

function masterKey(): Buffer {
  const hex = process.env.AES_MASTER_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error('AES_MASTER_KEY debe ser 32 bytes en hex (64 chars)');
  }
  return Buffer.from(hex, 'hex');
}

export function encryptPII(plaintext: string): Buffer {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, masterKey(), iv);
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]);
}

export function decryptPII(blob: Buffer): string {
  const iv = blob.subarray(0, 12);
  const tag = blob.subarray(12, 28);
  const data = blob.subarray(28);
  const decipher = createDecipheriv(ALGO, masterKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
}

/** HMAC-SHA256 para columnas *_hash (búsqueda/unicidad sin desencriptar). */
export function hashForSearch(value: string): string {
  const salt = process.env.PII_HMAC_SALT ?? 'dev-salt';
  return createHmac('sha256', salt).update(value).digest('hex');
}
