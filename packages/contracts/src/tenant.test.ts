import { describe, expect, it } from 'vitest';
import {
  PublicStudioSchema,
  StudioIdSchema,
  StudioNameSchema,
  StudioSchema,
  StudioSettingsSchema,
  StudioSlugSchema,
} from './tenant.js';

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

  it('validates and trims studio names', () => {
    expect(StudioNameSchema.parse('  Photo Studio  ')).toBe('Photo Studio');
    expect(StudioNameSchema.safeParse('').success).toBe(false);
    expect(StudioNameSchema.safeParse('   ').success).toBe(false);
    expect(StudioNameSchema.safeParse('A'.repeat(121)).success).toBe(false);
  });

  it('validates studio slug constraints', () => {
    expect(StudioSlugSchema.safeParse('koramangala-xerox-01').success).toBe(true);
    expect(StudioSlugSchema.safeParse('ab').success).toBe(false); // too short (<3)
    expect(StudioSlugSchema.safeParse('a'.repeat(65)).success).toBe(false); // too long (>64)
    expect(StudioSlugSchema.safeParse('Invalid_Slug!').success).toBe(false);
    expect(StudioSlugSchema.safeParse('Studio-Caps').success).toBe(false);
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

  it('validates public studio contract without internal settings exposure', () => {
    const publicStudio = {
      id: 'studio_abc',
      slug: 'studio-abc',
      name: 'ABC Photo Prints',
      status: 'active',
      currency: 'INR',
      contactPhone: '+919876543210',
      contactEmail: 'contact@abc.in',
    };
    expect(PublicStudioSchema.safeParse(publicStudio).success).toBe(true);

    // Invalid slug with uppercase or special characters
    expect(PublicStudioSchema.safeParse({ ...publicStudio, slug: 'Invalid_Slug!' }).success).toBe(
      false
    );
  });
});
