import {cardArt} from './card-art.js';
import {mountMissionModel} from './lesson-missions.js';
import {supplyModel,rocketModel,energyModel,cameraModel,signalModel} from './mission-math.js';
import {draftSaver} from './learning-path.js';

const fmt=(n,d=2)=>Number.isFinite(n)?n.toLocaleString(undefined,{maximumFractionDigits:d}):'—';
export function projectDesign(id,models={}){
 if(id==='lunar-expedition'){
  const supply=supplyModel(models.supply),tankMass=supply.tanks*7,dryMass=2000+tankMass;
  const rocket=rocketModel({...models.rocket,dryMass});
  return {locked:{rocket:{dryMass}},rows:[['Full water tanks',String(supply.tanks)],['Water + empty tanks',fmt(tankMass)+' kg'],['Vehicle dry mass',fmt(dryMass)+' kg'],['Ideal total velocity gain',fmt(rocket.deltaV)+' m/s']],
   explanation:'Each full tank adds 5 kg of water and a 2 kg shell. The rocket dry mass is carried automatically from your supply plan.'};
 }
 if(id==='solar-event'){
  const r=energyModel(models.energy);return {locked:{},rows:[['Daily demand',fmt(r.demand)+' kWh'],['Unmet demand',fmt(r.unserved)+' kWh'],['Invented system cost','$'+fmt(r.peak*800+r.capacity*200,0)]],explanation:'The same saved array, load and battery follow you through the project. The cost model is invented for comparing designs.'};
 }
 if(id==='game-world'){
  const r=cameraModel(models.camera);return {locked:{},rows:[['Area scale |det|',fmt(Math.abs(r.det))],['Reversible transform',r.invertible?'Yes':'No']],explanation:'Your sprite transformation is preserved while you investigate its geometry and communication needs.'};
 }
 const r=signalModel(models.signal);return {locked:{},rows:[['Base period',fmt(r.periodSeconds*1000)+' ms'],['Signal RMS',fmt(r.rms,3)]],explanation:'Your selected waveform persists between stages. RMS is a mathematical signal measure, not perceived loudness.'};
}

export function createProjectJourneysUI({api,esc,toast,missions,onContext}){
 let content={projects:[]},progress={},state={},dispose=null,version=0;
 async function load(){content=await api('learning/projects');}
 function cancel(){version++;dispose?.();dispose=null;}
 function banner(){return '<section class="project-directory-entry">'+cardArt({id:'lunar-expedition',kind:'project',title:'Connected projects',compact:true})+'<div><span class="eyebrow">BUILD SOMETHING OVER SEVERAL LESSONS</span><h2>Keep your design. Grow your mathematics.</h2><p>A lunar expedition, a game world, a sound signature or a solar-powered event.</p></div><a class="button secondary" href="#projects">Explore connected projects →</a></section>';}
 function render(host,id,p,s){cancel();progress=p;state=s||{};const project=content.projects.find(x=>x.id===id);if(!project){
  host.innerHTML=`<a class="backlink" href="#studio">← Apply the math</a><div class="intro"><div><span class="eyebrow">ONE PROJECT, MANY CONNECTED IDEAS</span><h1>Build something that grows with you.</h1><p>Keep your controls and decisions between lessons. Explain the tradeoffs, then try a new design.</p></div></div><div class="project-cards">${content.projects.map(x=>{const responses=state.projects?.[x.id]?.draft?.responses||{},count=Object.values(responses).filter(r=>r.decision?.trim()).length;return `<a class="project-card" href="#projects/${x.id}" style="--project-color:${x.color}">${cardArt({id:x.id,kind:'project',title:x.title})}<h2>${esc(x.title)}</h2><p>${esc(x.brief)}</p><small>${x.stages.length} connected stages${count?' · '+count+' decisions saved':''}</small><strong>${count?'Continue my design':'Start designing'} →</strong></a>`;}).join('')}</div><p class="coverage-note">Projects are supported exploration. Your design explanations await review; completing stages does not automatically award topic stars.</p>`;return;}
  const captured=p.profile_id,token=version,saved=state.projects?.[id]||{};let draft={stage:0,models:{},responses:{},...structuredClone(saved.draft||{})},stopModel=null,dead=false;
  const saver=draftSaver({api,profile:captured,path:'learning/project',base:{project_id:id},initialRevision:saved.revision,status:msg=>{if(!dead){const status=host.querySelector('[data-project-save]');if(status)status.textContent=msg;}},onSaved:(value,revision)=>{if(progress.profile_id!==captured)return;state.projects??={};state.projects[id]={draft:value.draft,revision};},onError:e=>{if(dead)toast(e.message);}});
  const persist=()=>saver.write({draft});
  const designHTML=()=>{const design=projectDesign(id,draft.models);return `<p>${esc(design.explanation)}</p><div class="project-design-numbers">${design.rows.map(([label,value])=>`<div><span>${esc(label)}</span><strong>${esc(value)}</strong></div>`).join('')}</div>`;};
  function draw(){
   stopModel?.();const stage=project.stages[draft.stage],response=draft.responses[stage.id]||{};
   onContext?.(stage.topic_id);host.innerHTML=`<a class="backlink" href="#projects">← All connected projects</a><article class="connected-project" style="--project-color:${project.color}"><header class="project-heading"><div><span class="eyebrow">${esc(project.title)}</span><h1>${esc(stage.title)}</h1></div><span>Stage ${draft.stage+1} / ${project.stages.length}</span></header><nav class="project-stage-nav" aria-label="Project stages">${project.stages.map((item,n)=>`<button type="button" data-stage="${n}" aria-current="${n===draft.stage?'step':'false'}">${n+1}. ${esc(item.title)}${draft.responses[item.id]?.decision?.trim()?' · saved':''}</button>`).join('')}</nav><p class="project-challenge">${esc(stage.challenge)}</p><a class="project-lesson-link" href="#watch/${stage.topic_id}">Learn the mathematics for this stage →</a><div class="project-design-summary" data-project-design>${designHTML()}</div><label class="field-label">Predict before experimenting: ${esc(stage.prediction)}<textarea class="homework-answer project-response" data-project-response="prediction" rows="2" maxlength="4000">${esc(response.prediction||'')}</textarea></label><div class="project-model-host" data-project-model></div><div class="project-reasoning"><label class="field-label">Make a decision: ${esc(stage.decision)}<textarea class="homework-answer project-response" data-project-response="decision" rows="4" maxlength="4000">${esc(response.decision||'')}</textarea></label><p class="project-connection">${esc(stage.connection)}</p><label class="field-label">Connect it to an earlier stage or explain what you changed<textarea class="homework-answer project-response" data-project-response="connection" rows="3" maxlength="4000">${esc(response.connection||'')}</textarea></label></div><details class="project-assumptions"><summary>Model assumptions & what a complete explanation needs</summary><p>${esc(project.assumptions)}</p><ul><li>State the quantities, units and constraints.</li><li>Show why each calculation or transformation is allowed.</li><li>Compare an alternative and explain the tradeoff.</li><li>Identify what the model leaves out.</li></ul></details><p role="status" data-project-save>Saved with your learning space · explanations await review.</p><div class="lesson-actions">${draft.stage?'<button class="button secondary" data-project-prev>← Previous stage</button>':''}${draft.stage<project.stages.length-1?'<button class="button" data-project-next>Keep my design & continue →</button>':'<button class="button" data-project-copy>Copy my complete design brief</button>'}<a href="#homework" class="review-text-button">My saved work</a></div></article>`;
   let marked=false;const model=stage.model_id;
   stopModel=mountMissionModel(host.querySelector('[data-project-model]'),{modelId:model,content:missions(),esc,
    initialControls:draft.models[model]||{},lockedControls:projectDesign(id,draft.models).locked[model]||{},
    onChange:controls=>{if(JSON.stringify(controls)!==JSON.stringify(draft.models[model])){draft.models[model]=controls;persist();}const summary=host.querySelector('[data-project-design]');if(summary)summary.innerHTML=designHTML();},
    onSupport:async()=>{if(marked)return;await api('learning/support',{topic_ids:[stage.topic_id]},captured);marked=true;}});
   // Displaying a model and its equations is supported learning from the outset.
   api('learning/support',{topic_ids:[stage.topic_id]},captured).then(()=>{marked=true;}).catch(e=>toast(e.message));
   const go=async n=>{try{await saver.flush();if(dead||token!==version)return;draft.stage=n;persist();draw();host.querySelector('h1').setAttribute('tabindex','-1');host.querySelector('h1').focus();}catch(e){toast(e.message);}};
   host.querySelectorAll('[data-stage]').forEach(b=>b.onclick=()=>go(Number(b.dataset.stage)));
   host.querySelector('[data-project-prev]')?.addEventListener('click',()=>go(draft.stage-1));host.querySelector('[data-project-next]')?.addEventListener('click',()=>go(draft.stage+1));
   host.querySelectorAll('[data-project-response]').forEach(field=>field.oninput=()=>{draft.responses[stage.id]??={prediction:'',decision:'',connection:''};draft.responses[stage.id][field.dataset.projectResponse]=field.value;persist();});
   host.querySelector('[data-project-copy]')?.addEventListener('click',async()=>{try{await saver.flush();const brief=project.title+'\n\n'+project.assumptions+'\n\n'+project.stages.map(s=>{const r=draft.responses[s.id]||{};return s.title+'\nPrediction: '+(r.prediction||'(pending)')+'\nDecision: '+(r.decision||'(pending)')+'\nConnection: '+(r.connection||'(pending)');}).join('\n\n')+'\n\nSaved controls:\n'+JSON.stringify(draft.models,null,2);await navigator.clipboard.writeText(brief);toast('Design brief copied for review.');}catch(e){toast(e.message);}});
  }
  draw();dispose=()=>{dead=true;stopModel?.();saver.flush().catch(()=>{});};
 }
 return {load,cancel,render,banner};
}
