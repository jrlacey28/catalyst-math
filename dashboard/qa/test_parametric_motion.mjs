import test from 'node:test';
import assert from 'node:assert/strict';
import {ellipsePosition,ellipseScene,coordinateAnswer} from '../parametric-motion.js';
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);
test('an eight-second clock visits right, top, left, bottom, then right',()=>{
 [[0,4,0],[2,0,2],[4,-4,0],[6,0,-2],[8,4,0]].forEach(([seconds,x,y])=>{
  const p=ellipsePosition({a:4,b:2,seconds});close(p.x,x);close(p.y,y);
 });
});
test('stretching preserves the ellipse equation at every sampled time',()=>{
 for(const a of [1,3,7])for(const b of [1,2.5,4])for(let seconds=0;seconds<=8;seconds+=.1){
  const p=ellipsePosition({a,b,seconds});close(p.x**2/a**2+p.y**2/b**2,1);
 }
});
test('prediction places the submitted coordinate and refuses variables or invalid numbers',()=>{
 close(coordinateAnswer('-8/2'),-4);close(coordinateAnswer('-sqrt(16)'),-4);
 for(const bad of ['','x','1/0','sqrt(-1)','100000000','alert(1)'])assert.throws(()=>coordinateAnswer(bad));
 const s=ellipseScene({a:4,b:2,seconds:4,answer:2,challenge:true});
 assert.match(s,/predicted x is 2/);assert.match(s,/cx="342"/);assert.match(s,/cx="156"/);
 assert.doesNotMatch(ellipseScene({challenge:true,seconds:4}),/Dot at x/);
});
test('geometric examples remain finite and malformed axes are rejected',()=>{
 for(const seconds of [0,.1,2,4,6,8])assert.doesNotMatch(ellipseScene({seconds}),/NaN|Infinity|undefined/);
 assert.throws(()=>ellipsePosition({a:0}));assert.throws(()=>ellipsePosition({b:-1}));assert.throws(()=>ellipsePosition({period:0}));
});
