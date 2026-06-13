import "dotenv/config";

export const env = {
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: required("DATABASE_URL"),
  betterAuthSecret: required("BETTER_AUTH_SECRET"),
  betterAuthUrl: process.env.BETTER_AUTH_URL ?? "http://localhost:4000",
  frontendOrigin: process.env.FRONTEND_ORIGIN ?? process.env.FRONTEND_URL ?? "http://localhost:3000"
};

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable ${name}`);
  return value;
}
