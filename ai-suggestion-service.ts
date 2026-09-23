// ai-suggestion-service.ts
// Sends the markdown context (built by training-context-builder.ts) to the
// Claude API and parses back a structured suggestion. Only called on demand
// (e.g. "Suggest next run" button, or a weekly/bi-weekly check-in) — not on
// every log entry.

const SYSTEM_PROMPT = `You are a marathon training assistant helping one runner adjust their plan.
You will receive a markdown "training context" with their goal, upcoming planned workout,
locally-computed trend flags, and recent run history including free-text notes on how each run felt.

Your job:
1. Decide whether the trend flags reflect a real pattern (fatigue, overreaching, a pace target
   that's no longer realistic) or just noise (a couple of rough days explained by the notes —
   heat, illness, poor sleep, life stress).
2. Recommend the next workout: keep it as planned, ease it, or replace it (e.g. swap a tempo
   for an easy run if there are signs of overreaching).
3. Give a short, plain-language reason a runner would actually want to read.

Respond ONLY with JSON, no markdown fences, no preamble, in this exact shape:
{
  "pattern_assessment": "noise" | "emerging" | "confirmed",
  "pattern_reasoning": "1-2 sentences",
  "next_workout": {
    "type": "easy" | "tempo" | "long" | "speed" | "recovery",
    "distance_mi": number,
    "pace_per_mi": "m:ss",
    "changed_from_plan": boolean
  },
  "explanation": "1-3 sentences in a coaching tone, plain language, no jargon"
}`;

export interface AiSuggestion {
  pattern_assessment: "noise" | "emerging" | "confirmed";
  pattern_reasoning: string;
  next_workout: {
    type: "easy" | "tempo" | "long" | "speed" | "recovery";
    distance_mi: number;
    pace_per_mi: string;
    changed_from_plan: boolean;
  };
  explanation: string;
}

export async function getNextRunSuggestion(
  contextMarkdown: string,
  apiKey: string
): Promise<AiSuggestion> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-5",
      max_tokens: 500,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: contextMarkdown }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Claude API error: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  const text = data.content
    .filter((block: any) => block.type === "text")
    .map((block: any) => block.text)
    .join("\n");

  const cleaned = text.replace(/```json|```/g, "").trim();
  return JSON.parse(cleaned) as AiSuggestion;
}

/* ---------------------------------------------------------------------
   Usage in your Tauri app:

   import { buildContextMarkdown, analyzeTrend } from "./training-context-builder";
   import { getNextRunSuggestion } from "./ai-suggestion-service";

   const trendFlags = [
     analyzeTrend(history, "tempo", 3),
     analyzeTrend(history, "long", 3),
   ];
   const md = buildContextMarkdown(goal, history, upcomingWorkout, trendFlags);
   const suggestion = await getNextRunSuggestion(md, storedApiKey);

   // storedApiKey: for a single-user local app, keep it in the OS keychain via
   // Tauri's secure storage (tauri-plugin-store or stronghold), not a plain file.
   ------------------------------------------------------------------------ */
