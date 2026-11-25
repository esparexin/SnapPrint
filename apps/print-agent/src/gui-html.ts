export function getGuiHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SnapPrint Print Agent</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: #f8fafc; color: #0f172a; padding: 24px; min-height: 100vh;
      display: flex; flex-direction: column; gap: 20px;
    }
    .header { display: flex; align-items: center; justify-content: space-between; padding-bottom: 16px; border-bottom: 1px solid #e2e8f0; }
    .brand { display: flex; align-items: center; gap: 10px; }
    .logo { width: 36px; height: 36px; background: #0284c7; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-weight: 800; font-size: 1.1rem; }
    .title { font-size: 1.15rem; font-weight: 700; }
    .version { font-size: 0.75rem; background: #e2e8f0; color: #475569; padding: 2px 8px; border-radius: 999px; font-weight: 600; }
    .card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
    .card-title { font-size: 0.95rem; font-weight: 600; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; }
    .status-badge { display: inline-flex; align-items: center; gap: 6px; font-size: 0.8rem; font-weight: 600; padding: 4px 10px; border-radius: 999px; }
    .status-badge.online { background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; }
    .status-badge.offline { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }
    .dot { width: 8px; height: 8px; border-radius: 50%; background: currentColor; }
    .field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; }
    .label { font-size: 0.825rem; font-weight: 600; color: #475569; }
    .input { padding: 10px 14px; font-size: 1rem; border: 1px solid #cbd5e1; border-radius: 8px; font-family: monospace; letter-spacing: 0.05em; text-transform: uppercase; width: 100%; }
    .input:focus { outline: none; border-color: #0284c7; box-shadow: 0 0 0 3px rgba(2,132,199,0.15); }
    .btn { padding: 11px 16px; border: none; border-radius: 8px; font-weight: 600; font-size: 0.9rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; width: 100%; transition: background 0.15s; }
    .btn-primary { background: #0284c7; color: white; }
    .btn-primary:hover { background: #0369a1; }
    .btn-primary:disabled { background: #94a3b8; cursor: not-allowed; }
    .btn-outline { background: transparent; border: 1px solid #cbd5e1; color: #475569; }
    .btn-outline:hover { background: #f1f5f9; }
    .btn-danger { background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }
    .btn-danger:hover { background: #fca5a5; }
    .printer-list { display: flex; flex-direction: column; gap: 8px; margin-top: 10px; max-height: 200px; overflow-y: auto; }
    .printer-item { display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 0.85rem; }
    .printer-name { font-weight: 600; color: #1e293b; }
    .printer-tags { display: flex; gap: 6px; align-items: center; }
    .tag { font-size: 0.7rem; padding: 2px 6px; border-radius: 4px; font-weight: 600; }
    .tag-color { background: #eff6ff; color: #1d4ed8; }
    .tag-bw { background: #f1f5f9; color: #475569; }
    .tag-default { background: #fef3c7; color: #92400e; }
    .alert { padding: 10px 14px; border-radius: 8px; font-size: 0.85rem; margin-bottom: 12px; display: none; }
    .alert-error { background: #fef2f2; color: #991b1b; border: 1px solid #fecaca; }
    .alert-success { background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; }
    .footer { text-align: center; font-size: 0.775rem; color: #94a3b8; margin-top: auto; padding-top: 16px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="brand">
      <div class="logo">SP</div>
      <div>
        <div class="title">SnapPrint Print Agent</div>
        <div style="font-size: 0.75rem; color: #64748b;" id="serverLabel">https://snapprint.onrender.com</div>
      </div>
    </div>
    <span class="version">v0.1.0</span>
  </div>

  <div id="alertBox" class="alert"></div>

  <div class="card" id="connectionCard">
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
      <div style="display: flex; flex-direction: column; gap: 8px; font-size: 0.85rem; margin-bottom: 16px;">
        <div style="display: flex; justify-content: space-between;"><span style="color: #64748b;">Studio ID:</span><span id="studioIdVal" style="font-weight: 600;"></span></div>
        <div style="display: flex; justify-content: space-between;"><span style="color: #64748b;">Device ID:</span><span id="deviceIdVal" style="font-family: monospace;"></span></div>
        <div style="display: flex; justify-content: space-between;"><span style="color: #64748b;">Daemon State:</span><span style="color: #047857; font-weight: 600;">Listening for jobs</span></div>
      </div>
      <button class="btn btn-danger" onclick="unpairDevice()">Unpair This Computer</button>
    </div>
  </div>

  <div class="card">
    <div class="card-title">
      <span>Local Discovered Printers</span>
      <button class="btn btn-outline" style="width: auto; padding: 4px 10px; font-size: 0.75rem;" onclick="refreshPrinters()">↻ Scan</button>
    </div>
    <div class="printer-list" id="printersList">
      <div style="color: #94a3b8; font-size: 0.825rem; text-align: center; padding: 12px;">Scanning printers...</div>
    </div>
  </div>

  <div class="footer">
    Background daemon active. You may close this window; the agent continues printing in the background.
  </div>

  <script>
    async function loadState() {
      try {
        const res = await fetch('/api/state');
        const data = await res.json();
        document.getElementById('serverLabel').textContent = data.apiUrl;
        
        if (data.isEnrolled) {
          document.getElementById('unpairedView').style.display = 'none';
          document.getElementById('pairedView').style.display = 'block';
          document.getElementById('statusBadge').className = 'status-badge online';
          document.getElementById('statusText').textContent = 'Connected';
          document.getElementById('studioIdVal').textContent = data.studioId || 'Enrolled';
          document.getElementById('deviceIdVal').textContent = data.deviceId || '';
        } else {
          document.getElementById('unpairedView').style.display = 'block';
          document.getElementById('pairedView').style.display = 'none';
          document.getElementById('statusBadge').className = 'status-badge offline';
          document.getElementById('statusText').textContent = 'Not Connected';
        }
        renderPrinters(data.printers || []);
      } catch (err) {
        showAlert('Failed to connect to agent service: ' + err.message, 'error');
      }
    }

    function renderPrinters(printers) {
      const container = document.getElementById('printersList');
      if (!printers || printers.length === 0) {
        container.innerHTML = '<div style="color: #94a3b8; font-size: 0.825rem; text-align: center; padding: 12px;">No printers detected on this computer.</div>';
        return;
      }
      container.innerHTML = printers.map(p => {
        const colorTag = p.isColorSupported ? '<span class="tag tag-color">Color</span>' : '<span class="tag tag-bw">B&W</span>';
        const defaultTag = p.isDefault ? '<span class="tag tag-default">Default</span>' : '';
        return '<div class="printer-item">' +
          '<div class="printer-name">' + escapeHtml(p.name) + '</div>' +
          '<div class="printer-tags">' + colorTag + defaultTag + '</div>' +
        '</div>';
      }).join('');
    }

    async function pairDevice() {
      const input = document.getElementById('pairingInput');
      const code = input.value.trim().toUpperCase();
      if (!code) { showAlert('Please enter your 16-character Pairing Code.', 'error'); return; }
      
      const btn = document.getElementById('pairBtn');
      btn.disabled = true;
      btn.textContent = 'Connecting...';
      
      try {
        const res = await fetch('/api/pair', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pairingCode: code })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Pairing failed');
        showAlert('Successfully connected to Studio!', 'success');
        input.value = '';
        await loadState();
      } catch (err) {
        showAlert(err.message, 'error');
      } finally {
        btn.disabled = false;
        btn.textContent = 'Connect to Studio';
      }
    }

    async function unpairDevice() {
      if (!confirm('Are you sure you want to unpair this computer?')) return;
      try {
        const res = await fetch('/api/unpair', { method: 'POST' });
        if (!res.ok) throw new Error('Unpair failed');
        showAlert('Computer unpaired successfully.', 'success');
        await loadState();
      } catch (err) {
        showAlert(err.message, 'error');
      }
    }

    async function refreshPrinters() {
      try {
        const res = await fetch('/api/sync', { method: 'POST' });
        const data = await res.json();
        renderPrinters(data.printers || []);
        showAlert('Printers refreshed.', 'success');
      } catch (err) {
        showAlert('Failed to refresh printers: ' + err.message, 'error');
      }
    }

    function showAlert(msg, type) {
      const box = document.getElementById('alertBox');
      box.textContent = msg;
      box.className = 'alert ' + (type === 'error' ? 'alert-error' : 'alert-success');
      box.style.display = 'block';
      setTimeout(() => { box.style.display = 'none'; }, 5000);
    }

    function escapeHtml(str) {
      return (str || '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m]);
    }

    loadState();
    setInterval(loadState, 10000);
  </script>
</body>
</html>`;
}
