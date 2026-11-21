import type { ApiResponse, ErrorResponse } from './schemas.js';

export function ok<T>(data: T): ApiResponse<T> {
  return { ok: true, data, error: null };
}

export function fail(message: string, statusCode = 500): ApiResponse<null> {
  return {
    ok: false,
    data: null,
    error: { error: message, statusCode } as ErrorResponse,
  };
}
