import {autosave} from './autosave.js';
import {AI_STAGES,AI_ROWS,AI_ATTENTION_PATCHES,AI_PARAMETER_NAMES,normalizeAIState,snapshotAI,normalizeFeatures,probeAI,predictAI,evaluateAI,chainAI,attentionAI,createAIModel,setAIParameter,trainAI,sigmoid} from './ai-math.js';

const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const color={ink:'#294d49',muted:'#6f807a',green:'#2e8977',gold:'#b77b27',purple:'#8060b0',blue:'#447fa9',red:'#bd6655',grid:'#dce8e2'};
const f=(n,d=3)=>Math.abs(n)<10**(-d)/2?'0':Number(n.toFixed(d)).toString();
const pair=values=>'['+values.map(n=>f(n)).join(', ')+']';
const pct=n=>f(n*100,1)+'%';
const svgText=(x,y,text,{size=13,fill=color.ink,anchor='middle',weight=400}={})=>`<text x="${x}" y="${y}" text-anchor="${anchor}" fill="${fill}" font-size="${size}" font-weight="${weight}" font-family="Segoe UI,system-ui,sans-serif">${escape(text)}</text>`;
const line=(x1,y1,x2,y2,stroke=color.grid,width=1,extra='')=>`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${width}" ${extra}/>`;
const circle=(x,y,r,fill,stroke='none',width=1)=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${width}"/>`;
function svg(body,label,height=350){return `<svg viewBox="0 0 620 ${height}" role="img" aria-label="${escape(label)}"><title>${escape(label)}</title>${body}</svg>`;}
function plot({xmin,xmax,ymin,ymax,xlabel,ylabel,height=350,xticks,yticks}){
  const left=64,right=585,top=36,bottom=height-58,x=n=>left+(n-xmin)/(xmax-xmin)*(right-left),y=n=>bottom-(n-ymin)/(ymax-ymin)*(bottom-top);
  let body='';
  for(const n of xticks||[xmin,(xmin+xmax)/2,xmax])body+=line(x(n),top,x(n),bottom)+svgText(x(n),bottom+22,f(n,2),{size:11,fill:color.muted});
  for(const n of yticks||[ymin,(ymin+ymax)/2,ymax])body+=line(left,y(n),right,y(n))+svgText(left-10,y(n)+4,f(n,2),{size:11,fill:color.muted,anchor:'end'});
  body+=line(left,bottom,right,bottom,color.muted)+line(left,top,left,bottom,color.muted)+svgText((left+right)/2,height-12,xlabel,{size:12,fill:color.muted})+svgText(left,18,ylabel,{size:12,fill:color.muted,anchor:'start'});
  return {x,y,body,left,right,top,bottom};
}
function featureSVG(probe){
  const p=plot({xmin:0,xmax:255,ymin:0,ymax:100,xlabel:'Raw brightness (0–255)',ylabel:'Texture index (0–100)',xticks:[0,64,128,192,255],yticks:[0,25,50,75,100]});let body=p.body;
  for(const row of AI_ROWS)body+=circle(p.x(row.brightness),p.y(row.texture),6,row.y?color.green:color.gold)+svgText(p.x(row.brightness)+10,p.y(row.texture)-9,row.id,{anchor:'start',size:11});
  body+=circle(p.x(probe.brightness),p.y(probe.texture),12,'none',color.purple,3);
  return svg(body,`Feature map. Rock labels are green, sand labels gold. Purple ring: brightness ${probe.brightness}, texture ${probe.texture}.`);
}
function weightedSVG(probe,params){
  const result=predictAI('linear',params,probe.x);let body=svgText(310,28,'Each feature contributes once',{weight:600,size:15});
  [95,225].forEach((y,i)=>{body+=line(111,y,231,y,color.blue,3)+line(377,y,487,160,color.purple,2)+circle(77,y,35,'#e9f2f6',color.blue,2)+svgText(77,y-4,`x${i+1}`,{size:12})+svgText(77,y+17,f(probe.x[i]),{size:17,weight:600})+svgText(171,y-15,`× ${f(params[i])}`,{size:14})+`<rect x="233" y="${y-32}" width="144" height="64" rx="12" fill="#f0edf8"/>`+svgText(305,y-6,i?'Texture part':'Brightness part',{size:11,fill:color.muted})+svgText(305,y+17,f(result.contributions[i]),{size:20,weight:600});});
  body+=circle(520,160,43,'#e9f5ec',color.green,2)+svgText(520,153,'score z',{size:12})+svgText(520,177,f(result.score),{size:20,weight:650})+line(365,304,497,203,color.gold,2)+svgText(340,310,`bias + (${f(params[2])})`,{fill:color.gold,size:15});
  return svg(body,`Weighted score: ${f(params[0])} times ${f(probe.x[0])}, plus ${f(params[1])} times ${f(probe.x[1])}, plus bias ${f(params[2])}, equals ${f(result.score)}.`);
}
function residualSVG(model){
  const evaluation=evaluateAI('linear',model.parameters),values=evaluation.results.map(row=>row.prediction),low=Math.min(-.25,...values)-.1,high=Math.max(1.25,...values)+.1;
  const p=plot({xmin:-.5,xmax:7.5,ymin:low,ymax:high,xlabel:'Each labeled patch',ylabel:'Raw prediction and target',xticks:[],yticks:[0,1]});let body=p.body;
  AI_ROWS.forEach((row,i)=>{body+=line(p.x(i),p.y(row.y),p.x(i),p.y(values[i]),color.red,3)+circle(p.x(i),p.y(row.y),6,row.y?color.green:color.gold)+circle(p.x(i),p.y(values[i]),6,'white',color.purple,3)+svgText(p.x(i),p.bottom+22,row.id,{size:11});});
  body+=svgText(390,18,'● target    ○ prediction    line = error',{size:11,fill:color.muted});return svg(body,'Prediction errors for all eight training patches. Vertical segments connect each prediction to its supplied target.');
}
function gradientSVG(model){
  const value=model.parameters[0],xmin=Math.max(-12,value-2),xmax=Math.min(12,value+2),points=Array.from({length:65},(_,i)=>{const x=xmin+(xmax-xmin)*i/64,p=[...model.parameters];p[0]=x;return {x,y:evaluateAI('linear',p).loss};}),current=evaluateAI('linear',model.parameters),ymax=Math.max(.1,...points.map(point=>point.y))*1.08;
  const p=plot({xmin,xmax,ymin:0,ymax,xlabel:'w₁ — other parameters held at their current values',ylabel:'Mean squared error',yticks:[0,ymax/2,ymax]});let body=p.body;
  body+=`<polyline points="${points.map(point=>`${p.x(point.x)},${p.y(point.y)}`).join(' ')}" fill="none" stroke="${color.blue}" stroke-width="3"/>`;
  const tangent=points.filter(point=>Math.abs(point.x-value)<.65).map(point=>({x:point.x,y:current.loss+current.gradient[0]*(point.x-value)})).filter(point=>point.y>=0&&point.y<=ymax);
  if(tangent.length>1)body+=`<polyline points="${tangent.map(point=>`${p.x(point.x)},${p.y(point.y)}`).join(' ')}" fill="none" stroke="${color.gold}" stroke-width="3" stroke-dasharray="7 4"/>`;
  body+=circle(p.x(value),p.y(current.loss),7,color.purple)+svgText(576,18,`Current slope: ${f(current.gradient[0],4)}`,{anchor:'end',size:12,fill:color.purple});
  return svg(body,'Loss curve as w1 varies with w2 and bias fixed at their current values. Purple point marks the current model; dashed tangent shows its current partial derivative.');
}
function historySVG(model){
  if(model.history.length<2)return '';
  const first=model.history[0].step,last=model.history.at(-1).step,ymax=Math.max(.02,...model.history.map(point=>point.loss))*1.1;
  const p=plot({xmin:first,xmax:Math.max(first+1,last),ymin:0,ymax,xlabel:'Actual parameter updates in this run',ylabel:'Training loss',height:190,xticks:[first,last],yticks:[0,ymax]});
  return svg(p.body+`<polyline points="${model.history.map(point=>`${p.x(point.step)},${p.y(point.loss)}`).join(' ')}" fill="none" stroke="${color.green}" stroke-width="3"/>`,'Recorded training loss after actual gradient updates. Manual parameter edits start a new run.',190);
}
function probabilitySVG(probe,params){
  const result=predictAI('logistic',params,probe.x),limit=Math.max(6,Math.abs(result.score)+1),p=plot({xmin:-limit,xmax:limit,ymin:0,ymax:1,xlabel:'Raw score z (logit)',ylabel:'Model probability of rock',xticks:[-limit,0,limit],yticks:[0,.5,1]});
  const points=Array.from({length:121},(_,i)=>{const z=-limit+2*limit*i/120;return `${p.x(z)},${p.y(sigmoid(z))}`;});
  let body=p.body+`<polyline points="${points.join(' ')}" fill="none" stroke="${color.blue}" stroke-width="3"/>`+line(p.x(result.score),p.bottom,p.x(result.score),p.y(result.prediction),color.purple,2,'stroke-dasharray="5 4"')+circle(p.x(result.score),p.y(result.prediction),7,color.purple)+svgText(580,18,`p = ${pct(result.prediction)}`,{anchor:'end',size:15,fill:color.purple,weight:650});
  return svg(body,`Sigmoid maps score ${f(result.score)} to probability ${pct(result.prediction)}. The 0.5 midpoint occurs at score zero.`);
}
function networkSVG(probe,params){
  const result=predictAI('network',params,probe.x),inputY=[100,245],hiddenY=[100,245];let body=svgText(75,28,'Features',{size:13,weight:600})+svgText(300,28,'Two hidden neurons',{size:13,weight:600})+svgText(525,28,'Output',{size:13,weight:600});
  for(let j=0;j<2;j++)for(let i=0;i<2;i++){const weight=params[j*3+i];body+=line(111,inputY[i],262,hiddenY[j],weight>=0?color.green:color.gold,1.5+Math.min(4,Math.abs(weight)))+`<title>u${j+1}${i+1} = ${f(weight,4)}</title>`;}
  for(let j=0;j<2;j++)body+=line(339,hiddenY[j],485,172,params[6+j]>=0?color.green:color.gold,1.5+Math.min(4,Math.abs(params[6+j])));
  body+=line(112,100,263,100,color.purple,4)+line(337,100,487,170,color.purple,4)+svgText(190,79,`u₁₁ = ${f(params[0])}`,{fill:color.purple,size:12});
  for(let i=0;i<2;i++)body+=circle(75,inputY[i],35,'#eaf3f5',color.blue,2)+svgText(75,inputY[i]-6,`x${i+1}`,{size:12})+svgText(75,inputY[i]+15,f(probe.x[i]),{size:16,weight:600});
  for(let j=0;j<2;j++)body+=circle(300,hiddenY[j],39,'#f0edf8',color.purple,2)+svgText(300,hiddenY[j]-9,`h${j+1} = tanh(a${j+1})`,{size:11})+svgText(300,hiddenY[j]+15,f(result.hidden[j]),{size:17,weight:650})+svgText(300,hiddenY[j]+59,`a${j+1}=${f(result.preactivation[j])}; c${j+1}=${f(params[j*3+2])}`,{size:11,fill:color.muted});
  body+=circle(525,172,42,'#e8f5ee',color.green,2)+svgText(525,164,'sigmoid(z)',{size:11})+svgText(525,189,pct(result.prediction),{size:17,weight:650})+svgText(525,235,`z=${f(result.score)}`,{size:12})+svgText(525,255,`bias d=${f(params[8])}`,{size:11,fill:color.muted})+svgText(310,337,'Purple: the chain from u₁₁ to the output probability',{size:12,fill:color.purple});
  return svg(body,`Two-input, two-hidden-neuron network. Hidden values ${pair(result.hidden)} produce probability ${pct(result.prediction)}. Purple follows the derivative route from u11.`,370);
}
function attentionSVG(query){
  const attention=attentionAI(query);let body=svgText(310,28,`Query q = ${pair(query)}`,{size:16,weight:650});
  AI_ATTENTION_PATCHES.forEach((patch,i)=>{const x=112+i*198,weight=attention.weights[i];body+=`<rect x="${x-76}" y="61" width="152" height="120" rx="15" fill="${patch.y?'#eaf4ed':'#fcf3e5'}" stroke="${patch.y?color.green:color.gold}"/>`+svgText(x,88,`${['Left','Center','Right'][i]} · ${patch.id}`,{size:13,weight:600})+svgText(x,113,`key = value`,{size:11,fill:color.muted})+svgText(x,135,pair(patch.x),{size:13})+svgText(x,160,`score = ${f(attention.scores[i])}`,{size:12})+line(x,184,310,268,color.purple,2+12*weight)+`<rect x="${x-65}" y="201" width="130" height="30" rx="7" fill="white" stroke="#e1ddec"/>`+`<rect x="${x-65}" y="201" width="${130*weight}" height="30" rx="7" fill="#e2d7f0"/>`+svgText(x,221,`α${i+1} = ${pct(weight)}`,{size:12,weight:600});});
  body+=`<rect x="160" y="270" width="300" height="63" rx="13" fill="#edf3f9" stroke="${color.blue}"/>`+svgText(310,294,'Weighted context vector',{size:12})+svgText(310,317,pair(attention.context),{size:19,weight:650});
  return svg(body,`Attention weights ${attention.weights.map(pct).join(', ')} sum to one and combine the three value vectors into ${pair(attention.context)}.`,355);
}

/** Root supplies content and profile-bound callbacks; this module never fetches. */
export function mountAILearning(host,{content,esc=escape,toast,topic,onSave,onSupport,getContext=()=>({}),initialState,onStageChange}={}){
  if(!host?.ownerDocument)return ()=>{};
  if(!content||!Array.isArray(content.stages)||AI_STAGES.some(id=>!content.stages.some(stage=>stage.id===id))){host.innerHTML='<p class="error">The AI learning path could not be loaded. Reload the page to try again.</p>';return ()=>{};}
  const controller=new AbortController(),listen={signal:controller.signal};let state=normalizeAIState(initialState),disposed=false,viewVersion=0,supportBusy=false,saveTimer=null,savePromise=null,editVersion=0,savedVersion=0,saveError=false,lastUpdate=null,lastFlushVersion=-1,failedStage=null;
  const permitted=new Set(),getStage=id=>content.stages.find(stage=>stage.id===id),context=()=>{try{return getContext()||{};}catch{return {independentCheck:true};}},profileKey=()=>JSON.stringify(context().profileId??null),mountedProfile=profileKey();
  const current=()=>!disposed&&host.isConnected&&profileKey()===mountedProfile&&!context().independentCheck;
  const titleFor=id=>{const entry=typeof topic==='function'?topic(id):topic?.[id];return entry?.title||id.split('.').at(-1).replaceAll('-',' ');};
  const topicLinks=ids=>(ids||[]).map(id=>`<a href="#topic/${encodeURIComponent(id)}">${esc(titleFor(id))}<span aria-hidden="true"> ↗</span></a>`).join('');
  host.innerHTML=`<section class="ai-learning"><nav class="ai-stage-nav" aria-label="AI mathematics stages"></nav><p class="ai-status" role="status" aria-live="polite"></p><div class="ai-stage-host"></div><div class="ai-save-line"><span class="ai-save-status" role="status" aria-live="polite"></span><button type="button" class="button secondary small" data-ai-action="retry" hidden>Retry save</button><button type="button" class="ai-text-button" data-ai-action="copy">Copy my exploration notes</button></div><textarea class="ai-copy-fallback" aria-label="Copyable AI exploration notes" readonly rows="8" hidden></textarea><details class="ai-foundations"><summary>The foundation path — start at the level you need</summary><p>These seven stages demonstrate a connected set of mechanisms. The linked lessons build the underlying mathematics; exploring this lab does not complete those lessons or change mastery.</p><div class="ai-foundation-grid">${(content.foundation_path||[]).map(group=>`<article><span>${esc(group.scope)}</span><h3>${esc(group.title)}</h3><p>${esc(group.why)}</p><div class="ai-topic-links">${topicLinks(group.topic_ids)}</div></article>`).join('')}</div><h3 class="ai-beyond-title">Continue beyond this small project</h3><p>These subjects matter for broader AI work and are not fully taught by the toy models above.</p><div class="ai-foundation-grid">${(content.beyond||[]).map(group=>`<article><h3>${esc(group.title)}</h3><p>${esc(group.why)}</p><div class="ai-topic-links">${topicLinks(group.topic_ids)}</div></article>`).join('')}</div></details><details class="ai-sources"><summary>Model assumptions, scope and primary sources</summary><p>${esc(content.dataset_note)}</p><p>${esc(content.scaling_note)}</p><p>Every training update uses all eight labeled rows. There is no held-out evaluation set, no pretrained model, no image-feature extractor and no claim of calibrated probabilities. Manual parameter edits start a new loss history. Numerical displays are rounded; computation uses the underlying numbers.</p>${(content.sources||[]).map(source=>`<p><a href="${esc(/^https:\/\//.test(source.url)?source.url:'#')}" target="_blank" rel="noopener noreferrer">${esc(source.title)}</a> — ${esc(source.supports)}</p>`).join('')}</details></section>`;
  const shell=host.querySelector('.ai-learning'),stageHost=shell.querySelector('.ai-stage-host'),nav=shell.querySelector('.ai-stage-nav'),status=shell.querySelector('.ai-status'),saveStatus=shell.querySelector('.ai-save-status'),retry=shell.querySelector('[data-ai-action="retry"]');
  function guard(){if(current())return true;if(!disposed){stageHost.inert=false;stageHost.removeAttribute('aria-busy');stageHost.innerHTML=`<div class="ai-guard"><h2>Return to practice to explore</h2><p>This supported walkthrough is unavailable during an independent check or after a learner switch.</p><a class="button" href="${esc(context().practiceHref||'#home')}">Return to practice</a></div>`;nav.querySelectorAll('button, select').forEach(button=>button.disabled=true);}return false;}
  function changed(){editVersion++;saveError=false;saveStatus.textContent=onSave?'Saving…':'Changes remain in this page. Copy your notes before leaving.';clearTimeout(saveTimer);saveTimer=setTimeout(()=>{saveTimer=null;void save();},450);}
  async function save(){
    clearTimeout(saveTimer);saveTimer=null;if(savePromise)return savePromise;if(!onSave)return false;if(savedVersion===editVersion)return true;
    savePromise=(async()=>{while(savedVersion<editVersion){const version=editVersion,snapshot=snapshotAI(state);try{await onSave(snapshot);savedVersion=Math.max(savedVersion,version);saveError=false;if(!disposed)retry.hidden=true;}catch(error){if(savedVersion>=version)continue;saveError=true;if(!disposed){saveStatus.textContent=`Not saved${error?.message?': '+error.message:'.'} Your work remains here; retry or copy your notes.`;retry.hidden=false;}return false;}}if(!disposed)saveStatus.textContent='Saved for this learner.';return true;})();
    try{return await savePromise;}finally{savePromise=null;}
  }
  function renderNav(){nav.innerHTML=`<label for="ai-stage-select">Math for AI</label><select id="ai-stage-select" data-ai-stage-select aria-label="AI mathematics stage">${AI_STAGES.map((id,index)=>`<option value="${id}" ${id===state.stageId?'selected':''}>${index+1} / ${AI_STAGES.length} · ${esc(getStage(id).short_title)}</option>`).join('')}</select>`;}
  async function openStage(id,notify=true){
    if(!AI_STAGES.includes(id)||!guard())return;const version=++viewVersion,stage=getStage(id);failedStage=null;supportBusy=true;stageHost.inert=true;stageHost.setAttribute('aria-busy','true');status.textContent='Opening this stage…';
    try{if(!permitted.has(id)&&onSupport)await onSupport({topicId:stage.topic_id,topicIds:[stage.topic_id,...stage.prerequisite_ids],stageId:id,kind:'ai_math_exploration',profileId:context().profileId??null});if(!current()||version!==viewVersion)return;permitted.add(id);state.stageId=id;if(!state.visited.includes(id)){state.visited.push(id);changed();}else if(notify)changed();lastUpdate=null;renderNav();renderStage();status.textContent='';onStageChange?.({topicId:stage.topic_id,stageId:id});}
    catch(error){if(current()&&version===viewVersion){failedStage=id;status.innerHTML=`This stage could not open${esc(error?.message?': '+error.message:'.')} <button type="button" class="ai-text-button" data-ai-action="retry-stage">Try again</button>`;renderNav();}}
    finally{if(version===viewVersion){supportBusy=false;stageHost.inert=false;stageHost.removeAttribute('aria-busy');if(notify&&state.stageId===id&&permitted.has(id)&&current())stageHost.querySelector('.ai-stage-heading h1')?.focus();}}
  }
  const modelKind=()=>['weighted-sum','loss','gradients'].includes(state.stageId)?'linear':state.stageId==='probability'?'logistic':state.stageId==='network'?'network':null;
  function slider(key,label,value,min,max,step,unit=''){return `<label class="ai-slider"><span>${esc(label)}<output data-ai-output="${esc(key)}">${esc(f(value,4)+unit)}</output></span><input type="range" data-ai-control="${esc(key)}" min="${min}" max="${max}" step="${step}" value="${value}" aria-label="${esc(label)}"></label>`;}
  function parameterControls(kind,stageId){
    const model=state.models[kind],primary=['loss','probability'].includes(stageId)?2:0;
    const controls=model.parameters.map((value,index)=>slider(`param:${index}`,AI_PARAMETER_NAMES[kind][index],value,-12,12,.05));
    return controls[primary]+`<details class="ai-more-weights"><summary>Other model settings</summary>${controls.filter((_,index)=>index!==primary).join('')}</details>`;
  }
  function renderStage(){
    const stage=getStage(state.stageId),index=AI_STAGES.indexOf(stage.id),kind=modelKind(),training=['gradients','probability','network'].includes(stage.id);
    const controls=stage.id==='features'?slider('brightness','Brightness',state.probe.brightness,0,255,1)+`<details class="ai-more-weights"><summary>Texture setting</summary>${slider('texture','Texture index',state.probe.texture,0,100,1)}</details>`:stage.id==='attention'?slider('query:0','Query: brightness coordinate',state.query[0],-3,3,.05)+`<details class="ai-more-weights"><summary>Other query setting</summary>${slider('query:1','Query: texture coordinate',state.query[1],-3,3,.05)}</details>`:parameterControls(kind,stage.id);
    stageHost.innerHTML=`<article class="ai-stage"><header class="ai-stage-heading"><h1 tabindex="-1">${esc(stage.title)}</h1><p>${esc(stage.purpose)}</p>${stage.id==='attention'?'<span class="ai-extension-label">An introduction to attention, not a complete transformer</span>':''}</header><div class="ai-lab-grid"><div class="ai-scene"><div class="ai-scene-toolbar"><label for="ai-sample-select">Patch</label><select id="ai-sample-select" data-ai-control="sample">${AI_ROWS.map(row=>`<option value="${row.id}" ${row.id===state.sampleId?'selected':''}>${row.id} · ${row.label} · brightness ${row.brightness}, texture ${row.texture}</option>`).join('')}</select></div><div class="ai-probe-label"></div><div class="ai-canvas"></div><p class="ai-scroll-cue">Scroll the diagram sideways for detail.</p><div class="ai-equation" aria-label="Live numerical equation"></div><div class="ai-live-readout"></div></div><section class="ai-controls" aria-label="Live model controls"><div class="ai-controls-inner">${controls}${training?`<div class="ai-training-controls"><button type="button" class="button" data-ai-action="train-one">Train one step →</button><details class="ai-training-settings"><summary>Training settings</summary>${slider('learningRate','Learning rate η',state.learningRate,.01,.4,.01)}<button type="button" class="button secondary small" data-ai-action="train-ten">Train 10 steps</button><p>Each step updates the model using all 8 labeled patches.</p></details></div>`:''}<div class="ai-controls-foot"><p class="ai-control-note">${stage.id==='features'?'A changed measurement is a probe. Training keeps the original eight rows.':stage.id==='attention'?'The three keys and values stay fixed.':'Manual edits start a new loss history.'}</p><button type="button" class="ai-text-button" data-ai-action="reset">Reset</button></div></div></section></div><div class="ai-update-detail" role="status" aria-live="polite"></div><details class="ai-training-history" hidden><summary>See the loss history</summary><div class="ai-history"></div></details><nav class="ai-stage-footer" aria-label="Continue the AI walkthrough"><button type="button" class="ai-text-button" data-ai-stage="${AI_STAGES[Math.max(0,index-1)]}" ${index===0?'disabled':''}>← Previous</button>${index<6?`<button type="button" class="${training?'ai-text-button ai-next-stage':'button'}" data-ai-stage="${AI_STAGES[index+1]}">Next: ${esc(getStage(AI_STAGES[index+1]).short_title)} →</button>`:'<button type="button" class="button" data-ai-action="foundations">Choose my next math lesson →</button>'}</nav><div class="ai-optional"><details class="ai-worked"><summary>Explain this math</summary><p class="ai-plain">${esc(stage.plain)}</p><div class="ai-formula">${esc(stage.formula)}</div><h2>A worked example</h2><p class="ai-worked-note">This example uses the stated values. Your live controls may have different settings.</p><ol>${stage.worked.map(step=>`<li><code>${esc(step.equation)}</code><p>${esc(step.why)}</p></li>`).join('')}</ol><button type="button" class="button secondary small" data-ai-action="example">Load the example settings</button></details><details class="ai-prediction"><summary>Try a question</summary><p>${esc(stage.challenge.prompt)}</p><div class="ai-choice-list">${stage.challenge.choices.map((choice,i)=>`<button type="button" class="ai-choice" data-ai-choice="${i}" aria-pressed="${state.practices[stage.id]?.choice===i}"><span>${i+1}</span>${esc(choice)}</button>`).join('')}</div><button type="button" class="button secondary small" data-ai-action="check-idea">Discuss my choice</button><div class="ai-choice-feedback" role="status" aria-live="polite"></div><small>Supported practice, not an independent assessment.</small></details><details class="ai-try"><summary>Experiments &amp; my notes</summary><ol>${stage.try.map(item=>`<li>${esc(item)}</li>`).join('')}</ol><label for="ai-stage-note">${esc(stage.reflection)}</label><textarea id="ai-stage-note" data-ai-control="note" rows="3" maxlength="1200" placeholder="My explanation…">${esc(state.notes[stage.id]||'')}</textarea></details><details class="ai-data-details"><summary>Inspect the eight training rows</summary><div class="ai-data-table"></div></details><details class="ai-prerequisites"><summary>Lessons behind this stage</summary><div class="ai-topic-links">${topicLinks(stage.prerequisite_ids)}</div></details></div></article>`;
    const diagram=stageHost.querySelector('.ai-canvas');diagram.tabIndex=0;diagram.setAttribute('role','region');diagram.setAttribute('aria-label','Mathematical diagram. Scroll horizontally for detail when needed.');
    if(stage.id==='attention'){
      stageHost.querySelector('.ai-scene-toolbar').innerHTML='<p>Compare the fixed patches R1, R4 and S1.</p>';
      stageHost.querySelector('.ai-data-details>summary').textContent='Inspect the keys, scores, weights and values';
    }else if(stage.id==='features')stageHost.querySelector('.ai-data-details>summary').textContent='Inspect all eight measurements and labels';
    else if(stage.id==='weighted-sum')stageHost.querySelector('.ai-data-details>summary').textContent='Compare the eight weighted scores';
    updateLive();showChoice();
  }
  function updateControls(){
    const kind=modelKind();stageHost.querySelectorAll('input[data-ai-control]').forEach(input=>{const key=input.dataset.aiControl,value=key==='brightness'?state.probe.brightness:key==='texture'?state.probe.texture:key==='learningRate'?state.learningRate:key.startsWith('query:')?state.query[Number(key.split(':')[1])]:key.startsWith('param:')&&kind?state.models[kind].parameters[Number(key.split(':')[1])]:null;if(value!==null){input.value=value;stageHost.querySelector(`[data-ai-output="${key}"]`).textContent=f(value,4);}});
    const select=stageHost.querySelector('[data-ai-control="sample"]');if(select)select.value=state.sampleId;
  }
  function updateLive(){
    if(!current())return;const stage=state.stageId,kind=modelKind(),probe=probeAI(state),canvas=stageHost.querySelector('.ai-canvas'),equation=stageHost.querySelector('.ai-equation'),readout=stageHost.querySelector('.ai-live-readout');if(!canvas)return;
    stageHost.querySelector('.ai-probe-label').innerHTML=stage==='attention'?'<span class="ai-label-chip probe">Query → keys → weights → values</span><span>The input patches stay fixed.</span>':`<span class="ai-label-chip ${probe.y===1?'rock':probe.y===0?'sand':'probe'}">${esc(probe.id)} · ${esc(probe.label)}${probe.y!==null?` · target ${probe.y}`:''}</span><span>Feature vector x = ${esc(pair(probe.x))}</span>`;
    if(stage==='features'){canvas.innerHTML=featureSVG(probe);equation.textContent=`x₁ = (${probe.brightness}−128)/128 ≈ ${f(probe.x[0],5)};  x₂ = (${probe.texture}−50)/50 ≈ ${f(probe.x[1],5)}`;readout.innerHTML='<p>The coordinates locate the patch. Its supplied class label stays separate from the two inputs.</p>';}
    else if(stage==='attention'){const result=attentionAI(state.query);canvas.innerHTML=attentionSVG(state.query);equation.textContent=`context ≈ ${result.weights.map((weight,i)=>`${f(weight,4)} × ${pair(AI_ATTENTION_PATCHES[i].x)}`).join(' + ')} ≈ ${pair(result.context)}`;readout.innerHTML=`<p><strong>Weight sum: ${f(result.sum,8)}.</strong> Shared score shifts leave these weights unchanged. The displayed values are rounded.</p><div class="ai-attention-values">${AI_ATTENTION_PATCHES.map((patch,i)=>`<span>${esc(patch.id)}: score ${f(result.scores[i],4)} → weight ${f(result.weights[i],4)}</span>`).join('')}</div>`;}
    else{
      const model=state.models[kind],prediction=predictAI(kind,model.parameters,probe.x),evaluation=evaluateAI(kind,model.parameters);
      canvas.innerHTML=stage==='weighted-sum'?weightedSVG(probe,model.parameters):stage==='loss'?residualSVG(model):stage==='gradients'?gradientSVG(model):stage==='probability'?probabilitySVG(probe,model.parameters):networkSVG(probe,model.parameters);
      if(kind==='linear')equation.textContent=`z ≈ (${f(model.parameters[0])})(${f(probe.x[0])}) + (${f(model.parameters[1])})(${f(probe.x[1])}) + ${f(model.parameters[2])} ≈ ${f(prediction.prediction,5)}`;
      else if(kind==='logistic')equation.textContent=`z ≈ ${f(prediction.score,5)}; p = 1/(1+exp(−z)) ≈ ${f(prediction.prediction,5)} ≈ ${pct(prediction.prediction)}`;
      else{const chain=chainAI(model.parameters,probe.x);equation.textContent=`∂p/∂u₁₁ ≈ ${chain.factors.map(value=>`(${f(value,5)})`).join(' × ')} ≈ ${f(chain.derivative,7)}`;}
      const lossLabel=kind==='linear'?'Mean squared error':'Mean binary cross-entropy';
      readout.innerHTML=`<div class="ai-metrics"><div><span>${lossLabel}</span><strong>${f(evaluation.loss,5)}</strong></div><div><span>${kind==='linear'?'This raw score':'This rock probability'}</span><strong>${kind==='linear'?f(prediction.prediction,4):pct(prediction.prediction)}</strong></div><div><span>Actual updates</span><strong>${model.steps}</strong></div></div>${kind!=='linear'?`<p><strong>${evaluation.correct}/${evaluation.count}</strong> training labels matched at threshold p≥0.5. This is not a validation score.</p>`:stage==='loss'&&probe.y!==null?`<p>This patch: error = ${f(prediction.prediction,4)} − ${probe.y} = <strong>${f(prediction.prediction-probe.y,4)}</strong>; squared error = <strong>${f((prediction.prediction-probe.y)**2,5)}</strong>.</p>`:'<p>A raw linear score is not a probability and may lie outside [0,1].</p>'}${stage==='gradients'?`<p class="ai-gradient-values">Current batch gradient ∇L = ${esc(pair(evaluation.gradient))}. Each component averages all eight rows.</p>`:stage==='network'?`<p class="ai-chain-labels">The four factors are sigmoid slope p(1−p), output weight v₁, tanh slope 1−h₁², and input x₁. This is the sensitivity of p, not the training loss gradient.</p>`:''}`;
    }
    const dataBox=stageHost.querySelector('.ai-data-table');
    if(stage==='attention'){
      const result=attentionAI(state.query);
      dataBox.innerHTML=`<p>In this extension, each patch's key and value are the same fixed two-feature vector.</p><table><thead><tr><th scope="col">Patch</th><th scope="col">Key / value</th><th scope="col">Scaled score</th><th scope="col">Attention weight</th><th scope="col">Weighted value</th></tr></thead><tbody>${AI_ATTENTION_PATCHES.map((row,i)=>`<tr><th scope="row">${row.id}</th><td>${esc(pair(row.x))}</td><td>${f(result.scores[i],5)}</td><td>${f(result.weights[i],5)}</td><td>${esc(pair(row.x.map(value=>value*result.weights[i])))}</td></tr>`).join('')}</tbody></table>`;
    }else{
      const dataKind=kind||'linear',model=state.models[dataKind],evaluation=evaluateAI(dataKind,model.parameters),showPrediction=stage!=='features',showLoss=!['features','weighted-sum'].includes(stage);
      const description=stage==='features'?'Fixed synthetic observations; target y=1 means rock and y=0 means sand.':stage==='weighted-sum'?'Apply the same weights and bias to every feature row.':dataKind==='linear'?'Linear score and squared error.':dataKind==='logistic'?'Logistic probability and binary cross-entropy.':'Network probability and binary cross-entropy.';
      dataBox.innerHTML=`<p>${description} All eight rows are training data.</p><table><thead><tr><th scope="col">Patch</th><th scope="col">Raw brightness</th><th scope="col">Raw texture</th><th scope="col">x₁</th><th scope="col">x₂</th><th scope="col">Target y</th>${showPrediction?'<th scope="col">Prediction</th>':''}${showLoss?'<th scope="col">Loss</th>':''}</tr></thead><tbody>${AI_ROWS.map((row,i)=>`<tr><th scope="row">${row.id} · ${row.label}</th><td>${row.brightness}</td><td>${row.texture}</td><td>${f(row.x[0],5)}</td><td>${f(row.x[1],5)}</td><td>${row.y}</td>${showPrediction?`<td>${f(evaluation.results[i].prediction,5)}</td>`:''}${showLoss?`<td>${f(evaluation.results[i].loss,5)}</td>`:''}</tr>`).join('')}</tbody></table>`;
    }
    const history=kind&&['gradients','probability','network'].includes(stage)?historySVG(state.models[kind]):'';stageHost.querySelector('.ai-history').innerHTML=history;stageHost.querySelector('.ai-training-history').hidden=!history;
    const update=stageHost.querySelector('.ai-update-detail');
    if(lastUpdate&&kind){const i=0;update.innerHTML=`<strong>${lastUpdate.executed} actual update${lastUpdate.executed===1?'':'s'}: loss ${f(lastUpdate.beforeLoss,5)} → ${f(lastUpdate.afterLoss,5)}</strong>${lastUpdate.executed?`<p>Last update for ${esc(AI_PARAMETER_NAMES[kind][i])}: ${f(lastUpdate.lastBefore[i],5)} − ${f(state.learningRate,3)} × (${f(lastUpdate.lastGradient[i],5)}) ≈ ${f(lastUpdate.afterParameters[i],5)}. All ${lastUpdate.afterParameters.length} parameters were updated.</p>`:''}${lastUpdate.limited?'<p>The bounded demo stopped at its step or parameter limit. Reset this model to begin a new run.</p>':''}`;}else update.innerHTML='';
  }
  function showChoice(){
    const stage=getStage(state.stageId),attempt=state.practices[stage.id],feedback=stageHost.querySelector('.ai-choice-feedback');if(!feedback)return;
    stageHost.querySelectorAll('[data-ai-choice]').forEach(button=>button.setAttribute('aria-pressed',String(attempt?.choice===Number(button.dataset.aiChoice))));
    feedback.className='ai-choice-feedback';feedback.textContent='';if(attempt?.shown&&attempt.choice!==null){feedback.textContent=stage.challenge.feedback[attempt.choice];feedback.classList.add(attempt.choice===stage.challenge.answer?'understood':'revisit');}
  }
  function resetExample(){state.sampleId='R1';state.probe={brightness:64,texture:75};const kind=modelKind();if(kind)state.models[kind]=createAIModel(kind);else if(state.stageId==='attention')state.query=[0,0];lastUpdate=null;changed();updateControls();updateLive();status.textContent='Starting example settings loaded. Your other models are unchanged.';}
  async function copyNotes(){
    const notes=`AI math exploration — supported practice, not mastery evidence\n${AI_STAGES.map(id=>`${getStage(id).title}: ${state.notes[id]||'[no explanation entered]'}`).join('\n\n')}\n\nCurrent parameters and training history:\n${JSON.stringify(snapshotAI(state).models,null,2)}\n\n${content.dataset_note}`;
    try{await navigator.clipboard.writeText(notes);if(current()){status.textContent='Exploration notes copied.';toast?.('Exploration notes copied.');}}
    catch{if(current()){const box=shell.querySelector('.ai-copy-fallback');box.hidden=false;box.value=notes;box.focus();box.select();status.textContent='Copy the selected notes below.';}}
  }
  shell.addEventListener('input',event=>{
    if(!guard()||supportBusy||!permitted.has(state.stageId))return;const input=event.target,key=input.dataset.aiControl;if(!key||key==='sample')return;
    if(key==='note'){state.notes[state.stageId]=input.value.slice(0,1200);changed();return;}
    const value=Number(input.value),kind=modelKind();if(!Number.isFinite(value))return;
    try{if(key==='brightness')state.probe.brightness=Math.round(Math.max(0,Math.min(255,value)));else if(key==='texture')state.probe.texture=Math.round(Math.max(0,Math.min(100,value)));else if(key==='learningRate'){state.learningRate=Math.max(.01,Math.min(.4,value));lastUpdate=null;}else if(key.startsWith('query:'))state.query[Number(key.split(':')[1])]=Math.max(-3,Math.min(3,value));else if(key.startsWith('param:')&&kind){state.models[kind]=setAIParameter(kind,state.models[kind],Number(key.split(':')[1]),value);lastUpdate=null;}else return;changed();const output=stageHost.querySelector(`[data-ai-output="${key}"]`);if(output)output.textContent=f(value,4);updateLive();}
    catch(error){status.textContent=error.message;updateControls();}
  },listen);
  shell.addEventListener('change',event=>{
    if(event.target.matches('[data-ai-stage-select]')){void openStage(event.target.value);return;}
    if(event.target.dataset.aiControl!=='sample'||!guard()||supportBusy)return;
    const row=AI_ROWS.find(row=>row.id===event.target.value);if(!row)return;
    state.sampleId=row.id;state.probe={brightness:row.brightness,texture:row.texture};changed();updateControls();updateLive();
  },listen);
  shell.addEventListener('click',async event=>{
    const stageButton=event.target.closest('[data-ai-stage]');if(stageButton){event.preventDefault();await openStage(stageButton.dataset.aiStage);return;}
    const choice=event.target.closest('[data-ai-choice]');if(choice&&guard()&&!supportBusy){state.practices[state.stageId]={choice:Number(choice.dataset.aiChoice),shown:false};changed();showChoice();return;}
    const button=event.target.closest('[data-ai-action]');if(!button||!shell.contains(button))return;const action=button.dataset.aiAction;
    if(action==='retry'){await save();return;}if(action==='copy'){await copyNotes();return;}if(action==='retry-stage'){if(failedStage)await openStage(failedStage);return;}if(!guard())return;
    if(action==='foundations'){const section=shell.querySelector('.ai-foundations');section.open=true;section.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});section.querySelector('summary').focus();return;}
    if(supportBusy||!permitted.has(state.stageId))return;
    if(action==='check-idea'){const attempt=state.practices[state.stageId];if(!attempt||attempt.choice===null){stageHost.querySelector('.ai-choice-feedback').textContent='Choose one explanation first, then compare the reasoning.';return;}attempt.shown=true;changed();showChoice();}
    else if(action==='example')resetExample();
    else if(action==='reset'){const kind=modelKind();if(kind)state.models[kind]=createAIModel(kind);else if(state.stageId==='attention')state.query=[-1,1];else{state.sampleId='R1';state.probe={brightness:64,texture:75};}lastUpdate=null;changed();updateControls();updateLive();status.textContent='Controls reset for this stage.';}
    else if(action==='train-one'||action==='train-ten'){const kind=modelKind();if(!kind||!['gradients','probability','network'].includes(state.stageId))return;try{lastUpdate=trainAI(kind,state.models[kind],state.learningRate,action==='train-one'?1:10);state.models[kind]=lastUpdate.model;changed();updateControls();updateLive();}catch(error){status.textContent=error.message;}}
  },listen);
  host.addEventListener('ai-learning-context',()=>{viewVersion++;guard();},listen);
  // A hard navigation cannot wait behind an earlier response. The root handles
  // flush requests with a new monotonic revision and an immediate keepalive POST.
  const flushOnLeave=()=>{
    clearTimeout(saveTimer);saveTimer=null;
    if(disposed||!onSave||saveError||editVersion<=savedVersion||lastFlushVersion===editVersion)return;
    const version=editVersion;lastFlushVersion=version;
    try{Promise.resolve(onSave(snapshotAI(state),{flush:true,reason:'pagehide'})).then(()=>{savedVersion=Math.max(savedVersion,version);},()=>{});}catch{}
  };
  const unregister=autosave.register(reason=>['pagehide','hidden'].includes(reason)?flushOnLeave():save());
  host.ownerDocument.defaultView?.addEventListener('pagehide',flushOnLeave,listen);
  renderNav();saveStatus.textContent=onSave?'Your changes save for this learner.':'Local exploration. Copy your notes before leaving.';void openStage(state.stageId,false);
  return ()=>{if(disposed)return;unregister();clearTimeout(saveTimer);saveTimer=null;if(editVersion>savedVersion&&!saveError)void save();disposed=true;viewVersion++;controller.abort();shell.remove();};
}
