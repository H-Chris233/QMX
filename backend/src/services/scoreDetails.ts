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

const toOptionalNote = (value: unknown): string | null | undefined => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const normalized = String(value).trim();
  if (!normalized) return null;
  return normalized.length > 1000 ? normalized.slice(0, 1000) : normalized;
};

interface NormalizeOptions {
  fallbackSubject?: SubjectType;
  fallbackRecordedAt?: string;
  note?: unknown;
}

export const createScoreDetail = (
  score: number,
  options: NormalizeOptions = {},
): ScoreDetail => {
  const fallbackSubject = options.fallbackSubject ?? SubjectType.SHOOTING;
  const fallbackRecordedAt = options.fallbackRecordedAt ?? new Date().toISOString();
  const fallbackNote = toOptionalNote(options.note);

  const detail: ScoreDetail = {
    score,
    subject: fallbackSubject,
    recorded_at: fallbackRecordedAt,
  };

  if (fallbackNote !== undefined) {
    detail.note = fallbackNote;
  }

  return detail;
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
        const detail: ScoreDetail = {
          score: item,
          subject: fallbackSubject,
          recorded_at: fallbackRecordedAt,
        };
        const fallbackNote = toOptionalNote(options.note);
        if (fallbackNote !== undefined) {
          detail.note = fallbackNote;
        }
        normalized.push(detail);
      }
      continue;
    }

    if (!item || typeof item !== 'object') continue;

    const raw = item as Record<string, unknown>;
    const score = toFiniteScore(raw.score);
    if (score === null) continue;

    const detail: ScoreDetail = {
      score,
      subject: toSubjectType(raw.subject, fallbackSubject),
      recorded_at: toIsoDateTime(raw.recorded_at ?? raw.recordedAt, fallbackRecordedAt),
    };

    const note = toOptionalNote(raw.note ?? raw.notes ?? options.note);
    if (note !== undefined) {
      detail.note = note;
    }

    normalized.push(detail);
  }

  return normalized;
};

export const scoreDetailsToRings = (details: ScoreDetail[]): number[] => {
  return details
    .map((item) => Number(item.score))
    .filter((score) => Number.isFinite(score));
};
