'use client';

import React from 'react';

export interface StaffInviteFormProps {
  email: string;
  setEmail: (val: string) => void;
  name: string;
  setName: (val: string) => void;
  inviting: boolean;
  onInvite: (e: React.FormEvent) => void;
}

export function StaffInviteForm({
  email,
  setEmail,
  name,
  setName,
  inviting,
  onInvite,
}: StaffInviteFormProps) {
  return (
    <form
      onSubmit={onInvite}
      style={{
        marginBottom: '20px',
        padding: '12px',
        backgroundColor: '#f8fafc',
        borderRadius: '8px',
        border: '1px solid #e2e8f0',
      }}
    >
      <span
        style={{
          fontSize: '0.8125rem',
          fontWeight: 700,
          color: '#334155',
          display: 'block',
          marginBottom: '8px',
        }}
      >
        + Invite Team Member by Email
      </span>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '8px',
          marginBottom: '8px',
        }}
      >
        <input
          type="email"
          placeholder="staff@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{
            padding: '8px 10px',
            fontSize: '0.8125rem',
            border: '1px solid #cbd5e1',
            borderRadius: '6px',
            width: '100%',
            minWidth: 0,
          }}
        />
        <input
          type="text"
          placeholder="Name (Optional)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{
            padding: '8px 10px',
            fontSize: '0.8125rem',
            border: '1px solid #cbd5e1',
            borderRadius: '6px',
            width: '100%',
            minWidth: 0,
          }}
        />
      </div>
      <button
        type="submit"
        disabled={inviting || !email.trim()}
        style={{
          width: '100%',
          minHeight: '40px',
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
  );
}
