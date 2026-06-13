export const apiUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
export const backendInternalUrl = process.env.BACKEND_INTERNAL_URL ?? apiUrl;

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
