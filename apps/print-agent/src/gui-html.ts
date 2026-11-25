export const FAVICON_BASE64 =
  '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';

export function getGuiHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="icon" type="image/png" href="data:image/png;base64,${FAVICON_BASE64}">
  <title>SnapPrint Print Agent</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f8fafc; color: #0f172a; padding: 20px; display: flex; flex-direction: column; gap: 16px; min-height: 100vh; }
    .header { display: flex; align-items: center; justify-content: space-between; padding-bottom: 14px; border-bottom: 1px solid #e2e8f0; }
    .brand { display: flex; align-items: center; gap: 10px; }
    .logo { width: 34px; height: 34px; background: #0284c7; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 800; }
    .title { font-size: 1.1rem; font-weight: 700; }
    .server-row { font-size: 0.75rem; color: #64748b; display: flex; align-items: center; gap: 6px; }
    .link-btn { background: none; border: none; color: #0284c7; cursor: pointer; font-size: 0.725rem; text-decoration: underline; padding: 0; }
    .card { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
    .card-title { font-size: 0.925rem; font-weight: 600; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; }
    .status-badge { display: inline-flex; align-items: center; gap: 6px; font-size: 0.8rem; font-weight: 600; padding: 3px 8px; border-radius: 999px; }
    .status-badge.online { background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; }
    .status-badge.offline { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }
    .dot { width: 8px; height: 8px; border-radius: 50%; background: currentColor; }
    .field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; }
    .label { font-size: 0.8rem; font-weight: 600; color: #475569; }
    .input { padding: 9px 12px; font-size: 0.95rem; border: 1px solid #cbd5e1; border-radius: 8px; width: 100%; font-family: monospace; }
    .input:focus { outline: none; border-color: #0284c7; }
    .btn { padding: 10px 14px; border: none; border-radius: 8px; font-weight: 600; font-size: 0.875rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; width: 100%; }
    .btn-primary { background: #0284c7; color: #fff; }
    .btn-primary:hover { background: #0369a1; }
    .btn-outline { background: transparent; border: 1px solid #cbd5e1; color: #475569; }
    .btn-outline:hover { background: #f1f5f9; }
    .btn-danger { background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }
    .printer-list { display: flex; flex-direction: column; gap: 6px; max-height: 180px; overflow-y: auto; }
    .printer-item { display: flex; align-items: center; justify-content: space-between; padding: 8px 10px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 0.825rem; }
    .tag { font-size: 0.675rem; padding: 2px 6px; border-radius: 4px; font-weight: 600; }
    .tag-color { background: #eff6ff; color: #1d4ed8; }
    .tag-bw { background: #f1f5f9; color: #475569; }
    .alert { padding: 8px 12px; border-radius: 6px; font-size: 0.825rem; display: none; }
    .alert-error { background: #fef2f2; color: #991b1b; border: 1px solid #fecaca; }
    .alert-success { background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; }
    .footer { text-align: center; font-size: 0.75rem; color: #94a3b8; margin-top: auto; padding-top: 8px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="brand">
      <div class="logo">SP</div>
      <div>
        <div class="title">SnapPrint Print Agent</div>
        <div class="server-row">
          <span id="serverLabel">https://snapprint.onrender.com</span>
          <button class="link-btn" onclick="toggleServerEdit()">change</button>
        </div>
      </div>
    </div>
    <span style="font-size: 0.75rem; background: #e2e8f0; padding: 2px 8px; border-radius: 999px;">v0.1.0</span>
  </div>

  <div id="serverEditBox" style="display: none; padding: 10px; background: #fff; border: 1px solid #cbd5e1; border-radius: 8px;">
    <div class="field" style="margin-bottom: 8px;">
      <label class="label">Backend API URL</label>
      <input class="input" id="serverInput" style="font-size: 0.825rem; padding: 6px 10px;" />
    </div>
    <div style="display: flex; gap: 6px;">
      <button class="btn btn-primary" style="padding: 6px;" onclick="saveServer()">Save</button>
      <button class="btn btn-outline" style="padding: 6px;" onclick="resetServer()">Reset</button>
      <button class="btn btn-outline" style="padding: 6px;" onclick="toggleServerEdit()">Cancel</button>
    </div>
  </div>

  <div id="alertBox" class="alert"></div>

  <div class="card">
    <div class="card-title">
      <span>Studio Connection</span>
      <span class="status-badge offline" id="statusBadge"><span class="dot"></span><span id="statusText">Not Connected</span></span>
    </div>
    <div id="unpairedView">
      <div class="field">
        <label class="label" for="pairingInput">16-Character Pairing Code</label>
        <input class="input" id="pairingInput" type="text" placeholder="SNAP-XXXX-YYYY" maxlength="19" autocomplete="off" />
      </div>
      <button class="btn btn-primary" id="pairBtn" onclick="pairDevice()">Connect to Studio</button>
    </div>
    <div id="pairedView" style="display: none;">
      <div style="display: flex; flex-direction: column; gap: 6px; font-size: 0.825rem; margin-bottom: 12px;">
        <div style="display: flex; justify-content: space-between;"><span style="color: #64748b;">Studio ID:</span><span id="studioIdVal" style="font-weight: 600;"></span></div>
        <div style="display: flex; justify-content: space-between;"><span style="color: #64748b;">Device ID:</span><span id="deviceIdVal" style="font-family: monospace;"></span></div>
        <div style="display: flex; justify-content: space-between;"><span style="color: #64748b;">Status:</span><span style="color: #047857; font-weight: 600;">Listening for jobs</span></div>
      </div>
      <button class="btn btn-danger" onclick="unpairDevice()">Unpair This Computer</button>
    </div>
  </div>

  <div class="card">
    <div class="card-title">
      <span>Local Discovered Printers</span>
      <button class="btn btn-outline" style="width: auto; padding: 3px 8px; font-size: 0.75rem;" onclick="loadPrinters()">↻ Scan</button>
    </div>
    <div class="printer-list" id="printersList">
      <div id="printersLoading" style="color: #64748b; font-size: 0.8rem; text-align: center; padding: 12px;">Scanning for printers...</div>
    </div>
  </div>

  <div class="footer">Runs in background. You may minimize or close this window without stopping prints.</div>

  <script>
    function toggleServerEdit() {
      const box = document.getElementById('serverEditBox');
      box.style.display = box.style.display === 'none' ? 'block' : 'none';
      if (box.style.display === 'block') document.getElementById('serverInput').value = document.getElementById('serverLabel').textContent;
    }
    async function saveServer() {
      const url = document.getElementById('serverInput').value.trim();
      const res = await fetch('/api/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ apiUrl: url }) });
      if (res.ok) { toggleServerEdit(); await loadState(); showAlert('Server updated.', 'success'); }
      else { showAlert('Invalid server URL.', 'error'); }
    }
    async function resetServer() {
      document.getElementById('serverInput').value = 'https://snapprint.onrender.com';
      await saveServer();
    }
    async function loadState() {
      try {
        const res = await fetch('/api/state');
        const data = await res.json();
        document.getElementById('serverLabel').textContent = data.apiUrl;
        const enrolled = Boolean(data.isEnrolled);
        document.getElementById('unpairedView').style.display = enrolled ? 'none' : 'block';
        document.getElementById('pairedView').style.display = enrolled ? 'block' : 'none';
        document.getElementById('statusBadge').className = 'status-badge ' + (enrolled ? 'online' : 'offline');
        document.getElementById('statusText').textContent = enrolled ? 'Connected' : 'Not Connected';
        if (enrolled) {
          document.getElementById('studioIdVal').textContent = data.studioId || '';
          document.getElementById('deviceIdVal').textContent = data.deviceId || '';
        }
      } catch (err) { showAlert('Failed to connect to agent service', 'error'); }
    }
    async function loadPrinters() {
      const list = document.getElementById('printersList');
      list.innerHTML = '<div style=\"color:#64748b;font-size:0.8rem;text-align:center;padding:12px;\">Scanning for printers...</div>';
      try {
        const res = await fetch('/api/printers');
        const data = await res.json();
        renderPrinters(data.printers || []);
      } catch {
        list.innerHTML = '<div style=\"color:#94a3b8;font-size:0.8rem;text-align:center;padding:12px;\">Could not scan printers.</div>';
      }
    }
    function renderPrinters(printers) {
      const list = document.getElementById('printersList');
      if (!printers || printers.length === 0) {
        list.innerHTML = '<div style=\"color:#94a3b8;font-size:0.8rem;text-align:center;padding:12px;\">No printers detected.</div>';
        return;
      }
      list.innerHTML = printers.map(p => {
        const tag = p.isColorSupported ? '<span class=\"tag tag-color\">Color</span>' : '<span class=\"tag tag-bw\">B&amp;W</span>';
        const d = p.isDefault ? '<span class=\"tag\" style=\"background:#fef3c7;color:#92400e;\">Default</span>' : '';
        return '<div class=\"printer-item\"><span>' + escapeHtml(p.name) + '</span><div style=\"display:flex;gap:4px;\">' + tag + d + '</div></div>';
      }).join('');
    }
    async function pairDevice() {
      const code = document.getElementById('pairingInput').value.trim().toUpperCase();
      if (!code) return showAlert('Please enter pairing code.', 'error');
      const btn = document.getElementById('pairBtn');
      btn.disabled = true; btn.textContent = 'Connecting...';
      try {
        const res = await fetch('/api/pair', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pairingCode: code }) });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Pairing failed');
        showAlert('Successfully connected to Studio!', 'success');
        document.getElementById('pairingInput').value = '';
        await loadState();
      } catch (err) { showAlert(err.message, 'error'); }
      finally { btn.disabled = false; btn.textContent = 'Connect to Studio'; }
    }
    async function unpairDevice() {
      if (!confirm('Unpair this computer?')) return;
      const res = await fetch('/api/unpair', { method: 'POST' });
      if (res.ok) { showAlert('Unpaired successfully.', 'success'); await loadState(); }
    }
    function showAlert(msg, type) {
      const box = document.getElementById('alertBox');
      box.textContent = msg;
      box.className = 'alert ' + (type === 'error' ? 'alert-error' : 'alert-success');
      box.style.display = 'block';
      setTimeout(() => { box.style.display = 'none'; }, 4000);
    }
    function escapeHtml(s) {
      return (s || '').replace(/[&<>"']/g, m => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', \"'\":'&#39;' })[m]);
    }
    loadState();
    loadPrinters();
    setInterval(loadState, 15000);
  </script>
</body>
</html>`;
}
