import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createSupabaseClient } from "../_shared/supabaseClient.ts";
import {
  readJson,
  jsonResponse,
  handleError,
  UnauthorizedError,
  BadRequestError,
} from "../_shared/responses.ts";

type ReviewResponse = "again" | "hard" | "good" | "easy";

interface Payload {
  flashcard_id: string;
  response: ReviewResponse;
}

const INTERVAL_MULTIPLIERS: Record<ReviewResponse, number> = {
  again: 0.5,
  hard: 1,
  good: 2,
  easy: 3,
};

serve(async (req: Request): Promise<Response> => {
  try {
    if (req.method !== "POST") {
      return jsonResponse({ error: "Method Not Allowed" }, { status: 405 });
    }

    const payload = await readJson<Payload>(req);
    if (!payload.flashcard_id) {
      throw new BadRequestError("Field 'flashcard_id' is required.");
    }
    if (!payload.response || !(payload.response in INTERVAL_MULTIPLIERS)) {
      throw new BadRequestError(
        "Field 'response' must be one of again|hard|good|easy."
      );
    }

    const supabase = createSupabaseClient(req);
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      throw new UnauthorizedError();
    }

    const { data: card, error: cardError } = await supabase
      .from("flashcards")
      .select("id,user_id,next_due_at")
      .eq("id", payload.flashcard_id)
      .maybeSingle();

    if (cardError || !card) {
      throw new BadRequestError("Flashcard not found.");
    }
    if (card.user_id !== user.id) {
      throw new UnauthorizedError();
    }

    const { data: lastReview } = await supabase
      .from("flashcard_reviews")
      .select("interval_days")
      .eq("flashcard_id", card.id)
      .order("reviewed_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const baseInterval = lastReview?.interval_days ?? 1;
    const multiplier = INTERVAL_MULTIPLIERS[payload.response];
    const nextInterval = Math.max(1, Math.round(baseInterval * multiplier));
    const nextDueAt = new Date(
      Date.now() + nextInterval * 24 * 60 * 60 * 1000
    ).toISOString();

    const { error: insertError } = await supabase
      .from("flashcard_reviews")
      .insert({
        flashcard_id: card.id,
        user_id: user.id,
        response: payload.response,
        next_due_at: nextDueAt,
        interval_days: nextInterval,
      });

    if (insertError) {
      throw new Error(`Failed to log review: ${insertError.message}`);
    }

    const { error: updateError } = await supabase
      .from("flashcards")
      .update({ next_due_at: nextDueAt })
      .eq("id", card.id);

    if (updateError) {
      throw new Error(`Failed to update flashcard: ${updateError.message}`);
    }

    return jsonResponse({
      flashcard_id: card.id,
      next_due_at: nextDueAt,
      interval_days: nextInterval,
    });
  } catch (error) {
    return handleError(error);
  }
});
