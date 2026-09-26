import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PURPOSE_DEFAULTS,physicsModel,mechanicalModel,electricalModel,architectureModel,financeModel,purposeModels,purposeResult,normalizePurposeDraft} from '../purpose-math.js';
import {purposeFields,purposeFigure,purposeDirectoryCards,mountPurposePaths} from '../purpose-paths.js';

const content=JSON.parse(await readFile(new URL('../purpose-paths.json',import.meta.url),'utf8'));
const catalog=JSON.parse(await readFile(new URL('../curriculum_catalog.json',import.meta.url),'utf8'));
const topicIds=new Set(catalog.courses.flatMap(c=>c.topics.map(t=>t.id)));
const close=(a,b,tol=1e-9)=>assert.ok(Math.abs(a-b)<=tol*Math.max(1,Math.abs(b)),a+' differs from '+b);
const simpson=(f,a,b,count=400)=>{
  const h=(b-a)/count;let sum=f(a)+f(b);
  for(let i=1;i<count;i++)sum+=(i%2?4:2)*f(a+i*h);
  return sum*h/3;
};
const field=id=>content.fields.find(f=>f.id===id);

test('six genuine fields have18 focused stages and valid prerequisite/source links',()=>{
  assert.deepEqual(content.fields.map(f=>f.id),['physics','mechanical','electrical','architecture','finance','ai-ml']);
  assert.equal(content.fields.reduce((n,f)=>n+f.stages.length,0),18);
  const sources=new Set(content.sources.map(s=>s.id));
  for(const f of content.fields){
    const meta=purposeFields.find(p=>p.id===f.id);
    assert.equal(meta.title,f.title);assert.equal(meta.subtitle,f.subtitle);assert.equal(meta.href,f.href);
    if(f.kind==='link'){assert.equal(f.href,'#ai-math');assert.equal(f.stages.length,0);continue;}
    assert.equal(meta.first,f.stages[0].id);
    assert.equal(typeof purposeModels[f.id],'function');
    assert.ok(f.stages.length>=3&&f.stages.length<=5);
    assert.equal(new Set(f.stages.map(s=>s.id)).size,f.stages.length);
    for(const [key,c] of Object.entries(f.controls)){
      assert.equal(c.default,PURPOSE_DEFAULTS[f.id][key]);
      assert.ok(c.min<=c.default&&c.default<=c.max&&c.step>0);
    }
    for(const s of f.stages){
      assert.ok(f.controls[s.control],f.id+':'+s.id);
      assert.ok(s.headline.split(/\s+/).length<=11,s.headline);
      assert.ok(s.action.split(/\s+/).length<=19,s.action);
      assert.ok(s.topic_ids.length>=2);
      s.topic_ids.forEach(id=>assert.ok(topicIds.has(id),id));
      s.source_ids.forEach(id=>assert.ok(sources.has(id),id));
      assert.ok(s.formula&&s.why.length>45&&s.question.length>35);
    }
  }
});

test('default outputs independently match hand-worked scenarios',()=>{
  const expected={
    physics:{distance:12,velocity:7,energy:49,accumulation:20},
    mechanical:{gears:40,torque:6,power:8*Math.PI,spring:.864},
    electrical:{current:6,power:.036,charging:6*(1-Math.exp(-1))},
    architecture:{volume:.24,balance:2.5,stiffness:320000/237600000*1000},
    finance:{time:1000*1.05**10+200*(1.05**10-1)/.05,rate:1000*1.05**10+200*(1.05**10-1)/.05,
      contributions:1000*1.05**10+200*(1.05**10-1)/.05,
      'buying-power':(1000*1.05**10+200*(1.05**10-1)/.05)/1.02**10}
  };
  for(const [id,stages] of Object.entries(expected))for(const [stage,value] of Object.entries(stages))
    close(purposeResult(id,stage,PURPOSE_DEFAULTS[id]).value,value);
});

test('physics derivative, velocity area and work-energy agree across varied parameters',()=>{
  for(const time of [0,.25,3,8])for(const speed of [0,3,12])for(const acceleration of [0,.1,4]){
    const m=physicsModel({time,speed,acceleration,mass:3.5}),h=1e-5;
    close((m.positionAt(time+h)-m.positionAt(time-h))/(2*h),m.velocity,1e-8);
    close(simpson(m.velocityAt,0,time),m.distance);
    close(m.kineticEnergy-m.initialEnergy,m.netWork);
    close(m.netWork,3.5*acceleration*m.distance);
  }
  close(purposeResult('physics','distance',{time:4,speed:3,acceleration:4,mass:2}).value,12);
});

test('ideal gear teeth, speed, torque and power satisfy independent constraints',()=>{
  for(const drivenTeeth of [12,18,36,60])for(const inputSpeed of [30,120,240])for(const inputTorque of [.5,2,8]){
    const m=mechanicalModel({drivenTeeth,inputSpeed,inputTorque});
    close(m.driverTeeth*inputSpeed,drivenTeeth*m.outputSpeed);
    close(m.outputTorque/drivenTeeth,inputTorque/12);
    close(m.inputPower,inputTorque*inputSpeed*Math.PI/30);
    close(m.inputPower,m.outputPower);
    assert.equal(m.oppositeDirections,true);
  }
  for(const compression of [0,.01,.12,.3]){
    const m=mechanicalModel({compression});
    close(simpson(x=>120*x,0,compression),m.springEnergy);
    close(m.springForce,120*compression);
  }
});

test('Ohm law and RC charging preserve SI conversion, circuit balance and the differential equation',()=>{
  for(const voltage of [1,6,12])for(const resistance of [100,1000,2000])for(const capacitance of [100,1000,2200]){
    const time=1.2,m=electricalModel({voltage,resistance,capacitance,time}),h=1e-6;
    close(m.current*resistance,voltage);
    close(m.currentMilliamps/1000,m.current);
    close(m.power,m.current*m.current*resistance);
    close(m.tau,resistance*capacitance/1e6);
    close(m.capacitorVoltage+m.chargingCurrent*resistance,voltage);
    close((m.voltageAt(time+h)-m.voltageAt(time-h))/(2*h),(voltage-m.capacitorVoltage)/m.tau,1e-7);
    assert.ok(m.capacitorVoltage>=0&&m.capacitorVoltage<=voltage);
  }
  const tiny=electricalModel({time:1e-12});assert.ok(tiny.capacitorVoltage>0);
  close(electricalModel({time:0}).capacitorVoltage,0);
  close(electricalModel({time:1}).capacitorVoltage/6,1-Math.exp(-1));
});

test('beam center displacement follows virtual work, boundary conditions and cubic sensitivity',()=>{
  for(const span of [4,6,8])for(const load of [1,5,10])for(const depth of [.2,.3,.4]){
    const m=architectureModel({span,load,depth,width:.2});
    const virtualWork=simpson(x=>{
      const arm=Math.min(x,span-x);
      const bendingMoment=m.load*arm/2,unitLoadMoment=arm/2;
      return bendingMoment*unitLoadMoment/(11e9*m.secondMoment);
    },0,span);
    close(m.deflection,virtualWork);
    close(m.deflectionAt(0),0);close(m.deflectionAt(span),0);
    close(m.deflectionAt(span/2),m.deflection);
    close(m.deflectionAt(.2*span),m.deflectionAt(.8*span));
    close(m.leftReaction+m.rightReaction,m.load);
    assert.ok(m.deflection/span<.01,'UI boundary strains small-deflection assumption');
  }
  close(architectureModel({depth:.4}).deflection/architectureModel({depth:.2}).deflection,1/8);
  close(architectureModel({width:.4}).deflection/architectureModel({width:.2}).deflection,1/2);
});

test('year-end savings recurrence matches a separate geometric-series calculation',()=>{
  for(const years of [0,1,10,30])for(const rate of [0,.25,5,10])for(const contribution of [0,200,1000]){
    const m=financeModel({years,rate,contribution,inflation:2}),r=rate/100;
    const expected=1000*(1+r)**years+contribution*(r?((1+r)**years-1)/r:years);
    close(m.balance,expected);
    close(m.contributed,1000+years*contribution);
    close(m.history.at(-1).real,m.purchasingPower);
    close(m.purchasingPower,m.balance/1.02**years);
  }
  close(financeModel({years:1,rate:10,contribution:200}).balance,1300);
  close(financeModel({inflation:0}).purchasingPower,financeModel().balance);
});

test('draft normalization retains only bounded controls, known stages and1200-character notes',()=>{
  const f=field('physics');
  const d=normalizePurposeDraft(f,{stage:100,controls:{time:Infinity,speed:999,acceleration:-10,mass:.63,secret:42},predictions:{distance:'a'.repeat(2000),invented:'ignored'}});
  assert.equal(d.version,1);assert.equal(d.stage,3);
  assert.deepEqual(Object.keys(d.controls),Object.keys(f.controls));
  assert.equal(d.controls.time,4);assert.equal(d.controls.speed,12);assert.equal(d.controls.acceleration,0);assert.equal(d.controls.mass,.5);
  assert.equal(d.predictions.distance.length,1200);assert.equal(d.predictions.invented,undefined);
  assert.deepEqual(normalizePurposeDraft(f,null).controls,PURPOSE_DEFAULTS.physics);
});

test('every stage and control boundary generates finite, accessible, bounded SVG',()=>{
  const ids=new Set();
  for(const f of content.fields.filter(f=>f.kind==='model')){
    const base=normalizePurposeDraft(f).controls,variants=[base];
    for(const [key,spec] of Object.entries(f.controls))for(const value of [spec.min,spec.max])variants.push({...base,[key]:value});
    variants.push(Object.fromEntries(Object.entries(f.controls).map(([k,s])=>[k,s.min])));
    variants.push(Object.fromEntries(Object.entries(f.controls).map(([k,s])=>[k,s.max])));
    for(const s of f.stages)for(const controls of variants){
      const output=purposeResult(f.id,s.id,controls);assert.ok(Number.isFinite(output.value));
      const markup=purposeFigure(f.id,s.id,controls,s.headline);
      assert.doesNotMatch(markup,/NaN|Infinity|undefined|<script|\son[a-z]+="/);
      assert.match(markup,/role="img"/);assert.match(markup,/viewBox="0 0 640 320"/);
      const title=markup.match(/<title id="([^"]+)"/)[1];assert.ok(!ids.has(title));ids.add(title);
      for(const m of markup.matchAll(/<rect[^>]+width="([^"]+)" height="([^"]+)"/g)){
        assert.ok(Number(m[1])>=0&&Number(m[2])>=0,f.id+':'+s.id);
      }
    }
  }
  const hostile=purposeFigure('physics','distance',{},'<script>bad</script>');
  assert.ok(hostile.includes('&lt;script&gt;bad&lt;/script&gt;'));assert.ok(!hostile.includes('<script>'));
});

test('directory offers every new field and AI through its existing route',()=>{
  const html=purposeDirectoryCards();
  for(const f of content.fields)assert.ok(html.includes('href="'+f.href+'"'),f.id);
  assert.equal((html.match(/class="purpose-card purpose-/g)||[]).length,6);
  assert.ok(!html.includes('#studio/'));
});

test('invalid physical domains fail explicitly instead of returning spurious values',()=>{
  assert.throws(()=>electricalModel({resistance:0}),RangeError);
  assert.throws(()=>mechanicalModel({drivenTeeth:12.5}),RangeError);
  assert.throws(()=>architectureModel({depth:0}),RangeError);
  assert.throws(()=>physicsModel({mass:0}),RangeError);
  assert.throws(()=>financeModel({years:1.5}),RangeError);
  assert.throws(()=>purposeResult('invented','anything'),RangeError);
});

test('stage models wait for support and stale profile contexts cannot reveal them',async()=>{
  const host={innerHTML:'',isConnected:true,querySelector:()=>null};
  let ctx={profile_id:'A',independentCheck:false},resolveSupport,called=0;
  const dispose=mountPurposePaths(host,{fieldId:'physics',content,getContext:()=>ctx,
    onSupport:()=>{called++;return new Promise(r=>{resolveSupport=r;});}});
  await Promise.resolve();
  assert.equal(called,1);assert.ok(host.innerHTML.includes('Opening Distance'));
  assert.ok(!host.innerHTML.includes('purpose-live'));
  ctx={profile_id:'B',independentCheck:true};resolveSupport();await Promise.resolve();await Promise.resolve();
  assert.ok(!host.innerHTML.includes('purpose-live'));
  dispose();
});

test('dispose flushes a bounded snapshot even while support is pending',async()=>{
  const host={innerHTML:'',isConnected:true,querySelector:()=>null};const saves=[];
  const dispose=mountPurposePaths(host,{fieldId:'physics',content,onSupport:()=>new Promise(()=>{}),
    initialDraft:{stage:1,controls:{time:4,speed:3,acceleration:2,mass:2},predictions:{velocity:'My explanation'}},
    onDraft:(d,opts)=>saves.push({d,opts})});
  dispose();await Promise.resolve();await Promise.resolve();
  assert.equal(saves.length,1);assert.equal(saves[0].opts.flush,true);
  assert.equal(saves[0].d.controls.acceleration,2);assert.equal(saves[0].d.predictions.velocity,'My explanation');
});
