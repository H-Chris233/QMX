import { MembershipStatus } from '@/types';

interface StudentJson {
  uid?: number;
  name?: string;
  age?: number | null;
  phone?: string;
  class?: string;
  subject?: string;
  rings?: number[];
  note?: string;
  lessonLeft?: number | null;
  lesson_left?: number | null;
  membershipStartDate?: string | Date | null;
  membership_start_date?: string | null;
  membershipEndDate?: string | Date | null;
  membership_end_date?: string | null;
  membershipDaysRemaining?: number | null;
  membership_days_remaining?: number | null;
  isMembershipActive?: boolean;
  is_membership_active?: boolean;
  membershipStatus?: MembershipStatus;
  membership_status?: MembershipStatus;
  createdAt?: Date | string | null;
  created_at?: string | null;
  updatedAt?: Date | string | null;
  updated_at?: string | null;
}

export interface PresentedStudent {
  uid: number;
  name: string;
  age: number | null;
  phone: string;
  class: string;
  classType: string;
  subject: string;
  rings: number[];
  note: string;
  lessonLeft: number | null;
  membershipStartDate: string | null;
  membershipEndDate: string | null;
  membershipDaysRemaining: number | null;
  isMembershipActive: boolean;
  membershipStatus: MembershipStatus;
  createdAt: Date | string | null;
  updatedAt: Date | string | null;
  lesson_left: number | null;
  membership_start_date: string | null;
  membership_end_date: string | null;
  membership_days_remaining: number | null;
  is_membership_active: boolean;
  membership_status: MembershipStatus;
  created_at: string | null;
  updated_at: string | null;
}

type StudentPresentable = PresentedStudent | StudentJson | (Partial<StudentJson> & Record<string, unknown>);

const formatDateOnly = (value: Date | string | null | undefined): string | null => {
  if (!value) {
    return null;
  }
  const date = typeof value === 'string' ? new Date(value) : value;
  const iso = date.toISOString();
  return iso.split('T')[0] ?? null;
};

const formatDateTime = (value: Date | string | null | undefined): string | null => {
  if (!value) {
    return null;
  }
  const date = typeof value === 'string' ? new Date(value) : value;
  return date.toISOString();
};

const determineMembershipStatus = (
  membershipStartDate: Date | string | null,
  membershipEndDate: Date | string | null
): MembershipStatus => {
  if (!membershipStartDate || !membershipEndDate) {
    return MembershipStatus.NONE;
  }

  const start = typeof membershipStartDate === 'string' ? new Date(membershipStartDate) : membershipStartDate;
  const end = typeof membershipEndDate === 'string' ? new Date(membershipEndDate) : membershipEndDate;
  const now = new Date();

  if (now < start) {
    return MembershipStatus.UPCOMING;
  }
  if (now > end) {
    return MembershipStatus.EXPIRED;
  }
  return MembershipStatus.ACTIVE;
};

const getMembershipDaysRemaining = (
  membershipEndDate: Date | string | null
): number | null => {
  if (!membershipEndDate) {
    return null;
  }

  const end = typeof membershipEndDate === 'string' ? new Date(membershipEndDate) : membershipEndDate;
  const now = new Date();

  const msPerDay = 1000 * 60 * 60 * 24;
  const diffTime = end.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / msPerDay);

  return diffDays >= 0 ? diffDays : 0;
};

const hasMembership = (
  membershipStartDate: Date | string | null,
  membershipEndDate: Date | string | null
): boolean => {
  const status = determineMembershipStatus(membershipStartDate, membershipEndDate);
  return status === MembershipStatus.ACTIVE;
};

export const presentStudent = (student: StudentPresentable): PresentedStudent => {
  const json = student as StudentJson;

  const lessonLeft = json.lessonLeft ?? json.lesson_left ?? null;
  const membershipStartDate = json.membershipStartDate
    ?? json.membership_start_date
    ?? formatDateOnly(student.membershipStartDate ?? null);
  const membershipEndDate = json.membershipEndDate
    ?? json.membership_end_date
    ?? formatDateOnly(student.membershipEndDate ?? null);
  const membershipDaysRemaining = json.membershipDaysRemaining
    ?? json.membership_days_remaining
    ?? getMembershipDaysRemaining(student.membershipEndDate ?? null);
  const membershipStatus = json.membershipStatus
    ?? json.membership_status
    ?? determineMembershipStatus(student.membershipStartDate ?? null, student.membershipEndDate ?? null);
  const isMembershipActive = json.isMembershipActive
    ?? json.is_membership_active
    ?? hasMembership(student.membershipStartDate ?? null, student.membershipEndDate ?? null);

  const createdAt = student.createdAt ? formatDateTime(student.createdAt) : null;
  const updatedAt = student.updatedAt ? formatDateTime(student.updatedAt) : null;
  const created_at = json.created_at ?? createdAt;
  const updated_at = json.updated_at ?? updatedAt;

  // 处理 rings - 可能是数组或 undefined
  const rings = Array.isArray(json.rings) ? json.rings : [];

  return {
    uid: json.uid ?? 0,
    name: json.name ?? '',
    age: json.age ?? null,
    phone: json.phone ?? '',
    class: json.class ?? json.classType ?? '',
    classType: json.classType ?? json.class ?? '',
    subject: json.subject ?? '',
    rings,
    note: json.note ?? '',
    lessonLeft,
    membershipStartDate,
    membershipEndDate,
    membershipDaysRemaining,
    isMembershipActive,
    membershipStatus,
    createdAt: json.createdAt ?? student.createdAt ?? null,
    updatedAt: json.updatedAt ?? student.updatedAt ?? null,
    lesson_left: lessonLeft,
    membership_start_date: membershipStartDate,
    membership_end_date: membershipEndDate,
    membership_days_remaining: membershipDaysRemaining,
    is_membership_active: isMembershipActive,
    membership_status: membershipStatus,
    created_at: created_at,
    updated_at: updated_at,
  };
};
