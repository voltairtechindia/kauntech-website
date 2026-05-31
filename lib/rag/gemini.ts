/**
 * Gemini wrapper (via the official @google/genai SDK) for embeddings,
 * chat generation, and JSON extraction. This is the only file that knows
 * about the model SDK; everything else calls these functions.
 */
import { GoogleGenAI } from "@google/genai";

import { config } from "./config";

let ai: GoogleGenAI | null = null;

function client(): GoogleGenAI {
  if (!ai) {
    if (!config.googleApiKey) {
      throw new Error("GOOGLE_API_KEY must be set (see .env.local.example).");
    }
    ai = new GoogleGenAI({ apiKey: config.googleApiKey });
  }
  return ai;
}

export type ChatTurn = { role: "user" | "model"; text: string };

const TASK = {
  query: "RETRIEVAL_QUERY",
  document: "RETRIEVAL_DOCUMENT",
} as const;

/** Embed a single search query (asymmetric with document embeddings). */
export async function embedQuery(text: string): Promise<number[]> {
  const [vec] = await embed([text], "query");
  return vec;
}

/**
 * Embed a batch of texts. We embed one-by-one to guarantee output ordering
 * (the batch endpoint has a known ordering bug for large batches:
 * https://github.com/googleapis/js-genai/issues/1207). Our knowledge base is
 * small, so the extra round-trips are negligible.
 */
export async function embed(
  texts: string[],
  task: "query" | "document",
): Promise<number[][]> {
  const out: number[][] = [];
  for (const text of texts) {
    const res = await client().models.embedContent({
      model: config.embeddingModel,
      contents: text,
      config: {
        taskType: TASK[task],
        outputDimensionality: config.embeddingDim,
      },
    });
    const values = res.embeddings?.[0]?.values;
    if (!values || !values.length) {
      throw new Error("Gemini returned an empty embedding.");
    }
    out.push(values);
  }
  return out;
}

/** Plain-text chat completion grounded by the system prompt + history. */
export async function generate(
  systemPrompt: string,
  history: ChatTurn[],
): Promise<string> {
  const res = await client().models.generateContent({
    model: config.llmModel,
    contents: history.map((m) => ({
      role: m.role,
      parts: [{ text: m.text }],
    })),
    config: {
      systemInstruction: systemPrompt,
      temperature: config.llmTemperature,
      maxOutputTokens: config.llmMaxOutputTokens,
      // 2.5-flash is a thinking model; disable thinking for a fast, cheap chat
      // widget so reasoning never eats the output-token budget. (0 = DISABLED.)
      thinkingConfig: { thinkingBudget: 0 },
    },
  });
  const text = (res.text ?? "").trim();
  if (!text) {
    return "I'm sorry, I couldn't put together a response just now. Could you rephrase that?";
  }
  return text;
}

/** Structured JSON completion (used for background analytics extraction). */
export async function generateJson(
  systemPrompt: string,
  prompt: string,
): Promise<Record<string, unknown>> {
  const res = await client().models.generateContent({
    model: config.llmModel,
    contents: prompt,
    config: {
      systemInstruction: systemPrompt,
      temperature: 0,
      responseMimeType: "application/json",
      thinkingConfig: { thinkingBudget: 0 },
    },
  });
  try {
    return JSON.parse((res.text ?? "{}").trim()) as Record<string, unknown>;
  } catch {
    return {};
  }
}
