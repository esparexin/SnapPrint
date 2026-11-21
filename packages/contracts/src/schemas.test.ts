import { describe, expect, it } from 'vitest';
import { ErrorResponseSchema, type ErrorResponse } from './schemas.js';

describe('ErrorResponseSchema', () => {
  it('accepts a valid error response', () => {
    const result = ErrorResponseSchema.safeParse({
      error: 'bad request',
      statusCode: 400,
    });
    expect(result.success).toBe(true);
  });

  it('rejects a non-positive status code', () => {
    const result = ErrorResponseSchema.safeParse({
      error: 'x',
      statusCode: -1,
    });
    expect(result.success).toBe(false);
  });

  it('infers the ErrorResponse type', () => {
    const value: ErrorResponse = { error: 'not found', statusCode: 404 };
    expect(value.statusCode).toBe(404);
  });
});
