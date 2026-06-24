"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.encryptPII = encryptPII;
exports.decryptPII = decryptPII;
exports.hashForSearch = hashForSearch;
const node_crypto_1 = require("node:crypto");
/**
 * Cifrado AES-256-GCM de PII y datos financieros (requisito BASE-GUIDE).
 * La clave maestra (32 bytes en hex) viene de AES_MASTER_KEY.
 * En producción la clave vive en Vault/HSM; en local en .env.
 *
 * Formato del ciphertext: iv(12) || authTag(16) || data  (todo en un Buffer).
 */
const ALGO = 'aes-256-gcm';
function masterKey() {
    const hex = process.env.AES_MASTER_KEY;
    if (!hex || hex.length !== 64) {
        throw new Error('AES_MASTER_KEY debe ser 32 bytes en hex (64 chars)');
    }
    return Buffer.from(hex, 'hex');
}
function encryptPII(plaintext) {
    const iv = (0, node_crypto_1.randomBytes)(12);
    const cipher = (0, node_crypto_1.createCipheriv)(ALGO, masterKey(), iv);
    const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, enc]);
}
function decryptPII(blob) {
    const iv = blob.subarray(0, 12);
    const tag = blob.subarray(12, 28);
    const data = blob.subarray(28);
    const decipher = (0, node_crypto_1.createDecipheriv)(ALGO, masterKey(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
}
/** HMAC-SHA256 para columnas *_hash (búsqueda/unicidad sin desencriptar). */
function hashForSearch(value) {
    const salt = process.env.PII_HMAC_SALT ?? 'dev-salt';
    return (0, node_crypto_1.createHmac)('sha256', salt).update(value).digest('hex');
}
//# sourceMappingURL=crypto.js.map