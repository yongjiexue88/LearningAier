"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractPdfText = extractPdfText;
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdfParse = require("pdf-parse");
async function extractPdfText(buffer) {
    try {
        const result = await pdfParse(buffer);
        return result.text.replace(/\s+\n/g, "\n").trim();
    }
    catch (error) {
        console.error("[PDF] Extraction failed", error);
        return "";
    }
}
