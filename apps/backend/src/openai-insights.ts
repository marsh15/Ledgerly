import OpenAI from "openai";
import { z } from "zod";
import type { AnalyticsSummary } from "./analytics";
import type { SubscriptionCandidate } from "./subscriptions";
import { env } from "./env";

export type InsightCard = {
  title: string;
  summary: string;
  severity: "info" | "warning" | "positive";
  metric: string;
};

const insightResponseSchema = z.object({
  insights: z.array(z.object({
    title: z.string().min(1).max(80),
    summary: z.string().min(1).max(260),
    severity: z.enum(["info", "warning", "positive"]),
    metric: z.string().min(1).max(80)
  })).max(4)
});

export async function generateSpendingInsights(input: {
  summary: AnalyticsSummary;
  subscriptions: SubscriptionCandidate[];
  context?: Record<string, string | number | undefined>;
}): Promise<InsightCard[]> {
  if (!env.aiInsightsEnabled) {
    throw new InsightConfigError("AI insights are disabled.");
  }
  if (!env.openaiApiKey) {
    throw new InsightConfigError("AI insights are not configured.");
  }
  if (input.summary.transactionCount < 3) {
    return [];
  }

  const client = new OpenAI({ apiKey: env.openaiApiKey });
  const response = await client.responses.create({
    model: env.openaiModel,
    input: [
      {
        role: "system",
        content: "You are Ledgerly's private finance analyst. Use only the aggregate JSON supplied. Never claim access to raw transaction text, SMS content, account numbers, or user identity."
      },
      {
        role: "user",
        content: JSON.stringify({
          context: input.context ?? {},
          aggregateSummary: input.summary,
          recurringCandidates: input.subscriptions
        })
      }
    ],
    text: {
      format: {
        type: "json_schema",
        name: "ledgerly_insights",
        schema: {
          type: "object",
          additionalProperties: false,
          required: ["insights"],
          properties: {
            insights: {
              type: "array",
              maxItems: 4,
              items: {
                type: "object",
                additionalProperties: false,
                required: ["title", "summary", "severity", "metric"],
                properties: {
                  title: { type: "string" },
                  summary: { type: "string" },
                  severity: { type: "string", enum: ["info", "warning", "positive"] },
                  metric: { type: "string" }
                }
              }
            }
          }
        }
      }
    }
  });

  const parsed = insightResponseSchema.parse(JSON.parse(response.output_text));
  return parsed.insights;
}

export class InsightConfigError extends Error {}
