import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {AI_STAGES,AI_MODEL_NAMES,AI_DATASET,AI_ROWS,AI_ATTENTION_PATCHES,AI_DEFAULT_PARAMETERS,normalizeFeatures,dot,sigmoid,softplus,binaryCrossEntropyLogit,softmax,predictAI,sampleAI,evaluateAI,chainAI,attentionAI,createAIModel,normalizeAIState,probeAI,trainAI,setAIParameter,snapshotAI} from '../ai-math.js';
import {mountAILearning} from '../ai-learning.js';

let checks=0;
const close=(actual,expected,tolerance=1e-10,label='')=>{assert.ok(Number.isFinite(actual)&&Math.abs(actual-expected)<=tolerance,`${label}: ${actual} != ${expected}`);checks++;};
const equal=(actual,expected)=>{assert.deepEqual(actual,expected);checks++;};
const throws=fn=>{assert.throws(fn);checks++;};
equal(typeof mountAILearning,'function');
equal(AI_DATASET.length,8);equal(AI_DATASET.filter(row=>row.y===1).length,4);
equal(normalizeFeatures({brightness:64,texture:75}),[-.5,.5]);
equal(normalizeFeatures({brightness:128,texture:50}),[0,0]);
equal(normalizeFeatures({brightness:0,texture:0}),[-1,-1]);
equal(normalizeFeatures({brightness:255,texture:100}),[127/128,1]);
for(const row of AI_ROWS){equal(row.x,normalizeFeatures(row));assert.ok(row.x.every(n=>n>=-1&&n<=1));checks++;}
for(const bad of [{brightness:-1,texture:50},{brightness:256,texture:50},{brightness:128,texture:101},{brightness:NaN,texture:0},{brightness:'64',texture:50},{brightness:Infinity,texture:50}])throws(()=>normalizeFeatures(bad));
close(dot([2,-3],[4,5]),-7);throws(()=>dot([1],[1,2]));throws(()=>dot([Infinity],[0]));
close(sigmoid(0),.5);close(sigmoid(1)+sigmoid(-1),1);close(softplus(0),Math.log(2));
close(binaryCrossEntropyLogit(0,0),Math.log(2));close(binaryCrossEntropyLogit(0,1),Math.log(2));
for(const z of [-10000,-100,-20,0,20,100,10000]){
 const p=sigmoid(z);assert.ok(p>=0&&p<=1);checks++;
 for(const y of [0,1]){const loss=binaryCrossEntropyLogit(z,y);assert.ok(Number.isFinite(loss)&&loss>=0);checks++;}
}
close(binaryCrossEntropyLogit(10000,0),10000);close(binaryCrossEntropyLogit(-10000,1),10000);
throws(()=>sigmoid(Infinity));throws(()=>binaryCrossEntropyLogit(1,-1));

const initial=normalizeAIState(),r1=AI_ROWS[0];
close(predictAI('linear',initial.models.linear.parameters,r1.x).prediction,.3);
close(sampleAI('linear',initial.models.linear.parameters,r1).error,-.7);
close(sampleAI('linear',initial.models.linear.parameters,r1).loss,.49);
close(sampleAI('linear',initial.models.linear.parameters,r1).gradient[0],.7);
close(predictAI('linear',[.8,.6,.2],r1.x).prediction,.1);
close(predictAI('logistic',initial.models.logistic.parameters,r1.x).prediction,sigmoid(.3));
equal(predictAI('network',initial.models.network.parameters,r1.x).preactivation,[-.3,.3]);
throws(()=>sampleAI('network',initial.models.network.parameters,{x:r1.x,y:null}));
throws(()=>predictAI('bogus',[1,2,3],r1.x));throws(()=>predictAI('linear',[13,0,0],r1.x));
throws(()=>evaluateAI('linear',[0,0,0],[]));throws(()=>evaluateAI('linear',[0,0,0],Array(65).fill(r1)));

// All analytical batch derivatives are compared with independent central
// finite differences of the scalar loss, at multiple nondegenerate models.
const variants={linear:[[.4,.6,.2],[-.7,.2,-.3],[1.2,-.9,.7]],logistic:[[.4,.6,.2],[-.7,.2,-.3],[1.2,-.9,.7]],network:[[...AI_DEFAULT_PARAMETERS.network],[.7,.1,-.2,-.3,.8,.15,.4,-.6,.2],[-.4,.8,.2,.1,-.7,-.1,.9,.3,-.4]]};
const epsilon=1e-6;
for(const kind of AI_MODEL_NAMES)for(const params of variants[kind]){
 const result=evaluateAI(kind,params);
 close(result.loss,result.results.reduce((sum,item)=>sum+item.loss,0)/8,1e-13,'batch mean');
 params.forEach((_,j)=>{const plus=[...params],minus=[...params];plus[j]+=epsilon;minus[j]-=epsilon;const numerical=(evaluateAI(kind,plus).loss-evaluateAI(kind,minus).loss)/(2*epsilon);close(result.gradient[j],numerical,2e-8,`${kind} gradient ${j}`);});
}
// The displayed four-factor chain is d(probability)/d(u11), distinct from d(loss).
for(const params of variants.network)for(const row of [AI_ROWS[0],AI_ROWS[4],{x:[0,.6]}]){
 const chain=chainAI(params,row.x),plus=[...params],minus=[...params];plus[0]+=epsilon;minus[0]-=epsilon;
 close(chain.derivative,(predictAI('network',plus,row.x).prediction-predictAI('network',minus,row.x).prediction)/(2*epsilon),2e-8,'displayed chain');
 close(chain.derivative,chain.factors.reduce((a,b)=>a*b,1));
}
close(chainAI(initial.models.network.parameters,[0,.5]).derivative,0);
const disconnected=[...initial.models.network.parameters];disconnected[6]=0;
close(sampleAI('network',disconnected,r1).gradient[0],0);

for(const kind of AI_MODEL_NAMES){
 const model=createAIModel(kind),before=JSON.stringify(model),evaluation=evaluateAI(kind,model.parameters),one=trainAI(kind,model,.15,1);
 equal(JSON.stringify(model),before);equal(one.executed,1);equal(one.model.steps,1);
 one.model.parameters.forEach((value,i)=>close(value,model.parameters[i]-.15*evaluation.gradient[i],1e-13,'simultaneous update'));
 assert.ok(one.afterLoss<one.beforeLoss);checks++;
 let trained=model;for(let batch=0;batch<20;batch++)trained=trainAI(kind,trained,.15,10).model;
 assert.ok(evaluateAI(kind,trained.parameters).loss<evaluation.loss*.25);checks++;
 equal(trained.steps,200);assert.ok(trained.history.length<=81);checks++;
 equal(trained.history[0].step,0);equal(trained.history.at(-1).step,200);
 for(let i=1;i<trained.history.length;i++){assert.ok(trained.history[i].step>trained.history[i-1].step);checks++;}
 close(trained.history.at(-1).loss,evaluateAI(kind,trained.parameters).loss);
 let repeat=model;for(let batch=0;batch<20;batch++)repeat=trainAI(kind,repeat,.15,10).model;equal(repeat,trained);
 const reset=setAIParameter(kind,trained,0,.5);equal(reset.steps,0);equal(reset.history.length,1);equal(reset.parameters[0],.5);
 const capped=trainAI(kind,{...model,steps:1000,history:[{step:1000,loss:evaluation.loss}]},.15,10);equal(capped.executed,0);equal(capped.limited,true);equal(capped.model.parameters,model.parameters);
}
for(const rate of [NaN,Infinity,-.1,0,.001,.5])throws(()=>trainAI('linear',createAIModel('linear'),rate));
for(const steps of [0,26,Infinity,1.5])throws(()=>trainAI('linear',createAIModel('linear'),.1,steps));
throws(()=>setAIParameter('network',createAIModel('network'),9,0));throws(()=>setAIParameter('linear',createAIModel('linear'),0,12.1));

for(const scores of [[0,0,0],[1,2,3],[-20,-21,-22],[10000,10001,9999],[-10000,0,10000]]){
 const weights=softmax(scores);close(weights.reduce((a,b)=>a+b,0),1,1e-14);assert.ok(weights.every(n=>Number.isFinite(n)&&n>=0&&n<=1));checks++;
 const shifted=softmax(scores.map(n=>n+23));weights.forEach((weight,i)=>close(weight,shifted[i],1e-14,'softmax shift'));
}
equal(softmax([0,0,0]),[1/3,1/3,1/3]);equal(softmax([10000,0,-10000]),[1,0,0]);
throws(()=>softmax([]));throws(()=>softmax([Infinity]));throws(()=>softmax(Array(33).fill(0)));
for(const query of [[0,0],[-1,1],[3,-3],[-3,3],[.3,-.8]]){
 const attention=attentionAI(query);close(attention.sum,1,1e-14);
 attention.scores.forEach((score,i)=>close(score,dot(query,AI_ATTENTION_PATCHES[i].x)/Math.sqrt(2)));
 attention.context.forEach((value,j)=>{close(value,attention.weights.reduce((sum,weight,i)=>sum+weight*AI_ATTENTION_PATCHES[i].x[j],0));assert.ok(value>=Math.min(...AI_ATTENTION_PATCHES.map(row=>row.x[j]))-1e-14&&value<=Math.max(...AI_ATTENTION_PATCHES.map(row=>row.x[j]))+1e-14);checks++;});
}
equal(attentionAI([0,0]).weights,[1/3,1/3,1/3]);assert.ok(attentionAI([-1,1]).weights[0]>attentionAI([-1,1]).weights[2]);checks++;
throws(()=>attentionAI([4,0]));throws(()=>attentionAI([0,0],[]));

// Only allowlisted, bounded exploration data is copied into saved drafts.
const bad=normalizeAIState({version:99,stageId:'fake',sampleId:'private',probe:{brightness:Infinity,texture:-1},learningRate:5,query:[NaN,0],models:{linear:{parameters:[Infinity,0,0],steps:100000,history:[{step:0,loss:NaN}]}},notes:{features:'x'.repeat(1300),secret:'private'},practices:{features:{choice:8,shown:true},secret:{choice:0,shown:true}},visited:['network','network','fake']});
equal(bad.version,1);equal(bad.stageId,'features');equal(bad.sampleId,'R1');equal(bad.probe,{brightness:64,texture:75});equal(bad.learningRate,.15);equal(bad.query,[-1,1]);equal(bad.models.linear.parameters,[.4,.6,.2]);equal(bad.models.linear.steps,0);equal(bad.notes.features.length,1200);equal(bad.notes.secret,undefined);equal(bad.practices.features.choice,null);equal(bad.practices.secret,undefined);equal(bad.visited,['network']);
equal(normalizeAIState(null).stageId,'features');equal(probeAI(initial).y,1);
const custom=snapshotAI(initial);custom.probe={brightness:127,texture:49};equal(probeAI(custom).y,null);equal(initial.probe,{brightness:64,texture:75});
const restored=snapshotAI(initial);restored.models.linear.parameters[0]=-3;equal(initial.models.linear.parameters[0],.4);
equal(normalizeAIState(initial),initial);

const content=JSON.parse(await readFile(new URL('../ai-learning-path.json',import.meta.url),'utf8'));
const catalog=JSON.parse(await readFile(new URL('../curriculum_catalog.json',import.meta.url),'utf8'));
const topics=new Set(catalog.courses.flatMap(course=>course.topics.map(topic=>topic.id))),sources=new Set(content.sources.map(source=>source.id));
equal(content.stages.map(stage=>stage.id),AI_STAGES);equal(content.version,1);
for(const stage of content.stages){assert.ok(topics.has(stage.topic_id));checks++;assert.ok(stage.worked.length>=4&&stage.try.length>=2);checks++;equal(stage.challenge.choices.length,3);equal(stage.challenge.feedback.length,3);assert.ok(Number.isInteger(stage.challenge.answer)&&stage.challenge.answer>=0&&stage.challenge.answer<=2);checks++;for(const step of stage.worked){assert.ok(step.equation.length>8&&step.why.length>25);checks++;}for(const id of stage.prerequisite_ids){assert.ok(topics.has(id),id);checks++;}for(const id of stage.source_ids){assert.ok(sources.has(id));checks++;}}
for(const group of [...content.foundation_path,...content.beyond])for(const id of group.topic_ids){assert.ok(topics.has(id),id);checks++;}
for(const source of content.sources){assert.ok(/^https:\/\/(docs\.pytorch\.org|papers\.nips\.cc)\//.test(source.url));checks++;}
assert.match(content.dataset_note,/invented/);assert.match(content.dataset_note,/generalization/);assert.match(content.stages.at(-1).plain,/outside this demo/);checks+=3;
for(const file of ['../ai-math.js','../ai-learning.js']){const text=await readFile(new URL(file,import.meta.url),'utf8');assert.ok(!/\beval\s*\(|new\s+Function\b/.test(text),file);assert.ok(!/\bfetch\s*\(/.test(text),'Unexpected module network in '+file);checks+=2;}
console.log(`AI pathway: ${checks} numerical, gradient, training, softmax, attention, state, coverage and safety checks passed.`);
