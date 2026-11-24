import { describe, expect, it } from 'vitest';
import { DEFAULT_OTP_TTL_MINUTES } from '@snapprint/contracts';
import { INSECURE_DEV_COOKIE_SECRET, INSECURE_DEV_SESSION_SECRET, loadConfig } from './config.js';

describe('API Configuration', () => {
  it('loads valid configuration with defaults in development', () => {
    const config = loadConfig({ NODE_ENV: 'development' });
    expect(config.port).toBe(3001);
    expect(config.host).toBe('127.0.0.1');
    expect(config.nodeEnv).toBe('development');
    expect(config.mongoDbName).toBe('snapprint');
    expect(config.logLevel).toBe('info');
    expect(config.sessionSecret).toBe(INSECURE_DEV_SESSION_SECRET);
    expect(config.cookieSecret).toBe(INSECURE_DEV_COOKIE_SECRET);
    expect(config.corsAllowedOrigins).toBe(
      'http://localhost:3000,http://127.0.0.1:3000,https://snap.palnadu.dev'
    );
    expect(config.trustProxy).toBe(false);
    expect(config.cookieSecure).toBe(false);
    expect(config.rateLimitMax).toBe(100);
    expect(config.rateLimitTimeWindow).toBe('1 minute');
    expect(config.otpTtlMinutes).toBe(DEFAULT_OTP_TTL_MINUTES);
  });

  it('loads custom environment variables in production with strong secrets', () => {
    const config = loadConfig({
      PORT: '8080',
      HOST: '0.0.0.0',
      NODE_ENV: 'production',
      MONGODB_URI: 'mongodb://localhost:27017',
      MONGODB_DB_NAME: 'custom_db',
      LOG_LEVEL: 'warn',
      SESSION_SECRET: 'a-very-strong-production-session-secret-key-64chars-long!!!!!!!',
      COOKIE_SECRET: 'a-very-strong-production-cookie-secret-key-64chars-long!!!!!!!',
      CORS_ALLOWED_ORIGINS: 'https://app.snapprint.com,https://admin.snapprint.com',
      TRUST_PROXY: 'true',
      COOKIE_SECURE: 'true',
      RATE_LIMIT_MAX: '50',
      RATE_LIMIT_TIME_WINDOW: '30 seconds',
      OTP_TTL_MINUTES: '20',
    });
    expect(config.port).toBe(8080);
    expect(config.host).toBe('0.0.0.0');
    expect(config.nodeEnv).toBe('production');
    expect(config.mongoUri).toBe('mongodb://localhost:27017');
    expect(config.mongoDbName).toBe('custom_db');
    expect(config.logLevel).toBe('warn');
    expect(config.sessionSecret).toBe(
      'a-very-strong-production-session-secret-key-64chars-long!!!!!!!'
    );
    expect(config.cookieSecret).toBe(
      'a-very-strong-production-cookie-secret-key-64chars-long!!!!!!!'
    );
    expect(config.corsAllowedOrigins).toBe('https://app.snapprint.com,https://admin.snapprint.com');
    expect(config.trustProxy).toBe(true);
    expect(config.cookieSecure).toBe(true);
    expect(config.rateLimitMax).toBe(50);
    expect(config.rateLimitTimeWindow).toBe('30 seconds');
    expect(config.otpTtlMinutes).toBe(20);
  });

  it('rejects default insecure session secret in production mode without leaking secret value', () => {
    expect(() =>
      loadConfig({
        NODE_ENV: 'production',
        MONGODB_URI: 'mongodb://localhost:27017',
        COOKIE_SECRET: 'a-very-strong-production-cookie-secret-key-64chars-long!!!!!!!',
      })
    ).toThrowError(
      'sessionSecret: Production environment requires a strong, non-default SESSION_SECRET (minimum 32 characters)'
    );

    // Verify the error message does not contain the default secret value
    try {
      loadConfig({ NODE_ENV: 'production' });
    } catch (err: unknown) {
      const msg = (err as Error).message;
      expect(msg).not.toContain(INSECURE_DEV_SESSION_SECRET);
      expect(msg).not.toContain(INSECURE_DEV_COOKIE_SECRET);
    }
  });

  it('rejects default insecure cookie secret in production mode without leaking secret value', () => {
    expect(() =>
      loadConfig({
        NODE_ENV: 'production',
        MONGODB_URI: 'mongodb://localhost:27017',
        SESSION_SECRET: 'a-very-strong-production-session-secret-key-64chars-long!!!!!!!',
      })
    ).toThrowError(
      'cookieSecret: Production environment requires a strong, non-default COOKIE_SECRET (minimum 32 characters)'
    );
  });

  it('rejects missing MONGODB_URI in production mode', () => {
    expect(() =>
      loadConfig({
        NODE_ENV: 'production',
        SESSION_SECRET: 'a-very-strong-production-session-secret-key-64chars-long!!!!!!!',
        COOKIE_SECRET: 'a-very-strong-production-cookie-secret-key-64chars-long!!!!!!!',
      })
    ).toThrowError('mongoUri: Production environment requires a valid MONGODB_URI');
  });

  it('throws when session secret is shorter than 32 characters', () => {
    expect(() =>
      loadConfig({
        SESSION_SECRET: 'short-secret-1234',
      })
    ).toThrow('Invalid application configuration');
  });

  it('throws when cookie secret is shorter than 32 characters', () => {
    expect(() =>
      loadConfig({
        COOKIE_SECRET: 'short-cookie-1234',
      })
    ).toThrow('Invalid application configuration');
  });

  it('throws on invalid port number', () => {
    expect(() =>
      loadConfig({
        PORT: '-1',
      })
    ).toThrow('Invalid application configuration');
  });

  it('rejects invalid OTP expiry values', () => {
    expect(() => loadConfig({ OTP_TTL_MINUTES: '0' })).toThrow('Invalid application configuration');
  });

  it('defaults cookieSecure to true in production when not explicitly specified', () => {
    const config = loadConfig({
      NODE_ENV: 'production',
      MONGODB_URI: 'mongodb://localhost:27017',
      SESSION_SECRET: 'a-very-strong-production-session-secret-key-64chars-long!!!!!!!',
      COOKIE_SECRET: 'a-very-strong-production-cookie-secret-key-64chars-long!!!!!!!',
    });
    expect(config.cookieSecure).toBe(true);
  });

  it('rejects insecure cookieSecure=false override in production mode', () => {
    expect(() =>
      loadConfig({
        NODE_ENV: 'production',
        MONGODB_URI: 'mongodb://localhost:27017',
        SESSION_SECRET: 'a-very-strong-production-session-secret-key-64chars-long!!!!!!!',
        COOKIE_SECRET: 'a-very-strong-production-cookie-secret-key-64chars-long!!!!!!!',
        COOKIE_SECURE: 'false',
      })
    ).toThrowError(
      'cookieSecure: Production environment requires COOKIE_SECURE to be true; insecure overrides (false) are disallowed'
    );
  });

  it('allows cookieSecure to be explicitly set to true or false in development mode', () => {
    const devTrue = loadConfig({
      NODE_ENV: 'development',
      COOKIE_SECURE: 'true',
    });
    expect(devTrue.cookieSecure).toBe(true);

    const devFalse = loadConfig({
      NODE_ENV: 'development',
      COOKIE_SECURE: 'false',
    });
    expect(devFalse.cookieSecure).toBe(false);

    const devUnset = loadConfig({
      NODE_ENV: 'development',
    });
    expect(devUnset.cookieSecure).toBe(false);
  });

  it('loads optional Cloudinary configuration when provided', () => {
    const config = loadConfig({
      NODE_ENV: 'development',
      CLOUDINARY_CLOUD_NAME: 'test_cloud',
      CLOUDINARY_API_KEY: '1234567890',
      CLOUDINARY_API_SECRET: 'test_secret_abc',
      CLOUDINARY_URL: 'cloudinary://1234567890:test_secret_abc@test_cloud',
      CLOUDINARY_FOLDER: 'Snaprice',
    });
    expect(config.cloudinaryCloudName).toBe('test_cloud');
    expect(config.cloudinaryApiKey).toBe('1234567890');
    expect(config.cloudinaryApiSecret).toBe('test_secret_abc');
    expect(config.cloudinaryUrl).toBe('cloudinary://1234567890:test_secret_abc@test_cloud');
    expect(config.cloudinaryFolder).toBe('Snaprice');

    const defaultConfig = loadConfig({
      NODE_ENV: 'development',
    });
    expect(defaultConfig.cloudinaryFolder).toBeUndefined();
  });

  it('loads optional MSG91 configuration when provided', () => {
    const config = loadConfig({
      NODE_ENV: 'development',
      MSG91_AUTHKEY: '430568Ad90Gy9O606935c11dP1',
      MSG91_EMAIL_DOMAIN: 'snap.palnadu.dev',
      MSG91_EMAIL_FROM: 'otp@snap.palnadu.dev',
      MSG91_EMAIL_TEMPLATE_ID: 'snap_otp',
    });
    expect(config.msg91AuthKey).toBe('430568Ad90Gy9O606935c11dP1');
    expect(config.msg91EmailDomain).toBe('snap.palnadu.dev');
    expect(config.msg91EmailFrom).toBe('otp@snap.palnadu.dev');
    expect(config.msg91EmailTemplateId).toBe('snap_otp');

    const defaultConfig = loadConfig({
      NODE_ENV: 'development',
    });
    expect(defaultConfig.msg91AuthKey).toBeUndefined();
  });
});
