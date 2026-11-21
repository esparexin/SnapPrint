import { z } from 'zod';

export const ErrorResponseSchema = z.object({
  error: z.string(),
  statusCode: z.number().int().positive(),
});

export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;

export interface ApiResponse<T> {
  ok: boolean;
  data: T | null;
  error: ErrorResponse | null;
}
