export const NOTE_PROCESSOR_PROMPT = `
You are the Study Assistant Note Processor.
Goals:
1. Read raw study material (Chinese / English / mixed).
2. Detect the dominant input language.
3. Produce bilingual output with mirrored content in zh & en.
4. Respond with strict JSON only. Do not wrap in Markdown or add commentary.

Output contract:
{
  "language_input": "zh" | "en",
  "summary": { "zh": "string", "en": "string" },
  "bullet_notes": {
    "zh": [ { "title": "string", "children": ["string"] } ],
    "en": [ { "title": "string", "children": ["string"] } ]
  },
  "terminology": [
    {
      "term_zh": "string|null",
      "term_en": "string|null",
      "definition_zh": "string",
      "definition_en": "string",
      "context_zh": "string|null",
      "context_en": "string|null"
    }
  ]
}

Rules:
- Always populate both zh and en fields (translate if the source lacks one language).
- Keep tone concise and academic.
- Put short phrases (<= 1 sentence) inside bullet children.
- Terminology focuses on key concepts, formulas, or jargon.
- If a field is missing in the source language, infer a faithful translation.
`;

export const NOTE_PROCESSOR_SCHEMA = {
  type: "object",
  required: ["language_input", "summary", "bullet_notes", "terminology"],
  properties: {
    language_input: { type: "string", enum: ["zh", "en"] },
    summary: {
      type: "object",
      required: ["zh", "en"],
      properties: {
        zh: { type: "string" },
        en: { type: "string" },
      },
    },
    bullet_notes: {
      type: "object",
      required: ["zh", "en"],
      properties: {
        zh: {
          type: "array",
          items: {
            type: "object",
            required: ["title", "children"],
            properties: {
              title: { type: "string" },
              children: {
                type: "array",
                items: { type: "string" },
              },
            },
          },
        },
        en: {
          type: "array",
          items: {
            type: "object",
            required: ["title", "children"],
            properties: {
              title: { type: "string" },
              children: {
                type: "array",
                items: { type: "string" },
              },
            },
          },
        },
      },
    },
    terminology: {
      type: "array",
      items: {
        type: "object",
        required: ["definition_zh", "definition_en"],
        properties: {
          term_zh: { type: ["string", "null"] },
          term_en: { type: ["string", "null"] },
          definition_zh: { type: "string" },
          definition_en: { type: "string" },
          context_zh: { type: ["string", "null"] },
          context_en: { type: ["string", "null"] },
        },
      },
    },
  },
};

export const TERMINOLOGY_PROMPT = `
You are the Study Assistant Terminology Engine.
Task: extract key technical or conceptual terms from the provided note text
and respond with bilingual flashcard-ready data.

Output JSON only:
{
  "terminology": [
    {
      "term_zh": "string|null",
      "term_en": "string|null",
      "definition_zh": "string",
      "definition_en": "string",
      "context_zh": "string|null",
      "context_en": "string|null"
    }
  ]
}

Rules:
- Focus on unique, high-value terms (no generic words like "introduction").
- Provide concise definitions (<= 2 sentences) in both languages.
- Include context sentences only when useful.
- Emit valid JSON with double quotes and no comments.
`;

export const TERMINOLOGY_SCHEMA = {
  type: "object",
  required: ["terminology"],
  properties: {
    terminology: {
      type: "array",
      items: {
        type: "object",
        required: ["definition_zh", "definition_en"],
        properties: {
          term_zh: { type: ["string", "null"] },
          term_en: { type: ["string", "null"] },
          definition_zh: { type: "string" },
          definition_en: { type: "string" },
          context_zh: { type: ["string", "null"] },
          context_en: { type: ["string", "null"] },
        },
      },
    },
  },
};

export const QA_PROMPT = `
You are the Study Assistant Strict-Context Q&A helper.
Rules:
- Answer ONLY using the supplied context chunks.
- If the context is insufficient, say so explicitly and set confidence to "low".
- Provide bilingual answers: "primary" matches the detected question language, "translation" provides the other language.
- Respond with JSON only and list the IDs of chunks that actually supported the answer.

Structure:
{
  "answer_language": "zh" | "en",
  "answer": {
    "primary": "string",
    "translation": "string"
  },
  "used_context_ids": ["string"],
  "confidence": "high" | "medium" | "low",
  "notes": "string|null"
}
`;

export const QA_SCHEMA = {
  type: "object",
  required: ["answer_language", "answer", "used_context_ids", "confidence"],
  properties: {
    answer_language: { type: "string", enum: ["zh", "en"] },
    answer: {
      type: "object",
      required: ["primary", "translation"],
      properties: {
        primary: { type: "string" },
        translation: { type: "string" },
      },
    },
    used_context_ids: {
      type: "array",
      items: { type: "string" },
    },
    confidence: {
      type: "string",
      enum: ["high", "medium", "low"],
    },
    notes: {
      type: ["string", "null"],
    },
  },
};
