import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from '@snapprint/contracts';
import { TenantIsolationViolationError } from '@snapprint/domain';
import {
  InvalidSessionTokenError,
  SessionExpiredError,
  SessionNotActiveError,
} from './session-token.js';

export interface StandardApiErrorResponse {
  statusCode: number;
  code: string;
  message: string;
  issues?: unknown[];
}

export function handleApiError(
  error: FastifyError | Error,
  request: FastifyRequest,
  reply: FastifyReply
): void {
  request.log.warn({ err: error, path: request.url }, 'API request failed with error');

  if (error instanceof TenantIsolationViolationError) {
    reply.status(403).send({
      statusCode: 403,
      code: 'TENANT_ISOLATION_VIOLATION',
      message: error.message,
    });
    return;
  }

  if (error instanceof SessionExpiredError) {
    reply.status(401).send({
      statusCode: 401,
      code: 'SESSION_EXPIRED',
      message: error.message,
    });
    return;
  }

  if (error instanceof SessionNotActiveError || error instanceof InvalidSessionTokenError) {
    reply.status(401).send({
      statusCode: 401,
      code: 'INVALID_SESSION',
      message: error.message,
    });
    return;
  }

  if (error instanceof ZodError) {
    reply.status(400).send({
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      message: 'Request payload or parameter validation failed',
      issues: (error as ZodError).issues,
    });
    return;
  }

  const statusCode = (error as FastifyError).statusCode ?? 500;
  reply.status(statusCode).send({
    statusCode,
    code: (error as FastifyError).code ?? 'INTERNAL_ERROR',
    message: statusCode >= 500 ? 'An unexpected internal server error occurred' : error.message,
  });
}
