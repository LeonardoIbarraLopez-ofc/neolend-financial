"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeEnvelope = makeEnvelope;
const node_crypto_1 = require("node:crypto");
function makeEnvelope(args) {
    return {
        eventId: (0, node_crypto_1.randomUUID)(),
        eventType: args.eventType,
        occurredAt: new Date().toISOString(),
        correlationId: args.correlationId,
        causationId: args.causationId,
        producer: args.producer,
        schemaVersion: args.schemaVersion ?? 1,
        payload: args.payload,
    };
}
//# sourceMappingURL=envelope.js.map