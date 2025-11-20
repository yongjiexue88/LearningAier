"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
const errors_1 = require("../errors");
function errorHandler(err, _req, res, _next) {
    const safeMessage = err instanceof Error ? err.message : String(err);
    if (err instanceof errors_1.AppError) {
        console.error("[API] AppError", {
            status: err.status,
            message: err.message,
            details: err.details ?? null,
        });
        res.status(err.status).json({
            error: err.message,
            details: err.details ?? null,
        });
        return;
    }
    if (err instanceof SyntaxError) {
        console.error("[API] SyntaxError", safeMessage);
        res.status(400).json({ error: "Invalid JSON payload" });
        return;
    }
    console.error("[API] Unhandled error", err);
    res.status(500).json({ error: "Internal Server Error" });
}
