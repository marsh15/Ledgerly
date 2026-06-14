import { backendInternalUrl } from "@/lib/api";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  if (!body || typeof body !== "object") {
    return Response.json({ error: "Invalid registration request" }, { status: 400 });
  }

  const response = await fetch(`${backendInternalUrl}/api/auth/register`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: getRequestOrigin(request)
    },
    body: JSON.stringify(body)
  });

  const contentType = response.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json")
    ? await response.json().catch(() => ({ error: "Registration failed" }))
    : { error: await response.text().catch(() => "Registration failed") };

  return Response.json(payload, { status: response.status });
}

function getRequestOrigin(request: Request): string {
  const origin = request.headers.get("origin");
  if (origin) return origin;

  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";
  if (forwardedHost) return `${forwardedProto}://${forwardedHost}`;

  return new URL(request.url).origin;
}
