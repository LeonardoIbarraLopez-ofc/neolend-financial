"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CORRELATION_HEADER = void 0;
exports.newCorrelationId = newCorrelationId;
exports.correlationFromHeaders = correlationFromHeaders;
const node_crypto_1 = require("node:crypto");
/** Header estándar para propagar la trazabilidad end-to-end. */
exports.CORRELATION_HEADER = 'x-correlation-id';
function newCorrelationId() {
    return (0, node_crypto_1.randomUUID)();
}
/** Extrae el correlationId del header o genera uno nuevo. */
function correlationFromHeaders(headers) {
    const raw = headers[exports.CORRELATION_HEADER];
    return typeof raw === 'string' && raw.length > 0 ? raw : newCorrelationId();
}
//# sourceMappingURL=correlation.js.map