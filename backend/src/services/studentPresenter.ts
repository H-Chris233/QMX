import { MembershipStatus, SubjectType } from '@/types';
import { normalizeScoreDetails, scoreDetailsToRings } from './scoreDetails';
import type { ScoreDetail } from '@/db/schema/students';

interface StudentJson {
  uid?: number;
  name?: string;
  age?: number | null;
  phone?: string;
  class?: string;
  classType?: string;
  subject?: string;
  rings?: number[];
  scoreDetails?: unknown[];
  score_details?: unknown[];
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
  score_details: ScoreDetail[];
  averageScore: number;
  note: string;
  lessonLeft: number | null;
  membershipStartDate: string | null;
  membershipEndDate: string | null;
  membershipDaysRemaining: number | null;
  isMembershipActive: boolean;
  membershipStatus: MembershipStatus;
  createdAt: string | null;
  updatedAt: string | null;
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
  membershipEndDate: Date | string | null,
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
  membershipEndDate: Date | string | null,
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
  membershipEndDate: Date | string | null,
): boolean => {
  const status = determineMembershipStatus(membershipStartDate, membershipEndDate);
  return status === MembershipStatus.ACTIVE;
};

export const presentStudent = (student: StudentPresentable): PresentedStudent => {
  const json = student as StudentJson;

  const resolvedClassType =
    json.classType
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ?? (student as any).classType
    ?? json.class
    ?? '';
  const resolvedClass = json.class ?? resolvedClassType;
  const resolvedSubject =
    json.subject
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ?? (student as any).subject
    ?? '';
  const resolvedSubjectType = (
    typeof resolvedSubject === 'string' && resolvedSubject.trim()
      ? resolvedSubject.trim().toUpperCase()
      : SubjectType.SHOOTING
  ) as SubjectType;

  const lessonLeft = json.lessonLeft ?? json.lesson_left ?? null;
  const membershipStartDate = formatDateOnly(
    json.membershipStartDate ?? json.membership_start_date ?? student.membershipStartDate ?? null,
  );
  const membershipEndDate = formatDateOnly(
    json.membershipEndDate ?? json.membership_end_date ?? student.membershipEndDate ?? null,
  );
  const membershipDaysRemaining = json.membershipDaysRemaining
    ?? json.membership_days_remaining
    ?? getMembershipDaysRemaining(student.membershipEndDate ?? null);
  const membershipStatus = json.membershipStatus
    ?? json.membership_status
    ?? determineMembershipStatus(student.membershipStartDate ?? null, student.membershipEndDate ?? null);
  const isMembershipActive = json.isMembershipActive
    ?? json.is_membership_active
    ?? hasMembership(student.membershipStartDate ?? null, student.membershipEndDate ?? null);

  const createdAt = formatDateTime(student.createdAt ?? json.createdAt ?? json.created_at ?? null);
  const updatedAt = formatDateTime(student.updatedAt ?? json.updatedAt ?? json.updated_at ?? null);
  const created_at = json.created_at ?? (createdAt ?? null);
  const updated_at = json.updated_at ?? (updatedAt ?? null);

  const fallbackRecordedAt = updatedAt ?? createdAt ?? new Date().toISOString();
  const normalizedScoreDetails = normalizeScoreDetails(
    json.scoreDetails ?? json.score_details,
    { fallbackSubject: resolvedSubjectType, fallbackRecordedAt },
  );
  const ringsFromLegacy = Array.isArray(json.rings) ? json.rings : [];
  const scoreDetails = normalizedScoreDetails.length > 0
    ? normalizedScoreDetails
    : normalizeScoreDetails(ringsFromLegacy, { fallbackSubject: resolvedSubjectType, fallbackRecordedAt });
  const rings = scoreDetailsToRings(scoreDetails);

  // 计算平均分
  const averageScore = rings.length > 0
    ? Math.round((rings.reduce((sum, score) => sum + score, 0) / rings.length) * 10) / 10
    : 0;

  return {
    uid: json.uid ?? 0,
    name: json.name ?? '',
    age: json.age ?? null,
    phone: json.phone ?? '',
    class: resolvedClass,
    classType: resolvedClassType,
    subject: resolvedSubject,
    rings,
    score_details: scoreDetails,
    averageScore,
    note: json.note ?? '',
    lessonLeft,
    membershipStartDate: membershipStartDate ?? null,
    membershipEndDate: membershipEndDate ?? null,
    membershipDaysRemaining,
    isMembershipActive,
    membershipStatus,
    createdAt: createdAt ?? null,
    updatedAt: updatedAt ?? null,
    lesson_left: lessonLeft,
    membership_start_date: membershipStartDate ?? null,
    membership_end_date: membershipEndDate ?? null,
    membership_days_remaining: membershipDaysRemaining,
    is_membership_active: isMembershipActive,
    membership_status: membershipStatus,
    created_at: created_at ?? null,
    updated_at: updated_at ?? null,
  };
};
