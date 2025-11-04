import { IStudentDoc, studentModel } from '@/models/mongo';
import { MembershipStatus } from '@/types';

export const toStudentDocument = (student: IStudentDoc | Record<string, any>): IStudentDoc => {
  if (typeof (student as IStudentDoc).toJSON === 'function') {
    return student as IStudentDoc;
  }
  return studentModel.hydrate(student);
};

export const presentStudent = (student: IStudentDoc | Record<string, any>) => {
  const doc = toStudentDocument(student);
  const json = doc.toJSON();

  let membershipStatus = MembershipStatus.NONE;
  if (doc.membershipStartDate && doc.membershipEndDate) {
    const now = new Date();
    if (now < doc.membershipStartDate) {
      membershipStatus = MembershipStatus.UPCOMING;
    } else if (now > doc.membershipEndDate) {
      membershipStatus = MembershipStatus.EXPIRED;
    } else {
      membershipStatus = MembershipStatus.ACTIVE;
    }
  }

  return {
    ...json,
    lessonLeft: json.lessonLeft ?? json.lesson_left ?? null,
    membershipStartDate: json.membershipStartDate ?? json.membership_start_date,
    membershipEndDate: json.membershipEndDate ?? json.membership_end_date,
    membershipDaysRemaining: json.membershipDaysRemaining ?? json.membership_days_remaining,
    isMembershipActive: json.isMembershipActive ?? json.is_membership_active,
    membership_status: membershipStatus,
    membershipStatus,
  };
};
