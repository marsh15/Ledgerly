import { auth } from "./auth";
import { env } from "./env";
import { ensurePersonalTenant } from "./tenant";

const users = [
  { name: "Asha Demo", email: "asha@example.com", password: "Password123!" },
  { name: "Rohan Demo", email: "rohan@example.com", password: "Password123!" }
];

for (const user of users) {
  const response = await auth.handler(
    new Request(new URL("/api/auth/sign-up/email", env.betterAuthUrl), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(user)
    })
  );

  const payload = await response.json().catch(() => null) as { user?: { id: string; email: string; name: string } } | null;
  if (payload?.user) {
    await ensurePersonalTenant(payload.user);
    console.log(`Seeded ${user.email}`);
  } else {
    console.log(`Skipped ${user.email}; it may already exist.`);
  }
}

process.exit(0);
