type PdfParseResult = {
  text: string;
};

// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdfParse = require("pdf-parse") as (
  dataBuffer: Buffer
) => Promise<PdfParseResult>;

export async function extractPdfText(buffer: Buffer): Promise<string> {
  try {
    const result = await pdfParse(buffer);
    return result.text.replace(/\s+\n/g, "\n").trim();
  } catch (error) {
    console.error("[PDF] Extraction failed", error);
    return "";
  }
}
