'use client';

import React, { useEffect, useState } from 'react';
import { StaffMember } from '@snapprint/contracts';
import { fetchStudioStaff, inviteStudioStaff, revokeStudioStaff } from '../../src/workspace-client';
import { ModalSheetShell } from './modal-sheet-shell';
import { StaffInviteForm } from './staff-invite-form';
import { StaffManagementHeader } from './staff-management-header';
import { StaffRosterList } from './staff-roster-list';

interface StaffManagementModalProps {
  studioId: string;
  studioName?: string;
  onClose: () => void;
  inShell?: boolean;
}

export function StaffManagementModal({
  studioId,
  studioName,
  onClose,
  inShell = false,
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
    <ModalSheetShell
      onClose={onClose}
      titleId="staff-modal-title"
      maxWidth="520px"
      inShell={inShell}
      hideCloseButton={true}
      contentStyle={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
    >
      <StaffManagementHeader studioName={studioName} onClose={inShell ? undefined : onClose} />

      <div style={{ padding: '20px', overflowY: inShell ? 'visible' : 'auto' }}>
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
    </ModalSheetShell>
  );
}
