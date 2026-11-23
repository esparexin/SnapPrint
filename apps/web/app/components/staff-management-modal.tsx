'use client';

import React, { useEffect, useState } from 'react';
import { StaffMember } from '@snapprint/contracts';
import { fetchStudioStaff, inviteStudioStaff, revokeStudioStaff } from '../../src/workspace-client';
import { StaffInviteForm } from './staff-invite-form';
import { StaffRosterList } from './staff-roster-list';

interface StaffManagementModalProps {
  studioId: string;
  studioName?: string;
  onClose: () => void;
}

export function StaffManagementModal({ studioId, studioName, onClose }: StaffManagementModalProps) {
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
      const res = await inviteStudioStaff(studioId, {
        email: email.trim(),
        name: name.trim() || undefined,
      });
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
            <h2
              id="staff-modal-title"
              style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0, color: '#0f172a' }}
            >
              Staff & Permissions
            </h2>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
              {studioName || 'Studio Workspace'}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.25rem',
              cursor: 'pointer',
              color: '#64748b',
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ padding: '20px', overflowY: 'auto' }}>
          {error && (
            <div
              role="alert"
              style={{
                padding: '8px 12px',
                backgroundColor: '#fef2f2',
                color: '#b91c1c',
                borderRadius: '6px',
                fontSize: '0.8125rem',
                marginBottom: '16px',
              }}
            >
              {error}
            </div>
          )}

          <StaffInviteForm
            email={email}
            setEmail={setEmail}
            name={name}
            setName={setName}
            inviting={inviting}
            onInvite={handleInvite}
          />

          <span
            style={{
              fontSize: '0.8125rem',
              fontWeight: 700,
              color: '#334155',
              display: 'block',
              marginBottom: '8px',
            }}
          >
            Active Staff Roster ({staff.length})
          </span>

          <StaffRosterList
            staff={staff}
            loading={loading}
            revokingId={revokingId}
            onRevoke={handleRevoke}
          />
        </div>
      </div>
    </div>
  );
}
