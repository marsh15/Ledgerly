import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

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
        mode: {},
        name: {},
        email: {},
        password: {}
      },
      async authorize(credentials) {
        const backendInternalUrl =
          process.env.BACKEND_INTERNAL_URL ??
          process.env.NEXT_PUBLIC_BACKEND_URL ??
          process.env.NEXT_PUBLIC_API_URL ??
          "http://localhost:4000";
        const frontendOrigin =
          process.env.AUTH_URL ??
          process.env.FRONTEND_URL ??
          "http://localhost:3000";
        const mode = String(credentials?.mode ?? "login") === "register" ? "register" : "login";
        const name = String(credentials?.name ?? "").trim();
        const email = String(credentials?.email ?? "").trim().toLowerCase();
        const password = String(credentials?.password ?? "");
        const authPath = mode === "register" ? "/api/auth/register" : "/api/auth/login";
        const body =
          mode === "register"
            ? { name: name || email.split("@")[0], email, password }
            : { email, password };

        let response = await fetch(`${backendInternalUrl}${authPath}`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            origin: frontendOrigin
          },
          body: JSON.stringify(body)
        });

        let failedRegisterMessage = "";
        if (!response.ok && mode === "register") {
          failedRegisterMessage = await response.clone().text().catch(() => "");
          if (isAlreadyRegisteredMessage(failedRegisterMessage)) {
            response = await fetch(`${backendInternalUrl}/api/auth/login`, {
              method: "POST",
              headers: {
                "content-type": "application/json",
                origin: frontendOrigin
              },
              body: JSON.stringify({ email, password })
            });
          }
        }

        if (!response.ok) {
          const message = failedRegisterMessage || (await response.text().catch(() => ""));
          console.error("Backend credential auth failed", {
            mode,
            status: response.status,
            backendInternalUrl,
            message
          });
          return null;
        }

        const payload = await response.json() as {
          user?: { id: string; email: string; name: string };
          token?: string | null;
          jwt?: string | null;
        };

        if (!payload.user || !payload.token) {
          console.error("Backend credential login returned an incomplete payload", {
            hasUser: Boolean(payload.user),
            hasToken: Boolean(payload.token)
          });
          return null;
        }

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

function isAlreadyRegisteredMessage(message: string): boolean {
  const normalized = message.toLowerCase();
  return normalized.includes("already") || normalized.includes("exist");
}
