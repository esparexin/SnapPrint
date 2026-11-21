import { describe, expect, it } from 'vitest';
import { StudioIdSchema, StudioSchema, StudioSettingsSchema } from './tenant.js';

describe('Tenant Contracts', () => {
  it('validates valid studio ids', () => {
    expect(StudioIdSchema.safeParse('studio_123').success).toBe(true);
    expect(StudioIdSchema.safeParse('std-koramangala-01').success).toBe(true);
  });

  it('rejects invalid studio ids', () => {
    expect(StudioIdSchema.safeParse('st').success).toBe(false); // too short
    expect(StudioIdSchema.safeParse('STUDIO_CAPS').success).toBe(false); // uppercase
    expect(StudioIdSchema.safeParse('studio@123').success).toBe(false); // special char
  });

  it('validates studio settings with max 2 active printers default', () => {
    const settings = StudioSettingsSchema.parse({});
    expect(settings.maxActivePrinters).toBe(2);
    expect(settings.currency).toBe('INR');

    // exceeds max 2 active printers
    expect(StudioSettingsSchema.safeParse({ maxActivePrinters: 3 }).success).toBe(false);
  });

  it('validates complete studio record', () => {
    const now = new Date().toISOString();
    const studio = {
      id: 'studio_abc',
      slug: 'studio-abc',
      name: 'ABC Photo Prints',
      status: 'active',
      settings: {
        currency: 'INR',
        maxActivePrinters: 2,
        autoApproveOrders: false,
      },
      createdAt: now,
      updatedAt: now,
    };
    expect(StudioSchema.safeParse(studio).success).toBe(true);
  });
});
