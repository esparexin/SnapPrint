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

/**
 * Redacts sensitive tokens, passwords, and MongoDB connection strings from error text.
 */
export function sanitizeLogText(text: string): string {
  if (!text) return text;
  return (
    text
      // Redact MongoDB connection credentials (mongodb://user:pass@host or mongodb+srv://...)
      .replace(/mongodb(\+srv)?:\/\/([^:]+):([^@]+)@/gi, 'mongodb$1://[REDACTED]:[REDACTED]@')
      // Redact Bearer tokens
      .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [REDACTED]')
      // Redact sensitive query/body key-value patterns
      .replace(/(?:secret|password|token|apiKey)=([^&\s]+)/gi, '$1=[REDACTED]')
  );
}

/**
 * Sanitizes request paths to prevent logging sensitive query parameter values.
 */
export function sanitizePath(rawUrl: string): string {
  if (!rawUrl) return rawUrl;
  try {
    const [path, query] = rawUrl.split('?');
    if (!query) return path;
    const sanitizedQuery = query
      .split('&')
      .map((pair) => {
        const [k, v] = pair.split('=');
        if (/token|secret|key|password|auth/i.test(k)) {
          return `${k}=[REDACTED]`;
        }
        return `${k}=${v ?? ''}`;
      })
      .join('&');
    return `${path}?${sanitizedQuery}`;
  } catch {
    return rawUrl.split('?')[0];
  }
}

export function handleApiError(
  error: FastifyError | Error,
  request: FastifyRequest,
  reply: FastifyReply
): void {
  const sanitizedUrl = sanitizePath(request.url);
  const sanitizedMessage = sanitizeLogText(error.message);

  request.log.warn(
    { errName: error.name, errMsg: sanitizedMessage, path: sanitizedUrl },
    'API request failed with error'
  );

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
  if (statusCode === 429) {
    reply.status(429).send({
      statusCode: 429,
      code: 'RATE_LIMIT_EXCEEDED',
      message: error.message || 'Rate limit exceeded. Please try again later.',
    });
    return;
  }

  // Never leak internal database connection details or unhandled stack traces
  reply.status(statusCode).send({
    statusCode,
    code: (error as FastifyError).code ?? 'INTERNAL_ERROR',
    message: statusCode >= 500 ? 'An unexpected internal server error occurred' : sanitizedMessage,
  });
}
