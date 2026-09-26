import {autosave} from './autosave.js';
// Formative review of learner-selected writing. No correctness classifier or mastery action.
export function createFeedbackUI({api,esc,toast,copy}) {
  let data={entries:[],sources:[],criteria:[]},loaded=false,view=0,loadVersion=0,active=null,events=null;
  autosave.register(()=>{if(!active?.dirty)return;if(active.error){if(active.failed?.path==='feedback/save'&&!(active.error.status>=400&&active.error.status<500))return retry(active);return;}return flush(active);});
  const contexts=new Map(),creationRequests=new Map(),kinds={legacy:'Lesson homework',reflection:'Explain it back',video:'Video homework',writing:'Connected written task',studio:'Application project'};
  const $=s=>document.querySelector(s),clone=v=>JSON.parse(JSON.stringify(v));
  const requestId=()=>globalThis.crypto?.randomUUID?.()||`review_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const date=v=>{const d=new Date(v);return Number.isNaN(d.valueOf())?'Saved work':d.toLocaleString(undefined,{dateStyle:'medium',timeStyle:'short'});};
  const fresh=(v,ctx)=>v===view&&(!ctx||active===ctx)&&Boolean($('#feedback-root'));
  const on=(node,event,handler)=>node?.addEventListener(event,handler,{signal:events.signal});
  function report(error){toast?.(error.message||String(error));}
  async function load(){const version=++loadVersion,result=await api('feedback');if(version!==loadVersion)return;data={entries:[],sources:[],criteria:[],...result};loaded=true;}
  function related(topicId){const n=data.entries.filter(e=>e.source.topic_ids.includes(topicId)).length;return `<div class="fd-related"><a href="#feedback/topic/${encodeURIComponent(topicId)}">${n?`Continue ${n===1?'your written review':'written reviews'}`:'Review your written reasoning'} →</a></div>`;}
  function context(entry){
    const key=`${data.profile_id}:${entry.id}`;let ctx=contexts.get(key);
    if(!ctx){ctx={key,profileId:data.profile_id,entry:clone(entry),draft:clone(entry.draft),editSerial:0,savedSerial:0,queuedSerial:0,dirty:false,pending:Promise.resolve(),timer:null,error:null,failed:null};contexts.set(key,ctx);}
    else if(!ctx.dirty&&!ctx.error&&ctx.savedSerial===ctx.queuedSerial&&entry.revision>=ctx.entry.revision){ctx.entry=clone(entry);ctx.draft=clone(entry.draft);}
    return ctx;
  }
  function remember(entry){const i=data.entries.findIndex(e=>e.id===entry.id);if(i<0)data.entries.unshift(entry);else data.entries[i]=entry;}
  function status(ctx){
    if(active!==ctx||!$('#fd-save-status'))return;
    const node=$('#fd-save-status');node.classList.toggle('fd-save-error',Boolean(ctx.error));
    node.textContent=ctx.error?`Not saved: ${ctx.error.message} Your text remains in the fields below.`:ctx.dirty?'Saving your review draft…':'✓ Draft saved · awaiting tutor review';
    if($('#fd-copy-unsaved'))$('#fd-copy-unsaved').hidden=!ctx.error;
    if($('#fd-retry-save'))$('#fd-retry-save').hidden=!(ctx.error&&ctx.failed);
  }
  function queueOperation(ctx,path,makePayload,done){
    const token=requestId();
    const task=ctx.pending.catch(()=>{}).then(async()=>{
      if(ctx.error)throw ctx.error;
      const payload={id:ctx.entry.id,request_id:token,base_revision:ctx.entry.revision,...makePayload()};
      ctx.failed={path,payload,done};
      const result=await api(path,payload,ctx.profileId);
      if(result.entry.revision!==payload.base_revision+1)throw Error('Another edit followed this saved request. Copy your unsaved draft, then reload to compare both versions.');
      ctx.entry=clone(result.entry);ctx.failed=null;if(data.profile_id===ctx.profileId)remember(result.entry);done?.(result.entry);status(ctx);return result;
    });
    ctx.pending=task.catch(error=>{ctx.error=error;ctx.dirty=true;status(ctx);throw error;});
    ctx.pending.catch(()=>{});return ctx.pending;
  }
  function flush(ctx){
    if(ctx.timer){clearTimeout(ctx.timer);ctx.timer=null;}
    if(ctx.error)return Promise.reject(ctx.error);
    if(!ctx.dirty||ctx.editSerial<=ctx.queuedSerial)return ctx.pending;
    const snapshot=clone(ctx.draft),serial=ctx.editSerial;ctx.queuedSerial=serial;
    return queueOperation(ctx,'feedback/save',()=>({draft:snapshot}),()=>{ctx.savedSerial=serial;if(ctx.editSerial===serial)ctx.dirty=false;});
  }
  function changed(ctx){ctx.editSerial++;ctx.dirty=true;status(ctx);if(ctx.timer)clearTimeout(ctx.timer);if(!ctx.error)ctx.timer=setTimeout(()=>{ctx.timer=null;flush(ctx).catch(()=>{});},450);}
  async function retry(ctx){
    const failed=ctx.failed;if(!failed)return;
    try{
      const result=await api(failed.path,failed.payload,ctx.profileId);
      if(result.entry.revision!==failed.payload.base_revision+1)throw Error('Another edit followed this saved request. Copy your unsaved draft, then reload to compare both versions.');
      ctx.entry=clone(result.entry);ctx.error=null;ctx.failed=null;if(data.profile_id===ctx.profileId)remember(result.entry);failed.done?.(result.entry);
      ctx.queuedSerial=ctx.savedSerial;ctx.pending=Promise.resolve();ctx.dirty=ctx.editSerial>ctx.savedSerial;status(ctx);dynamic(ctx);if(ctx.dirty)await flush(ctx);
    }catch(error){ctx.error=error;status(ctx);throw error;}
  }
  function cancel(){
    if(active&&active.dirty)flush(active).catch(()=>{});
    view++;events?.abort();events=null;active=null;
  }
  const badge=e=>e.versions.length>1?'Revised · awaiting review':'Awaiting review';
  const pageButtons=(page,total,attr)=>`<div class="fd-pages"><button class="button secondary small" ${page===0?'disabled':''} data-${attr}="${page-1}">← Previous three</button><span>${total?`${page*3+1}–${Math.min(total,page*3+3)} of ${total}`:'0 items'}</span><button class="button secondary small" ${page*3+3>=total?'disabled':''} data-${attr}="${page+1}">Next three →</button></div>`;
  function hub(topicId=''){
    let sourcePage=0,reviewPage=0,query='',kind='all';
    const sourceTopic=data.sources.find(s=>s.topic_ids.includes(topicId));
    $('#main').innerHTML=`<div id="feedback-root" class="feedback-desk"><div class="intro"><div><div class="eyebrow">WRITTEN REASONING DESK</div><h1>Make each step explainable.</h1><p>Bring one piece of saved work, find the uncertain step, and improve the argument.</p></div><a class="button secondary" href="#homework">My saved work ↗</a></div>${topicId?`<div class="fd-filter-note">Showing writing connected to ${esc(sourceTopic?.title||topicId)}. <a href="#feedback">Show every topic →</a></div>`:''}<div class="fd-cycle"><span><b>1</b> Choose your writing</span><span><b>2</b> Inspect the reasons</span><span><b>3</b> Revise and explain the change</span></div><section><div class="section-title"><h2>Choose a saved answer</h2><span>Three at a time</span></div><div class="fd-filters"><label>Find a topic or prompt<input type="search" id="fd-source-search" placeholder="Search your saved writing…"></label><label>Work type<select id="fd-source-kind"><option value="all">All writing</option>${Object.entries(kinds).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}</select></label></div><div id="fd-sources"></div></section><section><div class="section-title"><h2>Your review drafts</h2></div><div id="fd-reviews"></div></section><p class="fd-evidence-note">Guidance, notes, and revisions support learning. They remain separate from independent checks and mastery evidence.</p></div>`;
    function drawSources(){
      const list=data.sources.filter(s=>(!topicId||s.topic_ids.includes(topicId))&&(kind==='all'||s.kind===kind)&&`${s.title} ${s.prompt}`.toLowerCase().includes(query.toLowerCase()));sourcePage=Math.min(sourcePage,Math.max(0,Math.ceil(list.length/3)-1));
      $('#fd-sources').innerHTML=list.length?`<div class="fd-source-grid">${list.slice(sourcePage*3,sourcePage*3+3).map(s=>`<article class="card fd-source"><div class="eyebrow">${esc(kinds[s.kind]||'Saved writing')}</div><h3>${esc(s.title)}</h3><p class="fd-source-prompt">${esc(s.prompt)}</p><details><summary>Read my saved answer</summary><div class="fd-writing">${esc(s.text)}</div></details><button class="button small" data-fd-source="${esc(s.id)}">Review this answer →</button></article>`).join('')}</div>${pageButtons(sourcePage,list.length,'fd-source-page')}`:`<div class="fd-empty"><h3>No saved writing matches yet.</h3><p>Write an explanation in a lesson or application project, save it, and return here.</p><div class="lesson-actions"><a class="button secondary" href="${topicId?`#topic/${encodeURIComponent(topicId)}/explain`:'#homework'}">Open my writing</a><a class="button secondary" href="#studio">Choose an application</a></div></div>`;
      document.querySelectorAll('[data-fd-source-page]').forEach(b=>on(b,'click',()=>{sourcePage=Number(b.dataset.fdSourcePage);drawSources();}));
      document.querySelectorAll('[data-fd-source]').forEach(b=>on(b,'click',async()=>{
        const v=view,profileId=data.profile_id,key=`${profileId}:${b.dataset.fdSource}`;b.disabled=true;if(!creationRequests.has(key))creationRequests.set(key,requestId());
        try{const result=await api('feedback/save',{source_id:b.dataset.fdSource,base_revision:0,request_id:creationRequests.get(key)},profileId);if(data.profile_id===profileId)remember(result.entry);if(!fresh(v)||data.profile_id!==profileId)return;creationRequests.delete(key);location.hash=`#feedback/${result.entry.id}`;}catch(error){if(fresh(v)){b.disabled=false;report(error);}}
      }));
    }
    function drawReviews(){
      const list=data.entries.filter(e=>!topicId||e.source.topic_ids.includes(topicId));reviewPage=Math.min(reviewPage,Math.max(0,Math.ceil(list.length/3)-1));
      $('#fd-reviews').innerHTML=list.length?list.slice(reviewPage*3,reviewPage*3+3).map(e=>`<a class="fd-review-row" href="#feedback/${e.id}"><div><strong>${esc(e.source.title)}</strong><p>${esc(e.source.prompt)}</p><small>${esc(date(e.updated_at))} · ${e.versions.length} ${e.versions.length===1?'version':'versions'}</small></div><span>${badge(e)} →</span></a>`).join('')+pageButtons(reviewPage,list.length,'fd-review-page'):'<p class="fd-muted">Choose a saved answer above to open your first review.</p>';
      document.querySelectorAll('[data-fd-review-page]').forEach(b=>on(b,'click',()=>{reviewPage=Number(b.dataset.fdReviewPage);drawReviews();}));
    }
    on($('#fd-source-search'),'input',e=>{query=e.target.value;sourcePage=0;drawSources();});on($('#fd-source-kind'),'change',e=>{kind=e.target.value;sourcePage=0;drawSources();});drawSources();drawReviews();
  }
  function historyHTML(entry){return [...entry.versions].reverse().map(v=>`<details class="fd-version" ${v.number===entry.versions.length?'open':''}><summary>Version ${v.number} · ${v.origin==='saved_source'?'Imported original':'Learner revision'} <small>${esc(date(v.created_at))}</small></summary><div class="fd-writing">${esc(v.text)}</div>${v.reflection?`<div class="fd-correction"><strong>What changed and why</strong><p>${esc(v.reflection)}</p></div>`:''}</details>`).join('');}
  function notesHTML(entry){return entry.notes.length?entry.notes.map(n=>`<article class="fd-note"><div><strong>${esc(n.source_label)}</strong><span>Version ${n.version} · ${esc(date(n.created_at))}</span></div><p>${esc(n.text)}</p><small>Attribution supplied by the learner · awaiting independent review</small></article>`).join(''):'<p class="fd-muted">No feedback notes yet. You can start with your own observation.</p>';}
  function focusHTML(ctx){const g=data.criteria.find(c=>c.id===ctx.draft.focus)||data.criteria[0];return g?`<span class="eyebrow">ONE USEFUL NEXT ACTION</span><h3>${esc(g.title)}</h3><p>${esc(g.action)}</p>`:'';}
  function dynamic(ctx){if(active!==ctx)return;if($('#fd-history'))$('#fd-history').innerHTML=historyHTML(ctx.entry);if($('#fd-notes'))$('#fd-notes').innerHTML=notesHTML(ctx.entry);if($('#fd-version-label'))$('#fd-version-label').textContent=`${ctx.entry.versions.length} saved ${ctx.entry.versions.length===1?'version':'versions'} · ${badge(ctx.entry)}`;}
  function localBrief(ctx){
    const form=active===ctx?$('#fd-note-form'):null;
    const note=form?.elements.text.value.trim()?{text:form.elements.text.value,source:form.elements.source.value,version:form.elements.version.value}:ctx.failed?.path==='feedback/note'?ctx.failed.payload:null;
    const pendingNote=note?`\n\nFeedback note waiting to save (${note.source}, version ${note.version}):\n${note.text}`:'';
    return `My unsaved written review draft\nTopic: ${ctx.entry.source.title}\nOriginal prompt:\n${ctx.entry.source.prompt}\n\nCurrent draft:\n${ctx.draft.revision_text}\n\nUncertain step:\n${ctx.draft.uncertain_step}\n\nWhat changed and why:\n${ctx.draft.correction_reflection}\n\nMy criterion notes:\n${data.criteria.map(g=>g.title+': '+(ctx.draft.review_notes?.[g.id]||'')).join('\n')}${pendingNote}\n\nThis is unreviewed, supported work; no mastery or teacher certification is implied.`;
  }
  function editor(ctx){
    const entry=ctx.entry,source=entry.source,draft=ctx.draft,latest=entry.versions.at(-1),v=view;
    $('#main').innerHTML=`<div id="feedback-root" class="feedback-desk"><a class="backlink" href="#feedback">← Written reasoning desk</a><div class="intro"><div><div class="eyebrow">A SAVED ANSWER, A CLEARER ARGUMENT</div><h1>${esc(source.title)}</h1><p id="fd-version-label">${entry.versions.length} saved ${entry.versions.length===1?'version':'versions'} · ${badge(entry)}</p></div><a class="button secondary small" href="${esc(source.route)}">Original activity ↗</a></div><div class="fd-savebar"><p id="fd-save-status" role="status" aria-live="polite"></p><button class="button secondary small" id="fd-copy-unsaved" hidden>Copy this unsaved draft</button></div><div class="fd-workspace"><div class="fd-main"><section class="card fd-section fd-source-context"><div class="eyebrow">THE ORIGINAL PROMPT</div><h2>${esc(source.prompt)}</h2>${source.context?`<details><summary>Situation and saved model controls</summary><p>${esc(source.context)}</p><p>${esc(source.decision||'')}</p>${source.model_inputs?`<p class="fd-writing">${esc(JSON.stringify(source.model_inputs))}</p>`:''}</details>`:''}<details><summary>Read the imported original answer</summary><div class="fd-writing">${esc(source.text)}</div><p class="fd-muted">This snapshot stays attached even if you change the original activity later.</p></details>${source.rubric.length?`<details><summary>What this task asks your reasoning to show</summary><ul>${source.rubric.map(s=>`<li>${esc(s)}</li>`).join('')}</ul></details>`:''}</section><section class="card fd-section"><h2>Find the uncertain step</h2><label class="fd-field">Quote a step, or describe where the reasoning stops making sense<textarea data-fd-field="uncertain_step" rows="3" maxlength="3000" placeholder="I wrote …, but I am not sure why …">${esc(draft.uncertain_step)}</textarea></label><label class="fd-field">Start with this part of the argument<select id="fd-focus">${data.criteria.map(g=>`<option value="${g.id}" ${draft.focus===g.id?'selected':''}>${esc(g.title)}</option>`).join('')}</select></label><div class="fd-next-action" id="fd-next-action">${focusHTML(ctx)}</div><div class="fd-links">${source.links.map(l=>`<a href="${esc(l.href)}" title="${esc(l.reason||'')}">${esc(l.label)} ↗</a>`).join('')}</div></section><section class="card fd-section"><h2>Ask for a precise review</h2><p>Prepare a brief with this prompt, your explanation, the uncertain step, and your notes. Review it before copying it to a tutor.</p><div class="lesson-actions"><button class="button" id="fd-prepare-brief">Prepare tutor review brief</button>${source.topic_ids[0]?`<a class="button secondary" href="#tailor/${encodeURIComponent(source.topic_ids[0])}/writing-${encodeURIComponent(entry.id)}">Optional AI workspace ↗</a>`:''}</div><div id="fd-brief-panel" hidden><label class="fd-field">Grounded review brief<textarea id="fd-brief" rows="9" readonly></textarea></label><button class="button secondary small" id="fd-copy-brief">Copy brief</button><p class="fd-muted">Copying sends nothing automatically. AI feedback can be saved below with its source label.</p></div></section><section class="card fd-section"><h2>Keep the feedback and its source</h2><div id="fd-notes">${notesHTML(entry)}</div><form id="fd-note-form"><label class="fd-field">Where did this note come from?<select name="source"><option value="my_notes">My notes</option><option value="pasted_tutor">Tutor feedback I pasted</option><option value="unverified_ai">Unverified AI feedback</option></select></label><label class="fd-field">Attach it to an explanation version<select name="version">${entry.versions.map(version=>`<option value="${version.number}" ${version.number===latest.number?'selected':''}>Version ${version.number}</option>`).join('')}</select></label><label class="fd-field">Specific feedback or a question<textarea name="text" rows="4" maxlength="8000" required placeholder="The step that needs attention is … because …"></textarea></label><button class="button secondary" type="submit">Save feedback note</button></form><p class="fd-evidence-note">Source labels are supplied by you. A pasted comment is not a verified teacher decision and cannot certify mastery.</p></section><section class="card fd-section"><h2>Revise the explanation</h2><p>Use the next action above to repair a step. Keep enough reasoning that another learner could follow it.</p><label class="fd-field">My revised explanation<textarea data-fd-field="revision_text" rows="8" maxlength="24000">${esc(draft.revision_text)}</textarea></label><label class="fd-field">What changed, and why is the new step better justified?<textarea data-fd-field="correction_reflection" rows="3" maxlength="3000" placeholder="I changed … because … . I checked it by …">${esc(draft.correction_reflection)}</textarea></label><button class="button" id="fd-save-version">Save a new version</button><p class="fd-muted">Draft edits save as you type. Saving a new version keeps all earlier versions below.</p></section><section class="card fd-section"><h2>How your reasoning changed</h2><div id="fd-history">${historyHTML(entry)}</div></section></div><aside class="fd-guidance"><div class="fd-guidance-heading"><span class="eyebrow">FIVE WAYS TO INSPECT AN ARGUMENT</span><h2>Look for evidence in your work.</h2><p>These examples teach what to look for. They do not grade your answer.</p></div>${data.criteria.map(g=>`<details class="fd-criterion" ${g.id===draft.focus?'open':''}><summary>${esc(g.title)}</summary><p>${esc(g.question)}</p><div class="fd-example weak"><strong>A gap in the reasoning</strong><p>${esc(g.weak)}</p></div><div class="fd-example strong"><strong>A better justified version</strong><p>${esc(g.strong)}</p></div><p class="fd-why">${esc(g.why)}</p><button class="button secondary small" data-fd-focus="${g.id}">Work on this next</button><label class="fd-field">Evidence or questions I see in my answer<textarea data-fd-note="${g.id}" rows="3" maxlength="2000" placeholder="My line … shows … / I still need to explain …">${esc(draft.review_notes?.[g.id]||'')}</textarea></label></details>`).join('')}</aside></div></div>`;
    const retryButton=document.createElement('button');retryButton.id='fd-retry-save';retryButton.className='button secondary small';retryButton.textContent='Retry save';retryButton.hidden=true;$('.fd-savebar').append(retryButton);
    on(retryButton,'click',async()=>{retryButton.disabled=true;try{await retry(ctx);}catch(error){if(fresh(v,ctx))report(error);}finally{if(fresh(v,ctx))retryButton.disabled=false;}});
    status(ctx);
    document.querySelectorAll('[data-fd-field]').forEach(f=>on(f,'input',()=>{ctx.draft[f.dataset.fdField]=f.value;changed(ctx);}));
    document.querySelectorAll('[data-fd-note]').forEach(f=>on(f,'input',()=>{ctx.draft.review_notes??={};ctx.draft.review_notes[f.dataset.fdNote]=f.value;changed(ctx);}));
    function chooseFocus(id){ctx.draft.focus=id;$('#fd-focus').value=id;$('#fd-next-action').innerHTML=focusHTML(ctx);changed(ctx);}
    on($('#fd-focus'),'change',e=>chooseFocus(e.target.value));document.querySelectorAll('[data-fd-focus]').forEach(b=>on(b,'click',()=>chooseFocus(b.dataset.fdFocus)));
    on($('#fd-copy-unsaved'),'click',()=>Promise.resolve(copy(localBrief(ctx))).catch(report));
    on($('#fd-prepare-brief'),'click',async()=>{const button=$('#fd-prepare-brief');button.disabled=true;try{await flush(ctx);const result=await api('feedback/brief',{id:entry.id},ctx.profileId);if(!fresh(v,ctx))return;$('#fd-brief').value=result.brief;$('#fd-brief-panel').hidden=false;}catch(error){if(fresh(v,ctx))report(error);}finally{if(fresh(v,ctx))button.disabled=false;}});
    on($('#fd-copy-brief'),'click',()=>Promise.resolve(copy($('#fd-brief').value)).catch(report));
    on($('#fd-note-form'),'submit',async e=>{
      e.preventDefault();const form=e.target,values=new FormData(form),button=form.querySelector('button'),payload={source:values.get('source'),version:Number(values.get('version')),text:values.get('text')};button.disabled=true;
      try{flush(ctx).catch(()=>{});await queueOperation(ctx,'feedback/note',()=>payload,()=>{dynamic(ctx);if(fresh(v,ctx)&&form.elements.text.value===payload.text)form.elements.text.value='';});}catch(error){if(fresh(v,ctx))report(error);}finally{if(fresh(v,ctx))button.disabled=false;}
    });
    on($('#fd-save-version'),'click',async()=>{
      const button=$('#fd-save-version'),serial=ctx.editSerial,payload={text:ctx.draft.revision_text,reflection:ctx.draft.correction_reflection};button.disabled=true;
      if(!payload.text.trim()||!payload.reflection.trim()){button.disabled=false;report(Error('Write the revised explanation and what changed before saving a new version.'));return;}
      if(payload.text.trim()===ctx.entry.versions.at(-1).text.trim()){button.disabled=false;report(Error('Change the explanation before saving a new version. Keep observations in your notes.'));return;}
      try{flush(ctx).catch(()=>{});await queueOperation(ctx,'feedback/revise',()=>payload,saved=>{
        if(ctx.editSerial===serial){ctx.draft=clone(saved.draft);ctx.dirty=false;}
        if(fresh(v,ctx)){dynamic(ctx);if(ctx.editSerial===serial)$('[data-fd-field=correction_reflection]').value='';const select=$('#fd-note-form [name=version]');select.innerHTML=saved.versions.map(n=>`<option value="${n.number}" ${n.number===saved.versions.length?'selected':''}>Version ${n.number}</option>`).join('');}
      });}catch(error){if(fresh(v,ctx))report(error);}finally{if(fresh(v,ctx))button.disabled=false;}
    });
  }
  async function mount(id,tab){
    cancel();const version=view;events=new AbortController();
    if($('#breadcrumb'))$('#breadcrumb').textContent='Review my reasoning';
    // Re-read sources on entry so work saved in another activity appears immediately.
    await load();if(version!==view)return;
    if(!id||id==='topic'){hub(id==='topic'?tab:'');return;}
    let entry=data.entries.find(e=>e.id===id);
    if(!entry){await load();if(version!==view)return;entry=data.entries.find(e=>e.id===id);}
    if(!entry){$('#main').innerHTML='<div id="feedback-root" class="fd-empty"><h1>This review is unavailable.</h1><p>Open a review saved in the current learning space.</p><a class="button secondary" href="#feedback">Open the review desk</a></div>';return;}
    const ctx=context(entry);active=ctx;
    await api('feedback/open',{id:entry.id},ctx.profileId);if(version!==view)return;editor(ctx);
  }
  return {load,mount,cancel,related};
}
