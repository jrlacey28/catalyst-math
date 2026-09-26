import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {BODIES,orbitElements,orbitState,orbitModel,lunarDistancePreset,rocketModel,
  supplyModel,signalModel,cameraModel,solarEnergy,energyModel,networkModel} from '../mission-math.js';
import {relatedMission,mountMission} from '../lesson-missions.js';

const near=(actual,expected,tolerance=1e-9)=>assert.ok(Math.abs(actual-expected)<=tolerance*Math.max(1,Math.abs(expected)),actual+' is not within '+tolerance+' of '+expected);
const catalog=JSON.parse(await readFile(new URL('../curriculum_catalog.json',import.meta.url),'utf8'));
const content=JSON.parse(await readFile(new URL('../mission-content.json',import.meta.url),'utf8'));

test('UI: related mission metadata uses the actual topic and honest extension flag',()=>{
  const m=relatedMission('arithmetic.roots',content);
  assert.equal(m.modelId,'orbit');
  assert.equal(m.topic_id,'arithmetic.roots');
  assert.equal(m.extension,false);
  assert.equal(relatedMission('not-a-topic',content),null);
});

test('UI: pending public content cannot redraw a disposed lesson',async()=>{
  let deliver,calls=[];
  const response=new Promise(resolve=>{deliver=resolve;});
  const container={innerHTML:'',replaceChildren(){this.innerHTML='';}};
  const dispose=mountMission(container,{topicId:'arithmetic.roots',api:path=>{calls.push(path);return response;}});
  assert.equal(typeof dispose,'function');
  dispose();container.innerHTML='Another route';
  deliver(content);await response;await new Promise(resolve=>setTimeout(resolve,0));
  assert.equal(container.innerHTML,'Another route');
  assert.deepEqual(calls,['missions']);
});

test('UI: prediction opens first while exploration and calculation wait, with honest scratch notes',()=>{
  const nodes=new Map();
  const container={
    innerHTML:'',
    querySelector(selector){
      if(!nodes.has(selector))nodes.set(selector,{open:false,addEventListener(){},textContent:''});
      return nodes.get(selector);
    },
    querySelectorAll(){return[];},
    replaceChildren(){this.innerHTML='';},
  };
  let requests=0,support=0;
  const dispose=mountMission(container,{topicId:'arithmetic.roots',content,
    api:()=>{requests++;throw new Error('No request expected');},onSupport:()=>{support++;}});
  assert.equal(requests,0);assert.equal(support,0);
  assert.match(container.innerHTML,/<svg/);
  assert.match(container.innerHTML,/data-stage="1" hidden/);
  assert.match(container.innerHTML,/data-stage="2" hidden/);
  assert.doesNotMatch(container.innerHTML,/<details[^>]*data-calculation-detail[^>]* open/);
  assert.equal(nodes.get('[data-stage-heading]').textContent,'Make a prediction');
  assert.equal(nodes.has('[data-model-host]'),false,'The full model is not mounted during prediction');
  assert.equal(nodes.has('[data-calculation-host]'),false,'Optional calculation is not mounted during prediction');
  assert.match(container.innerHTML,/scratch notes stay here until you leave/);
  assert.match(container.innerHTML,/Use the separate lesson check to earn a star/);
  assert.match(container.innerHTML,/My prediction/);
  dispose();assert.equal(container.innerHTML,'');
});

test('content: every actual topic has one distinct, complete authored mission',()=>{
  const topics=new Map(catalog.courses.flatMap(c=>c.topics.map(t=>[t.id,{...t,course_id:c.id}])));
  assert.equal(topics.size,159);
  assert.equal(content.missions.length,159);
  assert.equal(new Set(content.missions.map(m=>m.topic_id)).size,159);
  assert.equal(new Set(content.missions.map(m=>m.title)).size,159);
  const models=new Set(content.models.map(m=>m.id)),sources=new Set(content.sources.map(s=>s.id));
  assert.deepEqual([...models].sort(),['camera','energy','network','orbit','rocket','signal','supply']);
  for(const source of content.sources)assert.equal(new URL(source.url).protocol,'https:');
  for(const model of content.models) {
    assert.ok(model.assumptions.length>=3,model.id);
    for(const id of model.prerequisite_ids)assert.ok(topics.has(id),id);
    for(const id of model.source_ids)assert.ok(sources.has(id),id);
  }
  for(const m of content.missions) {
    assert.ok(topics.has(m.topic_id),m.topic_id);
    assert.equal(m.course_id,topics.get(m.topic_id).course_id);
    assert.equal(m.topic_title,topics.get(m.topic_id).title);
    assert.deepEqual(m.prerequisite_ids,topics.get(m.topic_id).prerequisites);
    assert.ok(models.has(m.model_id),m.topic_id);
    assert.equal(typeof m.extension,'boolean');
    for(const field of ['title','brief','connection','prediction','manipulate','decision','clue'])assert.ok(typeof m[field]==='string'&&m[field].trim().length>=12,m.topic_id+': '+field);
    for(const id of m.prerequisite_ids)assert.ok(topics.has(id)&&id!==m.topic_id,m.topic_id+': '+id);
  }
});

test('orbit: circular initial states close and preserve speed in both coordinate models',()=>{
  for(const body of ['moon','earth-moon'])for(const altitudeKm of body==='moon'?[10,100,1000,20000]:[2000,100000,600000]){
    const primary=BODIES[body],r=primary.radiusKm+altitudeKm,v=Math.sqrt(primary.mu/r);
    const e=orbitElements({body,altitudeKm,speedKmS:v});
    assert.equal(e.kind,'circular orbit');
    near(e.periodSeconds,2*Math.PI*r/v);
    for(const fraction of [0,.125,.25,.5,.75,1]){
      const s=orbitState(e,e.periodSeconds*fraction);
      near(s.radius,r,1e-11);near(s.speed,v,1e-11);
      near(s.x/r,Math.cos(2*Math.PI*fraction),1e-12);
      near(s.y/r,Math.sin(2*Math.PI*fraction),1e-12);
    }
  }
});

test('orbit: ellipse, parabola, hyperbola and first-contact paths obey invariants',()=>{
  let states=0;
  for(const body of ['moon','earth-moon'])for(const altitudeKm of body==='moon'?[20,100,3000]:[2000,356925.44,600000]){
    const primary=BODIES[body],r0=primary.radiusKm+altitudeKm,v0=Math.sqrt(primary.mu/r0);
    for(const factor of [.25,.7,1,1.15,Math.SQRT2*(1-1e-9),Math.SQRT2,Math.SQRT2*(1+1e-9),1.8]){
      const e=orbitElements({body,altitudeKm,speedKmS:v0*factor});
      const start=orbitState(e,0);near(start.x,e.r0,1e-10);near(start.y,0,1e-8);near(start.vy,e.speedKmS,1e-10);
      for(const fraction of [0,.01,.1,.4,.7,1]){
        const s=orbitState(e,e.horizonSeconds*fraction);
        assert.ok([s.x,s.y,s.vx,s.vy,s.ax,s.ay].every(Number.isFinite));
        near((s.vx*s.vx+s.vy*s.vy)/2-e.mu/s.radius,e.energy,1e-7);
        near(s.x*s.vy-s.y*s.vx,e.angularMomentum,1e-7);
        assert.ok(s.radius>=primary.contactKm-1e-5,'Never draw a physical path through the body');
        states++;
      }
      if(e.collision){near(orbitState(e,e.horizonSeconds+100).radius,primary.contactKm,1e-9);assert.equal(orbitState(e,e.horizonSeconds+100).impact,true);}
      if(factor===Math.SQRT2){assert.equal(e.kind,'parabolic escape');assert.equal(e.periodSeconds,null);}
    }
  }
  assert.equal(states,288);
});

test('orbit: analytic time states match an independently integrated Newton equation',()=>{
  function integrate(mu,initial,total,steps){
    let s=[...initial];const h=total/steps;
    const derivative=([x,y,vx,vy])=>{const r=Math.hypot(x,y);return[vx,vy,-mu*x/r**3,-mu*y/r**3];};
    const add=(a,b,k)=>a.map((x,i)=>x+k*b[i]);
    for(let i=0;i<steps;i++){
      const a=derivative(s),b=derivative(add(s,a,h/2)),c=derivative(add(s,b,h/2)),d=derivative(add(s,c,h));
      s=s.map((x,j)=>x+h*(a[j]+2*b[j]+2*c[j]+d[j])/6);
    }
    return s;
  }
  for(const speedKmS of [1.4,1.7,2.4,3.2]){
    const e=orbitElements({altitudeKm:1000,speedKmS}),time=Math.min(600,e.horizonSeconds/3);
    const computed=orbitState(e,time),numerical=integrate(e.mu,[e.r0,0,0,e.speedKmS],time,4000);
    [computed.x,computed.y,computed.vx,computed.vy].forEach((x,i)=>near(x,numerical[i],1e-9));
  }
});

test('orbit: lunar-distance preset has correct geometry and an idealized monthly period',()=>{
  const e=orbitElements(lunarDistancePreset());
  near(e.a,384400,1e-12);near(e.eccentricity,.0549,1e-12);
  assert.ok(e.periodSeconds/86400>27&&e.periodSeconds/86400<28);
  assert.equal(e.mu,BODIES.moon.mu+398600.435507);
  const view=orbitModel({...lunarDistancePreset(),progress:50});
  near(view.current.radius,e.apoapsisKm,1e-10);
  assert.ok(view.current.speed<e.speedKmS);
});

test('rocket: mass conservation, monotonicity and independently integrated distance',()=>{
  for(const dryMass of [500,2000,10000])for(const propellant of [0,1000,20000])for(const flow of [5,100,500])for(const exhaust of [1000,3000,4500])for(const progress of [0,25,75,100]){
    const r=rocketModel({dryMass,propellant,flow,exhaust,progress}),s=r.current;
    near(s.mass+flow*s.seconds,dryMass+propellant);
    near(s.velocity,exhaust*Math.log((dryMass+propellant)/s.mass),1e-12);
    assert.ok(s.mass>=dryMass&&s.distance>=0&&s.velocity>=0);
    // Simpson quadrature samples velocity rather than the implemented distance formula.
    const n=2000,h=s.seconds/n;
    const velocity=t=>exhaust*Math.log((dryMass+propellant)/(dryMass+propellant-flow*t));
    let integral=velocity(0)+velocity(s.seconds);
    for(let i=1;i<n;i++)integral+=(i%2?4:2)*velocity(i*h);
    near(s.distance,integral*h/3,2e-7);
    for(let i=1;i<r.points.length;i++)assert.ok(r.points[i].velocity>=r.points[i-1].velocity-1e-10);
  }
  const one=rocketModel({dryMass:1000,propellant:3000}),two=rocketModel({dryMass:2000,propellant:6000});
  near(one.deltaV,two.deltaV);near(two.burnSeconds,2*one.burnSeconds);
});

test('supply: whole containers cover the required amount without a redundant tank',()=>{
  for(let crew=1;crew<=8;crew++)for(let days=1;days<=14;days++)for(const perPerson of [.5,.75,1.25,2.5,4]){
    const r=supplyModel({crew,days,perPerson});
    near(r.total,crew*days*perPerson);assert.ok(r.tanks*5>=r.total);
    assert.ok((r.tanks-1)*5<r.total);
    near(r.unusedCapacity,r.tanks*5-r.total);
  }
});

test('signal: harmonic RMS matches numerical quadrature and cancellation is global',()=>{
  for(const harmonic of [1,2,3,6])for(const mix of [0,.3,1])for(const phase of [0,90,180,270]){
    const r=signalModel({frequency:220,harmonic,mix,phase}),n=8192;
    let sum=0;for(let i=0;i<n;i++)sum+=r.sample((i+.5)/n/r.frequency).y**2;
    near(r.rms,Math.sqrt(sum/n),1e-11);
  }
  const quiet=signalModel({harmonic:1,mix:1,phase:180});
  for(const p of quiet.points)near(p.y,0,1e-12);
  near(quiet.rms,0,1e-12);
});

test('camera: determinant agrees with polygon area and translation preserves displacement',()=>{
  const area=points=>Math.abs(points.reduce((s,p,i)=>{const q=points[(i+1)%points.length];return s+p[0]*q[1]-p[1]*q[0];},0))/2;
  for(const angle of [-180,-30,0,90,135])for(const sx of [-2,0,.5,2])for(const sy of [-1,0,1.5]){
    const r=cameraModel({angle,sx,sy,pan:1.5});
    near(area(r.image),area(r.ship)*Math.abs(sx*sy),1e-11);
    near(r.matrix[0][0]*r.matrix[1][1]-r.matrix[0][1]*r.matrix[1][0],sx*sy);
    near(r.origin[0],1.5);near(r.origin[1],0);
  }
  const r=cameraModel({angle:90,sx:1,sy:1,pan:0});near(r.transform([1,2])[0],-2);near(r.transform([1,2])[1],1);
});

test('energy: dispatch conserves energy and cannot serve past demand retrospectively',()=>{
  for(const peak of [0,2,4,10])for(const capacity of [0,2,12,24])for(const load of [0,.5,1,3]){
    const r=energyModel({peak,capacity,load});
    near(r.produced,24*peak/Math.PI);
    near(r.initial+r.produced,r.served+r.stored+r.spill,1e-10);
    near(r.demand,r.served+r.unserved);
    assert.ok(r.stored>=0&&r.stored<=capacity&&r.spill>=-1e-10&&r.unserved>=-1e-10);
    assert.ok(r.points.every(p=>p.stored>=0&&p.stored<=capacity));
  }
  near(solarEnergy(4,0,6),0);near(solarEnergy(4,18,24),0);
  const noBattery=energyModel({peak:10,capacity:0,load:1});
  assert.ok(noBattery.unserved>=12,'No storage must leave all night demand unserved');
  assert.ok(noBattery.produced>noBattery.demand,'A daily energy surplus is insufficient by itself');
});

test('network: route enumeration agrees with independent Floyd–Warshall distance',()=>{
  const ids=['A','B','C','D','E'];
  for(const ridge of [1,4,9,15])for(const crater of [1,6,15])for(const failure of [0,10,40]){
    const r=networkModel({ridge,crater,failure,packets:20});
    const dist=ids.map((_,i)=>ids.map((_,j)=>i===j?0:Infinity));
    for(const [a,b,w] of r.edges){const i=ids.indexOf(a),j=ids.indexOf(b);dist[i][j]=dist[j][i]=w;}
    for(let k=0;k<5;k++)for(let i=0;i<5;i++)for(let j=0;j<5;j++)dist[i][j]=Math.min(dist[i][j],dist[i][k]+dist[k][j]);
    near(r.best.cost,dist[0][4]);
    for(const route of r.routes){
      assert.equal(new Set(route.nodes).size,route.nodes.length);
      near(route.reliability,(1-failure/100)**(route.nodes.length-1));
      near(route.expected,20*route.reliability);
    }
  }
});

test('models: malformed numeric inputs are bounded and finite',()=>{
  const orbit=orbitModel({altitudeKm:NaN,speedKmS:Infinity,progress:-500});
  assert.ok(orbit.points.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.speed)));
  assert.equal(rocketModel({dryMass:0}).dryMass,500);
  assert.equal(supplyModel({crew:-8}).crew,1);
  assert.equal(signalModel({frequency:0}).frequency,80);
  assert.equal(cameraModel({angle:Infinity}).angle,30);
  assert.equal(energyModel({capacity:-1}).capacity,0);
});
