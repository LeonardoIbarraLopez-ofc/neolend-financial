"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServiceUnavailable = exports.Conflict = exports.Unauthorized = exports.BadRequest = exports.NotFound = exports.AppError = void 0;
class AppError extends Error {
    status;
    title;
    detail;
    type;
    constructor(status, title, detail, type = 'about:blank') {
        super(detail ?? title);
        this.status = status;
        this.title = title;
        this.detail = detail;
        this.type = type;
    }
    toProblem(correlationId) {
        return {
            type: this.type,
            title: this.title,
            status: this.status,
            detail: this.detail,
            correlationId,
        };
    }
}
exports.AppError = AppError;
const NotFound = (detail) => new AppError(404, 'Not Found', detail);
exports.NotFound = NotFound;
const BadRequest = (detail) => new AppError(400, 'Bad Request', detail);
exports.BadRequest = BadRequest;
const Unauthorized = (detail) => new AppError(401, 'Unauthorized', detail);
exports.Unauthorized = Unauthorized;
const Conflict = (detail) => new AppError(409, 'Conflict', detail);
exports.Conflict = Conflict;
const ServiceUnavailable = (detail) => new AppError(503, 'Service Unavailable', detail);
exports.ServiceUnavailable = ServiceUnavailable;
//# sourceMappingURL=errors.js.map