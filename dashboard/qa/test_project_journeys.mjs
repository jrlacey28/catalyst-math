import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {projectDesign} from '../project-journeys.js';
import {draftSaver} from '../learning-path.js';

const number=value=>Number(value.replace(/[^0-9.\-]/g,''));
test('water budget determines the actual rocket dry mass',()=>{
  const small=projectDesign('lunar-expedition',{supply:{crew:2,days:3,perPerson:2}});
  // 12 L needs 3 full 5 L tanks; each includes 5 kg water and 2 kg shell.
  assert.equal(small.locked.rocket.dryMass,2021);
  const larger=projectDesign('lunar-expedition',{supply:{crew:8,days:14,perPerson:4}});
  assert.equal(larger.locked.rocket.dryMass,2630);
  assert.ok(number(larger.rows[3][1])<number(small.rows[3][1]));
  assert.ok(Math.abs(number(small.rows[3][1])-3000*Math.log((2021+6000)/2021))<.01);
});
test('solar cost and singular game transforms are meaningful design choices',()=>{
  const solar=projectDesign('solar-event',{energy:{peak:3,capacity:10,load:1}});
  assert.equal(number(solar.rows[2][1]),4400);
  assert.equal(projectDesign('game-world',{camera:{sx:0,sy:1}}).rows[1][1],'No');
  assert.equal(projectDesign('game-world',{camera:{sx:-2,sy:1}}).rows[1][1],'Yes');
  const tone=projectDesign('sound-studio',{signal:{frequency:100,harmonic:2,mix:0}});
  assert.equal(number(tone.rows[0][1]),10);
  assert.ok(Math.abs(number(tone.rows[1][1])-Math.sqrt(.5))<.001);
});
test('project stages use actual topics and explained modeling limits',async()=>{
  const [catalog,content,missions]=await Promise.all(['curriculum_catalog.json','project-journeys.json','mission-content.json'].map(name=>readFile(new URL('../'+name,import.meta.url),'utf8').then(JSON.parse)));
  const topics=new Set(catalog.courses.flatMap(c=>c.topics.map(t=>t.id))),models=new Set(missions.models.map(m=>m.id));
  assert.equal(content.projects.length,4);assert.equal(content.projects.flatMap(p=>p.stages).length,18);
  for(const p of content.projects){assert.ok(p.assumptions.length>100);for(const stage of p.stages){assert.ok(topics.has(stage.topic_id));assert.ok(models.has(stage.model_id));}}
  const lunar=content.projects.find(p=>p.id==='lunar-expedition');assert.match(lunar.assumptions,/transfer|trajectory/i);
});
test('draft snapshots stay ordered and bound after editing or leaving',async()=>{
  const calls=[],releases=[];
  const saver=draftSaver({profile:'learner-a',path:'learning/project',base:{project_id:'lunar-expedition'},api:(path,data,profile)=>{calls.push({path,data,profile});return new Promise(resolve=>releases.push(resolve));}});
  const first={draft:{stage:1,responses:{pack:'before'}}};saver.write(first);const pending1=saver.flush();await new Promise(resolve=>setImmediate(resolve));
  first.draft.responses.pack='mutated outside saver';saver.write({draft:{stage:2}});const pending2=saver.flush();
  assert.equal(calls.length,1);assert.equal(calls[0].data.draft.responses.pack,'before');
  releases.shift()({saved:true});await pending1;await new Promise(resolve=>setImmediate(resolve));
  assert.equal(calls.length,2);assert.equal(calls[1].profile,'learner-a');assert.ok(calls[1].data.revision>calls[0].data.revision);
  releases.shift()({saved:true});await pending2;
});
test('an explicit later save can recover after a failed write',async()=>{
  let count=0;const errors=[],saver=draftSaver({profile:'p',path:'learning/notes',onError:e=>errors.push(e.message),api:async()=>{if(++count===1)throw Error('offline');return {saved:true};}});
  saver.write({draft:{stage:0}});await assert.rejects(saver.flush(),/offline/);
  saver.write({draft:{stage:1}});await saver.flush();assert.equal(count,2);assert.ok(errors.includes('offline'));
});
