// Save drafts only. Submitting, grading and changing learners remain explicit actions.
const DRAFT_PATHS = new Set([
  'draft', 'homework', 'topic/draft', 'topic/homework', 'topic/video',
  'topic/writing', 'topic/reflection', 'topic/mission', 'studio/draft', 'studio/save',
  'review/draft', 'learning/notes', 'learning/project', 'learning/mission-design',
  'learning/ai', 'learning/purpose'
]);
// These editors own a revision handshake and perform their own safe retry.
const MANAGED_PATHS=new Set(['placement/draft','feedback/save']);
export const isDraftSave = (path, data) => data !== undefined && (DRAFT_PATHS.has(path)||MANAGED_PATHS.has(path));
const keyFor = (path, data, profile) => JSON.stringify([profile,path,data.session_id,
  data.lesson_id,data.topic_id,data.project_id,data.field_id,data.kind,data.id,data.question_id]);

export function createAutosave({clock=()=>Date.now(),interval=60000}={}) {
  const flushers=new Set(),writes=new Map();
  let target,doc,timer,getProfile=()=>null,onStatus=()=>{},lastSaved=null,sequence=0;
  function status() {
    const current=[...writes.values()].filter(w=>w.profile===getProfile());
    const failed=current.find(w=>w.error),pending=current.some(w=>w.pending);
    onStatus({state:failed?'error':pending?'saving':lastSaved?.profile===getProfile()?'saved':'ready',
      savedAt:lastSaved?.profile===getProfile()?lastSaved.at:null,error:failed?.error?.message||''});
  }
  function register(flush){flushers.add(flush);return()=>flushers.delete(flush);}
  function send(entry) {
    entry.pending=true;entry.error=null;status();
    let result;try{result=entry.send(entry.data,entry.profile);}catch(error){result=Promise.reject(error);}
    const promise=Promise.resolve(result).then(value=>{
      if(writes.get(entry.key)===entry){writes.delete(entry.key);lastSaved={profile:entry.profile,at:clock()};}
      return value;
    },error=>{entry.error=error;throw error;}).finally(()=>{entry.pending=false;status();});
    entry.promise=promise;return promise;
  }
  function track(path,data,profile,request) {
    if(!isDraftSave(path,data))return Promise.resolve(request(data,profile)).then(value=>{
      if(['submit','topic/submit','review/submit','studio/submit','placement/answer'].includes(path)){
        for(const [key,entry] of writes)if(entry.profile===profile&&entry.data.session_id===data?.session_id)writes.delete(key);
        status();
      }
      return value;
    });
    const key=keyFor(path,data,profile),entry={key,profile,data:structuredClone(data),send:request,
      serial:++sequence,pending:false,error:null,retry:DRAFT_PATHS.has(path)};
    writes.set(key,entry);return send(entry);
  }
  function flush(reason='interval') {
    // Call synchronously so pagehide can start keepalive requests immediately.
    const tasks=[];
    for(const callback of [...flushers]){
      try{tasks.push(Promise.resolve(callback(reason)));}catch(error){tasks.push(Promise.reject(error));}
    }
    for(const entry of writes.values()){
      if(entry.pending||entry.profile!==getProfile()||!entry.error)continue;
      if(!entry.retry)continue;
      // Conflicts and invalid input require a learner decision, never a forced overwrite.
      if(entry.error.status>=400&&entry.error.status<500)continue;
      tasks.push(send(entry));
    }
    return Promise.allSettled(tasks).then(result=>{status();return result;});
  }
  const hide=()=>{if(doc?.visibilityState==='hidden')void flush('hidden');};
  const leave=()=>{void flush('pagehide');};
  const online=()=>{void flush('online');};
  function stop(){if(timer!==undefined)target?.clearInterval(timer);timer=undefined;
    doc?.removeEventListener('visibilitychange',hide);target?.removeEventListener('pagehide',leave);target?.removeEventListener('online',online);}
  function start({window:win=globalThis.window,document:documentRef=globalThis.document,
    profile=()=>null,report=()=>{}}={}) {
    stop();target=win;doc=documentRef;getProfile=profile;onStatus=report;
    timer=target?.setInterval(()=>{void flush('interval');},interval);
    doc?.addEventListener('visibilitychange',hide);target?.addEventListener('pagehide',leave);target?.addEventListener('online',online);status();
    return stop;
  }
  return {start,stop,register,track,flush,status};
}
export const autosave=createAutosave();
