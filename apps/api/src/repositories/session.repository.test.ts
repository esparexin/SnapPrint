import { describe, expect, it } from 'vitest';
import { CustomerQrSession } from '@snapprint/contracts';
import { toSessionContract, toSessionDocument } from './session.repository.js';

describe('Session Persistence & TTL BSON Date Handling', () => {
  const mockSessionContract: CustomerQrSession = {
    sessionId: 'session_1234567890abcdef',
    studioId: 'studio_alpha',
    status: 'active',
    createdAt: '2026-11-21T14:00:00.000Z',
    expiresAt: '2026-11-21T16:00:00.000Z',
  };

  it('converts contract ISO strings to native BSON Date objects for MongoDB TTL indexing', () => {
    const doc = toSessionDocument(mockSessionContract);

    // MongoDB TTL background monitor strictly requires BSON Date (instanceof Date)
    expect(doc.expiresAt).toBeInstanceOf(Date);
    expect(doc.createdAt).toBeInstanceOf(Date);
    expect(typeof doc.expiresAt).not.toBe('string');

    // Values should match the exact timestamps
    expect(doc.expiresAt.getTime()).toBe(new Date('2026-11-21T16:00:00.000Z').getTime());
    expect(doc.createdAt.getTime()).toBe(new Date('2026-11-21T14:00:00.000Z').getTime());
    expect(doc.sessionId).toBe(mockSessionContract.sessionId);
    expect(doc.studioId).toBe(mockSessionContract.studioId);
  });

  it('converts MongoDB document back to validated CustomerQrSession contract with ISO strings', () => {
    const doc = {
      sessionId: 'session_1234567890abcdef',
      studioId: 'studio_alpha',
      status: 'active' as const,
      createdAt: new Date('2026-11-21T14:00:00.000Z'),
      expiresAt: new Date('2026-11-21T16:00:00.000Z'),
    };

    const contract = toSessionContract(doc);

    expect(typeof contract.createdAt).toBe('string');
    expect(typeof contract.expiresAt).toBe('string');
    expect(contract.createdAt).toBe('2026-11-21T14:00:00.000Z');
    expect(contract.expiresAt).toBe('2026-11-21T16:00:00.000Z');
    expect(contract.sessionId).toBe(doc.sessionId);
    expect(contract.studioId).toBe(doc.studioId);
  });

  it('throws an error if given an unparseable timestamp', () => {
    const invalidSession = {
      ...mockSessionContract,
      expiresAt: 'not-a-valid-date',
    };

    expect(() => toSessionDocument(invalidSession as unknown as CustomerQrSession)).toThrow(
      'Invalid timestamp provided for session document persistence'
    );
  });
});
