export type NullableString = string | null | undefined;

export function toClassType(value: NullableString): NullableString {
  if (!value) return value;
  const normalized = value.trim();
  const lowered = normalized.toLowerCase();
  if (['tentry', 'ten_try', 'ten-try', 'ten try'].includes(lowered)) return 'TEN_TRY';
  if (lowered === 'month') return 'MONTH';
  if (lowered === 'year') return 'YEAR';
  if (lowered === 'others') return 'OTHERS';
  return normalized.toUpperCase();
}

export function toSubjectType(value: NullableString): NullableString {
  if (!value) return value;
  const normalized = value.trim();
  const lowered = normalized.toLowerCase();
  if (lowered === 'shooting') return 'SHOOTING';
  if (lowered === 'archery') return 'ARCHERY';
  if (['shootingarchery', 'shooting_and_archery', 'shooting-archery', 'shooting&archery'].includes(lowered)) {
    return 'SHOOTING_ARCHERY';
  }
  if (lowered === 'others') return 'OTHERS';
  return normalized.toUpperCase();
}

export function toInstallmentStatus(value: NullableString): NullableString {
  if (!value) return value;
  const normalized = value.trim();
  const lowered = normalized.toLowerCase();
  if (lowered === 'pending') return 'PENDING';
  if (lowered === 'paid') return 'PAID';
  if (lowered === 'overdue') return 'OVERDUE';
  if (lowered === 'cancelled') return 'CANCELLED';
  return normalized.toUpperCase();
}

export function toInstallmentPlanStatus(value: NullableString): NullableString {
  if (!value) return value;
  const normalized = value.trim();
  const lowered = normalized.toLowerCase();
  if (lowered === 'active') return 'ACTIVE';
  if (lowered === 'completed') return 'COMPLETED';
  if (lowered === 'cancelled') return 'CANCELLED';
  return normalized.toUpperCase();
}

export function toPaymentFrequency(value: NullableString): NullableString {
  if (!value) return value;
  const normalized = value.trim();
  const lowered = normalized.toLowerCase();
  if (lowered === 'weekly') return 'WEEKLY';
  if (lowered === 'monthly') return 'MONTHLY';
  if (lowered === 'quarterly') return 'QUARTERLY';
  if (lowered === 'custom') return 'CUSTOM';
  return normalized.toUpperCase();
}

export function toFrontendClassType(value: NullableString): NullableString {
  if (!value) return value;
  const normalized = value.trim();
  if (normalized === 'TEN_TRY') return 'TenTry';
  if (normalized === 'MONTH') return 'Month';
  if (normalized === 'YEAR') return 'Year';
  if (normalized === 'OTHERS') return 'Others';
  return normalized;
}

export function toFrontendSubjectType(value: NullableString): NullableString {
  if (!value) return value;
  const normalized = value.trim();
  if (normalized === 'SHOOTING') return 'Shooting';
  if (normalized === 'ARCHERY') return 'Archery';
  if (normalized === 'SHOOTING_ARCHERY') return 'ShootingArchery';
  if (normalized === 'OTHERS') return 'Others';
  return normalized;
}

export function toFrontendMembershipStatus(value: NullableString): NullableString {
  if (!value) return value;
  const normalized = value.trim();
  if (normalized === 'NONE') return 'None';
  if (normalized === 'ACTIVE') return 'Active';
  if (normalized === 'EXPIRED') return 'Expired';
  if (normalized === 'UPCOMING') return 'Upcoming';
  return normalized;
}

export function toFrontendInstallmentStatus(value: NullableString): NullableString {
  if (!value) return value;
  const normalized = value.trim();
  if (normalized === 'PENDING') return 'Pending';
  if (normalized === 'PAID') return 'Paid';
  if (normalized === 'OVERDUE') return 'Overdue';
  if (normalized === 'CANCELLED') return 'Cancelled';
  return normalized;
}

export function toFrontendInstallmentPlanStatus(value: NullableString): NullableString {
  if (!value) return value;
  const normalized = value.trim();
  if (normalized === 'ACTIVE') return 'Active';
  if (normalized === 'COMPLETED') return 'Completed';
  if (normalized === 'CANCELLED') return 'Cancelled';
  return normalized;
}

export function toFrontendPaymentFrequency(value: NullableString): NullableString {
  if (!value) return value;
  const normalized = value.trim();
  if (normalized === 'WEEKLY') return 'Weekly';
  if (normalized === 'MONTHLY') return 'Monthly';
  if (normalized === 'QUARTERLY') return 'Quarterly';
  if (normalized === 'CUSTOM') return 'Custom';
  return normalized;
}
