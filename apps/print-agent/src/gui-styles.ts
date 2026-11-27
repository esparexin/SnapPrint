export function getGuiStyles(): string {
  return `
    :root {
      --bg: #f1f5f9;
      --surface: #ffffff;
      --surface-subtle: #f8fafc;
      --border: #e2e8f0;
      --border-strong: #cbd5e1;
      --text: #0f172a;
      --text-secondary: #475569;
      --muted: #64748b;
      --brand: #0284c7;
      --brand-hover: #0369a1;
      --brand-soft: #e0f2fe;
      --success: #059669;
      --success-bg: #ecfdf5;
      --success-border: #a7f3d0;
      --danger: #dc2626;
      --danger-bg: #fef2f2;
      --danger-border: #fecaca;
      --warning: #b45309;
      --warning-bg: #fef3c7;
      --shadow-sm: 0 1px 2px rgba(15, 23, 42, 0.04);
      --shadow-md: 0 4px 16px rgba(15, 23, 42, 0.06);
      --radius-lg: 14px;
      --radius-md: 10px;
      --radius-sm: 8px;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(180deg, #f8fafc 0%, var(--bg) 100%);
      color: var(--text);
      min-height: 100vh;
      padding: 20px 16px 28px;
      -webkit-font-smoothing: antialiased;
      display: flex;
      justify-content: center;
    }
    .shell { width: 100%; max-width: 640px; display: flex; flex-direction: column; gap: 14px; }
    .header { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 4px 2px; flex-wrap: wrap; }
    .brand { display: flex; align-items: center; gap: 12px; min-width: 0; }
    .logo {
      width: 38px; height: 38px; flex-shrink: 0;
      background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);
      border-radius: 11px; display: flex; align-items: center; justify-content: center;
      color: #fff; box-shadow: 0 4px 10px rgba(2, 132, 199, 0.25);
    }
    .title { font-size: 1rem; font-weight: 700; letter-spacing: -0.02em; line-height: 1.25; }
    .subtitle { font-size: 0.75rem; color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 240px; }
    .header-actions { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
    .version-pill {
      font-size: 0.72rem; font-weight: 600; color: var(--text-secondary);
      background: var(--surface); border: 1px solid var(--border);
      padding: 4px 9px; border-radius: 999px;
    }
    .icon-btn {
      width: 32px; height: 32px; border-radius: 9px;
      border: 1px solid var(--border); background: var(--surface);
      color: var(--text-secondary); cursor: pointer;
      display: inline-flex; align-items: center; justify-content: center;
      transition: background 0.15s, border-color 0.15s, color 0.15s;
    }
    .icon-btn:hover { background: var(--surface-subtle); border-color: var(--border-strong); color: var(--text); }
    .icon-btn.active { background: var(--brand-soft); border-color: #7dd3fc; color: var(--brand-hover); }
    .btn-update {
      padding: 5px 10px; border-radius: 999px; font-size: 0.72rem; font-weight: 600;
      border: 1px solid var(--border); background: var(--surface); color: var(--text-secondary);
      cursor: pointer; display: inline-flex; align-items: center; gap: 4px; transition: all 0.15s ease;
    }
    .btn-update:hover:not(:disabled) { border-color: var(--brand); color: var(--brand-hover); background: var(--brand-soft); }
    .btn-update.ready { background: var(--success); border-color: var(--success); color: #fff; }
    .btn-update.ready:hover:not(:disabled) { background: #047857; border-color: #047857; color: #fff; }
    .card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 18px; box-shadow: var(--shadow-sm); }
    .stack { display: flex; flex-direction: column; gap: 12px; }
    .card-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 12px; }
    .card-title { font-size: 0.92rem; font-weight: 700; letter-spacing: -0.01em; display: flex; align-items: center; gap: 8px; }
    .count-pill {
      font-size: 0.7rem; font-weight: 700; color: var(--muted);
      background: var(--surface-subtle); border: 1px solid var(--border); padding: 1px 7px; border-radius: 999px;
    }
    .helper { font-size: 0.82rem; color: var(--muted); line-height: 1.5; margin-bottom: 12px; }
    .status-badge { display: inline-flex; align-items: center; gap: 6px; font-size: 0.75rem; font-weight: 600; padding: 4px 10px; border-radius: 999px; }
    .status-badge.online { background: var(--success-bg); color: var(--success); border: 1px solid var(--success-border); }
    .status-badge.offline { background: var(--surface-subtle); color: var(--muted); border: 1px solid var(--border); }
    .dot { width: 7px; height: 7px; border-radius: 50%; background: currentColor; }
    .status-badge.online .dot { box-shadow: 0 0 0 3px rgba(5, 150, 105, 0.18); }
    .inline-form { display: flex; gap: 8px; align-items: stretch; }
    .field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; }
    .label { font-size: 0.78rem; font-weight: 600; color: var(--text-secondary); }
    .input {
      flex: 1; min-width: 0; padding: 10px 12px; font-size: 0.88rem; color: var(--text);
      background: var(--surface); border: 1px solid var(--border-strong); border-radius: var(--radius-md);
      transition: border-color 0.15s, box-shadow 0.15s;
    }
    .input.mono { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; letter-spacing: 0.06em; }
    .input:focus { outline: none; border-color: var(--brand); box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.14); }
    .btn {
      padding: 10px 16px; border: none; border-radius: var(--radius-md); font-weight: 600; font-size: 0.84rem;
      cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 7px;
      transition: all 0.15s ease; white-space: nowrap;
    }
    .btn:disabled { opacity: 0.6; cursor: not-allowed; }
    .btn-primary { background: var(--brand); color: #fff; }
    .btn-primary:hover:not(:disabled) { background: var(--brand-hover); }
    .btn-outline { background: var(--surface); border: 1px solid var(--border-strong); color: var(--text-secondary); }
    .btn-outline:hover:not(:disabled) { background: var(--surface-subtle); color: var(--text); }
    .btn-danger-ghost { background: var(--danger-bg); color: var(--danger); border: 1px solid var(--danger-border); }
    .btn-danger-ghost:hover:not(:disabled) { background: #fee2e2; }
    .btn-sm { padding: 6px 11px; font-size: 0.76rem; border-radius: var(--radius-sm); }
    .meta-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; margin-bottom: 12px; }
    .meta-box { background: var(--surface-subtle); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 9px 11px; }
    .meta-key { font-size: 0.7rem; color: var(--muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 2px; }
    .meta-val { font-size: 0.8rem; font-weight: 600; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .list { display: flex; flex-direction: column; gap: 8px; max-height: 220px; overflow-y: auto; }
    .row {
      display: flex; align-items: center; justify-content: space-between; gap: 10px;
      padding: 10px 12px; background: var(--surface-subtle); border: 1px solid var(--border); border-radius: var(--radius-md);
    }
    .row-main { display: flex; align-items: center; gap: 10px; min-width: 0; }
    .row-icon {
      width: 30px; height: 30px; border-radius: 8px; flex-shrink: 0;
      background: var(--surface); border: 1px solid var(--border);
      display: flex; align-items: center; justify-content: center; color: var(--text-secondary);
    }
    .row-title { font-size: 0.83rem; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .row-sub { font-size: 0.72rem; color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .tags { display: flex; align-items: center; gap: 5px; flex-shrink: 0; }
    .tag { font-size: 0.7rem; padding: 3px 8px; border-radius: 999px; font-weight: 600; }
    .tag-color { background: #eff6ff; color: #1d4ed8; }
    .tag-bw { background: #e2e8f0; color: #334155; }
    .tag-success { background: var(--success-bg); color: var(--success); }
    .tag-warning { background: var(--warning-bg); color: var(--warning); }
    .tag-danger { background: var(--danger-bg); color: var(--danger); }
    .tag-default { background: var(--warning-bg); color: var(--warning); }
    .empty { text-align: center; padding: 20px 12px; color: var(--muted); font-size: 0.8rem; display: flex; flex-direction: column; align-items: center; gap: 6px; }
    .empty-title { font-weight: 600; color: var(--text-secondary); font-size: 0.82rem; }
    .confirm-bar {
      display: none; align-items: center; justify-content: space-between; gap: 8px;
      padding: 10px 12px; background: var(--danger-bg); border: 1px solid var(--danger-border);
      border-radius: var(--radius-md); font-size: 0.8rem; color: #991b1b; font-weight: 600;
    }
    .confirm-bar.show { display: flex; }
    .footer { text-align: center; font-size: 0.74rem; color: var(--muted); margin-top: auto; padding-top: 4px; }
    .toast {
      position: fixed; bottom: 18px; left: 50%; transform: translateX(-50%) translateY(16px);
      padding: 9px 14px; border-radius: 999px; font-size: 0.8rem; font-weight: 600;
      box-shadow: var(--shadow-md); opacity: 0; pointer-events: none;
      transition: opacity 0.18s ease, transform 0.18s ease; z-index: 50; max-width: calc(100vw - 32px); text-align: center;
    }
    .toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }
    .toast.success { background: #0f172a; color: #fff; }
    .toast.error { background: var(--danger); color: #fff; }
    .spin { animation: spin 0.9s linear infinite; }
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    @media (max-width: 520px) { .inline-form { flex-direction: column; } .meta-grid { grid-template-columns: 1fr; } }
  `;
}
