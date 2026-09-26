// Tiny, deterministic learning models. No model calls, executable input or hidden data.
export const AI_STAGES=Object.freeze(['features','weighted-sum','loss','gradients','probability','network','attention']);
export const AI_MODEL_NAMES=Object.freeze(['linear','logistic','network']);
export const AI_STATE_LIMITS=Object.freeze({parameter:12,steps:1000,history:81,note:1200,learningRateMin:.01,learningRateMax:.4,query:3});
export const AI_DATASET=Object.freeze([
  {id:'R1',brightness:64,texture:75,y:1},{id:'R2',brightness:96,texture:90,y:1},
  {id:'R3',brightness:40,texture:60,y:1},{id:'R4',brightness:130,texture:72,y:1},
  {id:'S1',brightness:205,texture:20,y:0},{id:'S2',brightness:180,texture:35,y:0},
  {id:'S3',brightness:230,texture:45,y:0},{id:'S4',brightness:145,texture:15,y:0}
].map(row=>Object.freeze({...row,label:row.y?'rock':'sand'})));
export const AI_DEFAULT_PARAMETERS=Object.freeze({linear:Object.freeze([.4,.6,.2]),logistic:Object.freeze([.4,.6,.2]),network:Object.freeze([.4,-.3,.05,-.2,.5,-.05,-.4,.6,.1])});
export const AI_PARAMETER_NAMES=Object.freeze({linear:Object.freeze(['w₁','w₂','b']),logistic:Object.freeze(['w₁','w₂','b']),network:Object.freeze(['u₁₁','u₁₂','c₁','u₂₁','u₂₂','c₂','v₁','v₂','d'])});
const finite=n=>typeof n==='number'&&Number.isFinite(n);
const bounded=(n,min,max)=>finite(n)&&n>=min&&n<=max;
function requireNumber(n,min,max,name){if(!bounded(n,min,max))throw new RangeError(`${name} must be finite and between ${min} and ${max}.`);return n;}
function vector(value,length,bound,name){if(!Array.isArray(value)||value.length!==length||!value.every(n=>bounded(n,-bound,bound)))throw new RangeError(`${name} needs ${length} finite numbers between ${-bound} and ${bound}.`);return value;}
const copy=value=>JSON.parse(JSON.stringify(value));

export function normalizeFeatures({brightness,texture}={}){
  requireNumber(brightness,0,255,'Brightness');requireNumber(texture,0,100,'Texture');
  return [(brightness-128)/128,(texture-50)/50];
}
export const AI_ROWS=Object.freeze(AI_DATASET.map(row=>Object.freeze({...row,x:Object.freeze(normalizeFeatures(row))})));
export const AI_ATTENTION_PATCHES=Object.freeze([AI_ROWS[0],AI_ROWS[3],AI_ROWS[4]]);
export function dot(a,b){
  if(!Array.isArray(a)||!Array.isArray(b)||a.length!==b.length||!a.length||a.length>32||!a.every(n=>bounded(n,-1e6,1e6))||!b.every(n=>bounded(n,-1e6,1e6)))throw new RangeError('Dot products need matching finite vectors of length 1–32.');
  return a.reduce((sum,n,i)=>sum+n*b[i],0);
}
export function sigmoid(z){requireNumber(z,-1e6,1e6,'Score');if(z>=0)return 1/(1+Math.exp(-z));const e=Math.exp(z);return e/(1+e);}
export function softplus(z){requireNumber(z,-1e6,1e6,'Score');return Math.max(z,0)+Math.log1p(Math.exp(-Math.abs(z)));}
export function binaryCrossEntropyLogit(z,y){requireNumber(y,0,1,'Target');return softplus(z)-y*z;}
export function softmax(scores){
  if(!Array.isArray(scores)||!scores.length||scores.length>32||!scores.every(n=>bounded(n,-1e6,1e6)))throw new RangeError('Softmax needs 1–32 finite scores.');
  const max=Math.max(...scores),exp=scores.map(n=>Math.exp(n-max)),sum=exp.reduce((a,b)=>a+b,0);return exp.map(n=>n/sum);
}
function parameters(kind,p){if(!AI_MODEL_NAMES.includes(kind))throw new RangeError('Choose a supported toy model.');return vector(p,kind==='network'?9:3,AI_STATE_LIMITS.parameter,'Parameters');}
export function predictAI(kind,p,x){
  parameters(kind,p);vector(x,2,1,'Normalized inputs');
  if(kind!=='network'){const contributions=[p[0]*x[0],p[1]*x[1],p[2]],score=contributions.reduce((a,b)=>a+b,0);return {score,prediction:kind==='linear'?score:sigmoid(score),contributions};}
  const preactivation=[p[0]*x[0]+p[1]*x[1]+p[2],p[3]*x[0]+p[4]*x[1]+p[5]],hidden=preactivation.map(Math.tanh),score=p[6]*hidden[0]+p[7]*hidden[1]+p[8];
  return {score,prediction:sigmoid(score),hidden,preactivation,contributions:[p[6]*hidden[0],p[7]*hidden[1],p[8]]};
}
export function sampleAI(kind,p,row){
  if(!row||!bounded(row.y,0,1))throw new RangeError('A loss needs a target between zero and one.');
  const prediction=predictAI(kind,p,row.x),error=prediction.prediction-row.y,loss=kind==='linear'?error*error:binaryCrossEntropyLogit(prediction.score,row.y);
  if(kind!=='network'){const scale=kind==='linear'?2*error:error;return {...prediction,error,loss,gradient:[scale*row.x[0],scale*row.x[1],scale]};}
  const [h1,h2]=prediction.hidden,back1=error*p[6]*(1-h1*h1),back2=error*p[7]*(1-h2*h2);
  return {...prediction,error,loss,gradient:[back1*row.x[0],back1*row.x[1],back1,back2*row.x[0],back2*row.x[1],back2,error*h1,error*h2,error]};
}
export function evaluateAI(kind,p,rows=AI_ROWS){
  parameters(kind,p);if(!Array.isArray(rows)||!rows.length||rows.length>64)throw new RangeError('Use a labeled dataset of 1–64 rows.');
  const results=rows.map(row=>sampleAI(kind,p,row)),n=rows.length,gradient=Array(p.length).fill(0);
  let loss=0,correct=0;for(let i=0;i<n;i++){loss+=results[i].loss/n;results[i].gradient.forEach((value,j)=>gradient[j]+=value/n);if(Number(results[i].prediction>=.5)===rows[i].y)correct++;}
  return {loss,gradient,results,correct,count:n};
}
export function chainAI(p,x){
  const forward=predictAI('network',p,x),[h]=forward.hidden,pred=forward.prediction;
  const factors=[pred*(1-pred),p[6],1-h*h,x[0]];
  return {...forward,factors,derivative:factors.reduce((a,b)=>a*b,1)};
}
export function attentionAI(query,patches=AI_ATTENTION_PATCHES){
  vector(query,2,AI_STATE_LIMITS.query,'Query');if(!Array.isArray(patches)||!patches.length||patches.length>16)throw new RangeError('Use 1–16 feature patches.');
  patches.forEach(patch=>vector(patch.x,2,1,'Patch key/value'));
  const scores=patches.map(patch=>dot(query,patch.x)/Math.sqrt(2)),weights=softmax(scores),context=[0,0];
  patches.forEach((patch,i)=>patch.x.forEach((value,j)=>context[j]+=weights[i]*value));
  return {scores,weights,context,sum:weights.reduce((a,b)=>a+b,0)};
}
export function createAIModel(kind){const p=[...AI_DEFAULT_PARAMETERS[kind]||[]];parameters(kind,p);return {parameters:p,steps:0,history:[{step:0,loss:evaluateAI(kind,p).loss}]};}
function validModel(kind,value){
  const defaults=createAIModel(kind),p=Array.isArray(value?.parameters)&&value.parameters.length===defaults.parameters.length&&value.parameters.every(n=>bounded(n,-12,12))?[...value.parameters]:defaults.parameters;
  const steps=Number.isInteger(value?.steps)&&bounded(value.steps,0,1000)?value.steps:0;
  let last=-1;const history=Array.isArray(value?.history)?value.history.slice(-81).filter(point=>{const okay=Number.isInteger(point?.step)&&bounded(point.step,0,steps)&&point.step>last&&bounded(point.loss,0,4000);if(okay)last=point.step;return okay;}).map(point=>({step:point.step,loss:point.loss})):[];
  const current={step:steps,loss:evaluateAI(kind,p).loss};if(history.at(-1)?.step===steps)history[history.length-1]=current;else history.push(current);
  return {parameters:p,steps,history:history.slice(-81)};
}
export function normalizeAIState(value={}){
  const stageId=AI_STAGES.includes(value?.stageId)?value.stageId:'features',sampleId=AI_DATASET.some(row=>row.id===value?.sampleId)?value.sampleId:'R1';
  const selected=AI_DATASET.find(row=>row.id===sampleId),notes={},practices={};
  for(const id of AI_STAGES){if(typeof value?.notes?.[id]==='string')notes[id]=value.notes[id].slice(0,1200);const item=value?.practices?.[id];if(item&&typeof item==='object')practices[id]={choice:Number.isInteger(item.choice)&&bounded(item.choice,0,2)?item.choice:null,shown:Boolean(item.shown)};}
  return {version:1,stageId,sampleId,probe:{brightness:Number.isInteger(value?.probe?.brightness)&&bounded(value.probe.brightness,0,255)?value.probe.brightness:selected.brightness,texture:Number.isInteger(value?.probe?.texture)&&bounded(value.probe.texture,0,100)?value.probe.texture:selected.texture},learningRate:bounded(value?.learningRate,.01,.4)?value.learningRate:.15,query:Array.isArray(value?.query)&&value.query.length===2&&value.query.every(n=>bounded(n,-3,3))?[...value.query]:[-1,1],models:Object.fromEntries(AI_MODEL_NAMES.map(kind=>[kind,validModel(kind,value?.models?.[kind])])),notes,practices,visited:Array.isArray(value?.visited)?[...new Set(value.visited.filter(id=>AI_STAGES.includes(id)))].slice(0,7):[]};
}
export function probeAI(state){const x=normalizeFeatures(state.probe),known=AI_ROWS.find(row=>row.brightness===state.probe.brightness&&row.texture===state.probe.texture);return known?{...known,x}:{id:'Probe',label:'unlabeled',brightness:state.probe.brightness,texture:state.probe.texture,y:null,x};}
export function trainAI(kind,model,learningRate,iterations=1){
  requireNumber(learningRate,.01,.4,'Learning rate');if(!Number.isInteger(iterations)||iterations<1||iterations>25)throw new RangeError('One training action may perform 1–25 updates.');
  const next=validModel(kind,model),before=evaluateAI(kind,next.parameters),beforeParameters=[...next.parameters];let executed=0,limited=false,lastGradient=before.gradient,lastBefore=[...next.parameters];
  for(let i=0;i<iterations;i++){
    if(next.steps>=1000){limited=true;break;}
    const current=evaluateAI(kind,next.parameters),candidate=next.parameters.map((value,j)=>value-learningRate*current.gradient[j]);
    if(!candidate.every(n=>bounded(n,-12,12))){limited=true;break;}
    lastBefore=[...next.parameters];lastGradient=current.gradient;next.parameters=candidate;next.steps++;executed++;
    next.history.push({step:next.steps,loss:evaluateAI(kind,candidate).loss});if(next.history.length>81)next.history=[next.history[0],...next.history.slice(-80)];
  }
  const after=evaluateAI(kind,next.parameters);
  return {model:next,executed,limited,beforeLoss:before.loss,afterLoss:after.loss,beforeParameters,lastBefore,lastGradient,afterParameters:[...next.parameters]};
}
export function setAIParameter(kind,model,index,value){parameters(kind,model.parameters);if(!Number.isInteger(index)||index<0||index>=model.parameters.length)throw new RangeError('Choose a model parameter.');requireNumber(value,-12,12,'Parameter');const p=[...model.parameters];p[index]=value;return {parameters:p,steps:0,history:[{step:0,loss:evaluateAI(kind,p).loss}]};}
export function snapshotAI(state){return copy(normalizeAIState(state));}
