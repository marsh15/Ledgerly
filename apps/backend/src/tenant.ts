import { randomUUID } from "node:crypto";
import { HTTPException } from "hono/http-exception";
import { auth } from "./auth";
import { Prisma } from "@prisma/client";
import { prisma } from "./db";
import type { TenantScope } from "./isolation";

export async function getTenantScope(headers: Headers): Promise<TenantScope> {
  const session = await auth.api.getSession({ headers });
  if (!session) throw new HTTPException(401, { message: "Unauthorized" });

  const activeOrganizationId = (session.session as { activeOrganizationId?: string | null }).activeOrganizationId;
  const activeTeamId = (session.session as { activeTeamId?: string | null }).activeTeamId ?? null;
  const userId = session.user.id;

  if (activeOrganizationId) {
    const member = await prisma.member.findFirst({
      where: { userId, organizationId: activeOrganizationId },
      select: { organizationId: true }
    });

    if (member) {
      const teamId = await validatedTeamId(userId, member.organizationId, activeTeamId);
      return {
        userId,
        organizationId: member.organizationId,
        teamId
      };
    }
  }

  const existing = await prisma.member.findFirst({
    where: { userId },
    orderBy: { createdAt: "asc" },
    include: { organization: { include: { teams: { take: 1, orderBy: { createdAt: "asc" } } } } }
  });

  if (existing) {
    const teamId = existing.organization.teams[0]?.id ?? null;
    await prisma.session.updateMany({
      where: { userId },
      data: { activeOrganizationId: existing.organizationId, activeTeamId: teamId }
    });
    return { userId, organizationId: existing.organizationId, teamId };
  }

  return ensurePersonalTenant(session.user);
}

export async function ensurePersonalTenant(user: { id: string; email: string; name: string }): Promise<TenantScope> {
  const existing = await prisma.member.findFirst({
    where: { userId: user.id },
    include: { organization: { include: { teams: { take: 1 } } } }
  });

  if (existing) {
    return {
      userId: user.id,
      organizationId: existing.organizationId,
      teamId: existing.organization.teams[0]?.id ?? null
    };
  }

  const orgId = `personal-${user.id}`;
  const teamId = `personal-team-${user.id}`;
  const memberId = randomUUID();
  const teamMemberId = randomUUID();
  const nameSeed = user.name || user.email.split("@")[0] || "personal";
  const slug = `${slugify(nameSeed)}-${user.id.slice(0, 8)}`;

  try {
    await prisma.$transaction(async (tx) => {
      const concurrent = await tx.member.findFirst({ where: { userId: user.id } });
      if (concurrent) return;
      await tx.organization.create({
        data: {
          id: orgId,
          name: `${nameSeed}'s workspace`,
          slug,
          members: { create: { id: memberId, userId: user.id, role: "owner" } },
          teams: { create: { id: teamId, name: "Personal", members: { create: { id: teamMemberId, userId: user.id } } } }
        }
      });
      await tx.session.updateMany({ where: { userId: user.id }, data: { activeOrganizationId: orgId, activeTeamId: teamId } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || !["P2002", "P2034"].includes(error.code)) throw error;
  }

  const provisioned = await prisma.member.findFirst({
    where: { userId: user.id },
    include: { organization: { include: { teams: { where: { members: { some: { userId: user.id } } }, take: 1 } } } }
  });
  if (!provisioned) throw new Error("Unable to provision personal workspace");

  const resolvedTeamId = provisioned.organization.teams[0]?.id ?? null;
  await prisma.session.updateMany({
    where: { userId: user.id },
    data: { activeOrganizationId: provisioned.organizationId, activeTeamId: resolvedTeamId }
  });

  return { userId: user.id, organizationId: provisioned.organizationId, teamId: resolvedTeamId };
}

async function validatedTeamId(userId: string, organizationId: string, teamId: string | null): Promise<string | null> {
  if (!teamId) return null;
  const membership = await prisma.teamMember.findFirst({
    where: { userId, teamId, team: { organizationId } },
    select: { teamId: true }
  });
  return membership?.teamId ?? null;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40) || "personal";
}
