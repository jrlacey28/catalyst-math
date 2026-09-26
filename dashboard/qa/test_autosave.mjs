import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createAutosave,autosave,isDraftSave} from '../autosave.js';
import {draftSaver} from '../learning-path.js';

class Surface extends EventTarget {
  visibilityState='visible'; interval=null;
  setInterval(callback,ms){this.interval={callback,ms};return 1;}
  clearInterval(){this.interval=null;}
}
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function fixture(){
  let profile='first',state;
  const win=new Surface(),doc=new Surface(),save=createAutosave({clock:()=>1234});
  save.start({window:win,document:doc,profile:()=>profile,report:value=>state=value});
  return {save,win,doc,get state(){return state;},select:value=>{profile=value;save.status();}};
}

test('one minute and hidden/pagehide flush; visible does not; listeners clean up',async()=>{
  const f=fixture(),reasons=[];const unregister=f.save.register(reason=>reasons.push(reason));
  assert.equal(f.win.interval.ms,60000);f.win.interval.callback();await tick();
  f.doc.dispatchEvent(new Event('visibilitychange'));assert.deepEqual(reasons,['interval']);
  f.doc.visibilityState='hidden';f.doc.dispatchEvent(new Event('visibilitychange'));
  f.win.dispatchEvent(new Event('pagehide'));assert.deepEqual(reasons,['interval','hidden','pagehide']);
  unregister();await f.save.flush();assert.equal(reasons.length,3);
  f.save.stop();assert.equal(f.win.interval,null);
});

test('a failed save is retried on the minute and is not marked saved before confirmation',async()=>{
  const f=fixture();let calls=0,complete;
  const request=()=>{calls++;return calls===1?Promise.reject(new Error('Offline')):new Promise(resolve=>complete=resolve);};
  await assert.rejects(f.save.track('topic/draft',{session_id:'s',answers:{a:'12'},revision:2},'first',request));
  assert.equal(f.state.state,'error');assert.equal(f.state.savedAt,null);
  const pending=f.save.flush();assert.equal(calls,2);assert.equal(f.state.state,'saving');
  complete({saved:true});await pending;assert.equal(f.state.state,'saved');assert.equal(f.state.savedAt,1234);
  await f.save.flush();assert.equal(calls,2,'confirmed work is not rewritten each minute');
});

test('only the newest failed draft can be retried, including out-of-order responses',async()=>{
  const f=fixture();let rejectOld;const calls=[];
  const old=f.save.track('homework',{lesson_id:'l',revision:1,answers:{a:'old'}},'first',()=>new Promise((_,reject)=>rejectOld=reject));
  await f.save.track('homework',{lesson_id:'l',revision:2,answers:{a:'new'}},'first',async data=>{calls.push(data);return {saved:true};});
  rejectOld(new Error('old failed late'));await assert.rejects(old);await f.save.flush();
  assert.deepEqual(calls.map(c=>c.answers.a),['new']);assert.equal(f.state.state,'saved');
});

test('capture immutable drafts, never send them as another learner, preserve explicit conflicts',async()=>{
  const f=fixture(),data={topic_id:'t',text:'original',revision:3};let count=0;
  await assert.rejects(f.save.track('topic/reflection',data,'first',async(snapshot,profile)=>{
    count++;assert.equal(profile,'first');assert.equal(snapshot.text,'original');if(count===1)throw new Error('Offline');return {saved:true};
  }));data.text='mutated';f.select('second');await f.save.flush();assert.equal(count,1);
  f.select('first');await f.save.flush();assert.equal(count,2);
  let conflicts=0;await assert.rejects(f.save.track('topic/reflection',{topic_id:'t',text:'x',revision:4},'first',async()=>{conflicts++;throw Object.assign(new Error('Changed elsewhere'),{status:409});}));
  await f.save.flush();assert.equal(conflicts,1);assert.equal(f.state.state,'error');
});

test('autosave never replays submissions, profile changes or help requests',async()=>{
  const f=fixture();let calls=0;
  for(const path of ['submit','topic/submit','profiles/select','placement/answer','topic/help']){
    assert.equal(isDraftSave(path,{}),false);
    await assert.rejects(f.save.track(path,{},'first',async()=>{calls++;throw new Error('Offline');}));
  }
  await f.save.flush();assert.equal(calls,5);
});

test('explicit submission retires a previously failed draft for that session',async()=>{
  const f=fixture();let drafts=0;
  await assert.rejects(f.save.track('topic/draft',{session_id:'s',revision:1},'first',async()=>{drafts++;throw new Error('Offline');}));
  await f.save.track('topic/submit',{session_id:'s',answers:{a:'12'}},'first',async()=>({submitted:true}));
  await f.save.flush();assert.equal(drafts,1);assert.notEqual(f.state.state,'error');
});

test('revision-handshake editors report errors but keep control of their retries',async()=>{
  const f=fixture();let calls=0;
  await assert.rejects(f.save.track('feedback/save',{id:'review',base_revision:1},'first',async()=>{calls++;throw new Error('Offline');}));
  assert.equal(f.state.state,'error');await f.save.flush();assert.equal(calls,1);
  await f.save.track('feedback/save',{id:'review',base_revision:1},'first',async()=>({entry:{revision:2}}));
  assert.equal(f.state.state,'saved');
});

test('pagehide starts a pending debounced draft without waiting for an older response',async()=>{
  const sent=[];let completeOld;
  const saver=draftSaver({profile:'first',path:'learning/notes',base:{topic_id:'t',kind:'steps'},
    api:(_path,payload,profile)=>{sent.push({payload,profile});return sent.length===1?new Promise(resolve=>completeOld=resolve):Promise.resolve({saved:true});}});
  saver.write({draft:{lines:['old']}});const old=saver.flushImmediate();
  saver.write({draft:{lines:['latest']}});const leave=autosave.flush('pagehide');
  assert.equal(sent.length,2);assert.equal(sent[1].profile,'first');assert.deepEqual(sent[1].payload.draft.lines,['latest']);
  assert.ok(sent[1].payload.revision>sent[0].payload.revision);completeOld({saved:true});await old;await leave;
});
