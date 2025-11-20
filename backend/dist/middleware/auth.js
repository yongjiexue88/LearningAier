"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateRequest = authenticateRequest;
const auth_1 = require("firebase-admin/auth");
const errors_1 = require("../errors");
function extractBearerToken(header) {
    if (!header)
        return null;
    const parts = header.split(" ");
    if (parts.length === 2 && /^Bearer$/i.test(parts[0])) {
        return parts[1];
    }
    return null;
}
async function authenticateRequest(req, _res, next) {
    const token = extractBearerToken(req.headers.authorization);
    if (!token) {
        throw new errors_1.UnauthorizedError("Missing Authorization header");
    }
    try {
        const decoded = await (0, auth_1.getAuth)().verifyIdToken(token);
        req.user = {
            uid: decoded.uid,
            email: decoded.email ?? undefined,
        };
        next();
    }
    catch (error) {
        console.error("[Auth] Failed to verify token", error);
        throw new errors_1.UnauthorizedError("Invalid or expired auth token");
    }
}
