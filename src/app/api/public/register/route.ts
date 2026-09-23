import bcrypt from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';
import { getGlobalClient, getTenantClient } from '@/lib/prisma-factory';
import { normalizeMemberInput, validateMemberInput } from '@/features/members/lib/member-registration';
import { generateId } from '@/lib/id';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const churchSlug = typeof body.churchSlug === 'string' ? body.churchSlug.trim() : '';

  if (!churchSlug) {
    return NextResponse.json({ error: 'Igreja inválida.' }, { status: 400 });
  }

  const normalized = normalizeMemberInput(body);
  const validationError = validateMemberInput(normalized);

  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  if (!normalized.password || normalized.password.length < 6) {
    return NextResponse.json({ error: 'A senha deve ter pelo menos 6 caracteres.' }, { status: 400 });
  }

  const globalClient = getGlobalClient();
  const church = await globalClient.church.findUnique({
    where: { slug: churchSlug },
  });

  if (!church || !church.active || (church.status && church.status !== 'ACTIVE')) {
    return NextResponse.json({ error: 'Igreja não encontrada.' }, { status: 404 });
  }

  const databaseKey = church.databaseKey ?? church.slug;
  const prisma = getTenantClient(databaseKey);

  const existingMember = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
    `SELECT id FROM "Member" WHERE email = ? AND deletedAt IS NULL LIMIT 1`,
    normalized.email
  );

  if (existingMember.length > 0) {
    return NextResponse.json({ error: 'Este email já está cadastrado.' }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(normalized.password, 10);
  const memberId = generateId();
  const now = new Date().toISOString();

  await prisma.$executeRawUnsafe(
    `
      INSERT INTO "Member" (
        id, name, email, phone, creditBalance, active, approved,
        parentPhone, birthDate, conversionDate, baptismDate, previousChurch,
        aboutMe, maritalStatus, passwordHash, createdAt, updatedAt, deletedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    memberId,
    normalized.name,
    normalized.email,
    normalized.phone,
    0,
    true,
    false,
    normalized.parentPhone ?? null,
    normalized.birthDate?.toISOString() ?? null,
    normalized.conversionDate?.toISOString() ?? null,
    normalized.baptismDate?.toISOString() ?? null,
    normalized.previousChurch ?? null,
    normalized.aboutMe ?? null,
    normalized.maritalStatus ?? null,
    passwordHash,
    now,
    now,
    null
  );

  return NextResponse.json(
    {
      id: memberId,
      approved: false,
      message: 'Cadastro enviado para aprovação.',
    },
    { status: 201 }
  );
}
