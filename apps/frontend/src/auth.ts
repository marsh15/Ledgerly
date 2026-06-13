import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { backendInternalUrl } from "@/lib/api";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60
  },
  pages: {
    signIn: "/login"
  },
  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {}
      },
      async authorize(credentials) {
        const email = String(credentials?.email ?? "");
        const password = String(credentials?.password ?? "");

        const response = await fetch(`${backendInternalUrl}/api/auth/login`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email, password })
        });

        if (!response.ok) return null;
        const payload = await response.json() as {
          user?: { id: string; email: string; name: string };
          token?: string | null;
          jwt?: string | null;
        };

        if (!payload.user || !payload.token) return null;

        const user = {
          id: payload.user.id,
          email: payload.user.email,
          name: payload.user.name,
          backendToken: payload.token
        };

        if (payload.jwt) return { ...user, backendJwt: payload.jwt };
        return user;
      }
    })
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        if (typeof user.backendToken === "string") token.backendToken = user.backendToken;
        if (typeof user.backendJwt === "string") token.backendJwt = user.backendJwt;
      }
      return token;
    },
    session({ session, token }) {
      if (typeof token.backendToken === "string") session.backendToken = token.backendToken;
      if (typeof token.backendJwt === "string") session.backendJwt = token.backendJwt;
      return session;
    }
  }
});
