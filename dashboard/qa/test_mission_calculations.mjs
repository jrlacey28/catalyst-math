import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createCalculation,evaluateCalculation,renderCalculationScene} from '../mission-calculations.js';
const task=(modelId,controls={})=>createCalculation({modelId,controls});
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} differs from ${b}`);
const orbit=createCalculation({modelId:'orbit',topicId:'arithmetic.exponents',factor:4});
near(orbit.expected,8);assert.equal(evaluateCalculation(orbit,'4').close,false);assert.equal(evaluateCalculation(orbit,'sqrt(4^3)').close,true);
near(createCalculation({modelId:'orbit',topicId:'arithmetic.exponents',factor:1}).expected,1);
const r=task('orbit');near(r.expected,Math.sqrt(4902.800118/1837.4));
assert.match(evaluateCalculation(r,String(r.expected*.7)).physical.kind,/surface/);
assert.match(evaluateCalculation(r,String(r.expected*1.5)).physical.kind,/escape/);
const water=task('supply',{crew:3,days:3,perPerson:2.5});near(water.expected,5);assert.match(evaluateCalculation(water,'4').meaning,/2.5 L short/);
assert.throws(()=>evaluateCalculation(water,'4.5'),/whole/);
const rocket=task('rocket',{propellant:6000,flow:100});near(rocket.expected,60);assert.match(evaluateCalculation(rocket,'61').meaning,/100 kg more/);
const wave=task('signal',{frequency:250});near(wave.expected,4);assert.match(evaluateCalculation(wave,'8').meaning,/125 Hz/);
near(task('camera',{angle:90,sx:2,sy:1,pan:1.5}).expected,1.5);
near(task('energy',{peak:4}).expected,96/Math.PI);near(task('energy',{peak:0}).expected,0);
near(task('network').expected,10);near(task('network',{ridge:15,crater:1}).expected,8);
for(const bad of ['x','sqrt(-1)','1/0','999999999','globalThis.fetch(1)'])assert.throws(()=>evaluateCalculation(wave,bad));
for(const bad of ['0','-3'])assert.throws(()=>evaluateCalculation(orbit,bad));
assert.throws(()=>evaluateCalculation(r,'0'),/not been changed/);
const content=JSON.parse(readFileSync(new URL('../mission-content.json',import.meta.url),'utf8'));
assert.equal(content.missions.length,159);
for(const m of content.missions){const t=createCalculation({topicId:m.topic_id,modelId:m.model_id});assert.ok(Number.isFinite(t.expected));for(const out of [null,evaluateCalculation(t,String(t.expected))]){const html=renderCalculationScene(t,out);assert.match(html,/<svg/);assert.doesNotMatch(html,/NaN|Infinity|undefined/);}}
for(const name of ['supply','rocket','signal','camera','energy','network']){const t=task(name);const n=name==='camera'?-999999:999999;assert.doesNotMatch(renderCalculationScene(t,evaluateCalculation(t,String(n))),/NaN|Infinity/);}
console.log('Mission calculations: independent values, physical consequences, input bounds and all 159 scenes passed.');
