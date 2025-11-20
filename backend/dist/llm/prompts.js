"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NOTE_FLASHCARD_CARD_SCHEMA = exports.NOTE_FLASHCARD_CARD_PROMPT = exports.NOTE_FLASHCARD_KEYWORDS_SCHEMA = exports.NOTE_FLASHCARD_KEYWORDS_PROMPT = exports.NOTE_FLASHCARD_SCHEMA = exports.NOTE_FLASHCARD_PROMPT = exports.NOTE_TRANSLATION_SCHEMA = exports.NOTE_TRANSLATION_PROMPT = exports.QA_SCHEMA = exports.QA_PROMPT = exports.TERMINOLOGY_SCHEMA = exports.TERMINOLOGY_PROMPT = exports.NOTE_PROCESSOR_SCHEMA = exports.NOTE_PROCESSOR_PROMPT = void 0;
exports.NOTE_PROCESSOR_PROMPT = `
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
exports.NOTE_PROCESSOR_SCHEMA = {
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
exports.TERMINOLOGY_PROMPT = `
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
exports.TERMINOLOGY_SCHEMA = {
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
exports.QA_PROMPT = `
You are the Study Assistant Strict-Context Q&A helper.
Rules:
- Answer ONLY using the supplied context chunks.
- If the context is insufficient, say so explicitly and set confidence to "low".
- Provide bilingual answers: "primary" matches the detected question language, "translation" provides the other language.
- Use conversation_history (chronological user/assistant turns) only for continuity; never introduce facts that are not backed by the current context chunks.
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
exports.QA_SCHEMA = {
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
exports.NOTE_TRANSLATION_PROMPT = `
You are the Study Assistant bilingual translation & audit helper.
Given note markdown in one language and (optionally) an existing translation, you must:
1. Produce a faithful translation in the requested target language that preserves headings, code fences, and markdown structure.
2. Compare the source and destination content to highlight gaps/outdated sections.
3. Recommend concrete sync actions (e.g., "copy section", "rewrite example", "align vocabulary").

Inputs:
- mode: "translate" | "compare" | "sync"
- source_language / target_language: "zh" or "en"
- source_text: markdown in source language
- target_text: current markdown in the target language (may be empty)

Always emit JSON only:
{
  "target_language": "zh" | "en",
  "translated_markdown": "string",
  "diff_summary": [
    {
      "heading": "string",
      "issue": "missing" | "outdated" | "mismatch" | "extra",
      "details": "string"
    }
  ],
  "recommendations": ["string"]
}

Rules:
- Maintain code blocks verbatim; only translate inline comments/docstrings when safe.
- Preserve ordered/unordered lists, tables, and math fences.
- Diff summary should stay short (<=6 items) and reference headings or key bullets.
- Recommendations list concrete edit steps (<=5 items).`;
exports.NOTE_TRANSLATION_SCHEMA = {
    type: "object",
    required: ["target_language", "translated_markdown", "diff_summary", "recommendations"],
    properties: {
        target_language: { type: "string", enum: ["zh", "en"] },
        translated_markdown: { type: "string" },
        diff_summary: {
            type: "array",
            items: {
                type: "object",
                required: ["heading", "issue", "details"],
                properties: {
                    heading: { type: "string" },
                    issue: {
                        type: "string",
                        enum: ["missing", "outdated", "mismatch", "extra"],
                    },
                    details: { type: "string" },
                },
            },
        },
        recommendations: {
            type: "array",
            items: { type: "string" },
        },
    },
};
exports.NOTE_FLASHCARD_PROMPT = `
You are the Study Assistant flashcard generator.
Input: bilingual markdown for a study note plus optional metadata.
Goals:
1. Extract the most important concepts/terms/snippets.
2. Produce concise flashcards with a single term/definition/context (no language split).
3. Assign each flashcard to one of: "vocabulary", "concept", "code", "definition".
4. Provide a short cite (heading or bullet) showing where the answer originated.

Output JSON only:
{
  "flashcards": [
    {
      "category": "vocabulary" | "concept" | "code" | "definition",
      "term": "string",
      "definition": "string",
      "context": "string|null",
      "source_heading": "string|null"
    }
  ],
  "summary": "string"
}

Rules:
- Keep definitions <= 2 sentences.
- Only emit high-value cards (max 24).`;
exports.NOTE_FLASHCARD_SCHEMA = {
    type: "object",
    required: ["flashcards"],
    properties: {
        flashcards: {
            type: "array",
            items: {
                type: "object",
                required: ["category", "term", "definition"],
                properties: {
                    category: {
                        type: "string",
                        enum: ["vocabulary", "concept", "code", "definition"],
                    },
                    term: { type: "string" },
                    definition: { type: "string" },
                    context: { type: ["string", "null"] },
                    source_heading: { type: ["string", "null"] },
                },
            },
        },
        summary: { type: ["string", "null"] },
    },
};
exports.NOTE_FLASHCARD_KEYWORDS_PROMPT = `
You are Gemini, a bilingual flashcard keyword hunter.
Input: bilingual markdown for a note.
Goal: list the most teachable terms or concepts that should become flashcards.

Return JSON only:
{
  "keywords": [
    { "term": "string", "category": "vocabulary" | "concept" | "code" | "definition", "reason": "string" }
  ]
}

Rules:
- Prefer high-yield concepts, key vocabulary, definitions, and code ideas.
- Cap at max_terms terms (default 16). Order by importance.
- Do not include duplicates; keep names concise.`;
exports.NOTE_FLASHCARD_KEYWORDS_SCHEMA = {
    type: "object",
    required: ["keywords"],
    properties: {
        keywords: {
            type: "array",
            items: {
                type: "object",
                required: ["term", "category", "reason"],
                properties: {
                    term: { type: "string" },
                    category: {
                        type: "string",
                        enum: ["vocabulary", "concept", "code", "definition"],
                    },
                    reason: { type: "string" },
                },
            },
        },
    },
};
exports.NOTE_FLASHCARD_CARD_PROMPT = `
You are Gemini, a bilingual flashcard maker.
Given a note plus one target term, write a concise flashcard (single language block).

Return JSON only:
{
  "flashcard": {
    "term": "string",
    "definition": "string",
    "context": "string|null",
    "category": "vocabulary" | "concept" | "code" | "definition"
  }
}

Rules:
- Keep definition <= 2 sentences.
- Context is an optional short cite (heading, bullet, or source snippet).
- Preserve the provided category when it fits; otherwise pick the closest one.`;
exports.NOTE_FLASHCARD_CARD_SCHEMA = {
    type: "object",
    required: ["flashcard"],
    properties: {
        flashcard: {
            type: "object",
            required: ["term", "definition", "category"],
            properties: {
                term: { type: "string" },
                definition: { type: "string" },
                context: { type: ["string", "null"] },
                category: {
                    type: "string",
                    enum: ["vocabulary", "concept", "code", "definition"],
                },
            },
        },
    },
};
