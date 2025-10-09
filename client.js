// ==UserScript==
// @name         MakeCode AI (overlay, draggable launcher, animations)
// @namespace    mcai.local
// @version      0.6
// @description  Full-screen overlay panel, draggable launcher, auto-apply model, smooth animations
// @match        https://makecode.microbit.org/*
// @match        https://arcade.makecode.com/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==
const BACKEND = "https://mcai.dev.tk.sg";
const APP_TOKEN = ""; // fill ONLY if you set SERVER_APP_TOKEN on the server

(function () {
  // Prevent double-inject
  if (window.__mcaiInjected) return;
  window.__mcaiInjected = true;



  const wait = (ms) => new Promise(r => setTimeout(r, ms));

  // ----------- Elements -----------
  const overlay = document.createElement('div');
  overlay.id = 'mcai-overlay';

  const panel = document.createElement('div');
  panel.id = 'mcai-panel';

  const launcher = document.createElement('button');
  launcher.id = 'mcai-launcher';
  launcher.title = 'MakeCode AI (Alt+M) — drag to move';

  // ----------- CSS -----------
  const css = document.createElement('style');
  css.textContent = `
    :root {
      --mcai-surface: #0b1020;
      --mcai-surface-2: #0e1428;
      --mcai-stroke: rgba(125, 225, 255, .20);
      --mcai-stroke-2: rgba(89, 123, 255, .22);
      --mcai-text: #e8eeff;
      --mcai-accent: #3e7bff;
    }

    /* FULL black overlay (no gaps) */
    #mcai-overlay {
      position: fixed;
      inset: 0;
      background: #000;
      display: none;          /* hidden by default */
      z-index: 2147483646;
    }

    /* Panel container (resizable, no max size) */
    #mcai-panel {
      position: fixed;
      right: 24px;
      bottom: 24px;
      width: 560px;
      height: 520px;
      min-width: 420px;
      min-height: 320px;
      background: linear-gradient(180deg, var(--mcai-surface-2), var(--mcai-surface));
      color: var(--mcai-text);
      border: 1px solid var(--mcai-stroke);
      border-radius: 16px;
      box-shadow: 0 16px 40px rgba(0,0,0,.6), inset 0 1px 0 rgba(255,255,255,.05);
      display: none;          /* hidden by default */
      z-index: 2147483647;
      overflow: hidden;       /* keep internals tidy */
      transform: scale(.98);
      opacity: 0;
      transition: transform .18s ease, opacity .18s ease;
    }
    #mcai-panel.mcai-show {
      display: block;
      transform: scale(1);
      opacity: 1;
    }

    /* Header */
    .mcai-header {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 14px;
      background: linear-gradient(180deg, rgba(22,30,58,.8), rgba(16,22,45,.8));
      border-bottom: 1px solid var(--mcai-stroke-2);
      user-select: none;
      cursor: default;
    }
    .mcai-logo {
      width: 20px; height: 20px;
      border-radius: 7px;
      background: linear-gradient(135deg,#5b7cff,#7de1ff);
      color:#0b1020; font-weight: 900; font-size: 12px;
      display:flex; align-items:center; justify-content:center;
      box-shadow: 0 2px 12px rgba(93,131,255,.45);
    }
    .mcai-title { font-weight: 700; font-size: 13px; letter-spacing: .2px; }
    .mcai-status {
      margin-left: auto;
      display: inline-flex; align-items: center; gap: 8px;
      font-size: 11px; color: #a9b7ff;
      padding: 4px 10px; border-radius: 999px;
      background: rgba(89,123,255,.12);
      border: 1px solid var(--mcai-stroke-2);
    }
    .mcai-spinner {
      width: 12px; height: 12px; border-radius: 50%;
      border: 2px solid rgba(255,255,255,.12);
      border-top-color: #7de1ff;
      animation: mcai-spin 0.8s linear infinite;
      display: none;
    }
    .mcai-status.busy .mcai-spinner { display: inline-block; }
    @keyframes mcai-spin { to { transform: rotate(360deg); } }

    .mcai-close {
      margin-left: 8px; background: transparent; border: none;
      color:#cfd7ff; font-size:16px; line-height:1; cursor:pointer; border-radius:8px; padding:4px 6px;
    }
    .mcai-close:hover { background: rgba(255,255,255,.08); color:#fff; }

    /* Body */
    .mcai-body {
      position: absolute;
      inset: 48px 0 0 0; /* leave room for header */
      display: grid;
      grid-template-rows: auto auto 1fr auto auto;
      gap: 12px;
      padding: 14px;
    }

    .mcai-section {
      display: grid; gap: 8px; padding: 10px;
      border: 1px solid rgba(120,148,255,.18);
      border-radius: 12px;
      background: linear-gradient(180deg, rgba(18,24,48,.7), rgba(12,18,36,.7));
    }

    .mcai-label { font-size: 11px; color: #9eb2ff; text-transform: uppercase; letter-spacing: .08em; }
    .mcai-row { display:flex; gap:10px; align-items:center; flex-wrap:wrap; }

    .mcai-select, .mcai-textarea, .mcai-btn {
      border-radius: 10px; border:1px solid rgba(120,148,255,.25);
      background:#0b1020; color:#e6eaf7;
      padding: 10px 12px; font: 13px/1.35 system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
      outline: none; transition: border-color .15s, box-shadow .15s, transform .06s;
    }
    .mcai-select:hover, .mcai-textarea:hover { border-color: rgba(125,225,255,.35); }
    .mcai-select:focus, .mcai-textarea:focus { border-color: #7de1ff; box-shadow: 0 0 0 3px rgba(125,225,255,.15); }

    .mcai-select { min-width: 240px; flex: 1; }
    .mcai-textarea { resize: both; min-height: 110px; width: 100%; }

    .mcai-btn {
      cursor:pointer; user-select:none; font-weight:700; letter-spacing:.2px;
      background: linear-gradient(180deg, var(--mcai-accent), #2d67ff);
      border-color: rgba(89,123,255,.35); color:#fff;
      box-shadow: 0 6px 18px rgba(46,102,255,.35);
    }
    .mcai-btn:hover { transform: translateY(-1px); box-shadow: 0 10px 22px rgba(46,102,255,.45); }
    .mcai-btn:active { transform: translateY(0); box-shadow: 0 6px 18px rgba(46,102,255,.35); }

    .mcai-checkbox { display:flex; align-items:center; gap:8px; color:#cfe3ff; font-size:12px; }

    /* Feedback box */
    .mcai-feedback { display:none; }
    .mcai-feedback-inner {
      padding: 12px; border:1px solid rgba(120,148,255,.25); border-radius: 12px;
      background: linear-gradient(180deg, #131b38, #0f1832);
      box-shadow: inset 0 1px 0 rgba(255,255,255,.03);
    }
    .mcai-fb-head { display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; gap:8px; }
    .mcai-fb-title { font-size:11px; letter-spacing:.08em; text-transform:uppercase; color:#8fb7ff; display:flex; gap:8px; align-items:center; }
    .mcai-pill { width:18px; height:18px; display:inline-flex; align-items:center; justify-content:center; border-radius:50%; background:#3b82f6; color:#0b1020; font-weight:800; font-size:11px; }
    .mcai-fb-toggle { background:rgba(148,163,255,.12); color:#d7e1ff; border:1px solid rgba(148,163,255,.32); border-radius:999px; padding:4px 10px; font-size:11px; cursor:pointer; }
    .mcai-fb-lines { display:grid; gap:6px; }
    .mcai-fb-bubble { padding:8px 10px; border-left:3px solid #3b82f6; border-radius:8px; background:rgba(59,130,246,.16); color:#f1f6ff; }

    /* Log area */
    #mcai-log {
      border: 1px solid rgba(120,148,255,.18);
      border-radius: 12px;
      background: #0c1230;
      padding: 10px 12px;
      font: 12px/1.55 ui-monospace, SFMono-Regular, Menlo, Consolas, "Roboto Mono", monospace;
      color: #a9b7ff;
      overflow: auto;
      height: 120px;
    }

    /* Resizer */
    #mcai-resizer {
      position: absolute;
      right: 8px; bottom: 8px;
      width: 16px; height: 16px;
      cursor: nwse-resize;
      z-index: 2;
      background:
        linear-gradient(135deg, transparent 50%, rgba(125,225,255,.35) 50%) no-repeat,
        linear-gradient(135deg, transparent 60%, rgba(125,225,255,.25) 60%) no-repeat,
        linear-gradient(135deg, transparent 70%, rgba(125,225,255,.18) 70%) no-repeat;
      background-size: 100% 100%, 100% 100%, 100% 100%;
    }

    /* Launcher (draggable) */
    #mcai-launcher {
      position: fixed;
      right: 18px; bottom: 18px;
      width: 46px; height: 46px;
      border-radius: 14px;
      border: 1px solid rgba(125,225,255,.3);
      background: linear-gradient(135deg, #2c3c7a, #16244f);
      color: #eaf2ff; font-weight: 800; font-size: 14px;
      display:flex; align-items:center; justify-content:center;
      box-shadow: 0 10px 26px rgba(0,0,0,.55);
      z-index: 2147483645;
      cursor: grab;
      transition: box-shadow .15s ease, transform .15s ease;
    }
    #mcai-launcher:active { cursor: grabbing; transform: scale(.98); }

    /* Small toast animation on apply/change */
    .mcai-toast {
      position: absolute; right: 12px; top: 12px;
      font-size: 11px; color: #dff1ff;
      background: rgba(0,0,0,.45);
      border: 1px solid rgba(125,225,255,.25);
      border-radius: 10px; padding: 6px 10px;
      opacity: 0; transform: translateY(-6px);
      transition: opacity .18s ease, transform .18s ease;
      pointer-events: none;
    }
    .mcai-toast.show { opacity: 1; transform: translateY(0); }
  `;
  document.head.appendChild(css);

  // ----------- Launcher (minimized) -----------
  launcher.textContent = 'AI';
  document.body.appendChild(launcher);

  // Drag the launcher
  (function enableLauncherDrag() {
    let dragging = false, ox = 0, oy = 0, sx = 0, sy = 0;
    launcher.addEventListener('mousedown', (e) => {
      dragging = true; ox = e.clientX; oy = e.clientY;
      const r = launcher.getBoundingClientRect(); sx = r.left; sy = r.top;
      document.body.style.userSelect = 'none';
      e.preventDefault();
    });
    window.addEventListener('mousemove', (e) => {
      if (!dragging) return;
      const nx = Math.max(8, Math.min(window.innerWidth - launcher.offsetWidth - 8, sx + (e.clientX - ox)));
      const ny = Math.max(8, Math.min(window.innerHeight - launcher.offsetHeight - 8, sy + (e.clientY - oy)));
      launcher.style.left = nx + 'px';
      launcher.style.top = ny + 'px';
      launcher.style.right = 'auto';
      launcher.style.bottom = 'auto';
    });
    window.addEventListener('mouseup', () => { if (!dragging) return; dragging = false; document.body.style.userSelect = ''; });
  })();

  // ----------- Panel Structure -----------
  const header = document.createElement('div');
  header.className = 'mcai-header';
  header.innerHTML = `
    <div class="mcai-logo">M</div>
    <div class="mcai-title">MakeCode AI</div>
    <div id="mcai-status" class="mcai-status"><span class="mcai-spinner"></span><span id="mcai-status-text">Idle</span></div>
    <button id="mcai-close" class="mcai-close" title="Hide (Alt+M)">✕</button>
  `;

  const body = document.createElement('div');
  body.className = 'mcai-body';
  body.innerHTML = `
    <div class="mcai-section">
      <div class="mcai-label">Engine</div>
      <div class="mcai-row">
        <select id="mcai-engine" class="mcai-select"><option>Loading…</option></select>
        <div class="mcai-toast" id="mcai-toast">Engine applied</div>
      </div>
    </div>

    <div class="mcai-section">
      <div class="mcai-label">Target & Context</div>
      <div class="mcai-row">
        <select id="mcai-target" class="mcai-select">
          <option value="microbit">micro:bit</option>
          <option value="arcade">Arcade</option>
          <option value="maker">Maker</option>
        </select>
        <label class="mcai-checkbox"><input id="mcai-inc" type="checkbox" checked>Use current code</label>
      </div>
    </div>

    <div class="mcai-section" style="min-height: 140px;">
      <div class="mcai-label">Prompt</div>
      <textarea id="mcai-prompt" class="mcai-textarea" rows="4" placeholder="Describe what you want the block code to do — be specific"></textarea>
    </div>

    <div class="mcai-section mcai-feedback" id="mcai-fb">
      <div class="mcai-feedback-inner">
        <div class="mcai-fb-head">
          <div class="mcai-fb-title"><span class="mcai-pill">i</span> Model Feedback</div>
          <button id="mcai-fb-toggle" class="mcai-fb-toggle" aria-expanded="true">Hide</button>
        </div>
        <div id="mcai-fb-lines" class="mcai-fb-lines"></div>
      </div>
    </div>

    <div class="mcai-row">
      <button id="mcai-go" class="mcai-btn" style="flex:1">Generate & Paste</button>
      <button id="mcai-revert" class="mcai-btn" style="flex:1; background:#1b2746; border-color:rgba(120,148,255,.25)">Revert</button>
    </div>

    <div id="mcai-log"></div>
  `;

  const resizer = document.createElement('div');
  resizer.id = 'mcai-resizer';

  panel.appendChild(header);
  panel.appendChild(body);
  panel.appendChild(resizer);

  document.body.appendChild(overlay);
  document.body.appendChild(panel);

  // ----------- Refs -----------
  const $ = (sel, root = document) => root.querySelector(sel);
  const statusBox   = $('#mcai-status');
  const statusText  = $('#mcai-status-text');
  const closeBtn    = $('#mcai-close');
  const engine      = $('#mcai-engine');
  const toast       = $('#mcai-toast');
  const tgtSel      = $('#mcai-target');
  const inc         = $('#mcai-inc');
  const promptEl    = $('#mcai-prompt');
  const fbBox       = $('#mcai-fb');
  const fbLines     = $('#mcai-fb-lines');
  const fbToggle    = $('#mcai-fb-toggle');
  const goBtn       = $('#mcai-go');
  const revertBtn   = $('#mcai-revert');
  const logEl       = $('#mcai-log');

  // ----------- Show/Hide (with animations) -----------
  function showPanel() {
    overlay.style.display = 'block';
    panel.classList.add('mcai-show');
    panel.style.display = 'block';
  }
  function hidePanel() {
    panel.classList.remove('mcai-show');
    // allow the fade-out to play
    setTimeout(() => { panel.style.display = 'none'; overlay.style.display = 'none'; }, 200);
  }

  launcher.onclick = showPanel;
  overlay.onclick = hidePanel; // clicking the black backdrop hides the panel
  closeBtn.onclick = hidePanel;

  // Alt+M toggle
  window.addEventListener('keydown', (e) => {
    if (e.altKey && e.key.toLowerCase() === 'm') {
      if (panel.style.display === 'block') hidePanel(); else showPanel();
    }
  });

  // ----------- Resize (fix disappearing corner) -----------
  (function enableResize() {
    let resizing = false, sx = 0, sy = 0, sw = 0, sh = 0;
    resizer.addEventListener('mousedown', (e) => {
      resizing = true; sx = e.clientX; sy = e.clientY; sw = panel.offsetWidth; sh = panel.offsetHeight;
      document.body.style.userSelect = 'none';
      e.preventDefault();
    });
    window.addEventListener('mousemove', (e) => {
      if (!resizing) return;
      const w = Math.max(420, sw + (e.clientX - sx));
      const h = Math.max(320, sh + (e.clientY - sy));
      panel.style.width = w + 'px';
      panel.style.height = h + 'px';
    });
    window.addEventListener('mouseup', () => {
      if (!resizing) return;
      resizing = false; document.body.style.userSelect = '';
    });
  })();

  // ----------- Feedback utilities -----------
  function setBusy(b) {
    if (b) statusBox.classList.add('busy'); else statusBox.classList.remove('busy');
  }
  function setStatus(t) { statusText.textContent = t; }
  function logLine(t) {
    const d = document.createElement('div');
    d.textContent = t;
    logEl.appendChild(d);
    logEl.scrollTop = logEl.scrollHeight;
  }
  function clearLog() { logEl.innerHTML = ''; }

  function showToast(msg = 'Done') {
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 900);
  }

  function renderFeedback(items = []) {
    fbLines.innerHTML = '';
    const list = items.filter(x => x && String(x).trim());
    if (!list.length) {
      fbBox.style.display = 'none';
      fbToggle.style.visibility = 'hidden';
      return;
    }
    list.forEach(text => {
      const b = document.createElement('div');
      b.className = 'mcai-fb-bubble';
      b.textContent = String(text).trim();
      fbLines.appendChild(b);
    });
    fbBox.style.display = 'block';
    fbToggle.style.visibility = 'visible';
  }
  let fbCollapsed = false;
  fbToggle.onclick = () => {
    fbCollapsed = !fbCollapsed;
    if (fbCollapsed) { fbLines.style.display = 'none'; fbToggle.textContent = 'Show'; fbToggle.setAttribute('aria-expanded', 'false'); }
    else { fbLines.style.display = 'grid'; fbToggle.textContent = 'Hide'; fbToggle.setAttribute('aria-expanded', 'true'); }
  };

  // ----------- Monaco helpers -----------
  const clickLike=(root,labels)=>{ const arr=labels.map(x=>x.toLowerCase());
    const q=[...root.querySelectorAll('button,[role="tab"],a,[aria-label]')].filter(e=>e&&e.offsetParent!==null);
    for(const el of q){ const txt=((el.innerText||el.textContent||'')+' '+(el.getAttribute('aria-label')||'')).trim().toLowerCase();
      if(arr.some(s=>txt===s||txt.includes(s))){ el.click(); return el; } } return null; };
  const findMonacoCtx=(timeoutMs=18000)=>{ const deadline=performance.now()+timeoutMs;
    const cands=[window,...[...document.querySelectorAll('iframe')].map(f=>{try{return f.contentWindow}catch(e){return null}})].filter(Boolean);
    cands.forEach(w=>{try{clickLike(w.document,['javascript','typescript','text']);}catch(e){}});
    return new Promise((resolve,reject)=>{ (function poll(){
      if(performance.now()>=deadline){reject(new Error('Monaco not found. Open the project editor, not the home page.'));return;}
      for(const w of cands){ try{ const m=w.monaco; if(m&&m.editor){ const models=m.editor.getModels(); if(models&&models.length){
        const editors=m.editor.getEditors?m.editor.getEditors():[]; const ed=(editors&&editors.length)?editors[0]:null;
        const model=(ed&&ed.getModel&&ed.getModel())||models[0]; if(model){ resolve({win:w,monaco:m,editor:ed,model:model}); return; } } } }catch(e){} }
      setTimeout(poll,100); cands.forEach(w=>{try{clickLike(w.document,['javascript','typescript','text']);}catch(e){}}); })(); }); };
  const pasteToMakeCode=(code)=> findMonacoCtx().then((ctx)=>{ logLine('Switching to JavaScript tab.'); clickLike(ctx.win.document,['javascript','typescript','text']);
    return wait(20).then(()=>{ try{ const prev=ctx.model.getValue()||''; __undoStack.push(prev); revertBtn.disabled=false; logLine('Snapshot saved for revert.'); }catch(e){ logLine('Snapshot failed: '+e); }
      logLine('Pasting generated code into editor.'); ctx.model.setValue(code); if(ctx.editor&&ctx.editor.setPosition) ctx.editor.setPosition({lineNumber:1,column:1});
      logLine('Switching back to Blocks.'); clickLike(ctx.win.document,['blocks']) || (function(){ const m=ctx.win.document.querySelector('button[aria-label*="More"],button[aria-label*="Editor"],.menu-button,.more-button'); if(m){ m.click(); return clickLike(ctx.win.document,['blocks']); } })(); }); });
  const revertEditor=()=> findMonacoCtx().then((ctx)=>{ if(!__undoStack.length){ throw new Error('No snapshot to revert to.'); }
    const prev=__undoStack.pop(); logLine('Switching to JavaScript tab for revert.'); clickLike(ctx.win.document,['javascript','typescript','text']);
    return wait(20).then(()=>{ logLine('Restoring previous code.'); ctx.model.setValue(prev); if(ctx.editor&&ctx.editor.setPosition) ctx.editor.setPosition({lineNumber:1,column:1});
      logLine('Switching back to Blocks.'); clickLike(ctx.win.document,['blocks']) || (function(){ const m=ctx.win.document.querySelector('button[aria-label*="More"],button[aria-label*="Editor"],.menu-button,.more-button'); if(m){ m.click(); return clickLike(ctx.win.document,['blocks']); } })(); });
  }).then(()=>{ if(!__undoStack.length) revertBtn.disabled=true; });

  // ----------- Config -----------
  function applyEngineOptions(cfg) {
    engine.innerHTML = "";
    (cfg.presets || []).forEach(p => {
      const opt = document.createElement('option');
      opt.value = p; opt.textContent = p;
      engine.appendChild(opt);
    });
    if (cfg.activePreset && [...engine.options].some(o => o.value === cfg.activePreset)) engine.value = cfg.activePreset;
  }
  function fetchConfig() {
    const headers = APP_TOKEN ? { "Authorization": "Bearer " + APP_TOKEN } : {};
    return fetch(BACKEND + "/mcai/config", { headers })
      .then(r => r.json())
      .then(cfg => { applyEngineOptions(cfg); })
      .catch(e => { logLine("Config load failed: " + (e && e.message ? e.message : e)); });
  }
  fetchConfig();

  // Auto-apply engine (no Use button)
  let applyTimer = null;
  function setActiveEngine(preset) {
    const headers = { "Content-Type": "application/json" };
    if (APP_TOKEN) headers["Authorization"] = "Bearer " + APP_TOKEN;
    setBusy(true); setStatus("Setting engine…");
    return fetch(BACKEND + "/mcai/config", {
      method: "POST", headers, body: JSON.stringify({ preset })
    }).then(r => {
      if (!r.ok) return r.json().then(j => { throw new Error(j && j.error || ('HTTP ' + r.status)); });
      return r.json();
    }).then(j => {
      setStatus("Engine: " + j.activePreset);
      showToast("Engine: " + j.activePreset);
    }).catch(e => {
      setStatus("Error"); logLine("Set engine failed: " + (e && e.message ? e.message : e));
    }).finally(() => setBusy(false));
  }
  engine.addEventListener('change', () => {
    clearTimeout(applyTimer);
    applyTimer = setTimeout(() => setActiveEngine(engine.value), 250);
  });
  // Scroll-to-apply after pause
  engine.addEventListener('wheel', () => {
    clearTimeout(applyTimer);
    applyTimer = setTimeout(() => setActiveEngine(engine.value), 400);
  }, { passive: true });

  // ----------- Generate -----------
  let __undoStack = [];
  let busy = false;

  goBtn.onclick = function () {
    if (busy) return; busy = true;
    clearLog(); renderFeedback([]);
    setBusy(true); setStatus('Working'); logLine('Generating…');

    const reqText = (promptEl.value || '').trim();
    if (!reqText) { setBusy(false); setStatus('Idle'); logLine('Please enter a prompt.'); busy = false; return; }
    const t = tgtSel.value.trim();

    const orig = goBtn.textContent;
    goBtn.textContent = 'Loading…'; goBtn.disabled = true;

    const readCode = inc.checked
      ? (findMonacoCtx().then(ctx => { logLine('Reading current JavaScript…'); return ctx.model.getValue() || ''; }).catch(() => { logLine('Could not read current code.'); return ''; }))
      : Promise.resolve('');

    readCode.then(current => {
      const headers = { "Content-Type": "application/json" };
      if (APP_TOKEN) headers["Authorization"] = "Bearer " + APP_TOKEN;

      return fetch(BACKEND + "/mcai/generate", {
        method: "POST", headers,
        body: JSON.stringify({ target: t, request: reqText, currentCode: current })
      }).then(r => {
        if (!r.ok) return r.json().then(j => { throw new Error(j && j.error || ('HTTP ' + r.status)); });
        return r.json();
      }).then(result => {
        const feedback = Array.isArray(result.feedback) ? result.feedback : [];
        renderFeedback(feedback);

        const code = (result && result.code) || '';
        if (!code) { setStatus('No code'); logLine('No code returned.'); return; }

        setStatus('Pasting…');
        return pasteToMakeCode(code).then(() => {
          setStatus('Done'); logLine('Pasted and switched back to Blocks.');
          showToast('Inserted');
        });
      });
    }).catch(e => {
      setStatus('Error'); logLine('Proxy error: ' + (e && e.message ? e.message : e));
    }).finally(() => {
      busy = false; setBusy(false);
      goBtn.textContent = orig; goBtn.disabled = false;
    });
  };

  // Revert
  revertBtn.onclick = function () {
    if (!__undoStack.length) return;
    const orig = revertBtn.textContent;
    setStatus('Reverting…'); setBusy(true);
    revertBtn.textContent = 'Reverting…'; revertBtn.disabled = true;
    revertEditor().then(() => {
      setStatus('Reverted'); logLine('Reverted to previous snapshot.');
      showToast('Reverted');
    }).catch(e => {
      setStatus('Error'); logLine('Revert failed: ' + (e && e.message ? e.message : e));
    }).finally(() => {
      revertBtn.textContent = orig; setBusy(false);
      if (__undoStack.length) revertBtn.disabled = false;
    });
  };

  // Open immediately on first load so users see the animation
  showPanel();
})();
