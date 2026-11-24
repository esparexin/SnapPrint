'use client';

import React from 'react';
import { OrderRecord } from '@snapprint/contracts';
import { counterPaymentModalStyles as styles } from './counter-payment-modal-styles.js';

interface CounterPaymentBillCardProps {
  order: OrderRecord;
  formattedRemaining: string;
}

export function CounterPaymentBillCard({ order, formattedRemaining }: CounterPaymentBillCardProps) {
  return (
    <>
      <div style={styles.infoBox}>
        <div>
          <strong>Order:</strong> #{order.orderNumber} ({order.customerName || 'Walk-in Customer'})
        </div>
        <div style={{ marginTop: '4px', color: '#64748b' }}>
          Predefined print charges calculate the exact bill. No manual amount entry needed.
        </div>
      </div>

      <div style={styles.amountBox}>
        <div
          style={{
            fontSize: '12px',
            color: '#15803d',
            fontWeight: 600,
            textTransform: 'uppercase',
          }}
        >
          Exact Bill to Collect
        </div>
        <div style={{ fontSize: '32px', fontWeight: 800, color: '#166534', marginTop: '4px' }}>
          ₹{formattedRemaining}
        </div>
      </div>
    </>
  );
}
