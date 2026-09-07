/**
 * Utilitários de normalização para cadastro e edição de membros.
 */

export type MaritalStatus = 'single' | 'married' | 'divorced' | 'widowed';

export interface MemberFormInput {
  name: string;
  email: string;
  phone: string;
  parentPhone?: string;
  birthDate?: string;
  conversionDate?: string;
  baptismDate?: string;
  previousChurch?: string;
  aboutMe?: string;
  maritalStatus?: MaritalStatus;
  approved?: boolean;
  password?: string;
}

const normalizeString = (value: unknown) => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const normalizeDate = (value: unknown) => {
  if (typeof value !== 'string' || value.trim().length === 0) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
};

export function normalizeMemberInput(input: Record<string, unknown>) {
  return {
    name: normalizeString(input.name) ?? '',
    email: (normalizeString(input.email) ?? '').toLowerCase(),
    phone: normalizeString(input.phone) ?? '',
    parentPhone: normalizeString(input.parentPhone),
    birthDate: normalizeDate(input.birthDate),
    conversionDate: normalizeDate(input.conversionDate),
    baptismDate: normalizeDate(input.baptismDate),
    previousChurch: normalizeString(input.previousChurch),
    aboutMe: normalizeString(input.aboutMe),
    maritalStatus: normalizeString(input.maritalStatus) as MaritalStatus | undefined,
    approved: typeof input.approved === 'boolean' ? input.approved : undefined,
    password: normalizeString(input.password),
  };
}

export function validateMemberInput(input: ReturnType<typeof normalizeMemberInput>) {
  if (!input.name || !input.email || !input.phone) {
    return 'Nome, email e telefone são obrigatórios.';
  }

  return null;
}
