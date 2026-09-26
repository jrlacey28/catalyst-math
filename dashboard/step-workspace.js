import {checkSteps,STEP_SCOPE,STEP_LIMITS} from './step-checker.js';
import {enhanceMathInput} from './math-input.js';

const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clone=value=>JSON.parse(JSON.stringify(value));
const topicNames={'arithmetic.fractions':'fractions and common denominators','arithmetic.exponents':'powers and parentheses','arithmetic.roots':'roots and their domains','pre-algebra.expressions':'distribution and like terms','pre-algebra.multi-step-equations':'keeping equations balanced','pre-algebra.inequalities':'inequalities','algebra-1.functions':'expressions and functions','algebra-2.rational-functions':'cancellation and excluded inputs'};
let serial=0;

export function normalizeStepDraft(value={}){
  const lines=Array.isArray(value?.lines)?value.lines.slice(0,STEP_LIMITS.lines).map(line=>typeof line==='string'?line.slice(0,500):''):[];
  while(lines.length<2)lines.push('');
  return {version:1,lines,assumptions:typeof value?.assumptions==='string'?value.assumptions.slice(0,500):'',reflection:typeof value?.reflection==='string'?value.reflection.slice(0,2000):''};
}

export function buildStepBrief(work,review,topicId=''){
  const draft=normalizeStepDraft(work),lines=draft.lines.map((line,index)=>`${index+1}. ${line||'[blank]'}`).join('\n');
  const reviewed=review?`Local exact checker: ${review.status}.\n${review.items?.map(item=>`Line ${item.lineNumber}: ${item.title}. ${item.explanation}`).join('\n')||review.firstIssue?.explanation||review.message||''}\nCarried exclusions: ${review.restrictions?.join('; ')||'none reported'}.`:'These lines have not been checked.';
  return `Please review my actual written steps. Explain the first place the reasoning needs repair, why the relevant rule applies, and one small next step for me to try. Do not infer my ability from one mistake.\n\nTopic: ${topicId||'not specified'}\nWritten work:\n${lines}\n\nGiven domain or assumptions: ${draft.assumptions||'not separately entered; keep the original expression’s domain'}\nMy uncertainty or explanation: ${draft.reflection||'not entered'}\n\n${reviewed}\n\nScope: ${STEP_SCOPE}\nThe original problem is not supplied by this scratchpad. A matching rewrite is not proof that I answered the full problem, and this local check is not mastery evidence.`;
}

/** A practice-only scratchpad. Callbacks must be bound to the mounted learner. */
export function mountStepWorkspace(host,{esc=escape,topicId='',initialDraft,onDraft,onSupport,onRepair,onSendToCoach,getContext=()=>({topicId,independentCheck:false})}={}){
  if(!host?.ownerDocument)return ()=>{};
  const uid=`step-work-${++serial}`,controller=new AbortController(),listen={signal:controller.signal};
  let draft=normalizeStepDraft(initialDraft),review=null,disposed=false,editVersion=0,savedVersion=0,saveTimer=null,savePromise=null,saveFailed=false,actionBusy=false,helpOpened=false;
  let inputDisposers=[];
  host.innerHTML=`<section class="step-workspace" aria-label="Written step workspace"><details class="step-work-disclosure"><summary><span class="step-work-icon" aria-hidden="true">↳</span><span>Check a confusing step <small>Work line by line</small></span></summary><div class="step-work-body"><p class="step-work-intro">Start with your original expression or equation. Change one thing per line; the first step that needs attention comes first.</p><p class="step-work-scope">Supports rational arithmetic, expressions in <strong>x</strong>, and linear equations. Other math is kept for tutor review.</p><div class="step-work-lines"></div><button type="button" class="button secondary small" data-step-action="add">+ Add a line</button><label class="step-work-label" for="${uid}-domain">Given domain <span>(optional)</span></label><input id="${uid}-domain" class="step-work-domain" type="text" maxlength="500" autocomplete="off" spellcheck="false" placeholder="For example: x != 1; x != -2" value="${esc(draft.assumptions)}"><p class="step-work-help">Enter restrictions supplied by the problem. Original denominator exclusions are also carried automatically. This checker supports exclusions such as <code>x != 1</code>; other assumptions need review. Do not invent a restriction just to make a step work.</p><label class="step-work-label" for="${uid}-reflection">What feels uncertain? <span>(optional)</span></label><textarea id="${uid}-reflection" class="step-work-reflection" rows="2" maxlength="2000" placeholder="I canceled this part because…">${esc(draft.reflection)}</textarea><div class="step-work-actions"><button type="button" class="button" data-step-action="check">Check my written steps</button>${onSendToCoach?'<button type="button" class="button secondary" data-step-action="coach">Ask my coach about these lines</button>':''}<button type="button" class="button ghost small" data-step-action="copy">Copy my work &amp; review brief</button></div><div class="step-work-saving"><span class="step-work-save-status" role="status" aria-live="polite"></span><button type="button" class="button secondary small" data-step-action="retry" hidden>Retry save</button></div><div class="step-work-results" aria-live="polite" aria-atomic="false"></div><textarea class="step-work-copy-fallback" aria-label="Copyable work and review brief" rows="8" readonly hidden></textarea><details class="step-work-limits"><summary>What can this check establish?</summary><p>${esc(STEP_SCOPE)}</p><p>It compares exact expressions or solution sets. It does not certify your explanation, arbitrary proofs, an unseen problem’s final answer, or mastery. Equivalent values on a carried domain do not make two unrestricted functions identical.</p></details></div></details><p class="step-work-status" role="status" aria-live="polite"></p></section>`;
  const shell=host.querySelector('.step-workspace'),disclosure=shell.querySelector('.step-work-disclosure'),summary=disclosure.querySelector('summary'),body=shell.querySelector('.step-work-body'),lineBox=shell.querySelector('.step-work-lines'),domain=shell.querySelector('.step-work-domain'),reflection=shell.querySelector('.step-work-reflection'),results=shell.querySelector('.step-work-results'),status=shell.querySelector('.step-work-status'),saveStatus=shell.querySelector('.step-work-save-status'),retry=shell.querySelector('[data-step-action="retry"]'),copyFallback=shell.querySelector('.step-work-copy-fallback');
  function context(){try{return getContext()||{};}catch{return {independentCheck:true};}}
  const identity=()=>{const c=context();return JSON.stringify([c.profileId??null,c.topicId??topicId,Boolean(c.independentCheck)]);};
  const mountedIdentity=identity();
  function safeContext(){const c=context();return !disposed&&!c.independentCheck&&identity()===mountedIdentity&&(!c.topicId||!topicId||c.topicId===topicId);}
  function refreshGuard(){
    if(disposed)return;
    const blocked=!safeContext();body.hidden=blocked;
    if(blocked){disclosure.open=false;status.textContent='Step help is off during an independent check. Return to practice to use this workspace.';}
    shell.querySelectorAll('.step-line-input').forEach(input=>input.dispatchEvent(new Event('math-input-context')));
  }
  function setSaveStatus(message){if(!disposed)saveStatus.textContent=message;}
  async function save(){
    clearTimeout(saveTimer);saveTimer=null;
    if(savePromise)return savePromise;
    if(!onDraft){setSaveStatus('This draft is in this page only. Copy it before leaving.');return false;}
    if(savedVersion===editVersion)return true;
    savePromise=(async()=>{
      while(savedVersion<editVersion){
        const targetVersion=editVersion,snapshot=clone(draft);setSaveStatus('Saving your written work…');
        try{await onDraft(snapshot);savedVersion=targetVersion;saveFailed=false;if(!disposed)retry.hidden=true;}
        catch(error){saveFailed=true;if(!disposed){retry.hidden=false;setSaveStatus(`Draft not saved${error?.message?': '+error.message:'.'} Your lines remain here. Retry or copy your work.`);}return false;}
      }
      setSaveStatus('Written work saved.');return true;
    })();
    try{return await savePromise;}finally{savePromise=null;}
  }
  function edited(){
    editVersion++;review=null;copyFallback.hidden=true;results.innerHTML='';
    status.textContent='Your work changed. Check the new lines when you are ready.';
    setSaveStatus(onDraft?'Unsaved changes…':'This draft is in this page only. Copy it before leaving.');
    clearTimeout(saveTimer);saveTimer=setTimeout(()=>{saveTimer=null;void save();},350);
  }
  function renderLines(focusIndex=null){
    inputDisposers.forEach(dispose=>dispose());inputDisposers=[];
    lineBox.innerHTML=draft.lines.map((line,index)=>`<div class="step-work-line" data-step-line="${index}"><div class="step-work-line-head"><label for="${uid}-line-${index}"><span class="step-line-number">${index+1}</span>${index?'Next step':'Original expression or equation'}</label><button type="button" class="step-remove" data-step-remove="${index}" aria-label="Remove line ${index+1}" ${draft.lines.length<=2?'disabled':''}>Remove</button></div><input id="${uid}-line-${index}" class="step-line-input" type="text" maxlength="500" autocomplete="off" spellcheck="false" value="${esc(line)}" aria-describedby="${uid}-line-note"></div>`).join('')+`<p class="step-work-help" id="${uid}-line-note">Use one mathematical line per field. Press Enter to move to the next line. The notation helper previews what you typed.</p>`;
    for(const input of lineBox.querySelectorAll('.step-line-input'))inputDisposers.push(enhanceMathInput(input,{esc,getContext:()=>({...context(),topicId}),onSupport,preview:true}));
    shell.querySelector('[data-step-action="add"]').disabled=draft.lines.length>=STEP_LIMITS.lines;
    if(focusIndex!==null)lineBox.querySelector(`[data-step-line="${focusIndex}"] .step-line-input`)?.focus();
  }
  function addLine(){if(draft.lines.length>=STEP_LIMITS.lines||!safeContext())return;draft.lines.push('');edited();renderLines(draft.lines.length-1);}
  function resultHTML(item){
    const kind=item.status,tag=kind==='valid'?'Exact match':kind==='conditional'?'Domain matters':kind==='invalid'?'Revisit this step':kind==='input_error'?'Notation issue':'Needs review';
    return `<article class="step-work-result ${esc(kind)}"><div class="step-result-head"><strong>${Number.isInteger(item.fromIndex)?`Line ${item.fromIndex+1} → ${item.lineNumber}`:`Line ${item.lineNumber||1}`}</strong><span>${tag}</span></div><h4>${esc(item.title||'Review this line')}</h4><p>${esc(item.explanation||'')}</p>${item.counterexample?`<p class="step-counterexample">At <strong>x = ${esc(item.counterexample.x)}</strong>, the earlier expression is <strong>${esc(item.counterexample.before)}</strong> and the next is <strong>${esc(item.counterexample.after)}</strong>.</p>`:''}${item.beforeSolutions?`<div class="step-solutions"><p><strong>Before:</strong> ${esc(item.beforeSolutions)}</p><p><strong>After:</strong> ${esc(item.afterSolutions)}</p></div>`:''}${item.newRestrictions?.length?`<p><strong>New exclusions:</strong> ${item.newRestrictions.map(esc).join('; ')}.</p>`:''}${item.beforeCanonical?`<details class="step-exact-detail"><summary>See the exact algebra comparison</summary><p>The formulas simplify to the forms below. Their domain restrictions still apply.</p><code>${esc(item.beforeCanonical)}</code><code>${esc(item.afterCanonical)}</code></details>`:''}${!['valid','conditional'].includes(kind)?`<button type="button" class="step-focus-line" data-step-focus="${item.index??0}">Go to line ${item.lineNumber||1}</button>`:''}</article>`;
  }
  function showReview(){
    if(!review)return;
    const candidate=review.items?.some(item=>item.code==='excluded_candidate');
    const heading=candidate?'The candidate is excluded by the original domain':review.status==='valid'?'The written transitions agree exactly':review.status==='conditional'?'These steps keep their domain restrictions':review.status==='invalid'?`First step to revisit: line ${review.firstIssue?.lineNumber||'?'}`:review.status==='input_error'?'Check the notation before comparing':review.status==='incomplete'?'Add the next line':'This math needs a tutor review';
    const issue=review.firstIssue,items=review.items?.length?review.items:issue?[issue]:[];
    results.innerHTML=`<div class="step-review-heading"><h3>${esc(heading)}</h3>${review.message?`<p>${esc(review.message)}</p>`:''}</div>${review.restrictions?.length?`<div class="step-domain-carry"><strong>Keep this carried domain</strong><p>${review.restrictions.map(esc).join('; ')}.</p><p>Every line remains subject to these exclusions, even when a denominator disappears.</p></div>`:''}${items.map(resultHTML).join('')}${issue?.prerequisiteId?`<div class="step-work-repair"><p>This pattern might benefit from a refresher on <strong>${esc(topicNames[issue.prerequisiteId]||'the related prerequisite')}</strong>.</p>${onRepair?`<button type="button" class="button secondary small" data-step-action="repair">Repair this prerequisite</button>`:`<a class="button secondary small" href="#topic/${encodeURIComponent(issue.prerequisiteId)}">Open the prerequisite guide</a>`}</div>`:''}<p class="step-work-help">This is feedback on these written lines. It does not award mastery or check the answer to an unseen problem.</p>`;
  }
  async function support(kind){
    if(!safeContext()){refreshGuard();return false;}
    const key=identity();
    try{if(onSupport)await onSupport({topicId,profileId:context().profileId??null,kind});return safeContext()&&key===identity();}
    catch(error){if(!disposed)status.textContent=`Help could not be opened${error?.message?': '+error.message:'.'} Your work is still here.`;return false;}
  }
  async function perform(kind,action){
    if(actionBusy||!safeContext()){refreshGuard();return;}
    actionBusy=true;const buttons=[...shell.querySelectorAll('[data-step-action="check"],[data-step-action="coach"],[data-step-action="repair"]')];buttons.forEach(button=>button.disabled=true);
    const version=editVersion;status.textContent='Opening step support…';
    try{if(!await support(kind))return;if(version!==editVersion){status.textContent='Your work changed while support opened. Choose the action again for the current lines.';return;}await action();}
    catch(error){if(!disposed)status.textContent=`That action could not finish${error?.message?': '+error.message:'.'} Your written work is unchanged.`;}
    finally{actionBusy=false;if(!disposed)buttons.forEach(button=>button.disabled=false);}
  }
  async function copyWork(){
    const brief=buildStepBrief(draft,review,topicId);
    try{await navigator.clipboard.writeText(brief);if(!disposed)status.textContent='Your written steps and review brief were copied.';}
    catch{if(!disposed){copyFallback.hidden=false;copyFallback.value=brief;copyFallback.focus();copyFallback.select();status.textContent='Copy the selected brief below. Your work remains unchanged.';}}
  }
  summary.addEventListener('click',async event=>{
    event.preventDefault();if(disclosure.open){disclosure.open=false;return;}
    if(helpOpened&&safeContext()){disclosure.open=true;return;}
    await perform('step_help',async()=>{helpOpened=true;disclosure.open=true;status.textContent='';});
  },listen);
  disclosure.addEventListener('toggle',()=>{if(disclosure.open&&!helpOpened)disclosure.open=false;refreshGuard();},listen);
  shell.addEventListener('input',event=>{
    if(!safeContext())return;
    const input=event.target;
    if(input.classList.contains('step-line-input'))draft.lines[Number(input.closest('[data-step-line]').dataset.stepLine)]=input.value;
    else if(input===domain)draft.assumptions=input.value;
    else if(input===reflection)draft.reflection=input.value;
    else return;
    edited();
  },listen);
  shell.addEventListener('keydown',event=>{
    if(event.key!=='Enter'||event.isComposing||!event.target.classList.contains('step-line-input'))return;
    event.preventDefault();const index=Number(event.target.closest('[data-step-line]').dataset.stepLine),next=lineBox.querySelector(`[data-step-line="${index+1}"] .step-line-input`);
    if(next)next.focus();else addLine();
  },listen);
  shell.addEventListener('click',async event=>{
    const remove=event.target.closest('[data-step-remove]');
    if(remove){if(draft.lines.length<=2||!safeContext())return;const index=Number(remove.dataset.stepRemove);draft.lines.splice(index,1);edited();renderLines(Math.min(index,draft.lines.length-1));return;}
    const focus=event.target.closest('[data-step-focus]');if(focus){lineBox.querySelector(`[data-step-line="${Number(focus.dataset.stepFocus)}"] .step-line-input`)?.focus();return;}
    const button=event.target.closest('[data-step-action]');if(!button||!shell.contains(button))return;
    const action=button.dataset.stepAction;
    if(action==='add')addLine();
    else if(action==='retry')await save();
    else if(action==='copy')await copyWork();
    else if(action==='check')await perform('step_check',async()=>{review=checkSteps(draft.lines,{assumptions:draft.assumptions});showReview();status.textContent=review.firstIssue?`Review stops at line ${review.firstIssue.lineNumber}. Later steps have not been checked.`:review.status==='incomplete'?review.message:'Step comparison complete. Read any domain conditions below.';});
    else if(action==='repair'&&onRepair&&review?.firstIssue?.prerequisiteId)await perform('step_help',async()=>{
      const version=editVersion;if(onDraft&&!await save())return;if(!safeContext()||!review?.firstIssue?.prerequisiteId)return;
      if(version!==editVersion){status.textContent='Your work changed while saving. Choose the repair again for the current lines.';return;}
      await onRepair({prerequisiteId:review.firstIssue.prerequisiteId,topicId,work:clone(draft),review:clone(review)});
    });
    else if(action==='coach'&&onSendToCoach)await perform('step_help',async()=>{
      const version=editVersion;if(onDraft&&!await save())return;if(!safeContext())return;
      if(version!==editVersion){status.textContent='Your work changed while saving. Choose the coach action again for the current lines.';return;}
      await onSendToCoach({topicId,work:clone(draft),review:review?clone(review):null,brief:buildStepBrief(draft,review,topicId)});
    });
  },listen);
  host.addEventListener('step-workspace-context',refreshGuard,listen);
  renderLines();refreshGuard();setSaveStatus(onDraft?(initialDraft?'Saved draft restored.':'Your written work saves as you type.'):'This draft is in this page only. Copy it before leaving.');
  return ()=>{if(disposed)return;clearTimeout(saveTimer);saveTimer=null;if(editVersion>savedVersion&&!saveFailed)void save();disposed=true;controller.abort();inputDisposers.forEach(dispose=>dispose());inputDisposers=[];shell.remove();};
}
