import type { Router } from "express";
import { GoogleGenAI } from "@google/genai";
import { asyncHandler } from "../../middleware/asyncHandler";
import type { AuthenticatedRequest } from "../../middleware/auth";
import { BadRequestError } from "../../errors";
import { runtimeConfig } from "../../config/runtime";

const aiClient = new GoogleGenAI({
  apiKey: runtimeConfig.llmApiKey,
});

type ConversationRole = "user" | "assistant";

interface ConversationMessage {
  role: ConversationRole;
  content: string;
  language?: "zh" | "en";
}

export function registerAiNotesQaRoute(router: Router): void {
  router.post(
    "/ai-notes-qa",
    asyncHandler(async (req, res) => {
      const payload = req.body ?? {};
      if (typeof payload.question !== "string" || !payload.question.trim()) {
        throw new BadRequestError("Field 'question' is required.");
      }
      if (!payload.scope || typeof payload.scope !== "object") {
        throw new BadRequestError("Field 'scope' is required.");
      }

      const userId = (req as AuthenticatedRequest).user?.uid;
      if (!userId) {
        throw new BadRequestError("User context missing from request.");
      }

      const history = sanitizeHistory(payload.history);
      const answerText = await generateGeminiResponse({
        question: payload.question,
        history,
      });

      res.json({
        answer: answerText,
        history,
      });
    })
  );
}

function sanitizeHistory(
  messages?: ConversationMessage[]
): ConversationMessage[] {
  if (!Array.isArray(messages)) {
    return [];
  }
  return messages
    .filter(
      (msg) =>
        (msg.role === "user" || msg.role === "assistant") &&
        typeof msg.content === "string" &&
        msg.content.trim().length > 0
    )
    .slice(-6)
    .map((msg) => ({
      role: msg.role,
      content: msg.content.trim(),
      language: msg.language === "zh" || msg.language === "en"
        ? msg.language
        : undefined,
    }));
}

async function generateGeminiResponse({
  question,
  history,
}: {
  question: string;
  history: ConversationMessage[];
}): Promise<string> {
  const contents =
    history.length > 0
      ? [
          ...history.map((msg) => ({
            role: msg.role === "assistant" ? "model" : "user",
            parts: [{ text: msg.content }],
          })),
          { role: "user", parts: [{ text: question }] },
        ]
      : [{ role: "user", parts: [{ text: question }] }];

  const response = await aiClient.models.generateContent({
    model: runtimeConfig.defaultLLMModel,
    contents,
    config: {
      temperature: 0.3,
      maxOutputTokens: 1024,
    },
  });

  const text = response.text?.trim();
  if (!text) {
    throw new Error("Gemini returned an empty response");
  }
  return text;
}
