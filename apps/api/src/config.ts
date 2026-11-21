import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { z } from '@snapprint/contracts';

// Load local .env file if it exists, without crashing in environments where secrets are injected
const localEnvPath = resolve(process.cwd(), '.env');
if (existsSync(localEnvPath) && typeof process.loadEnvFile === 'function') {
  process.loadEnvFile(localEnvPath);
}

const ConfigSchema = z.object({
  port: z.coerce.number().int().positive().default(3001),
  host: z.string().default('127.0.0.1'),
  nodeEnv: z.enum(['development', 'test', 'production']).default('development'),
  mongoUri: z.string().min(1).optional(),
  mongoDbName: z.string().min(1).default('snapprint'),
  logLevel: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  sessionSecret: z
    .string()
    .min(32)
    .default('dev-insecure-session-secret-must-be-at-least-32-chars-long!'),
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
  });

  if (!result.success) {
    const issues = result.error.issues
      .map((issue: z.ZodIssue) => `${issue.path.join('.')}: ${issue.message}`)
      .join(', ');
    throw new Error(`Invalid application configuration: ${issues}`);
  }

  return result.data;
}
