import { auth } from "./auth";
import { demoUsers } from "./demo-users";
import { env } from "./env";
import { prisma } from "./db";
import { ensurePersonalTenant } from "./tenant";

for (const user of demoUsers) {
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
    const existing = await prisma.user.findUnique({
      where: { email: user.email },
      select: { id: true, email: true, name: true }
    });

    if (existing) {
      await ensurePersonalTenant(existing);
      console.log(`Repaired tenant for existing demo user ${user.email}`);
    } else {
      console.log(`Skipped ${user.email}; seed failed and no existing user was found.`);
    }
  }
}

await prisma.$disconnect();
process.exit(0);
