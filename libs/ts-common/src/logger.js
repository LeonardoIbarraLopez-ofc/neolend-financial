"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLogger = createLogger;
const pino_1 = __importDefault(require("pino"));
/**
 * Logger estructurado compartido. Todos los servicios deben loguear con esto
 * (no usar console.log). Incluye el nombre del servicio y, cuando exista,
 * el correlationId para trazabilidad end-to-end.
 */
function createLogger(service) {
    return (0, pino_1.default)({
        name: service,
        level: process.env.LOG_LEVEL ?? 'info',
        formatters: {
            level: (label) => ({ level: label }),
        },
        timestamp: pino_1.default.stdTimeFunctions.isoTime,
    });
}
//# sourceMappingURL=logger.js.map