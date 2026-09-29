export interface MemberFormMember {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  parentPhone?: string | null;
  birthDate?: string | null;
  conversionDate?: string | null;
  baptismDate?: string | null;
  previousChurch?: string | null;
  aboutMe?: string | null;
  maritalStatus?: string | null;
  approved?: boolean;
}
