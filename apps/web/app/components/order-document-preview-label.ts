import React from 'react';

export function resolveDocumentPreviewStatus(
  isUnavailable: boolean,
  isCancelled: boolean,
  isDeleted: boolean,
  filename: string
) {
  if (isUnavailable) {
    return {
      title: 'Document preview is unavailable (file not found in storage)',
      label: '🚫 No Preview',
    };
  }
  if (isCancelled) {
    return {
      title: 'Document preview is unavailable for cancelled orders',
      label: '🚫 Preview',
    };
  }
  if (isDeleted) {
    return {
      title: 'Document was permanently deleted',
      label: '🔒 Deleted',
    };
  }
  return {
    title: `Preview ${filename}`,
    label: '📄 Preview',
  };
}

export const rowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  fontSize: '12px',
  marginBottom: '6px',
  flexWrap: 'wrap',
  gap: '6px',
  padding: '4px 0',
};

export const nameWrapStyle: React.CSSProperties = {
  maxWidth: 'min(300px, 45vw)',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  display: 'inline-block',
};

export const getPreviewStyle = (avail: boolean): React.CSSProperties => ({
  minHeight: '36px',
  padding: '4px 10px',
  backgroundColor: !avail ? '#f1f5f9' : '#f0f9ff',
  border: `1px solid ${!avail ? '#cbd5e1' : '#bae6fd'}`,
  borderRadius: '4px',
  fontSize: '11px',
  color: !avail ? '#94a3b8' : '#0284c7',
  fontWeight: 600,
  cursor: !avail ? 'not-allowed' : 'pointer',
  opacity: !avail ? 0.65 : 1,
  display: 'inline-flex',
  alignItems: 'center',
});

export const purgeBtnStyle: React.CSSProperties = {
  minHeight: '36px',
  padding: '4px 8px',
  backgroundColor: '#fee2e2',
  border: '1px solid #fecaca',
  borderRadius: '4px',
  fontSize: '11px',
  color: '#991b1b',
  fontWeight: 600,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
};

export const deletedBadgeStyle: React.CSSProperties = {
  padding: '2px 6px',
  backgroundColor: '#f1f5f9',
  color: '#64748b',
  borderRadius: '4px',
  fontSize: '10px',
  fontWeight: 700,
};
