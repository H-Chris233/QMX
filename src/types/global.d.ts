import type { ErrorPriorityLevel, ShowAppErrorDetail } from '../utils/errorHandler';

declare global {
  type ShowErrorHandler = (
    title: string,
    message: string,
    details?: string,
    showRetry?: boolean,
    priority?: ErrorPriorityLevel
  ) => void;

  interface Window {
    showError?: ShowErrorHandler;
  }

  interface WindowEventMap {
    showAppError: CustomEvent<ShowAppErrorDetail>;
  }
}

export {};
