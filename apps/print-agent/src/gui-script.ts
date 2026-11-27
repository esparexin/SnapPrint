import { AGENT_VERSION } from './agent-updater.js';

export function getGuiScript(): string {
  return `
    let currentWebUrl = '';
    let defaultApiEndpoint = '';
    let toastTimer = null;
    let pendingUpdateVersion = null;
    const $ = (id) => document.getElementById(id);

    function openWebPortal() {
      const url = currentWebUrl || 'https://snap.palnadu.dev';
      window.open(url.replace(/[/]+$/, '') + '/portal', '_blank');
    }

    function toggleServerEdit() {
      const box = $('serverEditBox'), isOpen = box.style.display === 'block';
      box.style.display = isOpen ? 'none' : 'block';
      $('settingsBtn').className = 'icon-btn' + (isOpen ? '' : ' active');
      if (!isOpen) $('serverInput').value = $('serverLabel').textContent;
    }

    async function saveServer() {
      const url = $('serverInput').value.trim();
      const res = await fetch('/api/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ apiUrl: url }) });
      if (res.ok) { toggleServerEdit(); await loadState(); checkUpdates(false); showAlert('Server endpoint updated.', 'success'); }
      else showAlert('Enter a valid http:// or https:// URL.', 'error');
    }

    async function resetServer() {
      if (defaultApiEndpoint) {
        $('serverInput').value = defaultApiEndpoint;
        await saveServer();
      }
    }

    async function loadState() {
      try {
        const res = await fetch('/api/state');
        const data = await res.json();
        if (data.apiUrl) document.getElementById('serverLabel').textContent = data.apiUrl;
        if (data.defaultApiUrl) defaultApiEndpoint = data.defaultApiUrl;
        if (data.webUrl) currentWebUrl = data.webUrl;
        const enrolled = Boolean(data.isEnrolled);
        document.getElementById('unpairedView').style.display = enrolled ? 'none' : 'block';
        document.getElementById('pairedView').style.display = enrolled ? 'block' : 'none';
        document.getElementById('statusBadge').className = 'status-badge ' + (enrolled ? 'online' : 'offline');
        document.getElementById('statusText').textContent = enrolled ? 'Connected' : 'Not Connected';
        if (enrolled) {
          const sVal = document.getElementById('studioNameVal');
          sVal.textContent = data.studioName || 'Connected Studio';
          if (data.studioId) sVal.title = 'Studio ID: ' + data.studioId;
          const cVal = document.getElementById('computerNameVal');
          cVal.textContent = data.computerName || 'This Computer';
          if (data.deviceId) cVal.title = 'Device ID: ' + data.deviceId;
          cancelUnpairConfirm();
        }
      } catch {
        showAlert('Unable to reach local agent service.', 'error');
      }
    }

    async function loadPrinters(manual = false) {
      const btn = document.getElementById('scanBtn');
      const icon = btn.querySelector('svg');
      btn.disabled = true;
      if (icon) icon.classList.add('spin');
      try {
        const res = await fetch('/api/printers');
        const data = await res.json();
        const list = data.printers || [];
        renderPrinters(list);
        if (manual) {
          if (!list.length) showAlert('No physical printer detected. Please power ON printer and check cable.', 'error');
          else showAlert('Found ' + list.length + ' printer' + (list.length === 1 ? '' : 's') + '.', 'success');
        }
      } catch {
        document.getElementById('printersList').innerHTML =
          '<div class="empty"><div class="empty-title">Could not scan printers</div><div>Check your OS print spooler service and retry.</div></div>';
        if (manual) showAlert('Could not scan printers. Spooler service error.', 'error');
      } finally {
        btn.disabled = false;
        if (icon) icon.classList.remove('spin');
      }
    }

    function renderPrinters(printers) {
      const list = document.getElementById('printersList');
      document.getElementById('printersCount').textContent = String(printers ? printers.length : 0);
      if (!printers || !printers.length) {
        list.innerHTML =
          '<div style="background:var(--warning-bg);border:1px solid #fde68a;border-radius:var(--radius-md);padding:12px;font-size:0.78rem;line-height:1.45;color:#92400e;">' +
            '<div style="font-weight:700;display:flex;align-items:center;gap:6px;margin-bottom:6px;font-size:0.82rem;">⚠️ No Physical Printers Detected</div>' +
            '<div style="margin-bottom:8px;">Virtual printers (PDF, OneNote, AnyDesk) are filtered out automatically.</div>' +
            '<div style="font-weight:600;color:#78350f;">Troubleshooting checklist:</div>' +
            '<div>1. Is your physical printer turned <b>ON</b>?</div>' +
            '<div>2. Is the USB cable connected or Wi-Fi on the same network?</div>' +
            '<div>3. Does it show in Windows <i>Settings &rarr; Printers &amp; Scanners</i>?</div>' +
          '</div>';
        return;
      }
      list.innerHTML = printers.map((p) => {
        const colorTag = p.isColorSupported ? '<span class="tag tag-color">Color</span>' : '<span class="tag tag-bw">B&amp;W</span>';
        const defaultTag = p.isDefault ? '<span class="tag tag-default">Default</span>' : '';
        const statusTag = p.status === 'error'
          ? '<span class="tag tag-danger">Error</span>'
          : p.status === 'offline' ? '<span class="tag tag-danger">Offline</span>' : '<span class="tag tag-success">Ready</span>';
        const driver = p.driverName ? '<div class="row-sub">' + escapeHtml(p.driverName) + '</div>' : '';
        return '<div class="row"><div class="row-main"><div class="row-icon">' + printerIconSvg() + '</div><div style="min-width:0;"><div class="row-title">' + escapeHtml(p.name) + '</div>' + driver + '</div></div><div class="tags">' + statusTag + colorTag + defaultTag + '</div></div>';
      }).join('');
    }

    async function pasteAndConnect() {
      const input = document.getElementById('pairingInput');
      if (!input.value.trim()) {
        if (!navigator.clipboard || !navigator.clipboard.readText) {
          input.focus();
          return showAlert('Paste your pairing code into the box, then click Paste & Connect.', 'error');
        }
        try {
          const clip = (await navigator.clipboard.readText() || '').trim().toUpperCase();
          if (!clip) {
            input.focus();
            return showAlert('Clipboard is empty. Copy a pairing code first.', 'error');
          }
          input.value = clip.slice(0, 19);
        } catch {
          input.focus();
          return showAlert('Clipboard access blocked. Press Ctrl+V to paste.', 'error');
        }
      }
      return pairDevice();
    }

    async function pairDevice() {
      const input = document.getElementById('pairingInput');
      const code = input.value.trim().toUpperCase();
      if (!code) return showAlert('Please enter your pairing code.', 'error');
      const btn = document.getElementById('pairBtn');
      btn.disabled = true;
      btn.textContent = 'Connecting...';
      try {
        const res = await fetch('/api/pair', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pairingCode: code }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Pairing failed');
        showAlert('Connected to Studio!', 'success');
        input.value = '';
        await loadState();
      } catch (err) {
        showAlert(err.message || 'Pairing failed.', 'error');
      } finally {
        btn.disabled = false;
        btn.textContent = 'Paste & Connect';
      }
    }

    function requestUnpairConfirm() { document.getElementById('unpairConfirmBox').classList.add('show'); }
    function cancelUnpairConfirm() { document.getElementById('unpairConfirmBox').classList.remove('show'); }

    async function unpairDevice() {
      const res = await fetch('/api/unpair', { method: 'POST' });
      if (res.ok) {
        cancelUnpairConfirm();
        showAlert('Computer unpaired.', 'success');
        await loadState();
      }
    }

    function showAlert(msg, type) {
      const box = document.getElementById('toast');
      box.textContent = msg;
      box.className = 'toast show ' + (type === 'error' ? 'error' : 'success');
      if (toastTimer) clearTimeout(toastTimer);
      toastTimer = setTimeout(() => { box.className = 'toast'; }, 3600);
    }

    function escapeHtml(s) {
      return (s || '').replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m]);
    }

    function printerIconSvg() {
      return '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>';
    }

    function handleUpdateClick() { if (pendingUpdateVersion) performUpdate(); else checkUpdates(true); }

    async function checkUpdates(manual) {
      const btn = document.getElementById('updateBtn');
      if (manual) { btn.disabled = true; btn.textContent = 'Checking...'; }
      try {
        const res = await fetch('/api/update/check');
        const data = await res.json();
        if (data && data.updateAvailable && data.latestVersion) {
          pendingUpdateVersion = data.latestVersion;
          btn.className = 'btn-update ready';
          btn.textContent = '⚡ Update to v' + data.latestVersion;
          btn.disabled = false;
          if (manual) showAlert('Update v' + data.latestVersion + ' is available!', 'success');
        } else {
          pendingUpdateVersion = null;
          btn.className = 'btn-update';
          btn.textContent = '↻ Check Update';
          btn.disabled = false;
          if (manual) showAlert(data && data.error ? 'Update check failed: ' + data.error : 'Already up to date (v${AGENT_VERSION}).', data && data.error ? 'error' : 'success');
        }
      } catch {
        pendingUpdateVersion = null;
        btn.className = 'btn-update';
        btn.textContent = '↻ Check Update';
        btn.disabled = false;
        if (manual) showAlert('Unable to check for updates right now.', 'error');
      }
    }

    async function performUpdate() {
      const btn = document.getElementById('updateBtn');
      btn.disabled = true;
      btn.textContent = 'Updating...';
      showAlert('Downloading agent update...', 'success');
      try {
        const res = await fetch('/api/update/apply', { method: 'POST' });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.message || 'Update failed');
        btn.textContent = 'Restarting...';
        const interval = setInterval(async () => {
          try { if ((await fetch('/api/state')).ok) { clearInterval(interval); showAlert('Agent updated!', 'success'); loadState(); checkUpdates(false); } } catch {}
        }, 2000);
      } catch (err) {
        showAlert(err.message || 'Update failed.', 'error');
        btn.disabled = false;
        btn.textContent = 'Retry Update';
      }
    }

    loadState(); loadPrinters(); checkUpdates(false);
    setInterval(loadState, 15000); setInterval(() => checkUpdates(false), 60000);
  `;
}
