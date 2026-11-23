import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { DEFAULT_OTP_TTL_MINUTES, z } from '@snapprint/contracts';

// Load local .env files if present (checking current working directory and package root)
const envCandidates = [
  resolve(process.cwd(), '.env'),
  resolve(process.cwd(), 'apps/api/.env'),
  resolve(import.meta.dirname ?? '.', '../.env'),
];

for (const envPath of envCandidates) {
  if (existsSync(envPath) && typeof process.loadEnvFile === 'function') {
    try {
      process.loadEnvFile(envPath);
    } catch {
      // Continue searching next candidate
    }
  }
}

export const INSECURE_DEV_SESSION_SECRET =
  'dev-insecure-session-secret-must-be-at-least-32-chars-long!';
export const INSECURE_DEV_COOKIE_SECRET =
  'dev-insecure-cookie-secret-must-be-at-least-32-chars-long!';

const ConfigSchema = z
  .object({
    port: z.coerce.number().int().positive().default(3001),
    host: z.string().default('127.0.0.1'),
    nodeEnv: z.enum(['development', 'test', 'production']).default('development'),
    mongoUri: z.string().min(1).optional(),
    mongoDbName: z.string().min(1).default('snapprint'),
    logLevel: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
    sessionSecret: z.string().min(32).default(INSECURE_DEV_SESSION_SECRET),
    cookieSecret: z.string().min(32).default(INSECURE_DEV_COOKIE_SECRET),
    corsAllowedOrigins: z.string().default('http://localhost:3000,http://127.0.0.1:3000'),
    trustProxy: z.preprocess(
      (val) => {
        if (typeof val === 'string') {
          if (val.toLowerCase() === 'true') return true;
          if (val.toLowerCase() === 'false') return false;
        }
        return val;
      },
      z.union([z.boolean(), z.string()]).default(false)
    ),
    cookieSecure: z.preprocess((val) => {
      if (typeof val === 'string') {
        if (val.toLowerCase() === 'true') return true;
        if (val.toLowerCase() === 'false') return false;
      }
      return val;
    }, z.boolean().optional()),
    rateLimitMax: z.coerce.number().int().positive().default(100),
    rateLimitTimeWindow: z.string().default('1 minute'),
    otpTtlMinutes: z.coerce.number().int().positive().default(DEFAULT_OTP_TTL_MINUTES),
    razorpayKeyId: z.string().optional(),
    razorpayKeySecret: z.string().optional(),
    razorpayWebhookSecret: z.string().optional(),
    zeptoMailApiToken: z.string().optional(),
    zeptoMailBounceAddress: z.string().optional(),
    zeptoMailFromEmail: z.string().email().optional(),
    zeptoMailFromName: z.string().default('SnapPrint'),
  })
  .superRefine((data, ctx) => {
    if (data.nodeEnv === 'production') {
      if (!data.sessionSecret || data.sessionSecret === INSECURE_DEV_SESSION_SECRET) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['sessionSecret'],
          message:
            'Production environment requires a strong, non-default SESSION_SECRET (minimum 32 characters)',
        });
      }
      if (!data.cookieSecret || data.cookieSecret === INSECURE_DEV_COOKIE_SECRET) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['cookieSecret'],
          message:
            'Production environment requires a strong, non-default COOKIE_SECRET (minimum 32 characters)',
        });
      }
      if (!data.mongoUri) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['mongoUri'],
          message: 'Production environment requires a valid MONGODB_URI',
        });
      }
      if (data.cookieSecure === false) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['cookieSecure'],
          message:
            'Production environment requires COOKIE_SECURE to be true; insecure overrides (false) are disallowed',
        });
      }
    }
  });

export type AppConfig = z.infer<typeof ConfigSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const result = ConfigSchema.safeParse({
    port: env.PORT,
    host: env.HOST,
    nodeEnv: env.NODE_ENV,
    mongoUri: env.MONGODB_URI,
    mongoDbName: env.MONGODB_DB_NAME,
    logLevel: env.LOG_LEVEL,
    sessionSecret: env.SESSION_SECRET,
    cookieSecret: env.COOKIE_SECRET,
    corsAllowedOrigins: env.CORS_ALLOWED_ORIGINS,
    trustProxy: env.TRUST_PROXY,
    cookieSecure: env.COOKIE_SECURE,
    rateLimitMax: env.RATE_LIMIT_MAX,
    rateLimitTimeWindow: env.RATE_LIMIT_TIME_WINDOW,
    otpTtlMinutes: env.OTP_TTL_MINUTES,
    razorpayKeyId: env.RAZORPAY_KEY_ID,
    razorpayKeySecret: env.RAZORPAY_KEY_SECRET,
    razorpayWebhookSecret: env.RAZORPAY_WEBHOOK_SECRET,
    zeptoMailApiToken: env.ZEPTOMAIL_API_TOKEN,
    zeptoMailBounceAddress: env.ZEPTOMAIL_BOUNCE_ADDRESS,
    zeptoMailFromEmail: env.ZEPTOMAIL_FROM_EMAIL,
    zeptoMailFromName: env.ZEPTOMAIL_FROM_NAME,
  });

  if (!result.success) {
    const issues = result.error.issues
      .map((issue: z.ZodIssue) => `${issue.path.join('.')}: ${issue.message}`)
      .join(', ');
    throw new Error(`Invalid application configuration: ${issues}`);
  }

  // Derive default cookieSecure from nodeEnv if not explicitly set
  const data = result.data;
  if (data.cookieSecure === undefined) {
    data.cookieSecure = data.nodeEnv === 'production';
  }

  return data;
}
