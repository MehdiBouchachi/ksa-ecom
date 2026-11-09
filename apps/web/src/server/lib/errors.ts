import { ERROR_HTTP_STATUS, type ErrorCode } from "@saudi-ecom/contracts";

/** Domain error that maps to the canonical `{error:{code,message,requestId}}` JSON shape. */
export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details?: unknown;
  constructor(code: ErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = ERROR_HTTP_STATUS[code];
    this.details = details;
  }
}

export const isAppError = (e: unknown): e is AppError => e instanceof AppError;
