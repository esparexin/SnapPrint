import { AGENT_VERSION } from './agent-updater.js';
import { FAVICON_BASE64 } from './gui-assets.js';

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
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f8fafc; color: #0f172a; padding: 16px; display: flex; flex-direction: column; gap: 14px; min-height: 100vh; }
    .header { display: flex; align-items: center; justify-content: space-between; padding-bottom: 12px; border-bottom: 1px solid #e2e8f0; }
    .brand { display: flex; align-items: center; gap: 10px; }
    .logo { width: 34px; height: 34px; background: #0284c7; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 800; }
    .title { font-size: 1.1rem; font-weight: 700; }
    .server-row { font-size: 0.75rem; color: #64748b; display: flex; align-items: center; gap: 6px; }
    .link-btn { background: none; border: none; color: #0284c7; cursor: pointer; font-size: 0.725rem; text-decoration: underline; padding: 0; }
    .card { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
    .card-title { font-size: 0.9rem; font-weight: 600; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; }
    .status-badge { display: inline-flex; align-items: center; gap: 6px; font-size: 0.8rem; font-weight: 600; padding: 2px 8px; border-radius: 999px; }
    .status-badge.online { background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; }
    .status-badge.offline { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }
    .dot { width: 8px; height: 8px; border-radius: 50%; background: currentColor; }
    .field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 10px; }
    .label { font-size: 0.8rem; font-weight: 600; color: #475569; }
    .input { padding: 8px 10px; font-size: 0.9rem; border: 1px solid #cbd5e1; border-radius: 8px; width: 100%; font-family: monospace; }
    .input:focus { outline: none; border-color: #0284c7; }
    .btn { padding: 8px 12px; border: none; border-radius: 8px; font-weight: 600; font-size: 0.85rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; width: 100%; }
    .btn-primary { background: #0284c7; color: #fff; } .btn-primary:hover { background: #0369a1; }
    .btn-outline { background: transparent; border: 1px solid #cbd5e1; color: #475569; } .btn-outline:hover { background: #f1f5f9; }
    .btn-danger { background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }
    .list { display: flex; flex-direction: column; gap: 6px; max-height: 150px; overflow-y: auto; }
    .item { display: flex; align-items: center; justify-content: space-between; padding: 7px 9px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 0.8rem; }
    .tag { font-size: 0.675rem; padding: 2px 6px; border-radius: 4px; font-weight: 600; }
    .tag-color { background: #eff6ff; color: #1d4ed8; } .tag-bw { background: #f1f5f9; color: #475569; }
    .tag-success { background: #ecfdf5; color: #047857; } .tag-warning { background: #fef3c7; color: #92400e; } .tag-danger { background: #fef2f2; color: #991b1b; }
    .alert { padding: 8px 12px; border-radius: 6px; font-size: 0.825rem; display: none; }
    .alert-error { background: #fef2f2; color: #991b1b; border: 1px solid #fecaca; } .alert-success { background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; }
    .footer { text-align: center; font-size: 0.725rem; color: #94a3b8; margin-top: auto; padding-top: 6px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="brand">
      <div class="logo">SP</div>
      <div>
        <div class="title">SnapPrint Print Agent</div>
        <div class="server-row"><span id="serverLabel">https://snapprint.onrender.com</span><button class="link-btn" onclick="toggleServerEdit()">change</button></div>
      </div>
    </div>
    <div style="display:flex;align-items:center;gap:6px;">
      <button id="updateBtn" class="btn" style="display:none;width:auto;padding:2px 8px;font-size:0.75rem;background:#059669;color:#fff;" onclick="performUpdate()">Update</button>
      <span style="font-size:0.75rem;background:#e2e8f0;padding:2px 8px;border-radius:999px;">v${AGENT_VERSION}</span>
    </div>
  </div>

  <div id="serverEditBox" style="display:none;padding:10px;background:#fff;border:1px solid #cbd5e1;border-radius:8px;">
    <div class="field"><label class="label">Backend API URL</label><input class="input" id="serverInput" /></div>
    <div style="display:flex;gap:6px;"><button class="btn btn-primary" onclick="saveServer()">Save</button><button class="btn btn-outline" onclick="resetServer()">Reset</button><button class="btn btn-outline" onclick="toggleServerEdit()">Cancel</button></div>
  </div>

  <div id="alertBox" class="alert"></div>

  <div class="card">
    <div class="card-title"><span>Studio Connection</span><span class="status-badge offline" id="statusBadge"><span class="dot"></span><span id="statusText">Not Connected</span></span></div>
    <div id="unpairedView">
      <div class="field"><label class="label" for="pairingInput">16-Character Pairing Code</label><input class="input" id="pairingInput" type="text" placeholder="SNAP-XXXX-YYYY" maxlength="19" /></div>
      <button class="btn btn-primary" id="pairBtn" onclick="pairDevice()">Connect to Studio</button>
    </div>
    <div id="pairedView" style="display:none;">
      <div style="display:flex;flex-direction:column;gap:5px;font-size:0.8rem;margin-bottom:10px;">
        <div style="display:flex;justify-content:space-between;"><span style="color:#64748b;">Studio ID:</span><span id="studioIdVal" style="font-weight:600;"></span></div>
        <div style="display:flex;justify-content:space-between;"><span style="color:#64748b;">Device ID:</span><span id="deviceIdVal" style="font-family:monospace;"></span></div>
        <div style="display:flex;justify-content:space-between;"><span style="color:#64748b;">Status:</span><span style="color:#047857;font-weight:600;">Listening for jobs</span></div>
      </div>
      <button class="btn btn-danger" onclick="unpairDevice()">Unpair This Computer</button>
    </div>
  </div>

  <div class="card">
    <div class="card-title"><span>Local Discovered Printers</span><button class="btn btn-outline" style="width:auto;padding:2px 8px;font-size:0.75rem;" onclick="loadPrinters()">↻ Scan</button></div>
    <div class="list" id="printersList"><div style="color:#64748b;font-size:0.8rem;text-align:center;padding:8px;">Scanning...</div></div>
  </div>

  <div class="card">
    <div class="card-title"><span>Live Print Queue</span><button class="btn btn-outline" style="width:auto;padding:2px 8px;font-size:0.75rem;" onclick="loadJobs()">↻ Refresh</button></div>
    <div class="list" id="jobsList"><div style="color:#94a3b8;font-size:0.8rem;text-align:center;padding:8px;">No print jobs yet.</div></div>
  </div>

  <div class="footer">Runs in background. You may minimize or close this window without stopping prints.</div>

  <script>
    function toggleServerEdit() { const box = document.getElementById('serverEditBox'); box.style.display = box.style.display === 'none' ? 'block' : 'none'; if (box.style.display === 'block') document.getElementById('serverInput').value = document.getElementById('serverLabel').textContent; }
    async function saveServer() { const url = document.getElementById('serverInput').value.trim(); const res = await fetch('/api/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ apiUrl: url }) }); if (res.ok) { toggleServerEdit(); await loadState(); showAlert('Server updated.', 'success'); } else { showAlert('Invalid server URL.', 'error'); } }
    async function resetServer() { document.getElementById('serverInput').value = 'https://snapprint.onrender.com'; await saveServer(); }
    async function loadState() {
      try {
        const res = await fetch('/api/state'); const data = await res.json();
        document.getElementById('serverLabel').textContent = data.apiUrl;
        const enrolled = Boolean(data.isEnrolled);
        document.getElementById('unpairedView').style.display = enrolled ? 'none' : 'block';
        document.getElementById('pairedView').style.display = enrolled ? 'block' : 'none';
        document.getElementById('statusBadge').className = 'status-badge ' + (enrolled ? 'online' : 'offline');
        document.getElementById('statusText').textContent = enrolled ? 'Connected' : 'Not Connected';
        if (enrolled) { document.getElementById('studioIdVal').textContent = data.studioId || ''; document.getElementById('deviceIdVal').textContent = data.deviceId || ''; }
      } catch { showAlert('Failed to connect to agent service', 'error'); }
    }
    async function loadPrinters() {
      const list = document.getElementById('printersList'); list.innerHTML = '<div style="color:#64748b;font-size:0.8rem;text-align:center;padding:8px;">Scanning...</div>';
      try { const res = await fetch('/api/printers'); const data = await res.json(); renderPrinters(data.printers || []); }
      catch { list.innerHTML = '<div style="color:#94a3b8;font-size:0.8rem;text-align:center;padding:8px;">Could not scan printers.</div>'; }
    }
    function renderPrinters(printers) {
      const list = document.getElementById('printersList');
      if (!printers || !printers.length) { list.innerHTML = '<div style="color:#94a3b8;font-size:0.8rem;text-align:center;padding:8px;">No printers detected.</div>'; return; }
      list.innerHTML = printers.map(p => {
        const tag = p.isColorSupported ? '<span class="tag tag-color">Color</span>' : '<span class="tag tag-bw">B&amp;W</span>';
        const d = p.isDefault ? '<span class="tag" style="background:#fef3c7;color:#92400e;">Default</span>' : '';
        const st = p.status === 'error' ? '<span class="tag tag-danger">Error</span>' : p.status === 'offline' ? '<span class="tag tag-danger">Offline</span>' : '<span class="tag tag-success">Ready</span>';
        return '<div class="item"><span>' + escapeHtml(p.name) + '</span><div style="display:flex;gap:4px;">' + st + tag + d + '</div></div>';
      }).join('');
    }
    async function loadJobs() {
      try { const res = await fetch('/api/jobs'); const data = await res.json(); renderJobs(data.jobs || []); } catch {}
    }
    function renderJobs(jobs) {
      const list = document.getElementById('jobsList');
      if (!jobs || !jobs.length) { list.innerHTML = '<div style="color:#94a3b8;font-size:0.8rem;text-align:center;padding:8px;">No print jobs yet.</div>'; return; }
      list.innerHTML = jobs.map(j => {
        let tagCls = 'tag-bw'; let lbl = j.status;
        if (j.status === 'completed') { tagCls = 'tag-success'; lbl = 'Printed'; }
        else if (j.status === 'failed') { tagCls = 'tag-danger'; lbl = 'Failed'; }
        else if (j.status === 'processing') { tagCls = 'tag-warning'; lbl = 'Printing'; }
        const title = j.errorMessage ? ' title="' + escapeHtml(j.errorMessage) + '"' : '';
        const copies = j.copies && j.copies > 1 ? ' (' + j.copies + 'c)' : '';
        return '<div class="item"><div style="display:flex;flex-direction:column;gap:1px;max-width:70%;"><span style="font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + escapeHtml(j.filename) + copies + '</span><span style="font-size:0.675rem;color:#64748b;">' + escapeHtml(j.printerName) + ' &bull; ' + escapeHtml(j.jobId) + '</span></div><span class="tag ' + tagCls + '"' + title + '>' + escapeHtml(lbl) + '</span></div>';
      }).join('');
    }
    async function pairDevice() {
      const code = document.getElementById('pairingInput').value.trim().toUpperCase(); if (!code) return showAlert('Please enter pairing code.', 'error');
      const btn = document.getElementById('pairBtn'); btn.disabled = true; btn.textContent = 'Connecting...';
      try {
        const res = await fetch('/api/pair', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pairingCode: code }) });
        const data = await res.json(); if (!res.ok) throw new Error(data.message || 'Pairing failed');
        showAlert('Connected to Studio!', 'success'); document.getElementById('pairingInput').value = ''; await loadState();
      } catch (err) { showAlert(err.message, 'error'); } finally { btn.disabled = false; btn.textContent = 'Connect to Studio'; }
    }
    async function unpairDevice() { if (!confirm('Unpair this computer?')) return; const res = await fetch('/api/unpair', { method: 'POST' }); if (res.ok) { showAlert('Unpaired.', 'success'); await loadState(); } }
    function showAlert(msg, type) { const box = document.getElementById('alertBox'); box.textContent = msg; box.className = 'alert ' + (type === 'error' ? 'alert-error' : 'alert-success'); box.style.display = 'block'; setTimeout(() => { box.style.display = 'none'; }, 4000); }
    function escapeHtml(s) { return (s || '').replace(/[&<>"']/g, m => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[m]); }
    async function checkUpdates() {
      try {
        const res = await fetch('/api/update/check'); const data = await res.json(); const btn = document.getElementById('updateBtn');
        if (data && data.updateAvailable && data.latestVersion) { btn.textContent = '⚡ Update to v' + data.latestVersion; btn.style.display = 'inline-flex'; } else { btn.style.display = 'none'; }
      } catch {}
    }
    async function performUpdate() {
      const btn = document.getElementById('updateBtn'); btn.disabled = true; btn.textContent = 'Updating...'; showAlert('Downloading update...', 'success');
      try {
        const res = await fetch('/api/update/apply', { method: 'POST' }); const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.message || 'Update failed');
        btn.textContent = 'Restarting...';
        const interval = setInterval(async () => { try { const r = await fetch('/api/state'); if (r.ok) { clearInterval(interval); showAlert('Agent updated!', 'success'); loadState(); checkUpdates(); } } catch {} }, 2000);
      } catch (err) { showAlert(err.message, 'error'); btn.disabled = false; btn.textContent = 'Retry Update'; }
    }
    loadState(); loadPrinters(); loadJobs(); checkUpdates();
    setInterval(loadState, 15000); setInterval(loadJobs, 5000); setInterval(checkUpdates, 60000);
  </script>
</body>
</html>`;
}
