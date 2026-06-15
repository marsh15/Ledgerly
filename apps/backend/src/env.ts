import "dotenv/config";

const nodeEnv = process.env.NODE_ENV ?? "development";
const isProduction = nodeEnv === "production";

export const env = {
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: required("DATABASE_URL"),
  betterAuthSecret: required("BETTER_AUTH_SECRET"),
  betterAuthUrl: originSetting("BETTER_AUTH_URL", "http://localhost:4000"),
  frontendOrigins: frontendOrigins()
};

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable ${name}`);
  return value;
}

function parseOrigins(value: string): string[] {
  return value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function originSetting(name: string, developmentFallback: string): string {
  const value = process.env[name]?.trim() || (isProduction ? undefined : developmentFallback);
  if (!value) throw new Error(`Missing required environment variable ${name}`);
  const normalized = value.replace(/\/+$/, "");
  rejectLocalhostInProduction(name, normalized);
  return normalized;
}

function frontendOrigins(): string[] {
  const configuredValue = process.env.FRONTEND_ORIGINS ?? process.env.FRONTEND_ORIGIN ?? process.env.FRONTEND_URL;
  const origins = parseOrigins(configuredValue ?? (isProduction ? "" : "http://localhost:3000")).map((origin) => origin.replace(/\/+$/, ""));
  if (origins.length === 0) {
    throw new Error("Missing required environment variable FRONTEND_ORIGINS, FRONTEND_ORIGIN, or FRONTEND_URL");
  }
  for (const origin of origins) {
    rejectLocalhostInProduction("FRONTEND_ORIGINS", origin);
  }
  return origins;
}

function rejectLocalhostInProduction(name: string, origin: string): void {
  if (!isProduction) return;
  const url = new URL(origin);
  if (url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "::1") {
    throw new Error(`${name} must use a deployed origin in production, not ${origin}`);
  }
}
