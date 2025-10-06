(function(){ if(window.__mcBlocksStrict)return; const wait=(ms)=>new Promise(r=>setTimeout(r,ms));

  /* ==== ULTRA-LITE UI (no code shown; with Revert; no Copy/Download) ==== */
  const ui=document.createElement('div');
  ui.style.cssText='position:fixed;right:12px;bottom:12px;width:460px;max-height:84vh;overflow:auto;background:#0b1020;color:#e6e8ef;font-family:system-ui,Segoe UI,Arial,sans-serif;border:1px solid #21304f;border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.35);display:flex;flex-direction:column;z-index:2147483647';
  ui.innerHTML=''
  +'<div id="h" style="cursor:move;display:flex;align-items:center;padding:10px 12px;background:#111936;border-bottom:1px solid #21304f">'
  +'  <span style="font-weight:600;font-size:13px">MakeCode AI</span>'
  +'  <span id="status" style="margin-left:10px;font-size:11px;color:#9bb1dd">Idle</span>'
  +'  <button id="x" style="margin-left:auto;background:transparent;border:none;color:#93a4c4;font-size:16px;cursor:pointer">x</button>'
  +'</div>'
  +'<div style="padding:10px 12px;display:grid;gap:8px;border-bottom:1px solid #21304f">'
  +'  <div style="display:flex;gap:8px">'
  +'    <select id="prov" style="flex:1;padding:8px;border-radius:8px;border:1px solid #29324e;background:#0b1020;color:#e6e8ef">'
  +'      <option value="openai">OpenAI</option>'
  +'      <option value="gemini">Gemini</option>'
  +'      <option value="openrouter">OpenRouter</option>'
  +'    </select>'
  +'    <input id="model" placeholder="gpt-4o-mini or gemini-2.5-flash or openrouter/auto" style="flex:1;padding:8px;border-radius:8px;border:1px solid #29324e;background:#0b1020;color:#e6e8ef">'
  +'  </div>'
  +'  <input id="key" type="password" placeholder="API key" style="padding:8px;border-radius:8px;border:1px solid #29324e;background:#0b1020;color:#e6e8ef">'
  +'  <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">'
  +'    <select id="target" style="flex:1 1 48%;padding:8px;border-radius:8px;border:1px solid #29324e;background:#0b1020;color:#e6e8ef">'
  +'      <option value="microbit">micro:bit</option>'
  +'      <option value="arcade">Arcade</option>'
  +'      <option value="maker">Maker</option>'
  +'    </select>'
  +'    <label style="display:flex;gap:6px;align-items:center;font-size:12px;color:#c7d2fe"><input id="inc" type="checkbox" checked>Use current code</label>'
  +'  </div>'
  +'  <textarea id="p" rows="3" placeholder="Describe what you want the block code to do-try to be specific" style="resize:vertical;min-height:64px;padding:8px;border-radius:8px;border:1px solid #29324e;background:#0b1020;color:#e6e8ef"></textarea>'
  +'  <div style="display:flex;gap:8px;flex-wrap:wrap">'
  +'    <button id="go" style="flex:1 1 48%;padding:10px;border:none;border-radius:8px;background:#3b82f6;color:#fff;font-weight:600;cursor:pointer">Generate & Paste</button>'
  +'    <button id="revert" style="flex:1 1 48%;padding:10px;border:1px solid #2b3a5a;border-radius:8px;background:#223058;color:#e6e8ef;cursor:pointer" disabled>Revert</button>'
  +'    <button id="save" style="padding:10px;border:none;border-radius:8px;background:#16a34a;color:#fff;font-weight:600;cursor:pointer">Save Key</button>'
  +'  </div>'
  +'</div>'
  +'<div id="log" style="padding:10px 12px;font-size:11px;color:#9bb1dd;display:block;max-height:200px;overflow:auto"></div>'
  +'<div id="rz" style="position:absolute;width:14px;height:14px;right:2px;bottom:2px;cursor:nwse-resize;background:linear-gradient(135deg,transparent 50%,#2b3a5a 50%);opacity:.9"></div>';
  document.body.appendChild(ui);
  
  /* ==== Refs & state ==== */
  const $=(s)=>ui.querySelector(s);
  const hdr=$('#h'), statusEl=$('#status'), closeBtn=$('#x'), resizer=$('#rz');
  const prov=$('#prov'), key=$('#key'), model=$('#model'), tgtSel=$('#target'), inc=$('#inc');
  const promptEl=$('#p'), go=$('#go'), revertBtn=$('#revert'), log=$('#log'), save=$('#save');
  let __lastCode='';      // hidden last result
  let __undoStack=[];     // snapshots before paste
  const setStatus=(t)=>statusEl.textContent=t;
  const logLine=(t)=>{ const d=document.createElement('div'); d.textContent=t; log.appendChild(d); log.scrollTop=log.scrollHeight; };
  const clearLog=()=>{ log.innerHTML=''; };
  
  /* ==== Monaco helpers ==== */
  const clickLike=(root,labels)=>{
    const arr=labels.map(x=>x.toLowerCase());
    const q=[...root.querySelectorAll('button,[role="tab"],a,[aria-label]')].filter(e=>e&&e.offsetParent!==null);
    for(const el of q){
      const txt=((el.innerText||el.textContent||'')+' '+(el.getAttribute('aria-label')||'')).trim().toLowerCase();
      if(arr.some(s=>txt===s||txt.includes(s))){ el.click(); return el; }
    }
    return null;
  };
  const findMonacoCtx=(timeoutMs=18000)=>{
    const deadline=performance.now()+timeoutMs;
    const cands=[window,...[...document.querySelectorAll('iframe')].map(f=>{try{return f.contentWindow}catch(e){return null}})].filter(Boolean);
    cands.forEach(w=>{try{clickLike(w.document,['javascript','typescript','text']);}catch(e){}});
    return new Promise((resolve,reject)=>{
      (function poll(){
        if(performance.now()>=deadline){reject(new Error('Monaco not found. Open the project editor, not the home page.'));return;}
        for(const w of cands){
          try{
            const m=w.monaco;
            if(m&&m.editor){
              const models=m.editor.getModels();
              if(models&&models.length){
                const editors=m.editor.getEditors?m.editor.getEditors():[];
                const ed=(editors&&editors.length)?editors[0]:null;
                const model=(ed&&ed.getModel&&ed.getModel())||models[0];
                if(model){ resolve({win:w,monaco:m,editor:ed,model:model}); return; }
              }
            }
          }catch(e){}
        }
        setTimeout(poll,100);
        cands.forEach(w=>{try{clickLike(w.document,['javascript','typescript','text']);}catch(e){}});
      })();
    });
  };
  const pasteToMakeCode=(code)=>{
    return findMonacoCtx().then((ctx)=>{
      logLine('Switching to JavaScript tab.');
      clickLike(ctx.win.document,['javascript','typescript','text']);
      return wait(20).then(()=>{
        // Snapshot BEFORE paste
        try{
          const prev = ctx.model.getValue() || '';
          __undoStack.push(prev);
          revertBtn.disabled = false;
          logLine('Snapshot saved for revert.');
        }catch(e){ logLine('Snapshot failed: '+e); }
        logLine('Pasting generated code into editor.');
        ctx.model.setValue(code);
        if(ctx.editor && ctx.editor.setPosition) ctx.editor.setPosition({lineNumber:1,column:1});
        logLine('Switching back to Blocks.');
        clickLike(ctx.win.document,['blocks']) || (function(){ const m=ctx.win.document.querySelector('button[aria-label*="More"],button[aria-label*="Editor"],.menu-button,.more-button'); if(m){ m.click(); return clickLike(ctx.win.document,['blocks']); }})();
      });
    });
  };
  const revertEditor=()=>{
    return findMonacoCtx().then((ctx)=>{
      if(!__undoStack.length){ throw new Error('No snapshot to revert to.'); }
      const prev = __undoStack.pop();
      logLine('Switching to JavaScript tab for revert.');
      clickLike(ctx.win.document,['javascript','typescript','text']);
      return wait(20).then(()=>{
        logLine('Restoring previous code.');
        ctx.model.setValue(prev);
        if(ctx.editor && ctx.editor.setPosition) ctx.editor.setPosition({lineNumber:1,column:1});
        logLine('Switching back to Blocks.');
        clickLike(ctx.win.document,['blocks']) || (function(){ const m=ctx.win.document.querySelector('button[aria-label*="More"],button[aria-label*="Editor"],.menu-button,.more-button'); if(m){ m.click(); return clickLike(ctx.win.document,['blocks']); }})();
      });
    }).then(()=>{
      if(!__undoStack.length) revertBtn.disabled = true;
    });
  };
  
  /* ==== Sanitizer / extract ==== */
  const sanitizeMakeCode=(txt)=>{
    if(!txt) return '';
    let s=String(txt);
    if(/^```/.test(s)) s=s.replace(/^```[\s\S]*?\n/,'').replace(/```\s*$/,'');
    s=s.replace(/\\r\\n/g,"\n").replace(/\\n/g,"\n").replace(/\\t/g,"\t");
    s=s.replace(/\r\n/g,"\n").replace(/\r/g,"\n");
    s=s.replace(/[\u2018\u2019]/g,"'").replace(/[\u201C\u201D]/g,'"');
    s=s.replace(/[\u200B-\u200D\uFEFF]/g,"").replace(/\u00A0/g," ");
    s=s.replace(/^`+|`+$/g,"");
    return s.trim();
  };
  const separateFeedback=(raw)=>{
    const feedback=[];
    if(!raw) return {feedback, body:''};
    let text=String(raw).replace(/\r\n/g,"\n").replace(/\r/g,"\n");
    const lines=text.split('\n');
    const bodyLines=[];
    for(const line of lines){
      const trimmed=line.trim();
      if(/^FEEDBACK:/i.test(trimmed)){
        feedback.push(trimmed.replace(/^FEEDBACK:\s*/i,'').trim());
        continue;
      }
      bodyLines.push(line);
    }
    return {feedback, body:bodyLines.join('\n').trim()};
  };
  const extractCode=(s)=>{
    if(!s) return '';
    const m=s.match(/```[a-z]*\n([\s\S]*?)```/);
    const code=m?m[1]:s;
    return sanitizeMakeCode(code);
  };
  
  /* ==== Blocks-compat validator ==== */
  function validateBlocksCompatibility(code, target){
    const rules = [
      {re:/=>/g, why:'arrow functions'},
      {re:/\bclass\s+/g, why:'classes'},
      {re:/\bnew\s+[A-Z_a-z]/g, why:'new constructor'},
      {re:/\bPromise\b|\basync\b|\bawait\b/g, why:'promises/async'},
      {re:/\bimport\s|\bexport\s/g, why:'import/export'},
      {re:/`/g, why:'template strings'},
      {re:/\.\s*(map|forEach|filter|reduce|find|some|every)\s*\(/g, why:'higher-order array methods'},
      {re:/\bnamespace\b|\bmodule\b/g, why:'namespaces/modules'},
      {re:/\benum\b|\binterface\b|\btype\s+[A-Z_a-z]/g, why:'TS types/enums'},
      {re:/<\s*[A-Z_a-z0-9_,\s]+>/g, why:'generics syntax'},
      {re:/setTimeout\s*\(|setInterval\s*\(/g, why:'timers'},
      {re:/console\./g, why:'console calls'},
      {re:/^\s*\/\//m, why:'line comments'},
      {re:/\/\*[\s\S]*?\*\//g, why:'block comments'}
    ];
    if(target==='microbit'||target==='maker'){
      if(/sprites\.|controller\.|scene\.|game\.onUpdate/i.test(code)) return {ok:false, violations:['Arcade APIs in micro:bit/Maker']};
    }
    if(target==='arcade'){
      if(/led\./i.test(code) || /radio\./i.test(code)) return {ok:false, violations:['micro:bit APIs in Arcade']};
    }
    const violations=[]; for(const r of rules){ if(r.re.test(code)) violations.push(r.why); }
    if(/[^\x09\x0A\x0D\x20-\x7E]/.test(code)) violations.push('non-ASCII characters');
    return {ok:violations.length===0, violations:[...new Set(violations)]};
  }
  
  /* ==== Strict prompt for Blocks-convertible code ==== */
  let BASE_TEMP=0.1;     // more deterministic
  let MAXTOK=3072;       // extra budget if supported
  const sysFor=(t)=>{
    // Clarify namespace per target
    let ns='basic,input,music,led,radio,pins,loops,logic,variables,math,functions,arrays,text,game,images,serial,control';
    let targetName='micro:bit';
    if(t==='arcade'){ ns='controller,game,scene,sprites,info,music,effects,game'; targetName='Arcade'; }
    if(t==='maker'){ ns='pins,input,loops,music'; targetName='Maker'; }
  
    return [
      'ROLE: You are a Microsoft MakeCode assistant.',
      'HARD REQUIREMENT: Return ONLY Microsoft MakeCode Static JavaScript that the MakeCode decompiler can convert to BLOCKS for '+targetName+' with ZERO errors.',
      'OPTIONAL FEEDBACK: You may send brief notes before the code. Prefix each note with "FEEDBACK: ".',
      'RESPONSE FORMAT: After any feedback lines, output ONLY Microsoft MakeCode Static TypeScript with no markdown fences or extra prose.',
      'NO COMMENTS inside the code.',
      'ALLOWED APIS: '+ns+'. Prefer event handlers and forever/update loops.',
      'FORBIDDEN IN OUTPUT: arrow functions (=>), classes, new constructors, async/await/Promise, import/export, template strings (`), higher-order array methods (map/filter/reduce/forEach/find/some/every), namespaces/modules, enums, interfaces, type aliases, generics, timers (setTimeout/setInterval), console calls, markdown, escaped newlines, onstart functions, and any other javascript code that cannot be converted into blocks',
      'TARGET-SCOPE: Use ONLY APIs valid for '+targetName+'. Never mix Arcade APIs into micro:bit/Maker or vice versa.',
      'STYLE: Straight quotes, ASCII only, real newlines, use function () { } handlers.',
      'VAGUE REQUESTS: Choose sensible defaults and still produce a small interactive program.',
      'SELF-CHECK BEFORE SENDING: Ensure every forbidden construct is removed; ensure only allowed APIs for '+targetName+' are used; ensure it decompiles to BLOCKS.',
      'IF UNSURE: Return a minimal program that is guaranteed to decompile to BLOCKS for '+targetName+'. Code only.'
    ].join('\n');
  };
  const userFor=(req,cur)=>{
    const header = 'USER_REQUEST:\n'+req.trim();
    if(cur&&cur.trim().length){
      return header+'\n\n<<<CURRENT_CODE>>>\n'+cur+'\n<<<END_CURRENT_CODE>>>';
    }
    return header;
  };
  
  /* ==== Fallback stub (never leave you empty) ==== */
  function stubForTarget(t){
    if(t==='arcade'){ return ['controller.A.onEvent(ControllerButtonEvent.Pressed, function () {','    game.splash("Start!")','})','game.onUpdate(function () {','})'].join('\n'); }
    if(t==='maker'){ return ['loops.forever(function () {','})'].join('\n'); }
    return ['basic.onStart(function () {','    basic.showString("Hi")','})'].join('\n'); // micro:bit
  }
  
  /* ==== Provider calls with timeouts & empty-output handling ==== */
  const REQ_TIMEOUT_MS=60000;
  const EMPTY_RETRIES=2;
  function withTimeout(promise, ms, label){
    return Promise.race([
      promise,
      new Promise((_,rej)=>setTimeout(()=>rej(new Error((label||'request')+' timeout')), ms))
    ]);
  }
  function extractGeminiText(resp){
    try{
      if(!resp) return '';
      if(resp.candidates && resp.candidates.length>0){
        const c=resp.candidates[0];
        if(c.finishReason && String(c.finishReason).toUpperCase().includes('BLOCK')) return '';
        const parts=(c.content && c.content.parts)||[]; let s='';
        for(let i=0;i<parts.length;i++){ if(parts[i].text) s+=parts[i].text; }
        return (s||'').trim();
      }
      if(resp.promptFeedback && resp.promptFeedback.blocked) return '';
    }catch(e){}
    return '';
  }
  function parseModelList(mdl){
    if(!mdl) return [];
    return mdl.split(/[\s,]+/).map(s=>s.trim()).filter(Boolean);
  }
  function callOpenAI(k,mdl,sys,user){
    const body={model:mdl||'gpt-4o-mini',temperature:BASE_TEMP,max_tokens:MAXTOK,messages:[{role:'system',content:sys},{role:'user',content:user}]};
    return withTimeout(
      fetch('https://api.openai.com/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+k},body:JSON.stringify(body)})
        .then(r=>{ if(!r.ok) return r.text().then(tx=>{throw new Error(tx)}); return r.json(); })
        .then(j=> (j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content || '').trim()),
      REQ_TIMEOUT_MS,'OpenAI');
  }
  function callGemini(k,mdl,sys,user){
    const url='https://generativelanguage.googleapis.com/v1/models/'+encodeURIComponent(mdl||'gemini-2.5-flash')+':generateContent?key='+encodeURIComponent(k);
    const body={contents:[{role:'user',parts:[{text:sys+'\n\n'+user}]}],generationConfig:{temperature:BASE_TEMP,maxOutputTokens:MAXTOK}};
    return withTimeout(
      fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})
        .then(r=>{ if(!r.ok) return r.text().then(tx=>{throw new Error(tx)}); return r.json(); })
        .then(j=> extractGeminiText(j)),
      REQ_TIMEOUT_MS,'Gemini');
  }
  function callOpenRouter(k,mdl,sys,user){
    const models=parseModelList(mdl);
    const queue=models.length?models:['openrouter/auto'];
    const baseUrl='https://openrouter.ai/api/v1/chat/completions';
    const baseHeaders={
      'Content-Type':'application/json',
      'Authorization':'Bearer '+k
    };
    try{ baseHeaders['HTTP-Referer']=location&&location.origin?location.origin:document&&document.location&&document.location.origin?document.location.origin:''; }catch(e){}
    try{ const title=document&&document.title; if(title) baseHeaders['X-Title']=title; }catch(e){}
    const sendForModel=(modelId)=>{
      const body={model:modelId,temperature:BASE_TEMP,max_tokens:MAXTOK,messages:[{role:'system',content:sys},{role:'user',content:user}]};
      return withTimeout(
        fetch(baseUrl,{method:'POST',headers:{...baseHeaders},body:JSON.stringify(body)})
          .then(r=>{ if(!r.ok) return r.text().then(tx=>{throw new Error(tx||('HTTP '+r.status));}); return r.json(); })
          .then(j=> (j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content || '').trim()),
        REQ_TIMEOUT_MS,'OpenRouter '+modelId);
    };
    const attempt=(idx)=>{
      if(idx>=queue.length) return Promise.reject(new Error('All OpenRouter models failed'));
      const modelName=queue[idx];
      logLine('OpenRouter trying '+modelName+'.');
      return sendForModel(modelName).then(res=>{
        if(res && res.trim()) return res;
        if(idx<queue.length-1){
          logLine('Model '+modelName+' returned empty result. Trying next model.');
          return attempt(idx+1);
        }
        return res;
      }).catch(err=>{
        if(idx<queue.length-1){
          logLine('Model '+modelName+' failed: '+(err&&err.message?err.message:String(err))+'. Trying next model.');
          return attempt(idx+1);
        }
        throw err;
      });
    };
    return attempt(0);
  }

  /* ==== Ask model with validation & robust empty handling ==== */
  function askValidated(provider, apiKey, mdl, sys, user, target){
    const providers={openai:callOpenAI, gemini:callGemini, openrouter:callOpenRouter};
    const fn=providers[provider]||providers.openai;
    const friendly={openai:'OpenAI', gemini:'Gemini', openrouter:'OpenRouter'};
    function oneAttempt(extraSys, insist){
      const finalSys = sys + (extraSys?('\n'+extraSys):'') + (insist?'\nMANDATE: You must output only Blocks-decompilable MakeCode Static TypeScript.':'');
      const who=friendly[provider]||provider;
      logLine('Sending to '+who+' ('+(mdl||'default')+').');
      return fn(apiKey, mdl, finalSys, user).then(raw=>{
        const {feedback, body} = separateFeedback(raw);
        let code = extractCode(body);
        code = sanitizeMakeCode(code);
        const v = validateBlocksCompatibility(code, target);
        return {code, v, feedback};
      });
    }
    // 1) Try, 2) retry on empty, 3) retry to remove violations, else stub
    return oneAttempt(null,false).then(res=>{
      if(!res.code || !res.code.trim()){
        return (function loopEmpty(i, prevRes){
          if(i>=EMPTY_RETRIES) return prevRes;
          const extra='Your last message returned no code. Return ONLY Blocks-decompilable MakeCode Static TypeScript. No prose.';
          return oneAttempt(extra,true).then(nr=>{
            if(nr.code && nr.code.trim()) return nr;
            return loopEmpty(i+1,nr);
          });
        })(0,res);
      }
      return res;
    }).then(res0=>{
      if(!res0.code || !res0.code.trim()) return res0;
      if(res0.v && res0.v.ok) return res0;
      const viol=(res0.v && res0.v.violations)||[];
      const fb1='Previous code used: '+viol.join(', ')+'. Remove ALL forbidden constructs. Use only '+(target==='arcade'?'Arcade':'micro:bit/Maker')+' APIs.';
      return oneAttempt(fb1,true).then(res1=>{
        if((res1.v && res1.v.ok) || (!res1.v && res1.code)) return res1;
        const v2=(res1.v && res1.v.violations)||[];
        const fb2='STRICT MODE: Output a smaller program that fully decompiles to Blocks. Absolutely no: '+v2.join(', ')+'.';
        return oneAttempt(fb2,true);
      });
    }).then(finalRes=>{
      const fb=(finalRes && Array.isArray(finalRes.feedback)) ? finalRes.feedback : [];
      if(!finalRes || !finalRes.code || !finalRes.code.trim()){
        logLine('Model returned no code after retries. Using minimal stub.');
        return {code:stubForTarget(target), feedback:fb};
      }
      return {code:finalRes.code, feedback:fb};
    });
  }
  
  /* ==== Persistence & actions ==== */
  try{const saved=localStorage.getItem('__mc_ai_key'); if(saved) key.value=saved;}catch(e){}
  save.onclick=function(){ try{localStorage.setItem('__mc_ai_key',key.value.trim()); setStatus('Key saved'); logLine('API key saved in this browser.'); }catch(e){ logLine('Save failed: '+e); } };
  
  /* ==== Main action (with Loading… state) ==== */
  let busy=false;
  go.onclick=function(){
    if(busy) return; busy=true;
    clearLog(); setStatus('Working'); logLine('Generating…');
    const apiKey=key.value.trim(); if(!apiKey){ alert('Enter API key'); busy=false; return; }
    const req=promptEl.value.trim(); if(!req){ setStatus('Idle'); logLine('Please enter a request.'); busy=false; return; }
    const provider=prov.value, mdl=model.value.trim(), t=tgtSel.value.trim();
  
    const origText = go.textContent;
    go.textContent='Loading…'; go.disabled=true; go.style.opacity='0.7'; go.style.cursor='not-allowed';
  
    const curP = inc.checked ? (findMonacoCtx().then(ctx=>{ logLine('Reading current JavaScript.'); return ctx.model.getValue()||''; }).catch(()=>{ logLine('Could not read current code.'); return ''; })) : Promise.resolve('');
  
    curP.then(cur=>{
      const sys=sysFor(t), user=userFor(req,cur);
      return askValidated(provider, apiKey, mdl, sys, user, t);
    }).then(result=>{
      const feedback=(result && Array.isArray(result.feedback))?result.feedback:[];
      if(feedback.length){
        feedback.forEach(msg=>{ if(msg) logLine('Feedback: '+msg); });
      }
      __lastCode = (result && result.code) || '';
      if(!__lastCode){ setStatus('No code'); logLine('No code returned.'); busy=false; return; }
      setStatus('Pasting');
      return pasteToMakeCode(__lastCode).then(()=>{ setStatus('Done'); logLine('Pasted and switched back to Blocks.'); });
    }).catch(e=>{
      setStatus('Error'); logLine('Model/API error: '+(e&&e.message?e.message:String(e)));
    }).finally(()=>{
      busy=false;
      go.textContent=origText; go.disabled=false; go.style.opacity=''; go.style.cursor='pointer';
    });
  };
  
  /* ==== Revert action ==== */
  revertBtn.onclick=function(){
    if(revertBtn.disabled) return;
    const orig = revertBtn.textContent;
    revertBtn.textContent='Reverting…'; revertBtn.disabled=true; revertBtn.style.opacity='0.7'; revertBtn.style.cursor='not-allowed';
    setStatus('Reverting'); logLine('Reverting to previous snapshot…');
    revertEditor().then(()=>{
      setStatus('Reverted'); logLine('Revert complete: restored previous code and switched back to Blocks.');
    }).catch(e=>{
      setStatus('Error'); logLine('Revert failed: '+(e&&e.message?e.message:String(e)));
    }).finally(()=>{
      revertBtn.textContent=orig;
      revertBtn.style.opacity=''; revertBtn.style.cursor='pointer';
      if(__undoStack.length) revertBtn.disabled=false;
    });
  };
  
  /* ==== Drag/Resize/Close ==== */
  (function(){let ox=0,oy=0,sx=0,sy=0,drag=false;
    hdr.addEventListener('mousedown',(e)=>{drag=true;ox=e.clientX;oy=e.clientY;const r=ui.getBoundingClientRect();sx=r.left;sy=r.top;document.body.style.userSelect='none';});
    window.addEventListener('mousemove',(e)=>{if(!drag)return;const nx=sx+(e.clientX-ox),ny=sy+(e.clientY-oy);ui.style.left=Math.max(0,Math.min(window.innerWidth-ui.offsetWidth,nx))+'px';ui.style.top=Math.max(0,Math.min(window.innerHeight-60,ny))+'px';ui.style.right='auto';ui.style.bottom='auto';});
    window.addEventListener('mouseup',()=>{drag=false;document.body.style.userSelect='';});
  })();
  (function(){let rx=0,ry=0,startW=0,startH=0,res=false;
    resizer.addEventListener('mousedown',(e)=>{res=true;rx=e.clientX;ry=e.clientY;startW=ui.offsetWidth;startH=ui.offsetHeight;document.body.style.userSelect='none';});
    window.addEventListener('mousemove',(e)=>{if(!res)return;const w=Math.max(380,startW+(e.clientX-rx)),h=Math.max(260,startH+(e.clientY-ry));ui.style.width=w+'px';ui.style.height=h+'px';});
    window.addEventListener('mouseup',()=>{res=false;document.body.style.userSelect='';});
  })();
  closeBtn.onclick=function(){ui.remove();};
  
  window.__mcBlocksStrict=1;
  })();
