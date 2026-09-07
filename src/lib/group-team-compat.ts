import { PrismaClient } from '@prisma/client';
import { generateId } from '@/lib/id';
import { parseJsonField } from '@/lib/groups';

type TeamRow = {
  id: string;
  name: string;
  description: string | null;
  color: string;
  icon: string;
  leaderIds: string | null;
};

type GroupRow = {
  id: string;
  name: string;
  description: string | null;
  color: string;
  icon: string;
  capabilities: string | null;
};

function normalizeIds(value: string | null | undefined) {
  if (!value) return [] as string[];
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

export async function ensureGroupTeamCompatibility(prisma: PrismaClient) {
  const now = new Date().toISOString();
  const teams = await prisma.$queryRawUnsafe<TeamRow[]>(
    `SELECT id, name, description, color, icon, leaderIds FROM "Team" WHERE deletedAt IS NULL`
  );

  for (const team of teams) {
    const [existingGroup] = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `SELECT id FROM "Group" WHERE id = ? AND deletedAt IS NULL LIMIT 1`,
      team.id
    );

    if (!existingGroup) {
      await prisma.$executeRawUnsafe(
        `
          INSERT INTO "Group" (id, name, description, type, capabilities, color, icon, active, createdAt, updatedAt, deletedAt)
          VALUES (?, ?, ?, 'team', '[]', ?, ?, 1, ?, ?, NULL)
        `,
        team.id,
        team.name,
        team.description,
        team.color,
        team.icon,
        now,
        now
      );

      const leaderIds = normalizeIds(team.leaderIds);
      const members = await prisma.$queryRawUnsafe<Array<{ id: string; teamIds: string | null }>>(
        `SELECT id, teamIds FROM "Member" WHERE deletedAt IS NULL`
      );

      for (const member of members) {
        const teamIds = normalizeIds(member.teamIds);
        if (!teamIds.includes(team.id)) continue;

        await prisma.$executeRawUnsafe(
          `
            INSERT INTO "GroupMember" (id, groupId, memberId, role, createdAt, updatedAt, deletedAt)
            VALUES (?, ?, ?, ?, ?, ?, NULL)
          `,
          generateId(),
          team.id,
          member.id,
          leaderIds.includes(member.id) ? 'leader' : 'member',
          now,
          now
        );
      }
    }
  }

  const groups = await prisma.$queryRawUnsafe<GroupRow[]>(
    `SELECT id, name, description, color, icon, capabilities FROM "Group" WHERE type = 'team' AND deletedAt IS NULL`
  );

  for (const group of groups) {
    const [existingTeam] = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `SELECT id FROM "Team" WHERE id = ? AND deletedAt IS NULL LIMIT 1`,
      group.id
    );

    const memberships = await prisma.$queryRawUnsafe<Array<{ memberId: string; role: string }>>(
      `SELECT memberId, role FROM "GroupMember" WHERE groupId = ? AND deletedAt IS NULL`,
      group.id
    );

    const leaderIds = memberships
      .filter((membership) => ['leader', 'responsible'].includes(membership.role))
      .map((membership) => membership.memberId);

    if (!existingTeam) {
      await prisma.$executeRawUnsafe(
        `
          INSERT INTO "Team" (id, name, description, color, icon, leaderIds, createdAt, updatedAt, deletedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL)
        `,
        group.id,
        group.name,
        group.description,
        group.color,
        group.icon,
        leaderIds.join(','),
        now,
        now
      );
    } else {
      await prisma.$executeRawUnsafe(
        `
          UPDATE "Team"
          SET name = ?, description = ?, color = ?, icon = ?, leaderIds = ?, updatedAt = ?
          WHERE id = ? AND deletedAt IS NULL
        `,
        group.name,
        group.description,
        group.color,
        group.icon,
        leaderIds.join(','),
        now,
        group.id
      );
    }

    const members = await prisma.$queryRawUnsafe<Array<{ id: string; teamIds: string | null }>>(
      `SELECT id, teamIds FROM "Member" WHERE deletedAt IS NULL`
    );

    const memberIds = memberships.map((membership) => membership.memberId);
    for (const member of members) {
      const current = normalizeIds(member.teamIds);
      const next = memberIds.includes(member.id)
        ? Array.from(new Set([...current.filter((teamId) => teamId !== group.id), group.id]))
        : current.filter((teamId) => teamId !== group.id);

      if (next.join(',') !== current.join(',')) {
        await prisma.$executeRawUnsafe(
          `UPDATE "Member" SET "teamIds" = ?, "updatedAt" = ? WHERE id = ?`,
          next.length > 0 ? next.join(',') : null,
          now,
          member.id
        );
      }
    }
  }
}

export async function upsertCanonicalTeamGroup(
  prisma: PrismaClient,
  payload: {
    id: string;
    name: string;
    description?: string | null;
    color: string;
    icon: string;
    memberIds: string[];
    leaderIds: string[];
  }
) {
  const now = new Date().toISOString();
  const [existingGroup] = await prisma.$queryRawUnsafe<Array<{ id: string; capabilities: string | null }>>(
    `SELECT id, capabilities FROM "Group" WHERE id = ? AND deletedAt IS NULL LIMIT 1`,
    payload.id
  );

  if (existingGroup) {
    await prisma.$executeRawUnsafe(
      `
        UPDATE "Group"
        SET name = ?, description = ?, type = 'team', color = ?, icon = ?, updatedAt = ?
        WHERE id = ? AND deletedAt IS NULL
      `,
      payload.name,
      payload.description ?? null,
      payload.color,
      payload.icon,
      now,
      payload.id
    );
  } else {
    await prisma.$executeRawUnsafe(
      `
        INSERT INTO "Group" (id, name, description, type, capabilities, color, icon, active, createdAt, updatedAt, deletedAt)
        VALUES (?, ?, ?, 'team', '[]', ?, ?, 1, ?, ?, NULL)
      `,
      payload.id,
      payload.name,
      payload.description ?? null,
      payload.color,
      payload.icon,
      now,
      now
    );
  }

  await prisma.$executeRawUnsafe(
    `UPDATE "GroupMember" SET deletedAt = ?, updatedAt = ? WHERE groupId = ? AND deletedAt IS NULL`,
    now,
    now,
    payload.id
  );

  for (const memberId of payload.memberIds) {
    await prisma.$executeRawUnsafe(
      `
        INSERT INTO "GroupMember" (id, groupId, memberId, role, createdAt, updatedAt, deletedAt)
        VALUES (?, ?, ?, ?, ?, ?, NULL)
      `,
      generateId(),
      payload.id,
      memberId,
      payload.leaderIds.includes(memberId) ? 'leader' : 'member',
      now,
      now
    );
  }

  await ensureGroupTeamCompatibility(prisma);
}

export async function softDeleteCanonicalTeamGroup(prisma: PrismaClient, id: string) {
  const now = new Date().toISOString();
  await prisma.$executeRawUnsafe(`UPDATE "Group" SET deletedAt = ?, updatedAt = ? WHERE id = ? AND type = 'team'`, now, now, id);
  await prisma.$executeRawUnsafe(`UPDATE "GroupMember" SET deletedAt = ?, updatedAt = ? WHERE groupId = ? AND deletedAt IS NULL`, now, now, id);
  await prisma.$executeRawUnsafe(`UPDATE "Team" SET deletedAt = ?, updatedAt = ? WHERE id = ? AND deletedAt IS NULL`, now, now, id);

  const members = await prisma.$queryRawUnsafe<Array<{ id: string; teamIds: string | null }>>(
    `SELECT id, teamIds FROM "Member" WHERE deletedAt IS NULL`
  );

  for (const member of members) {
    const current = normalizeIds(member.teamIds);
    const next = current.filter((teamId) => teamId !== id);
    if (next.join(',') !== current.join(',')) {
      await prisma.$executeRawUnsafe(
        `UPDATE "Member" SET "teamIds" = ?, "updatedAt" = ? WHERE id = ?`,
        next.length > 0 ? next.join(',') : null,
        now,
        member.id
      );
    }
  }
}

export function parseLeaderIds(value: string | null | undefined) {
  return normalizeIds(value);
}

export function parseCapabilities(value: string | null | undefined) {
  return parseJsonField<string[]>(value, []);
}
