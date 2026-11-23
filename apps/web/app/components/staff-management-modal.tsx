'use client';

import React, { useEffect, useState } from 'react';
import { StaffMember } from '@snapprint/contracts';
import {
  fetchStudioStaff,
  inviteStudioStaff,
  revokeStudioStaff,
} from '../../src/workspace-client';

interface StaffManagementModalProps {
  studioId: string;
  studioName?: string;
  onClose: () => void;
}

export function StaffManagementModal({
  studioId,
  studioName,
  onClose,
}: StaffManagementModalProps) {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [inviting, setInviting] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const loadStaff = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchStudioStaff(studioId);
      setStaff(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load staff roster');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStaff();
  }, [studioId]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setInviting(true);
    setError(null);
    try {
      const res = await inviteStudioStaff(studioId, { email: email.trim(), name: name.trim() || undefined });
      setStaff((prev) => [...prev.filter((s) => s.userId !== res.staff.userId), res.staff]);
      setEmail('');
      setName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to invite staff');
    } finally {
      setInviting(false);
    }
  };

  const handleRevoke = async (memberId: string) => {
    setRevokingId(memberId);
    setError(null);
    try {
      await revokeStudioStaff(studioId, memberId);
      setStaff((prev) => prev.filter((s) => s.id !== memberId && s.userId !== memberId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke staff access');
    } finally {
      setRevokingId(null);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="staff-modal-title"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        zIndex: 60,
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '520px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <h2 id="staff-modal-title" style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
              Staff & Permissions
            </h2>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
              {studioName || 'Studio Workspace'}
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#64748b' }}>
            ✕
          </button>
        </div>

        <div style={{ padding: '20px', overflowY: 'auto' }}>
          {error && (
            <div role="alert" style={{ padding: '8px 12px', backgroundColor: '#fef2f2', color: '#b91c1c', borderRadius: '6px', fontSize: '0.8125rem', marginBottom: '16px' }}>
              {error}
            </div>
          )}

          {/* Invite form */}
          <form onSubmit={handleInvite} style={{ marginBottom: '20px', padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '8px' }}>
              + Invite Team Member by Email
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
              <input
                type="email"
                placeholder="staff@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{ padding: '8px 10px', fontSize: '0.8125rem', border: '1px solid #cbd5e1', borderRadius: '6px' }}
              />
              <input
                type="text"
                placeholder="Name (Optional)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{ padding: '8px 10px', fontSize: '0.8125rem', border: '1px solid #cbd5e1', borderRadius: '6px' }}
              />
            </div>
            <button
              type="submit"
              disabled={inviting || !email.trim()}
              style={{
                width: '100%',
                padding: '8px 12px',
                backgroundColor: '#0284c7',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 600,
                fontSize: '0.8125rem',
                cursor: inviting ? 'not-allowed' : 'pointer',
                opacity: inviting ? 0.7 : 1,
              }}
            >
              {inviting ? 'Inviting...' : 'Send Staff Invitation'}
            </button>
          </form>

          {/* Staff list */}
          <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '8px' }}>
            Active Staff Roster ({staff.length})
          </span>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: '#64748b', fontSize: '0.875rem' }}>
              Loading staff members...
            </div>
          ) : staff.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '16px 0', color: '#64748b', fontSize: '0.8125rem' }}>
              No staff members invited yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {staff.map((member) => (
                <div
                  key={member.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0f172a' }}>
                      {member.name || member.email}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      {member.email} • <span style={{ textTransform: 'capitalize', color: member.status === 'active' ? '#16a34a' : '#b45309' }}>{member.status}</span>
                    </div>
                  </div>
                  {member.role === 'studio_staff' && (
                    <button
                      type="button"
                      onClick={() => handleRevoke(member.id)}
                      disabled={revokingId === member.id}
                      style={{
                        padding: '4px 8px',
                        backgroundColor: '#fff1f2',
                        color: '#e11d48',
                        border: '1px solid #fecdd3',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: revokingId === member.id ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {revokingId === member.id ? 'Revoking…' : 'Revoke'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
