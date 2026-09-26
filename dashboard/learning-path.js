import {autosave} from './autosave.js';
import {renderAnswerVisual,fallbackVisual} from './answer-visuals.js';
import {mountStepWorkspace} from './step-workspace.js';

// Each saver owns its profile and version, including when its view has gone away.
export function draftSaver({api,profile,path,base={},initialRevision=0,status,onSaved,onError=()=>{}}){
 let revision=Math.max(Date.now(),initialRevision),timer=null,dirty=null,pending=Promise.resolve(),unregister=null;
 const run=immediate=>{clearTimeout(timer);if(!dirty)return pending;const snapshot=dirty;dirty=null;const number=++revision;
  const send=()=>api(path,{...base,...snapshot,revision:number},profile);
  pending=immediate?send():pending.catch(()=>{}).then(send);
  pending.then(()=>{if(number===revision){status?.('✓ Saved');onSaved?.(snapshot,number);}}).catch(e=>{if(number===revision&&!dirty)dirty=snapshot;status?.('Not saved: '+e.message);onError(e);}).finally(()=>{if(!dirty){unregister?.();unregister=null;}});return pending;};
 const flush=()=>run(false),flushImmediate=()=>run(true);
 return {write(snapshot){dirty=structuredClone(snapshot);status?.('Saving…');unregister??=autosave.register(flushImmediate);clearTimeout(timer);timer=setTimeout(()=>flush().catch(()=>{}),300);},flush,flushImmediate};
}

export function createLearningPathUI({api,esc,toast,topic,onCoach}){
 let progress={},state={},profile=null,version=0,disposeCurrent=null,repairDispose=null;
 const $=s=>document.querySelector(s);
 const saveStatus=(host,selector)=>message=>{if(host.isConnected){const el=host.querySelector(selector);if(el)el.textContent=message;}};
 function setState(p,s){progress=p;state=s||{};profile=p.profile_id;}
 function cancel(){version++;disposeCurrent?.();disposeCurrent=null;repairDispose?.();repairDispose=null;}
 const support=ids=>api('learning/support',{topic_ids:ids},profile);
 function homeLink(){const due=state.due_topic_ids||[];return due.length?`<div class="session-nudge"><span>↻ ${due.length} ${due.length===1?'idea is':'ideas are'} ready for a refresh.</span><a href="#session">Start with a short warm-up →</a></div>`:'';}
 function notebookLinks(){const notes=Object.entries(state.notes||{}).filter(([,n])=>n.steps?.draft?.lines?.some(x=>x.trim()));const projects=Object.keys(state.projects||{});return notes.length||projects.length?`<section class="saved-learning-notes"><h2>My steps & ongoing projects</h2>${notes.map(([id])=>`<a href="#watch/${id}/steps">${esc(topic(id)?.title||id)} · saved steps →</a>`).join('')}${projects.length?'<a href="#projects">Continue my saved projects →</a>':''}</section>`:'';}
 function mountScaffold(host,tid){
  const t=topic(tid),guide=t?.lesson||t?.scaffold,examples=guide?.examples||[];if(!examples.length)return()=>{};
  const captured=profile,saved=state.notes?.[tid]?.scaffold||{};let draft={stage:'example',example:0,hidden:1,response:'',compared:false,...saved.draft},dead=false;
  const saver=draftSaver({api,profile:captured,path:'learning/notes',base:{topic_id:tid,kind:'scaffold'},initialRevision:saved.revision,status:saveStatus(host,'[data-scaffold-save]'),onSaved:(s,n)=>{if(profile!==captured)return;state.notes??={};state.notes[tid]??={};state.notes[tid].scaffold={draft:s.draft,revision:n};},onError:e=>{if(dead)toast(e.message);}});
  const persist=()=>saver.write({draft});
  function draw(){
   const ex=examples[Math.min(draft.example,examples.length-1)],complete=draft.stage==='complete',cut=Math.max(1,ex.steps.length-Math.min(draft.hidden,ex.steps.length-1));
   host.innerHTML=`<div class="guided-path"><p>${esc(guide.intuition)}</p><div class="guided-stage-picker" aria-label="Amount of guidance"><button type="button" data-guided-stage="example" aria-pressed="${!complete}">1. See an example</button><button type="button" data-guided-stage="complete" aria-pressed="${complete}">2. Finish a step</button><button type="button" data-guided-stage="independent">3. Try it yourself</button></div><h3>${esc(ex.title)}</h3><ol class="guided-steps">${ex.steps.slice(0,complete?cut:ex.steps.length).map(s=>`<li><span class="math-expression">${esc(s.expression)}</span><details><summary>Why is this allowed?</summary><p>${esc(s.reason)}</p></details></li>`).join('')}</ol>${complete?`<label class="field-label">Write the missing ${ex.steps.length-cut===1?'step':'steps'} and the reason<textarea class="homework-answer" data-completion rows="3" maxlength="4000">${esc(draft.response)}</textarea></label><div class="lesson-actions"><button class="button secondary small" data-compare>Compare with the worked solution</button>${cut>1?'<button class="review-text-button" data-less-guidance>Try with one more step hidden</button>':''}</div><div data-comparison ${draft.compared?'':'hidden'}><p>Your response is saved for comparison; this guided attempt does not earn an independent pass.</p>${ex.steps.slice(cut).map(s=>`<p><strong>${esc(s.expression)}</strong><br>${esc(s.reason)}</p>`).join('')}</div>`:''}${ex.note?`<p class="domain-note">${esc(ex.note)}</p>`:''}<div class="lesson-actions">${!complete?'<button class="button secondary small" data-next-guidance>Now finish part of an example →</button>':'<button class="button small" data-solo>Try my three problems →</button>'}${examples.length>1?'<button class="review-text-button" data-another-example>Another example</button>':''}</div><details class="guided-connections"><summary>Common wrong turn &amp; deeper connections</summary><p>${esc(guide.misconception||'Explain why each step is allowed and keep the original conditions.')}</p>${(t.connections||[]).map(c=>`<p><a href="#watch/${c.topic_id}/guide">${esc(topic(c.topic_id)?.title||c.topic_id)}</a>: ${esc(c.why)}</p>`).join('')}${t.application?`<p>${esc(t.application.scenario)}</p><p>${esc(t.application.task)}</p>`:''}${t.writing?`<a href="#topic/${tid}/explain">Build and review a written argument →</a>`:''}</details><p class="small-note" role="status" data-scaffold-save>Guided work saves with this lesson.</p></div>`;
   const choose=stage=>{if(stage==='independent'){draft.stage='independent';persist();host.closest('details')?.removeAttribute('open');const target=$('#inline-practice-host input, #inline-practice-host textarea, #inline-practice-host button');target?.focus();target?.scrollIntoView({block:'center',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});return;}draft.stage=stage;draft.compared=false;if(stage==='complete'&&examples.length>1)draft.example=1;persist();draw();};
   host.querySelectorAll('[data-guided-stage]').forEach(b=>b.onclick=()=>choose(b.dataset.guidedStage));
   host.querySelector('[data-next-guidance]')?.addEventListener('click',()=>choose('complete'));
   host.querySelector('[data-solo]')?.addEventListener('click',()=>choose('independent'));
   host.querySelector('[data-another-example]')?.addEventListener('click',()=>{draft.example=(draft.example+1)%examples.length;draft.compared=false;draft.response='';persist();draw();});
   host.querySelector('[data-completion]')?.addEventListener('input',e=>{draft.response=e.target.value;persist();});
   host.querySelector('[data-compare]')?.addEventListener('click',async()=>{if(!draft.response.trim()){host.querySelector('[data-completion]').focus();return;}try{await api('learning/support',{topic_ids:[tid]},captured);if(dead)return;draft.compared=true;persist();host.querySelector('[data-comparison]').hidden=false;}catch(e){toast(e.message);}});
   host.querySelector('[data-less-guidance]')?.addEventListener('click',()=>{draft.hidden++;draft.compared=false;draft.response='';persist();draw();});
  }
  if(draft.stage==='independent')draft.stage='complete';draw();return()=>{dead=true;saver.flush().catch(()=>{});host.replaceChildren();};
 }
 function mountTools(host,tid,tab){
  const captured=profile,saved=state.notes?.[tid]?.steps||{};let disposed=false;
  host.innerHTML=`<div class="lesson-work-tools"><div data-step-host></div><button class="review-text-button foundation-entry" type="button" data-repair-entry>Revisit a helpful foundation</button><p class="small-note">A short detour keeps your original work here.</p></div>`;
  const saver=draftSaver({api,profile:captured,path:'learning/notes',base:{topic_id:tid,kind:'steps'},initialRevision:saved.revision,onSaved:(s,n)=>{if(profile!==captured)return;state.notes??={};state.notes[tid]??={};state.notes[tid].steps={draft:s.draft,revision:n};},onError:e=>{if(disposed)toast(e.message);}});
  const stop=mountStepWorkspace(host.querySelector('[data-step-host]'),{esc,topicId:tid,initialDraft:saved.draft,getContext:()=>({topicId:tid,profileId:profile,independentCheck:disposed||captured!==profile}),
   onDraft:draft=>{saver.write({draft});return saver.flush();},
   onSupport:event=>api('calculator/support',{topic_id:tid,kind:event.kind},captured),
   onRepair:request=>openRepair(tid,request.prerequisiteId),
   onSendToCoach:()=>onCoach?.()});
  host.querySelector('[data-repair-entry]').onclick=()=>openRepair(tid);
  if(tab==='steps'){host.querySelector('.step-work-disclosure > summary')?.click();host.scrollIntoView({block:'center'});}
  return()=>{disposed=true;stop?.();saver.flush().catch(()=>{});host.replaceChildren();};
 }
 async function openRepair(fromId,requested){
  repairDispose?.();const captured=profile,parentVersion=version,from=topic(fromId);if(!from)return;
  const choices=[...new Set([requested,...(from.prerequisites||[]),'arithmetic.fractions','pre-algebra.expressions','pre-algebra.basic-functions','pre-algebra.multi-step-equations','algebra-1.factoring','algebra-2.rational-functions'].filter(id=>id&&id!==fromId&&topic(id)))];
  if(!choices.length)return;
  const previous=state.repairs?.[fromId],focus=document.activeElement;
  let targetId=choices.includes(requested)?requested:choices.includes(previous?.topic_id)?previous.topic_id:choices[0],session=null,answers={},counter=Date.now(),dead=false,request=0,pending=Promise.resolve();
  const dialog=document.createElement('dialog');dialog.className='repair-dialog';dialog.setAttribute('aria-label','Revisit a helpful foundation');document.body.append(dialog);
  const flush=()=>session?api(session.legacy?'draft':'topic/draft',{session_id:session.id,answers:{...answers},revision:++counter},captured):Promise.resolve();
  function dispose(){if(dead)return;dead=true;request++;pending.catch(()=>{}).then(()=>flush()).catch(e=>toast(e.message));api('learning/repair',{from_topic_id:fromId,topic_id:targetId,active:false,reason:'Returned to the original problem.'},captured).catch(e=>toast(e.message));dialog.close();dialog.remove();if(focus?.isConnected)focus.focus();}
  repairDispose=dispose;
  function frame(){dialog.innerHTML=`<header><div><span class="eyebrow">A SHORT DETOUR</span><h2>Repair one missing piece.</h2></div><button class="icon-button" data-repair-close aria-label="Return to my original problem">×</button></header><p>Your ${esc(from.title)} answers stay where you left them.</p><label class="field-label">Foundation to revisit<select data-repair-select>${choices.map(id=>`<option value="${id}" ${targetId===id?'selected':''}>${esc(topic(id).title)}</option>`).join('')}</select></label><div data-repair-body></div><footer><button class="button secondary" data-repair-return>Return to my original problem →</button><p role="status" data-repair-status></p></footer>`;
   dialog.querySelector('[data-repair-close]').onclick=dispose;dialog.querySelector('[data-repair-return]').onclick=dispose;
   dialog.querySelector('[data-repair-select]').onchange=async e=>{const chosen=e.target.value;try{await pending;await flush();if(dead)return;session=null;answers={};targetId=chosen;await show();}catch(error){toast(error.message);}};
  }
  async function show(){
   const token=++request,t=topic(targetId);frame();const body=dialog.querySelector('[data-repair-body]');body.innerHTML='<p role="status">Opening this foundation…</p>';
   try{await api('learning/repair',{from_topic_id:fromId,topic_id:targetId,active:true,reason:requested?'Suggested by a step pattern; this is not a diagnosis.':'Learner selected a useful foundation.'},captured);if(dead||parentVersion!==version||token!==request)return;
    const guide=t.lesson||t.scaffold,ex=guide?.examples?.[0];body.innerHTML=`<h3>${esc(t.title)}</h3><p>${esc(guide?.intuition||t.objective)}</p>${ex?`<details><summary>See one small worked example</summary>${ex.steps.map(s=>`<p><strong>${esc(s.expression)}</strong><br>${esc(s.reason)}</p>`).join('')}</details>`:''}<button class="button small" data-repair-start>Try three foundation problems</button><div data-repair-questions></div>`;
    body.querySelector('[data-repair-start]').onclick=begin;
   }catch(e){if(!dead)body.textContent=e.message;}
  }
  async function begin(){const token=++request,t=topic(targetId),box=dialog.querySelector('[data-repair-questions]');try{
   await pending;await flush();session=null;answers={};
   const result=await api(t.lesson?'topic/activity':'activity',t.lesson?{topic_id:targetId,difficulty:'gentle',mode:'practice'}:{lesson_id:t.existing_lesson_id,mode:'practice'},captured);
   if(dead||token!==request)return;session={...result,legacy:!t.lesson};answers={...session.answers};counter=Math.max(Date.now(),session.draft_revision||0);renderQuestions(box);
  }catch(e){if(!dead)box.textContent=e.message;}}
  function renderQuestions(box){
   box.innerHTML=`<form data-repair-form>${session.questions.map((q,i)=>`<fieldset class="question"><legend>${i+1}. ${esc(q.prompt)}</legend>${renderAnswerVisual(q.visual||fallbackVisual(q))}${q.kind==='choice'?q.options.map((a,n)=>`<label class="option"><input type="radio" name="${q.id}" value="${esc(a)}" ${answers[q.id]===a?'checked':''}> ${esc(a)}</label>`).join(''):`<input class="answer-input" aria-label="Answer to foundation problem ${i+1}" name="${q.id}" value="${esc(answers[q.id]||'')}">`}</fieldset>`).join('')}<button class="button small" type="submit">Check these practice answers</button><p role="status" data-repair-feedback></p></form>`;
   const form=box.querySelector('form');form.oninput=()=>{for(const q of session.questions){const input=form.querySelector(`[name="${q.id}"]${q.kind==='choice'?':checked':''}`);answers[q.id]=input?.value||'';}pending=flush().catch(e=>{if(!dead)dialog.querySelector('[data-repair-status]').textContent='Not saved: '+e.message;throw e;});pending.catch(()=>{});};
   form.onsubmit=async event=>{event.preventDefault();const active=session,token=request;try{await pending;await flush();const r=await api(active.legacy?'submit':'topic/submit',{session_id:active.id,answers},captured);if(dead||token!==request)return;active.submitted=true;box.innerHTML=`<p class="feedback ${r.score===r.total?'correct':''}">${r.score} / ${r.total} correct in supported practice.</p>${r.items.map(q=>`<p><strong>${esc(q.prompt)}</strong><br>Your answer: ${esc(q.response)}<br>${esc(q.explanation)}</p>`).join('')}<p>Return to the original step and try the idea there. These supported answers do not earn a new star.</p>`;session=null;}catch(e){if(!dead)form.querySelector('[data-repair-feedback]').textContent=e.message;}};
  }
  dialog.addEventListener('cancel',event=>{event.preventDefault();dispose();});dialog.showModal();await show();
 }
 async function renderSession(host,next){
  const token=++version,captured=profile;let dead=false,current=null,answers={},rev=Date.now(),pending=Promise.resolve();
  const nextLink=next?`<a class="button" href="#watch/${next.id}">Continue: ${esc(next.title)} →</a>`:'<a class="button" href="#videos">Choose my next lesson →</a>';
  const header=`<div class="intro"><div><span class="eyebrow">KEEP WHAT YOU LEARN</span><h1>A short warm-up, then your lesson.</h1><p>Recall a few earlier ideas before opening examples. Your earned stars stay yours.</p></div></div>`;
  const flush=()=>current&&!current.submitted?api('learning/recall-draft',{session_id:current.id,answers:{...answers},revision:++rev},captured):Promise.resolve();
  disposeCurrent=()=>{dead=true;pending.catch(()=>{}).then(()=>flush()).catch(e=>toast(e.message));};
  function showResult(r){host.innerHTML=header+`<section class="card guide-section"><h2>${r.score} of ${r.total} recalled</h2><p>${r.independent_score} correct without help. ${esc(r.scope_note)}</p>${r.items.map(q=>`<div class="question"><strong>${esc(q.prompt)}</strong><p>Your answer: ${esc(q.response)}</p>${renderAnswerVisual(q.visual||fallbackVisual(q,q))}<p class="feedback ${q.correct?'correct':''}">${esc(q.explanation)}</p>${!q.correct?`<a href="#watch/${q.topic_id}/steps">Revisit this idea →</a>`:''}</div>`).join('')}<div class="lesson-actions">${nextLink}</div></section>`;}
  function questions(){host.innerHTML=header+`<form class="card guide-section" data-recall-form>${current.questions.map((q,i)=>`<fieldset class="question"><legend><span class="question-num">${i+1}</span>${esc(q.prompt)}</legend>${renderAnswerVisual(q.visual||fallbackVisual(q))}${q.kind==='choice'?q.options.map(a=>`<label class="option"><input type="radio" name="${q.id}" value="${esc(a)}" ${answers[q.id]===a?'checked':''}> ${esc(a)}</label>`).join(''):`<input class="answer-input" name="${q.id}" aria-label="Answer to recall problem ${i+1}" value="${esc(answers[q.id]||'')}">`}</fieldset>`).join('')}<button class="button" type="submit">Check my recall</button><p role="status" data-recall-status>Your answers save as you type.</p></form><div class="lesson-actions">${nextLink}<a class="review-text-button" href="#review">More generated mixed practice</a></div>`;
   const form=host.querySelector('form');form.oninput=()=>{for(const q of current.questions)answers[q.id]=form.querySelector(`[name="${q.id}"]${q.kind==='choice'?':checked':''}`)?.value||'';pending=flush();pending.catch(e=>{if(!dead)form.querySelector('[data-recall-status]').textContent=e.message;});};
   form.onsubmit=async event=>{event.preventDefault();try{await pending;await flush();const r=await api('learning/recall-submit',{session_id:current.id,answers,revision:++rev},captured);if(dead||token!==version)return;current.submitted=true;showResult(r);}catch(e){if(!dead)form.querySelector('[data-recall-status]').textContent=e.message;}};
  }
  async function begin(){try{current=await api('learning/recall-start',{},captured);if(dead||token!==version)return;answers={...current.answers};rev=Math.max(Date.now(),current.revision);questions();}catch(e){if(!dead){const status=host.querySelector('[data-session-status]');if(status)status.textContent=e.message;}}}
  host.innerHTML=header+`<section class="card guide-section"><h2>${state.due_topic_ids?.length?'Ready for a refresh':'You are up to date'}</h2><p>${state.due_topic_ids?.length?'Start up to three fresh questions from the topics whose independent checks you passed earlier.':'Independent checks schedule later recall. You can continue learning now.'}</p><div class="lesson-actions">${state.due_topic_ids?.length?'<button class="button" data-start-recall>Start my short warm-up →</button>':''}${nextLink}</div><p role="status" data-session-status></p><a href="#review">Choose generated mixed practice</a></section>`;
  host.querySelector('[data-start-recall]')?.addEventListener('click',begin);
  const active=state.reviews?.slice().reverse().find(s=>!s.submitted&&!s.paused_topic_ids?.length);if(active){current=active;answers={...active.answers};rev=Math.max(Date.now(),active.revision);questions();}
 }
 function renderPilot(host){
  const captured=profile,token=++version;let pilot=state.pilot;
  const active=()=>token===version&&captured===profile&&host.isConnected;
  const draw=()=>{if(!active())return;host.innerHTML=`<a class="backlink" href="#about">← About Catalyst</a><div class="intro"><div><span class="eyebrow">HELP IMPROVE THE LEARNING EXPERIENCE</span><h1>Try it. Tell us where it breaks down.</h1><p>A voluntary local pilot. Nothing uploads automatically, and this does not change grades or stars.</p></div></div><section class="card guide-section"><h2>A practical first trial</h2><ol><li>Choose one unfamiliar lesson and attempt a problem.</li><li>Use a worked example, write your own steps, then try a fresh problem.</li><li>Try a short foundation repair and return to your saved work.</li><li>Return tomorrow and a week later for fresh recall. Record where you needed help.</li></ol><p>The written <a href="/LEARNER_PILOT.md">pilot protocol</a> explains task selection, consent and how to compare learning fairly.</p>${!pilot?'<label class="check-field"><input type="checkbox" data-pilot-consent> I choose to save my pilot observations on this computer.</label><button class="button" data-pilot-join>Join the local pilot</button>':pilot.stopped_at?'<p>You stopped this pilot. Your previous notes remain available in your progress export.</p>':`<form data-pilot-form><label class="field-label">Lesson and task<input name="task" maxlength="4000" required></label><label class="field-label">What helped you understand?<textarea name="worked" maxlength="4000" rows="3"></textarea></label><label class="field-label">Where did you get stuck or need help?<textarea name="stuck" maxlength="4000" rows="3"></textarea></label><label class="field-label">On a later attempt, what could you do independently?<textarea name="next_day" maxlength="4000" rows="3"></textarea></label><button class="button" type="submit">Save my observations</button></form><p>${pilot.observations.length} observation sets saved. Use Download your progress to keep a copy.</p><button class="review-text-button" data-pilot-stop>Stop participating</button>`}<p role="status" data-pilot-status></p></section>`;
   host.querySelector('[data-pilot-join]')?.addEventListener('click',async()=>{try{pilot=await api('learning/pilot',{action:'enroll',consent:host.querySelector('[data-pilot-consent]').checked},captured);draw();}catch(e){if(active())host.querySelector('[data-pilot-status]').textContent=e.message;}});
   host.querySelector('[data-pilot-stop]')?.addEventListener('click',async()=>{try{pilot=await api('learning/pilot',{action:'stop'},captured);draw();}catch(e){if(active())host.querySelector('[data-pilot-status]').textContent=e.message;}});
   const form=host.querySelector('form');if(form)form.onsubmit=async event=>{event.preventDefault();try{pilot=await api('learning/pilot',{action:'observe',...Object.fromEntries(new FormData(form))},captured);draw();if(active())host.querySelector('[data-pilot-status]').textContent='Saved locally. Thank you for describing the actual experience.';}catch(e){if(active())host.querySelector('[data-pilot-status]').textContent=e.message;}};
  };draw();
 }
 return {setState,cancel,homeLink,notebookLinks,mountScaffold,mountTools,openRepair,renderSession,renderPilot};
}
