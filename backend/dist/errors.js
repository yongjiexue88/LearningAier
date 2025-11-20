"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotFoundError = exports.UnauthorizedError = exports.BadRequestError = exports.AppError = void 0;
class AppError extends Error {
    status;
    details;
    constructor(status, message, details) {
        super(message);
        this.status = status;
        this.details = details;
        this.name = "AppError";
    }
}
exports.AppError = AppError;
class BadRequestError extends AppError {
    constructor(message, details) {
        super(400, message, details);
        this.name = "BadRequestError";
    }
}
exports.BadRequestError = BadRequestError;
class UnauthorizedError extends AppError {
    constructor(message = "Unauthorized") {
        super(401, message);
        this.name = "UnauthorizedError";
    }
}
exports.UnauthorizedError = UnauthorizedError;
class NotFoundError extends AppError {
    constructor(message = "Not Found") {
        super(404, message);
        this.name = "NotFoundError";
    }
}
exports.NotFoundError = NotFoundError;
