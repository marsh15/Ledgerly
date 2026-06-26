import NextAuth, { CredentialsSignin } from "next-auth";
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
        const backendInternalUrl = resolveBackendInternalUrl();
        const frontendOrigin = resolveFrontendOrigin();
        const mode = String(credentials?.mode ?? "login") === "register" ? "register" : "login";
        const name = String(credentials?.name ?? "").trim();
        const email = String(credentials?.email ?? "").trim().toLowerCase();
        const password = String(credentials?.password ?? "");
        const authPath = mode === "register" ? "/api/auth/register" : "/api/auth/login";
        const body =
          mode === "register"
            ? { name: name || email.split("@")[0], email, password }
            : { email, password };

        if (!backendInternalUrl || !frontendOrigin) {
          console.error("Backend credential auth is not configured. Set BACKEND_INTERNAL_URL or NEXT_PUBLIC_BACKEND_URL, plus AUTH_URL or FRONTEND_URL.");
          throw new BackendUnconfiguredError();
        }

        const response = await callBackendAuth(`${backendInternalUrl}${authPath}`, body, frontendOrigin);

        if (!response.ok) {
          const backendError = await readBackendAuthError(response);
          console.error("Backend credential auth failed", {
            mode,
            status: response.status,
            message: backendError.raw
          });
          if (mode === "register" && isDuplicateEmailMessage(backendError.message)) {
            throw new DuplicateEmailError();
          }
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
        if (typeof user.name === "string") token.name = user.name;
        if (typeof user.email === "string") token.email = user.email;
        if (typeof user.backendToken === "string") token.backendToken = user.backendToken;
        if (typeof user.backendJwt === "string") token.backendJwt = user.backendJwt;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        if (typeof token.sub === "string") session.user.id = token.sub;
        if (typeof token.name === "string") session.user.name = token.name;
        if (typeof token.email === "string") session.user.email = token.email;
      }
      if (typeof token.backendToken === "string") session.backendToken = token.backendToken;
      if (typeof token.backendJwt === "string") session.backendJwt = token.backendJwt;
      return session;
    }
  }
});

async function callBackendAuth(url: string, body: unknown, frontendOrigin: string): Promise<Response> {
  try {
    return await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: frontendOrigin
      },
      body: JSON.stringify(body)
    });
  } catch (error) {
    console.error("Backend credential auth request failed", {
      message: error instanceof Error ? error.message : "Unknown network error"
    });
    throw new BackendUnreachableError();
  }
}

function resolveBackendInternalUrl(): string | undefined {
  const configuredUrl =
    normalizeUrl(process.env.BACKEND_INTERNAL_URL) ??
    normalizeUrl(process.env.NEXT_PUBLIC_BACKEND_URL) ??
    normalizeUrl(process.env.NEXT_PUBLIC_API_URL);
  if (configuredUrl) return configuredUrl;
  if (process.env.NODE_ENV === "production") return undefined;
  return "http://localhost:4000";
}

function resolveFrontendOrigin(): string | undefined {
  const configuredUrl = normalizeUrl(process.env.AUTH_URL) ?? normalizeUrl(process.env.FRONTEND_URL);
  if (configuredUrl) return configuredUrl;
  if (process.env.NODE_ENV === "production") return undefined;
  return "http://localhost:3000";
}

function normalizeUrl(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  return trimmed.replace(/\/+$/, "");
}

async function readBackendAuthError(response: Response): Promise<{ message: string; raw: string }> {
  const raw = await response.text().catch(() => "");
  try {
    const payload = JSON.parse(raw) as { error?: { message?: unknown } | string; message?: unknown };
    const message =
      typeof payload.error === "string"
        ? payload.error
        : typeof payload.error?.message === "string"
          ? payload.error.message
          : typeof payload.message === "string"
            ? payload.message
            : raw;
    return { message, raw };
  } catch {
    return { message: raw, raw };
  }
}

function isDuplicateEmailMessage(message: string): boolean {
  const normalized = message.toLowerCase();
  return normalized.includes("already") || normalized.includes("exist");
}

class BackendUnconfiguredError extends CredentialsSignin {
  code = "auth_backend_unconfigured";
}

class BackendUnreachableError extends CredentialsSignin {
  code = "auth_backend_unreachable";
}

class DuplicateEmailError extends CredentialsSignin {
  code = "auth_duplicate_email";
}
