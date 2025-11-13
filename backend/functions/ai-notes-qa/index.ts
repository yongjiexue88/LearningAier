import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createSupabaseClient } from "../_shared/supabaseClient.ts";
import {
  readJson,
  jsonResponse,
  handleError,
  UnauthorizedError,
  BadRequestError,
} from "../_shared/responses.ts";
import { embedTexts } from "../_shared/embeddings.ts";
import { retrieveContextChunks, type QAScope } from "../_shared/rag.ts";
import { generateUserJSON } from "../_shared/llm.ts";
import { QA_PROMPT, QA_SCHEMA } from "../../src/llm/prompts.ts";

interface QAPayload {
  question: string;
  scope: QAScope;
  matchCount?: number;
}

serve(async (req: Request): Promise<Response> => {
  try {
    if (req.method !== "POST") {
      return jsonResponse({ error: "Method Not Allowed" }, { status: 405 });
    }

    const payload = await readJson<QAPayload>(req);
    if (!payload.question || !payload.question.trim()) {
      throw new BadRequestError("Field 'question' is required.");
    }
    if (!payload.scope || !payload.scope.type) {
      throw new BadRequestError("Field 'scope' is required.");
    }

    const supabase = createSupabaseClient(req);
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      throw new UnauthorizedError();
    }

    const [queryEmbedding] = await embedTexts([payload.question]);
    if (!queryEmbedding) {
      throw new Error("Failed to generate embedding for question");
    }

    const contextChunks = await retrieveContextChunks({
      supabase,
      userId: user.id,
      scope: payload.scope,
      queryEmbedding,
      matchCount: payload.matchCount ?? 8,
    });

    const qaResult = await generateUserJSON(supabase, {
      userId: user.id,
      systemPrompt: QA_PROMPT,
      userPrompt: JSON.stringify({
        question: payload.question,
        context_chunks: contextChunks.map(
          ({ id, text, source_type, source_title }) => ({
            id,
            text,
            source_type,
            source_title,
          })
        ),
      }),
      schemaName: "StrictContextQAResult",
      schema: QA_SCHEMA,
    });

    return jsonResponse({ answer: qaResult, context_chunks: contextChunks });
  } catch (error) {
    return handleError(error);
  }
});
