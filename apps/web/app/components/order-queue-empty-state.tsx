'use client';

import React from 'react';

export function OrderQueueEmptyState() {
  return (
    <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
      <div style={{ fontSize: '32px', marginBottom: '8px' }}>📭</div>
      <div style={{ fontWeight: 600, fontSize: '15px' }}>No pending orders</div>
      <p style={{ fontSize: '13px', margin: '4px 0 0' }}>
        New print requests submitted by customers will show up here in real time.
      </p>
    </div>
  );
}
