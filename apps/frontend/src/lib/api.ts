const localBackendUrl = "http://localhost:4000";

export const apiUrl = resolveBrowserBackendUrl();
export const backendInternalUrl = normalizeUrl(process.env.BACKEND_INTERNAL_URL) ?? apiUrl;

function resolveBrowserBackendUrl(): string {
  const configuredUrl = normalizeUrl(process.env.NEXT_PUBLIC_BACKEND_URL) ?? normalizeUrl(process.env.NEXT_PUBLIC_API_URL);
  if (configuredUrl) return configuredUrl;

  if (process.env.NODE_ENV === "production") {
    throw new Error("Missing NEXT_PUBLIC_BACKEND_URL or NEXT_PUBLIC_API_URL for Ledgerly production auth/API calls.");
  }

  return localBackendUrl;
}

function normalizeUrl(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  return trimmed.replace(/\/+$/, "");
}

export async function apiFetch<T>(path: string, token: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
      ...init.headers
    },
    credentials: "include"
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({ error: "Request failed" }));
    throw new Error(typeof payload.error === "object" ? payload.error.message : payload.error ?? "Request failed");
  }

  return response.json() as Promise<T>;
}

export async function apiText(path: string, token: string): Promise<string> {
  const response = await fetch(`${apiUrl}${path}`, {
    headers: {
      authorization: `Bearer ${token}`
    },
    credentials: "include"
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({ error: "Request failed" }));
    throw new Error(typeof payload.error === "object" ? payload.error.message : payload.error ?? "Request failed");
  }

  return response.text();
}
