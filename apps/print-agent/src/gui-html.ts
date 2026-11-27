import { AGENT_VERSION } from './agent-updater.js';
import { FAVICON_BASE64 } from './gui-assets.js';
import { getGuiScript } from './gui-script.js';
import { getGuiStyles } from './gui-styles.js';

const PRINTER_SVG = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>`;
const GEAR_SVG = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`;
const REFRESH_SVG = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>`;
const EXTERNAL_SVG = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`;

export function getGuiHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="icon" type="image/png" href="data:image/png;base64,${FAVICON_BASE64}">
  <title>SnapPrint Print Agent</title>
  <style>${getGuiStyles()}</style>
</head>
<body>
  <main class="shell">
    <header class="header">
      <div class="brand">
        <div class="logo">${PRINTER_SVG}</div>
        <div style="min-width:0;">
          <div class="title">SnapPrint Print Agent</div>
          <div class="subtitle" id="serverLabel">https://snapprint.onrender.com</div>
        </div>
      </div>
      <div class="header-actions">
        <button class="btn btn-outline btn-sm" onclick="openWebPortal()">Dashboard ${EXTERNAL_SVG}</button>
        <button id="updateBtn" class="btn-update" onclick="handleUpdateClick()">↻ Check Update</button>
        <span class="version-pill">v${AGENT_VERSION}</span>
        <button id="settingsBtn" class="icon-btn" title="Server Settings" onclick="toggleServerEdit()">${GEAR_SVG}</button>
      </div>
    </header>

    <section id="serverEditBox" class="card" style="display:none;">
      <div class="card-head">
        <div class="card-title">Server Endpoint</div>
      </div>
      <div class="field">
        <label class="label" for="serverInput">Backend API URL</label>
        <input class="input mono" id="serverInput" onkeydown="if(event.key==='Enter')saveServer()" />
      </div>
      <div style="display:flex;gap:8px;justify-content:flex-end;">
        <button class="btn btn-outline btn-sm" onclick="resetServer()">Reset Default</button>
        <button class="btn btn-outline btn-sm" onclick="toggleServerEdit()">Cancel</button>
        <button class="btn btn-primary btn-sm" onclick="saveServer()">Save</button>
      </div>
    </section>

    <div class="stack">
      <section class="card">
        <div class="card-head">
          <div class="card-title">Studio Connection</div>
          <span class="status-badge offline" id="statusBadge"><span class="dot"></span><span id="statusText">Not Connected</span></span>
        </div>
        <div id="unpairedView">
          <p class="helper">Paste the pairing code from your SnapPrint Dashboard to link this computer.</p>
          <div class="inline-form">
            <input class="input mono" id="pairingInput" type="text" placeholder="SNAP-XXXX-YYYY" maxlength="19" onkeydown="if(event.key==='Enter')pairDevice()" />
            <button class="btn btn-primary" id="pairBtn" onclick="pasteAndConnect()">Paste &amp; Connect</button>
          </div>
        </div>
        <div id="pairedView" style="display:none;">
          <div class="meta-grid">
            <div class="meta-box">
              <div class="meta-key">Connected Studio</div>
              <div class="meta-val" id="studioNameVal">—</div>
              <div id="studioIdSub" style="font-size:0.72rem;color:var(--muted);font-family:monospace;margin-top:2px;"></div>
            </div>
            <div class="meta-box">
              <div class="meta-key">This Computer</div>
              <div class="meta-val" id="computerNameVal">—</div>
              <div id="deviceIdSub" style="font-size:0.72rem;color:var(--muted);font-family:monospace;margin-top:2px;"></div>
            </div>
          </div>
          <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;">
            <span style="font-size:0.78rem;color:var(--success);font-weight:600;">Active &middot; Listening for print jobs</span>
            <button id="unpairTriggerBtn" class="btn btn-danger-ghost btn-sm" onclick="requestUnpairConfirm()">Unpair Computer</button>
          </div>
          <div id="unpairConfirmBox" class="confirm-bar" style="margin-top:10px;">
            <span>Disconnect this PC from studio?</span>
            <div style="display:flex;gap:6px;">
              <button class="btn btn-outline btn-sm" onclick="cancelUnpairConfirm()">Cancel</button>
              <button class="btn btn-danger-ghost btn-sm" onclick="unpairDevice()">Yes, Unpair</button>
            </div>
          </div>
        </div>
      </section>

      <section class="card">
        <div class="card-head">
          <div class="card-title">Local Printers <span class="count-pill" id="printersCount">0</span></div>
          <button id="scanBtn" class="btn btn-outline btn-sm" onclick="loadPrinters()">${REFRESH_SVG} Scan</button>
        </div>
        <div class="list" id="printersList">
          <div class="empty"><div class="empty-title">Scanning printers...</div></div>
        </div>
      </section>
    </div>

    <footer class="footer">Runs silently in the system tray. Closing this window won&rsquo;t stop active print jobs.</footer>
  </main>

  <div id="toast" class="toast" role="status" aria-live="polite"></div>
  <script>${getGuiScript()}</script>
</body>
</html>`;
}
