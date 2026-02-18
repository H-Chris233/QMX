export enum ErrorType {
  InvalidInput = 'InvalidInput',
  NotFound = 'NotFound',
  State = 'State',
  Unauthorized = 'Unauthorized',
  Forbidden = 'Forbidden',
  RateLimit = 'RateLimit',
  Other = 'Other',
}

const DEFAULT_STATUS_CODE: Record<ErrorType, number> = {
  [ErrorType.InvalidInput]: 400,
  [ErrorType.NotFound]: 404,
  [ErrorType.State]: 409,
  [ErrorType.Unauthorized]: 401,
  [ErrorType.Forbidden]: 403,
  [ErrorType.RateLimit]: 429,
  [ErrorType.Other]: 500,
};

export interface AppErrorOptions {
  statusCode?: number;
  code?: string;
  details?: unknown;
  cause?: unknown;
  expose?: boolean;
}

export interface SerializedError {
  type: ErrorType;
  message: string;
  code?: string;
  details?: unknown;
}

const LEGACY_PREFIX = /^(InvalidInput|NotFound|State|Unauthorized|Forbidden|RateLimit|Other)\s*:\s*(.*)$/i;

const normalizeErrorType = (raw?: string | ErrorType | null): ErrorType | undefined => {
  if (!raw) {
    return undefined;
  }
  const candidate = String(raw).trim();
  switch (candidate) {
    case ErrorType.InvalidInput:
    case 'invalidinput':
      return ErrorType.InvalidInput;
    case ErrorType.NotFound:
    case 'notfound':
      return ErrorType.NotFound;
    case ErrorType.State:
    case 'state':
      return ErrorType.State;
    case ErrorType.Unauthorized:
    case 'unauthorized':
      return ErrorType.Unauthorized;
    case ErrorType.Forbidden:
    case 'forbidden':
      return ErrorType.Forbidden;
    case ErrorType.RateLimit:
    case 'ratelimit':
    case 'rate_limit':
      return ErrorType.RateLimit;
    case ErrorType.Other:
    case 'other':
      return ErrorType.Other;
    default:
      return undefined;
  }
};

const parseLegacyMessage = (
  message?: string,
): { type?: ErrorType; message: string } => {
  if (!message) {
    return { message: '' };
  }
  const match = LEGACY_PREFIX.exec(message);
  if (match) {
    const type = normalizeErrorType(match[1]);
    const extracted = (match[2] ?? '').trim();
    return {
      type,
      message: extracted.length > 0 ? extracted : message,
    };
  }
  return {
    message: message.trim(),
  };
};

export class AppError extends Error {
  public readonly type: ErrorType;
  public readonly statusCode: number;
  public readonly code?: string;
  public readonly details?: unknown;
  public readonly expose: boolean;

  constructor(message: string, type: ErrorType, options: AppErrorOptions = {}) {
    super(message);
    this.name = 'AppError';
    this.type = type;
    this.statusCode = options.statusCode ?? DEFAULT_STATUS_CODE[type] ?? 500;
    this.code = options.code;
    this.details = options.details;
    this.expose = options.expose ?? this.statusCode < 500;

    if (options.cause !== undefined) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (this as any).cause = options.cause;
    }

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }

  static invalidInput(message: string, options: AppErrorOptions = {}): AppError {
    return new AppError(message, ErrorType.InvalidInput, options);
  }

  static notFound(message: string, options: AppErrorOptions = {}): AppError {
    return new AppError(message, ErrorType.NotFound, options);
  }

  static state(message: string, options: AppErrorOptions = {}): AppError {
    return new AppError(message, ErrorType.State, options);
  }

  static unauthorized(message: string, options: AppErrorOptions = {}): AppError {
    return new AppError(message, ErrorType.Unauthorized, options);
  }

  static forbidden(message: string, options: AppErrorOptions = {}): AppError {
    return new AppError(message, ErrorType.Forbidden, options);
  }

  static rateLimited(message: string, options: AppErrorOptions = {}): AppError {
    return new AppError(message, ErrorType.RateLimit, options);
  }

  static other(message: string, options: AppErrorOptions = {}): AppError {
    return new AppError(message, ErrorType.Other, options);
  }

  toJSON(): SerializedError {
    return serializeError(this);
  }
}

export const isAppError = (value: unknown): value is AppError => value instanceof AppError;

export const mapErrorTypeToStatus = (type: ErrorType): number => DEFAULT_STATUS_CODE[type] ?? 500;

export interface AppErrorFallbackOptions {
  type?: ErrorType;
  message?: string;
  statusCode?: number;
  code?: string;
  details?: unknown;
  expose?: boolean;
}

const extractExistingErrorShape = (
  input: unknown,
): Partial<{ type: ErrorType; message: string; statusCode?: number; code?: string; details?: unknown }> => {
  if (!input || typeof input !== 'object') {
    return {};
  }
  const candidate = input as Record<string, unknown>;
  const explicitType = normalizeErrorType(candidate.type as string | undefined);
  const message = typeof candidate.message === 'string' ? candidate.message : undefined;
  const statusCode = typeof candidate.statusCode === 'number' ? candidate.statusCode : undefined;
  const code = typeof candidate.code === 'string' ? candidate.code : undefined;
  const details = candidate.details;

  return {
    type: explicitType,
    message,
    statusCode,
    code,
    details,
  };
};

export const toAppError = (input: unknown, fallback: AppErrorFallbackOptions = {}): AppError => {
  if (isAppError(input)) {
    return input;
  }

  const derivedShape = extractExistingErrorShape(input);
  const baseError = input instanceof Error ? input : undefined;
  const rawMessage = derivedShape.message
    ?? (baseError ? baseError.message : undefined)
    ?? fallback.message;

  const parsed = parseLegacyMessage(rawMessage);
  const type = derivedShape.type
    ?? parsed.type
    ?? fallback.type
    ?? ErrorType.Other;

  const message = parsed.message && parsed.message.length > 0
    ? parsed.message
    : fallback.message
    ?? '服务器内部错误';

  const statusCode = derivedShape.statusCode
    ?? fallback.statusCode
    ?? DEFAULT_STATUS_CODE[type]
    ?? 500;

  const code = derivedShape.code ?? fallback.code;
  const details = derivedShape.details ?? fallback.details;

  return new AppError(message, type, {
    statusCode,
    code,
    details,
    cause: baseError,
    expose: fallback.expose,
  });
};

export const ensureAppError = (input: unknown, fallback: AppErrorFallbackOptions = {}): AppError => {
  return toAppError(input, fallback);
};

export const serializeError = (error: AppError): SerializedError => {
  const payload: SerializedError = {
    type: error.type,
    message: error.message,
  };

  if (error.code) {
    payload.code = error.code;
  }

  if (error.details !== undefined) {
    payload.details = error.details;
  }

  return payload;
};
