"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.downloadFileBuffer = downloadFileBuffer;
const firebaseAdmin_1 = require("./firebaseAdmin");
const errors_1 = require("../errors");
async function downloadFileBuffer(path) {
    const bucket = firebaseAdmin_1.firebaseStorage.bucket();
    const file = bucket.file(path);
    const [exists] = await file.exists();
    if (!exists) {
        throw new errors_1.NotFoundError(`File not found at path: ${path}`);
    }
    const [buffer] = await file.download();
    return buffer;
}
