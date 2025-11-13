import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createSupabaseClient } from "../_shared/supabaseClient.ts";
import {
  readJson,
  jsonResponse,
  handleError,
  UnauthorizedError,
  BadRequestError,
} from "../_shared/responses.ts";
import { generateUserJSON } from "../_shared/llm.ts";
import {
  NOTE_PROCESSOR_PROMPT,
  NOTE_PROCESSOR_SCHEMA,
} from "../../src/llm/prompts.ts";

const DOCUMENTS_BUCKET = Deno.env.get("DOCUMENTS_BUCKET") ?? "documents";

interface Payload {
  document_id: string;
}

serve(async (req: Request): Promise<Response> => {
  try {
    if (req.method !== "POST") {
      return jsonResponse({ error: "Method Not Allowed" }, { status: 405 });
    }

    const payload = await readJson<Payload>(req);
    if (!payload.document_id) {
      throw new BadRequestError("Field 'document_id' is required.");
    }

    const supabase = createSupabaseClient(req);
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      throw new UnauthorizedError();
    }

    const { data: document, error: docError } = await supabase
      .from("documents")
      .select("*")
      .eq("id", payload.document_id)
      .maybeSingle();

    if (docError || !document) {
      throw new BadRequestError("Document not found.");
    }
    if (document.user_id !== user.id) {
      throw new UnauthorizedError();
    }

    const { data: file, error: downloadError } = await supabase.storage
      .from(DOCUMENTS_BUCKET)
      .download(document.file_path);

    if (downloadError || !file) {
      throw new Error(`Unable to download PDF: ${downloadError?.message}`);
    }

    const buffer = await file.arrayBuffer();
    const extractedText = await extractPdfText(buffer);
    if (!extractedText) {
      throw new Error("Failed to extract text from PDF.");
    }

    const noteDraft = await generateUserJSON(supabase, {
      userId: user.id,
      systemPrompt: NOTE_PROCESSOR_PROMPT,
      userPrompt: JSON.stringify({ text: extractedText }),
      schemaName: "NoteProcessorResult",
      schema: NOTE_PROCESSOR_SCHEMA,
    });

    return jsonResponse({
      document_id: document.id,
      noteDraft,
      stats: {
        bytes: buffer.byteLength,
        characters: extractedText.length,
      },
    });
  } catch (error) {
    return handleError(error);
  }
});

async function extractPdfText(buffer: ArrayBuffer): Promise<string> {
  try {
    const pdfjs = await import(
      "https://esm.sh/pdfjs-dist@4.0.379/legacy/build/pdf.js"
    );
    const pdf = await pdfjs.getDocument({ data: buffer }).promise;
    const parts: string[] = [];
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const content = await page.getTextContent();
      const pageText = content.items
        .map((item: any) => item.str ?? "")
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      if (pageText) {
        parts.push(pageText);
      }
    }
    return parts.join("\n\n");
  } catch (error) {
    console.error("PDF extraction failed", error);
    return "";
  }
}
