import { SubjectType } from '@/types';
import type { ScoreDetail } from '@/db/schema/students';

const VALID_SUBJECTS = new Set<string>(Object.values(SubjectType));

const toSubjectType = (value: unknown, fallback: SubjectType): SubjectType => {
  if (typeof value !== 'string') return fallback;
  const normalized = value.trim().toUpperCase();
  if (VALID_SUBJECTS.has(normalized)) return normalized as SubjectType;
  return fallback;
};

const toIsoDateTime = (value: unknown, fallback: string): string => {
  if (typeof value !== 'string' || !value.trim()) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toISOString();
};

const toFiniteScore = (value: unknown): number | null => {
  const score = Number(value);
  if (!Number.isFinite(score)) return null;
  return score;
};

interface NormalizeOptions {
  fallbackSubject?: SubjectType;
  fallbackRecordedAt?: string;
}

export const createScoreDetail = (
  score: number,
  options: NormalizeOptions = {},
): ScoreDetail => {
  const fallbackSubject = options.fallbackSubject ?? SubjectType.SHOOTING;
  const fallbackRecordedAt = options.fallbackRecordedAt ?? new Date().toISOString();

  return {
    score,
    subject: fallbackSubject,
    recorded_at: fallbackRecordedAt,
  };
};

export const normalizeScoreDetails = (
  input: unknown,
  options: NormalizeOptions = {},
): ScoreDetail[] => {
  const fallbackSubject = options.fallbackSubject ?? SubjectType.SHOOTING;
  const fallbackRecordedAt = options.fallbackRecordedAt ?? new Date().toISOString();

  if (!Array.isArray(input)) return [];

  const normalized: ScoreDetail[] = [];

  for (const item of input) {
    if (typeof item === 'number') {
      if (Number.isFinite(item)) {
        normalized.push({
          score: item,
          subject: fallbackSubject,
          recorded_at: fallbackRecordedAt,
        });
      }
      continue;
    }

    if (!item || typeof item !== 'object') continue;

    const raw = item as Record<string, unknown>;
    const score = toFiniteScore(raw.score);
    if (score === null) continue;

    normalized.push({
      score,
      subject: toSubjectType(raw.subject, fallbackSubject),
      recorded_at: toIsoDateTime(raw.recorded_at ?? raw.recordedAt, fallbackRecordedAt),
    });
  }

  return normalized;
};

export const scoreDetailsToRings = (details: ScoreDetail[]): number[] => {
  return details
    .map((item) => Number(item.score))
    .filter((score) => Number.isFinite(score));
};
