// ==UserScript==
// @name         MakeCode AI (polished, toggle + auto-apply + drag-pick)
// @namespace    mcai.local
// @version      0.4
// @description  Better UX: launcher toggle, Alt+M, auto-apply engine, drag to pick
// @match        https://makecode.microbit.org/*
// @match        https://arcade.makecode.com/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

const BACKEND = "http://mcai.dev.tk.sg";
const APP_TOKEN = ""; // fill ONLY if you set SERVER_APP_TOKEN

(function () {
  if (window.__mcAIPanel) return; // prevent duplicates
  window.__mcBlocksStrict = 1;    // keep one instance
  const wait = (ms) => new Promise(r => setTimeout(r, ms));

  // ---------- launcher (always present) ----------
  const launcher = document.createElement('button');
  launcher.id = 'mcai-launcher';
  launcher.title = 'MakeCode AI (Alt+M)';
  launcher.style.cssText = `
    position:fixed; right:18px; bottom:18px; z-index:2147483647;
    width:44px; height:44px; border-radius:12px; border:1px solid rgba(125,225,255,.25);
    background:linear-gradient(135deg,#2c3c7a,#16244f); color:#eaf2ff; font-weight:800;
    box-shadow:0 8px 24px rgba(0,0,0,.45); cursor:pointer; display:flex; align-items:center; justify-content:center;
  `;
  launcher.textContent = 'AI';
  document.body.appendChild(launcher);

  // ---------- panel ----------
  const ui = document.createElement('div');
  ui.setAttribute('role', 'dialog');
  ui.setAttribute('aria-label', 'MakeCode AI Panel');
  ui.style.cssText = 'position:fixed;right:16px;bottom:16px;width:480px;max-width:calc(100vw - 24px);max-height:85vh;z-index:2147483647;display:flex;flex-direction:column;';
  const css = document.createElement('style');
  css.textContent = `
    .mcai-card { background: linear-gradient(180deg, #0e1428 0%, #0a1020 100%); border: 1px solid rgba(89,123,255,.15);
      border-radius: 14px; box-shadow: 0 12px 30px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.03);
      color: #e6eaf7; font: 13px/1.45 system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; overflow: hidden; backdrop-filter: blur(6px); }
    .mcai-header { display:flex;align-items:center;gap:10px; padding:12px 14px;
      background: linear-gradient(180deg, rgba(22,30,58,.7), rgba(16,22,45,.7)); border-bottom: 1px solid rgba(89,123,255,.15);
      cursor: move; user-select:none; }
    .mcai-logo { width:18px;height:18px;border-radius:6px; background: linear-gradient(135deg,#5b7cff,#7de1ff);
      display:inline-flex;align-items:center;justify-content:center; color:#0b1020;font-weight:900;font-size:12px;
      box-shadow: 0 2px 12px rgba(93,131,255,.45); }
    .mcai-title { font-weight:700;font-size:13px; letter-spacing:.2px }
    .mcai-status { margin-left:auto; font-size:11px; color:#a9b7ff; padding:3px 8px;border-radius:999px;
      background:rgba(89,123,255,.12); border:1px solid rgba(89,123,255,.22); }
    .mcai-close { margin-left:8px;background:transparent;border:none;color:#b8c2ff; font-size:16px;line-height:1;cursor:pointer;border-radius:8px;padding:4px 6px; }
    .mcai-close:hover { background:rgba(255,255,255,.06); color:#fff }
    .mcai-body { padding:12px 14px; display:grid; gap:10px; }
    .mcai-section { display:grid; gap:8px; padding:10px; border:1px solid rgba(120,148,255,.15); border-radius:12px;
      background: linear-gradient(180deg, rgba(18,24,48,.65), rgba(12,18,36,.65)); }
    .mcai-row { display:flex; gap:10px; align-items:center; flex-wrap:wrap; }
    .mcai-label { font-size:11px;color:#9eb2ff; text-transform:uppercase; letter-spacing:.08em }
    .mcai-select, .mcai-textarea, .mcai-btn {
      border-radius:10px; border:1px solid rgba(120,148,255,.2); background:#0b1020; color:#e6eaf7;
      padding:10px 12px; font:13px/1.35 inherit; outline:none; transition: border-color .15s, box-shadow .15s, background-color .15s, transform .06s; }
    .mcai-select:hover, .mcai-textarea:hover { border-color: rgba(125,225,255,.35); }
    .mcai-select:focus, .mcai-textarea:focus { border-color:#7de1ff; box-shadow:0 0 0 3px rgba(125,225,255,.15); }
    .mcai-select { flex:1; min-width:220px; }
    .mcai-textarea { resize:vertical; min-height:84px; width:100%; }
    .mcai-btn { cursor:pointer; user-select:none; font-weight:700; letter-spacing:.2px;
      background: linear-gradient(180deg,#3e7bff,#2d67ff); border-color: rgba(89,123,255,.35); color:#fff; box-shadow: 0 6px 18px rgba(46,102,255,.35); }
    .mcai-btn:hover { transform: translateY(-1px); box-shadow: 0 10px 22px rgba(46,102,255,.45); }
    .mcai-btn:active { transform: translateY(0); box-shadow: 0 6px 18px rgba(46,102,255,.35); }
    .mcai-checkbox { display:flex; align-items:center; gap:8px; color:#cfe3ff; font-size:12px; }
    .mcai-feedback { display:none; margin:0 14px 12px; }
    .mcai-feedback-inner { padding:12px; border:1px solid rgba(120,148,255,.25); border-radius:12px; background: linear-gradient(180deg,#131b38,#0f1832); box-shadow: inset 0 1px 0 rgba(255,255,255,.03); }
    .mcai-fb-head { display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; gap:8px; }
    .mcai-fb-title { font-size:11px; letter-spacing:.08em; text-transform:uppercase; color:#8fb7ff; display:flex; gap:8px; align-items:center; }
    .mcai-pill { width:18px;height:18px;display:inline-flex;align-items:center;justify-content:center;border-radius:50%; background:#3b82f6; color:#0b1020; font-weight:800; font-size:11px; }
    .mcai-fb-toggle { background:rgba(148,163,255,.12); color:#d7e1ff; border:1px solid rgba(148,163,255,.32); border-radius:999px; padding:4px 10px; font-size:11px; cursor:pointer; }
    .mcai-fb-lines { display:grid; gap:6px; }
    .mcai-fb-bubble { padding:8px 10px; border-left:3px solid #3b82f6; border-radius:8px; background:rgba(59,130,246,.16); color:#f1f6ff; }
    .mcai-log { padding:10px 12px; font:12px/1.5 ui-monospace, SFMono-Regular, Menlo, Consolas, "Roboto Mono", monospace; color:#a9b7ff; background:#0c1230; border-top:1px solid rgba(120,148,255,.18); max-height:180px; overflow:auto; scrollbar-width: thin; border-radius: 0 0 14px 14px; }
    .mcai-resize { position:absolute; width:16px; height:16px; right:8px; bottom:8px; cursor:nwse-resize; opacity:.85;
      background: linear-gradient(135deg,transparent 52%, rgba(125,225,255,.35) 52% 60%, transparent 0) no-repeat,
                  linear-gradient(135deg,transparent 62%, rgba(125,225,255,.25) 62% 70%, transparent 0) no-repeat,
                  linear-gradient(135deg,transparent 72%, rgba(125,225,255,.18) 72% 80%, transparent 0) no-repeat; background-size: 100% 100%, 100% 100%, 100% 100%; }
  `;
  const card = document.createElement('div');
  card.className = 'mcai-card';
  const header = document.createElement('div');
  header.className = 'mcai-header';
  header.innerHTML = `
    <div class="mcai-logo">M</div>
    <div class="mcai-title">MakeCode AI</div>
    <span id="status" class="mcai-status">Idle</span>
    <button id="mcai-close" class="mcai-close" title="Hide panel">✕</button>
  `;
  const body = document.createElement('div');
  body.className = 'mcai-body';
  body.innerHTML = `
    <div class="mcai-section">
      <div class="mcai-label">Engine</div>
      <div class="mcai-row">
        <select id="engine" class="mcai-select"><option>Loading…</option></select>
        <!-- removed Use button: auto-apply below -->
      </div>
    </div>

    <div class="mcai-section">
      <div class="mcai-label">Target & Context</div>
      <div class="mcai-row">
        <select id="target" class="mcai-select">
          <option value="microbit">micro:bit</option>
          <option value="arcade">Arcade</option>
          <option value="maker">Maker</option>
        </select>
        <label class="mcai-checkbox"><input id="inc" type="checkbox" checked>Use current code</label>
      </div>
    </div>

    <div class="mcai-section">
      <div class="mcai-label">Prompt</div>
      <textarea id="p" class="mcai-textarea" rows="3" placeholder="Describe what you want the block code to do — be specific"></textarea>
      <div class="mcai-row">
        <button id="go" class="mcai-btn" style="flex:1">Generate & Paste</button>
        <button id="revert" class="mcai-btn" style="flex:1; background:#1b2746; border-color:rgba(120,148,255,.25)">Revert</button>
      </div>
    </div>
  `;
  const feedbackWrap = document.createElement('div');
  feedbackWrap.className = 'mcai-feedback';
  feedbackWrap.innerHTML = `
    <div class="mcai-feedback-inner">
      <div class="mcai-fb-head">
        <div class="mcai-fb-title"><span class="mcai-pill">i</span> Model Feedback</div>
        <button id="fbToggle" class="mcai-fb-toggle" aria-expanded="true">Hide</button>
      </div>
      <div id="fbLines" class="mcai-fb-lines"></div>
    </div>
  `;
  const log = document.createElement('div');
  log.id = 'log'; log.className = 'mcai-log';
  const rz = document.createElement('div'); rz.id = 'rz'; rz.className = 'mcai-resize';

  card.appendChild(header); card.appendChild(body);
  ui.appendChild(css); ui.appendChild(card); ui.appendChild(feedbackWrap); ui.appendChild(log); ui.appendChild(rz);
  document.body.appendChild(ui);
  window.__mcAIPanel = ui;

  // ---------- refs ----------
  const $ = (s) => ui.querySelector(s);
  const statusEl = $('#status'), closeBtn = $('#mcai-close'), resizer = $('#rz');
  const engine = $('#engine'), tgtSel = $('#target'), inc = $('#inc');
  const promptEl = $('#p'), go = $('#go'), revertBtn = $('#revert');
  const feedbackBox = feedbackWrap, feedbackLines = $('#fbLines'), feedbackToggle = $('#fbToggle');

  let __lastCode = '', __undoStack = [], busy = false;
  const setStatus = (t) => { statusEl.textContent = t; };
  const logLine = (t) => { const d = document.createElement('div'); d.textContent = t; log.appendChild(d); log.scrollTop = log.scrollHeight; };
  const clearLog = () => { log.innerHTML = ''; };

  // ---------- show/hide / launcher / hotkey ----------
  function showPanel() { ui.style.display = 'flex'; launcher.style.display = 'none'; }
  function hidePanel() { ui.style.display = 'none'; launcher.style.display = 'flex'; }
  launcher.onclick = showPanel;
  closeBtn.onclick = hidePanel;
  // open on install by default
  showPanel();
  // Alt+M toggles
  window.addEventListener('keydown', (e) => {
    if (e.altKey && (e.key.toLowerCase() === 'm')) {
      if (ui.style.display === 'none') showPanel(); else hidePanel();
    }
  });

  // ---------- feedback ----------
  let feedbackCollapsed = false;
  const applyFeedbackCollapse = () => {
    if (feedbackCollapsed) { feedbackLines.style.display = 'none'; feedbackToggle.textContent = 'Show'; feedbackToggle.setAttribute('aria-expanded','false'); }
    else { feedbackLines.style.display = 'grid'; feedbackToggle.textContent = 'Hide'; feedbackToggle.setAttribute('aria-expanded','true'); }
  };
  const renderFeedback = (items = []) => {
    feedbackLines.innerHTML = '';
    const list = items.filter(x => x && x.trim());
    if (!list.length) {
      feedbackCollapsed = false; feedbackBox.style.display = 'none'; feedbackToggle.style.visibility = 'hidden'; return;
    }
    list.forEach(msg => {
      const b = document.createElement('div'); b.className = 'mcai-fb-bubble'; b.textContent = msg.trim(); feedbackLines.appendChild(b);
    });
    feedbackToggle.style.visibility = 'visible'; feedbackBox.style.display = 'block'; feedbackCollapsed = false; applyFeedbackCollapse();
  };
  feedbackToggle.onclick = () => { if (feedbackBox.style.display !== 'none') { feedbackCollapsed = !feedbackCollapsed; applyFeedbackCollapse(); } };

  // ---------- monaco helpers ----------
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

  // ---------- config fetch ----------
  const applyEngineOptions = (cfg) => {
    engine.innerHTML = "";
    (cfg.presets || []).forEach(p => {
      const opt = document.createElement('option'); opt.value = p; opt.textContent = p; engine.appendChild(opt);
    });
    if (cfg.activePreset && [...engine.options].some(o => o.value === cfg.activePreset)) engine.value = cfg.activePreset;
  };
  function fetchConfig() {
    const headers = APP_TOKEN ? { "Authorization": "Bearer " + APP_TOKEN } : {};
    return fetch(BACKEND + "/mcai/config", { headers })
      .then(r => r.json())
      .then(cfg => { applyEngineOptions(cfg); })
      .catch(e => { logLine("Config load failed: " + (e && e.message ? e.message : e)); });
  }
  fetchConfig();

  // ---------- auto-apply engine (no Use button) ----------
  let applyTimer = null;
  function setActiveEngine(preset) {
    const headers = { "Content-Type": "application/json" };
    if (APP_TOKEN) headers["Authorization"] = "Bearer " + APP_TOKEN;
    return fetch(BACKEND + "/mcai/config", {
      method: "POST", headers, body: JSON.stringify({ preset })
    }).then(r => {
      if (!r.ok) return r.json().then(j => { throw new Error(j && j.error || ('HTTP ' + r.status)); });
      return r.json();
    }).then(j => { setStatus("Engine: " + j.activePreset); logLine("Active engine: " + j.activePreset); })
      .catch(e => { setStatus("Error"); logLine("Set engine failed: " + (e && e.message ? e.message : e)); });
  }
  // standard change → debounce 300ms
  engine.addEventListener('change', () => {
    clearTimeout(applyTimer);
    applyTimer = setTimeout(() => setActiveEngine(engine.value), 300);
  });

  // drag-to-pick: hold mouse on select, move to scroll options, release to apply
  (function enableDragPick() {
    let dragging = false, startY = 0, startIndex = 0;
    const rowHeight = 22; // approx option step
    engine.addEventListener('mousedown', (e) => { dragging = true; startY = e.clientY; startIndex = engine.selectedIndex; document.body.style.userSelect='none'; });
    window.addEventListener('mousemove', (e) => {
      if (!dragging) return;
      const delta = Math.floor((e.clientY - startY) / rowHeight);
      let idx = Math.max(0, Math.min(engine.options.length - 1, startIndex + delta));
      if (engine.selectedIndex !== idx) { engine.selectedIndex = idx; setStatus("Preview: " + engine.value); }
    });
    window.addEventListener('mouseup', () => {
      if (!dragging) return;
      dragging = false; document.body.style.userSelect='';
      setActiveEngine(engine.value);
    });
    // wheel scrolling also applies after short pause
    engine.addEventListener('wheel', () => {
      clearTimeout(applyTimer);
      applyTimer = setTimeout(() => setActiveEngine(engine.value), 400);
    }, { passive: true });
  })();

  // ---------- main action ----------
  go.onclick = function () {
    if (busy) return; busy = true;
    clearLog(); renderFeedback([]);
    setStatus('Working'); logLine('Generating…');

    const req = promptEl.value.trim(); if (!req) { setStatus('Idle'); logLine('Please enter a request.'); busy = false; return; }
    const t = tgtSel.value.trim();

    const origText = go.textContent; go.textContent = 'Loading…'; go.disabled = true;

    const curP = inc.checked
      ? (findMonacoCtx().then(ctx => { logLine('Reading current JavaScript.'); return ctx.model.getValue() || ''; }).catch(() => { logLine('Could not read current code.'); return ''; }))
      : Promise.resolve('');

    curP.then(cur => {
      const headers = { "Content-Type": "application/json" };
      if (APP_TOKEN) headers["Authorization"] = "Bearer " + APP_TOKEN;
      return fetch(BACKEND + "/mcai/generate", {
        method: "POST", headers, body: JSON.stringify({ target: t, request: req, currentCode: cur })
      }).then(r => {
        if (!r.ok) return r.json().then(j => { throw new Error(j && j.error || ('HTTP ' + r.status)); });
        return r.json();
      }).then(result => {
        const feedback = (result && Array.isArray(result.feedback)) ? result.feedback : [];
        renderFeedback(feedback);
        __lastCode = (result && result.code) || '';
        if (!__lastCode) { setStatus('No code'); logLine('No code returned.'); busy = false; return; }
        setStatus('Pasting');
        return pasteToMakeCode(__lastCode).then(() => { setStatus('Done'); logLine('Pasted and switched back to Blocks.'); });
      });
    }).catch(e => {
      setStatus('Error'); logLine('Proxy error: ' + (e && e.message ? e.message : e));
    }).finally(() => {
      busy = false; go.textContent = origText; go.disabled = false;
    });
  };

  // revert
  revertBtn.onclick = function () {
    if (revertBtn.disabled) return;
    const orig = revertBtn.textContent;
    revertBtn.textContent = 'Reverting…'; revertBtn.disabled = true;
    setStatus('Reverting'); logLine('Reverting to previous snapshot…');
    revertEditor().then(() => {
      setStatus('Reverted'); logLine('Revert complete: restored previous code and switched back to Blocks.');
    }).catch(e => {
      setStatus('Error'); logLine('Revert failed: ' + (e && e.message ? e.message : e));
    }).finally(() => {
      revertBtn.textContent = orig;
      if (__undoStack.length) revertBtn.disabled = false;
    });
  };

  // drag window
  (function () { let ox = 0, oy = 0, sx = 0, sy = 0, drag = false;
    header.addEventListener('mousedown', (e) => { drag = true; ox = e.clientX; oy = e.clientY; const r = ui.getBoundingClientRect(); sx = r.left; sy = r.top; document.body.style.userSelect = 'none'; });
    window.addEventListener('mousemove', (e) => { if (!drag) return; const nx = sx + (e.clientX - ox), ny = sy + (e.clientY - oy); ui.style.left = Math.max(8, Math.min(window.innerWidth - 40, nx)) + 'px'; ui.style.top = Math.max(8, Math.min(window.innerHeight - 40, ny)) + 'px'; ui.style.right = 'auto'; ui.style.bottom = 'auto'; });
    window.addEventListener('mouseup', () => { drag = false; document.body.style.userSelect = ''; });
  })();
  // resize
  (function () { let rx = 0, ry = 0, startW = 0, startH = 0, res = false;
    resizer.addEventListener('mousedown', (e) => { res = true; rx = e.clientX; ry = e.clientY; startW = ui.offsetWidth; startH = ui.offsetHeight; document.body.style.userSelect = 'none'; });
    window.addEventListener('mousemove', (e) => { if (!res) return; const w = Math.max(420, startW + (e.clientX - rx)), h = Math.max(300, startH + (e.clientY - ry)); ui.style.width = w + 'px'; ui.style.height = h + 'px'; });
    window.addEventListener('mouseup', () => { res = false; document.body.style.userSelect = ''; });
  })();
})();
