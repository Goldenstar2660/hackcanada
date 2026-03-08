import type {
  AnalyticsInsightCard,
  AnalyticsInsightsResponse,
  AnalyticsSummary
} from "@binsight/contracts";

const DEFAULT_GEMINI_MODEL = "gemini-3.1-flash-lite-preview";
const GEMINI_API_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";
const GEMINI_TIMEOUT_MS = 8000;

interface GeminiAnalyticsInsightsConfig {
  readonly apiKey?: string;
  readonly model?: string;
}

interface GeminiGenerateContentResponse {
  readonly candidates?: ReadonlyArray<{
    readonly content?: {
      readonly parts?: ReadonlyArray<{
        readonly text?: string;
      }>;
    };
  }>;
}

interface AnalyticsInsightPayload {
  readonly cards?: ReadonlyArray<{
    readonly id?: string;
    readonly title?: string;
    readonly body?: string;
    readonly emphasis?: string;
  }>;
}

type AnalyticsInsightPayloadCard = NonNullable<AnalyticsInsightPayload["cards"]>[number];

export interface AnalyticsInsightsGenerator {
  generate(summary: AnalyticsSummary): Promise<AnalyticsInsightsResponse>;
}

function buildFallbackCards(): readonly [AnalyticsInsightCard, AnalyticsInsightCard] {
  return [
    {
      id: "summary",
      title: "Operational highlight",
      body: "AI insight summaries are unavailable right now. Review the current analytics cards for the latest system performance snapshot.",
      emphasis: "primary"
    },
    {
      id: "recommendation",
      title: "Recommended action",
      body: "Use contamination, purity, and leaderboard metrics to identify the next location that needs operator follow-up.",
      emphasis: "default"
    }
  ];
}

function createFallbackInsights(model: string, fallbackReason: string): AnalyticsInsightsResponse {
  return {
    generatedAt: new Date().toISOString(),
    model,
    status: "placeholder",
    cards: buildFallbackCards(),
    fallbackReason
  };
}

function trimText(value: string | undefined, fallback: string): string {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : fallback;
}

function normalizeCard(payload: AnalyticsInsightPayloadCard | undefined, fallback: AnalyticsInsightCard): AnalyticsInsightCard {
  const id = payload?.id === "recommendation" ? "recommendation" : fallback.id;
  const emphasis = payload?.emphasis === "default" ? "default" : fallback.emphasis;

  return {
    id,
    title: trimText(payload?.title, fallback.title),
    body: trimText(payload?.body, fallback.body),
    emphasis
  };
}

function normalizeInsightPayload(payload: AnalyticsInsightPayload, model: string): AnalyticsInsightsResponse {
  const fallbackCards = buildFallbackCards();
  const summaryCard = normalizeCard(payload.cards?.[0], fallbackCards[0]);
  const recommendationCard = normalizeCard(payload.cards?.[1], fallbackCards[1]);

  return {
    generatedAt: new Date().toISOString(),
    model,
    status: "ready",
    cards: [summaryCard, recommendationCard]
  };
}

function stringifySummary(summary: AnalyticsSummary): string {
  return JSON.stringify(summary, null, 2);
}

function stripCodeFence(rawText: string): string {
  return rawText
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
}

async function readGeminiText(response: Response): Promise<string> {
  const data = await response.json() as GeminiGenerateContentResponse;
  const parts = data.candidates?.[0]?.content?.parts ?? [];
  return parts
    .map((part) => part.text ?? "")
    .join("")
    .trim();
}

async function readGeminiError(response: Response): Promise<string> {
  const text = await response.text();

  try {
    const parsed = JSON.parse(text) as { error?: { message?: string } };
    const message = parsed.error?.message?.trim();
    if (message) {
      return message;
    }
  } catch {
    // Ignore parse errors and fall through to raw text.
  }

  return text.trim() || `Gemini request failed with ${response.status}.`;
}

function createPrompt(summary: AnalyticsSummary): string {
  return [
    "You are generating two short analytics insight cards for the Binsight operator dashboard.",
    "Use only the analytics data provided below.",
    "Do not invent causes, locations, or operational facts that are not present.",
    "Return valid JSON only.",
    "Return this shape exactly:",
    JSON.stringify({
      cards: [
        {
          id: "summary",
          title: "Operational highlight",
          body: "Short factual summary grounded only in the analytics metrics.",
          emphasis: "primary"
        },
        {
          id: "recommendation",
          title: "Recommended action",
          body: "Short recommendation that is conditional on the provided analytics data.",
          emphasis: "default"
        }
      ]
    }),
    "Constraints:",
    "- Keep each body under 220 characters.",
    "- Keep each title under 40 characters.",
    "- Avoid markdown, bullets, and code fences.",
    "- Keep wording product-facing and concise.",
    "Analytics summary:",
    stringifySummary(summary)
  ].join("\n\n");
}

async function generateWithGemini(apiKey: string, model: string, summary: AnalyticsSummary): Promise<AnalyticsInsightsResponse> {
  const url = `${GEMINI_API_BASE_URL}/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error("Gemini request timed out.")), GEMINI_TIMEOUT_MS);
  });

  const requestPromise = fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 400,
        responseMimeType: "application/json"
      },
      contents: [
        {
          role: "user",
          parts: [
            {
              text: createPrompt(summary)
            }
          ]
        }
      ]
    })
  });

  const response = await Promise.race([requestPromise, timeoutPromise]);
  if (!response.ok) {
    throw new Error(await readGeminiError(response));
  }

  const rawText = await readGeminiText(response);
  if (rawText.length === 0) {
    throw new Error("Gemini returned an empty response.");
  }

  const parsed = JSON.parse(stripCodeFence(rawText)) as AnalyticsInsightPayload;
  return normalizeInsightPayload(parsed, model);
}

export function createAnalyticsInsightsGenerator(config: GeminiAnalyticsInsightsConfig = {}): AnalyticsInsightsGenerator {
  const model = config.model?.trim() || process.env.BINSIGHT_GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;
  const apiKey = config.apiKey?.trim() || process.env.BINSIGHT_GEMINI_API_KEY?.trim();

  return {
    async generate(summary) {
      if (!apiKey) {
        return createFallbackInsights(model, "BINSIGHT_GEMINI_API_KEY is not configured.");
      }

      try {
        return await generateWithGemini(apiKey, model, summary);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown Gemini error.";
        return createFallbackInsights(model, message);
      }
    }
  };
}