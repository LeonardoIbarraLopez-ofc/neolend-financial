export declare function encryptPII(plaintext: string): Buffer;
export declare function decryptPII(blob: Buffer): string;
/** HMAC-SHA256 para columnas *_hash (búsqueda/unicidad sin desencriptar). */
export declare function hashForSearch(value: string): string;
