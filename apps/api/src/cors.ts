import { FastifyCorsOptions } from '@fastify/cors';

export const CANONICAL_PRODUCTION_ORIGIN = 'https://snap.palnadu.dev';

export const DEFAULT_DEV_ORIGINS = ['http://localhost:3000', 'http://127.0.0.1:3000'];

export const DEFAULT_CORS_ALLOWED_ORIGINS = [
  ...DEFAULT_DEV_ORIGINS,
  CANONICAL_PRODUCTION_ORIGIN,
].join(',');

export const CORS_ALLOWED_METHODS = ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'];

export const CORS_ALLOWED_HEADERS = [
  'Authorization',
  'Content-Type',
  'X-Session-Token',
  'X-Studio-ID',
  'Accept',
  'Origin',
];

/**
 * Normalizes an origin string into standard protocol://host form without trailing slash.
 */
export function normalizeOrigin(origin: string): string | null {
  const trimmed = origin.trim();
  if (!trimmed || trimmed === 'null') {
    return null;
  }
  try {
    const parsed = new URL(trimmed);
    return `${parsed.protocol}//${parsed.host}`.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Parses a comma-separated list of allowed origins, normalizing each and
 * guaranteeing the canonical production origin is permitted.
 */
export function parseAllowedOrigins(allowedOriginsStr?: string): string[] {
  const parsed: string[] = [];

  if (allowedOriginsStr) {
    for (const raw of allowedOriginsStr.split(',')) {
      const normalized = normalizeOrigin(raw);
      if (normalized) {
        parsed.push(normalized);
      }
    }
  }

  // Always ensure canonical production origin is permitted
  if (!parsed.includes(CANONICAL_PRODUCTION_ORIGIN)) {
    parsed.push(CANONICAL_PRODUCTION_ORIGIN);
  }

  return [...new Set(parsed)];
}

/**
 * Validates whether an incoming request Origin header is permitted.
 * Direct non-browser requests without an Origin header return true.
 */
export function isOriginAllowed(
  originHeader: string | undefined,
  allowedOriginsStr?: string
): boolean {
  if (!originHeader) {
    return true;
  }
  const normalized = normalizeOrigin(originHeader);
  if (!normalized) {
    return false;
  }
  const allowed = parseAllowedOrigins(allowedOriginsStr);
  return allowed.includes(normalized);
}

/**
 * Builds the centralized @fastify/cors plugin configuration.
 */
export function buildCorsOptions(allowedOriginsStr?: string): FastifyCorsOptions {
  const allowed = parseAllowedOrigins(allowedOriginsStr);

  return {
    origin: (origin, callback) => {
      // Non-browser or server-to-server requests without Origin header
      if (!origin) {
        return callback(null, true);
      }
      const normalized = normalizeOrigin(origin);
      if (normalized && allowed.includes(normalized)) {
        return callback(null, origin);
      }
      return callback(null, false);
    },
    credentials: true,
    methods: CORS_ALLOWED_METHODS,
    allowedHeaders: CORS_ALLOWED_HEADERS,
    maxAge: 86400,
    strictPreflight: false,
  };
}
