import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { bearer, jwt, organization } from "better-auth/plugins";
import { prisma } from "./db";
import { env } from "./env";

export const auth = betterAuth({
  appName: "Ledgerly",
  secret: env.betterAuthSecret,
  baseURL: env.betterAuthUrl,
  trustedOrigins: [env.frontendOrigin],
  database: prismaAdapter(prisma, {
    provider: "postgresql"
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24
  },
  plugins: [
    organization({
      teams: {
        enabled: true,
        maximumTeams: 1
      }
    }),
    bearer(),
    jwt()
  ],
  experimental: {
    joins: true
  }
});

export type AuthSession = typeof auth.$Infer.Session;
