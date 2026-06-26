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
  const currencyContext = buildCurrencyContext(input.summary);
  const response = await client.responses.create({
    model: env.openaiModel,
    input: [
      {
        role: "system",
        content: [
          "You are Ledgerly's private finance analyst.",
          "Use only the aggregate JSON supplied.",
          "Never claim access to raw transaction text, SMS content, account numbers, or user identity.",
          "Money formatting is mandatory: use the supplied currencyContext, never default to dollars.",
          "If all data uses one currency, format every monetary value with that currency symbol.",
          "If multiple currencies are present, do not convert or add them together in prose; name the currency for each monetary amount."
        ].join(" ")
      },
      {
        role: "user",
        content: JSON.stringify({
          context: input.context ?? {},
          currencyContext,
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
  return normalizeInsightCurrency(parsed.insights, currencyContext);
}

export class InsightConfigError extends Error {}

function buildCurrencyContext(summary: AnalyticsSummary) {
  const currencies = summary.currencySummaries.map((item) => ({
    currencyCode: item.currencyCode,
    symbol: currencySymbol(item.currencyCode),
    example: `${currencySymbol(item.currencyCode)}1,234.56`,
    count: item.totals.debitCount + item.totals.creditCount
  }));
  const primaryCurrencyCode = currencies[0]?.currencyCode ?? "INR";

  return {
    primaryCurrencyCode,
    primarySymbol: currencySymbol(primaryCurrencyCode),
    isMixedCurrency: currencies.length > 1,
    currencies,
    instruction:
      currencies.length > 1
        ? "This filtered dataset has multiple currencies. Do not convert or combine currencies in prose. Format each amount with its own currency symbol and code when needed."
        : `Format all monetary values with ${currencySymbol(primaryCurrencyCode)} for ${primaryCurrencyCode}.`
  };
}

function currencySymbol(currencyCode: string): string {
  if (currencyCode === "INR") return "₹";
  if (currencyCode === "USD") return "$";
  if (currencyCode === "EUR") return "€";
  if (currencyCode === "GBP") return "£";
  return `${currencyCode} `;
}

function normalizeInsightCurrency(insights: InsightCard[], currencyContext: ReturnType<typeof buildCurrencyContext>): InsightCard[] {
  if (currencyContext.isMixedCurrency || currencyContext.primaryCurrencyCode === "USD") return insights;
  const symbol = currencyContext.primarySymbol;
  return insights.map((insight) => ({
    ...insight,
    summary: insight.summary
      .replace(/\$(?=\d)/g, symbol)
      .replace(/\bUS dollars?\b/gi, currencyContext.primaryCurrencyCode === "INR" ? "rupees" : currencyContext.primaryCurrencyCode)
      .replace(/\bdollars?\b/gi, currencyContext.primaryCurrencyCode === "INR" ? "rupees" : currencyContext.primaryCurrencyCode)
  }));
}
