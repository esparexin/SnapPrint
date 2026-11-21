import { describe, expect, it } from 'vitest';
import { loadConfig } from './config.js';

describe('API Configuration', () => {
  it('loads valid configuration with defaults', () => {
    const config = loadConfig({});
    expect(config.port).toBe(3001);
    expect(config.host).toBe('127.0.0.1');
    expect(config.nodeEnv).toBe('development');
    expect(config.mongoDbName).toBe('snapprint');
    expect(config.logLevel).toBe('info');
    expect(config.mongoUri).toBeUndefined();
    expect(config.sessionSecret).toBeDefined();
    expect(config.sessionSecret.length).toBeGreaterThanOrEqual(32);
  });

  it('loads custom environment variables', () => {
    const config = loadConfig({
      PORT: '8080',
      HOST: '0.0.0.0',
      NODE_ENV: 'production',
      MONGODB_URI: 'mongodb://localhost:27017',
      MONGODB_DB_NAME: 'custom_db',
      LOG_LEVEL: 'warn',
      SESSION_SECRET: 'custom-production-secret-key-at-least-32-chars-long!',
    });
    expect(config.port).toBe(8080);
    expect(config.host).toBe('0.0.0.0');
    expect(config.nodeEnv).toBe('production');
    expect(config.mongoUri).toBe('mongodb://localhost:27017');
    expect(config.mongoDbName).toBe('custom_db');
    expect(config.logLevel).toBe('warn');
    expect(config.sessionSecret).toBe('custom-production-secret-key-at-least-32-chars-long!');
  });

  it('throws on invalid configuration', () => {
    expect(() =>
      loadConfig({
        PORT: '-1',
      })
    ).toThrow('Invalid application configuration');
  });

  it('throws on session secret too short', () => {
    expect(() =>
      loadConfig({
        SESSION_SECRET: 'too-short',
      })
    ).toThrow('Invalid application configuration');
  });
});
