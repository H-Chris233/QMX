import { IStudentDoc, studentModel } from '@/models/mongo';
import { MembershipStatus } from '@/types';

interface StudentJson {
  uid?: number;
  name?: string;
  age?: number | null;
  phone?: string;
  class?: IStudentDoc['class'];
  subject?: IStudentDoc['subject'];
  rings?: number[];
  note?: string;
  lessonLeft?: number | null;
  lesson_left?: number | null;
  membershipStartDate?: string | null;
  membership_start_date?: string | null;
  membershipEndDate?: string | null;
  membership_end_date?: string | null;
  membershipDaysRemaining?: number | null;
  membership_days_remaining?: number | null;
  isMembershipActive?: boolean;
  is_membership_active?: boolean;
  membershipStatus?: MembershipStatus;
  membership_status?: MembershipStatus;
  createdAt?: Date | null;
  created_at?: string | null;
  updatedAt?: Date | null;
  updated_at?: string | null;
}

export interface PresentedStudent {
  uid: number;
  name: string;
  age: number | null;
  phone: string;
  class: IStudentDoc['class'];
  subject: IStudentDoc['subject'];
  rings: number[];
  note: string;
  lessonLeft: number | null;
  membershipStartDate: string | null;
  membershipEndDate: string | null;
  membershipDaysRemaining: number | null;
  isMembershipActive: boolean;
  membershipStatus: MembershipStatus;
  createdAt: Date | null;
  updatedAt: Date | null;
  lesson_left: number | null;
  membership_start_date: string | null;
  membership_end_date: string | null;
  membership_days_remaining: number | null;
  is_membership_active: boolean;
  membership_status: MembershipStatus;
  created_at: string | null;
  updated_at: string | null;
}

type StudentPresentable = IStudentDoc | PresentedStudent | StudentJson | (Partial<StudentJson> & Record<string, unknown>);

const isStudentDocument = (student: StudentPresentable): student is IStudentDoc => {
  return typeof (student as IStudentDoc)?.toJSON === 'function';
};

const formatDateOnly = (value: Date | null | undefined): string | null => {
  if (!value) {
    return null;
  }
  const iso = value.toISOString();
  return iso.split('T')[0] ?? null;
};

const formatDateTime = (value: Date | null | undefined): string | null => {
  return value ? value.toISOString() : null;
};

const determineMembershipStatus = (doc: IStudentDoc): MembershipStatus => {
  if (doc.membershipStartDate && doc.membershipEndDate) {
    const now = new Date();
    if (now < doc.membershipStartDate) {
      return MembershipStatus.UPCOMING;
    }
    if (now > doc.membershipEndDate) {
      return MembershipStatus.EXPIRED;
    }
    return MembershipStatus.ACTIVE;
  }
  return MembershipStatus.NONE;
};

export const toStudentDocument = (student: StudentPresentable): IStudentDoc => {
  if (isStudentDocument(student)) {
    return student;
  }
  return studentModel.hydrate(student);
};

export const presentStudent = (student: StudentPresentable): PresentedStudent => {
  const doc = toStudentDocument(student);
  const json = doc.toJSON() as StudentJson;

  const lessonLeft = json.lessonLeft ?? json.lesson_left ?? doc.lessonLeft ?? null;
  const membershipStartDate = json.membershipStartDate
    ?? json.membership_start_date
    ?? formatDateOnly(doc.membershipStartDate);
  const membershipEndDate = json.membershipEndDate
    ?? json.membership_end_date
    ?? formatDateOnly(doc.membershipEndDate);
  const membershipDaysRemaining = json.membershipDaysRemaining
    ?? json.membership_days_remaining
    ?? doc.getMembershipDaysRemaining();
  const isMembershipActive = json.isMembershipActive
    ?? json.is_membership_active
    ?? doc.hasMembership();
  const membershipStatus = json.membershipStatus
    ?? json.membership_status
    ?? determineMembershipStatus(doc);

  const createdAt = json.createdAt ?? doc.createdAt ?? null;
  const updatedAt = json.updatedAt ?? doc.updatedAt ?? null;
  const created_at = json.created_at ?? formatDateTime(createdAt);
  const updated_at = json.updated_at ?? formatDateTime(updatedAt);

  return {
    uid: json.uid ?? doc.uid,
    name: json.name ?? doc.name,
    age: json.age ?? doc.age ?? null,
    phone: json.phone ?? doc.phone,
    class: json.class ?? doc.class,
    subject: json.subject ?? doc.subject,
    rings: Array.isArray(json.rings) ? json.rings : doc.rings,
    note: json.note ?? doc.note ?? '',
    lessonLeft,
    membershipStartDate,
    membershipEndDate,
    membershipDaysRemaining,
    isMembershipActive,
    membershipStatus,
    createdAt,
    updatedAt,
    lesson_left: lessonLeft,
    membership_start_date: membershipStartDate,
    membership_end_date: membershipEndDate,
    membership_days_remaining: membershipDaysRemaining,
    is_membership_active: isMembershipActive,
    membership_status: membershipStatus,
    created_at,
    updated_at,
  };
};
