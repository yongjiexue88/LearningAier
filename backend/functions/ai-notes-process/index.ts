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

interface RequestPayload {
  text: string;
}

serve(async (req: Request): Promise<Response> => {
  try {
    if (req.method !== "POST") {
      return jsonResponse({ error: "Method Not Allowed" }, { status: 405 });
    }

    const payload = await readJson<RequestPayload>(req);
    if (!payload.text || !payload.text.trim()) {
      throw new BadRequestError("Field 'text' is required.");
    }

    const supabase = createSupabaseClient(req);
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      throw new UnauthorizedError();
    }

    const result = await generateUserJSON(supabase, {
      userId: user.id,
      systemPrompt: NOTE_PROCESSOR_PROMPT,
      userPrompt: JSON.stringify({ text: payload.text }),
      schemaName: "NoteProcessorResult",
      schema: NOTE_PROCESSOR_SCHEMA,
    });

    return jsonResponse(result);
  } catch (error) {
    return handleError(error);
  }
});
