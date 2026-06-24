"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildHealth = buildHealth;
function buildHealth(service, version = '0.1.0') {
    return {
        service,
        status: 'ok',
        version,
        uptimeSeconds: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
    };
}
//# sourceMappingURL=health.js.map