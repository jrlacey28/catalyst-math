"""Local math studio. Serves only lesson assets and saves this learner's evidence."""
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from pathlib import Path
from urllib.parse import urlparse, unquote
from datetime import datetime, timezone, timedelta
from contextlib import contextmanager
from http.cookies import SimpleCookie
import argparse, json, mimetypes, os, random, re, threading, uuid
from question_bank import questions, public, grade
from profile_store import ProfileStore
import placement
import studio
import tutor_ai
import review
import feedback
import lesson_coach
import learning_support
import visual_learning
from answer_visuals import prepare_question, prepare_feedback, feedback_from_result

ROOT=Path(__file__).resolve().parents[1];APP=Path(__file__).resolve().parent
COURSE=ROOT/'courses/levels-4a-4b-5';CAT=json.loads((COURSE/'manifest.json').read_text(encoding='utf-8'))
LESSONS={l['id']:l for u in CAT['units'] for l in u['lessons']}
LOCK=threading.RLock();STATE_DIR=ROOT/'student';STATE=None;STORE=None
ROADMAP_FILE=APP/'curriculum_catalog.json'
ADVANCED_GUIDES_FILE=APP/'advanced_guides.json'
ROADMAP=None
VIDEO_CATALOG_FILE=APP/'video_catalog.json'
def video_catalog():
    return json.loads(VIDEO_CATALOG_FILE.read_text(encoding='utf-8')) if VIDEO_CATALOG_FILE.exists() else {'version':1,'lessons':[],'topic_count':159,'rendered_count':0}
def video_index():
    return {item['id']:item for item in video_catalog()['lessons']}
def public_tour():
    folder=ROOT/'videos/catalyst-tour'
    timing=folder/'timings.json'
    parts=json.loads(timing.read_text(encoding='utf-8')) if timing.is_file() else []
    return {'video_available':(folder/'final.mp4').is_file(),
            'duration':sum(p['duration'] for p in parts),
            'chapters':[{k:p[k] for k in ('title','text','start','duration')} for p in parts],
            'video_url':'/videos/catalyst-tour/final.mp4',
            'poster_url':'/videos/catalyst-tour/poster.jpg',
            'captions_url':'/videos/catalyst-tour/captions.vtt',
            'downloads':{name:(ROOT.parent/'releases'/('catalyst-'+name+'.zip')).is_file() for name in ('source','offline')}}
def public_videos():
    data=video_catalog()
    data['courses']=[{k:v for k,v in c.items() if k!='topics'} for c in roadmap()['courses']]
    for item in data['lessons']:
        folder=ROOT/item['video_path']
        item['video_available']=(folder/'final.mp4').is_file()
        item['transcript']=(folder/'narration.txt').read_text(encoding='utf-8') if (folder/'narration.txt').is_file() else ''
        for q in item.get('practice',[]):
            q.pop('answer',None);q['visual']=prepare_question(q,item['id'])
    return data
def visual_response(value):
    # Only released result objects have all four fields. Assessment prompts are
    # decorated by question_bank.public without their keys or explanations.
    if isinstance(value, list):return [visual_response(item) for item in value]
    if not isinstance(value, dict):return value
    result={key:visual_response(item) if key!='visual' else item for key,item in value.items()}
    if {'prompt','response','correct','answer'} <= result.keys() and 'visual' not in result:
        result['visual']=feedback_from_result(result, result.get('topic_id',''))
    return result

def now():return datetime.now(timezone.utc).isoformat()
def empty():return dict(version=2,lessons={},homework={},homework_revisions={},sessions={},events=[],bridge_passed=False,unit_tests={},topics={},topic_sessions={},preferences={},updated_at=now())
def normalize(state):
    for key in ('topics','topic_sessions','preferences','homework_revisions'):state.setdefault(key,{})
    return state
def save():
    STATE['updated_at']=now();p=STATE_DIR/'dashboard_progress.json';tmp=p.with_suffix('.tmp')
    tmp.write_text(json.dumps(STATE,indent=2,ensure_ascii=False)+'\n',encoding='utf-8');os.replace(tmp,p)
def record(kind,**values):STATE['events'].append(dict(type=kind,time=now(),**values))
def pause_checks_for_help(lid,include_mixed=True,include_learning=True):
    for session in STATE['sessions'].values():
        if session['mode'] in ('check','unit') and not session.get('submitted') and any(q['lesson_id']==lid for q in session['questions']):
            session['paused_for_help']=True;record('check_paused_for_help',session_id=session['id'],lesson_id=lid)
    for topic in topic_index().values():
        if topic.get('existing_lesson_id')==lid:pause_topic_checks(topic['id'],include_mixed,include_learning)
def unlocked(lid):
    if lid=='bridge':return True
    l=LESSONS[lid]
    return l['index']==1 or STATE['lessons'].get(f"{l['unit'].upper()}-{l['index']-1:02d}",{}).get('check_passed',False)
def progress():
    normalize(STATE)
    profile_id='original' if STATE_DIR==ROOT/'student' or (STORE and STATE_DIR==STORE.original_dir) else STATE_DIR.parent.name
    ps=placement.current(STATE)
    summary={'status':ps['status'],'answered':len(ps['responses']),'recommendation':(ps.get('result') or {}).get('recommendation')} if ps else {'status':'not_started'}
    return dict(profile_id=profile_id,placement=summary,lessons=STATE['lessons'],homework=STATE['homework'],homework_revisions=STATE['homework_revisions'],unit_tests=STATE['unit_tests'],bridge_passed=STATE['bridge_passed'],updated_at=STATE['updated_at'],unlocked={lid:unlocked(lid) for lid in LESSONS},learner=STATE_DIR.parent.name if STATE_DIR!=ROOT/'student' else 'Your workspace',topics=STATE['topics'],topic_sessions=[export_topic_session(s) for s in STATE['topic_sessions'].values() if not s.get('submitted')],preferences=STATE['preferences'])
def export_session(s):
    result=dict(id=s['id'],lesson_id=s['lesson_id'],mode=s['mode'],questions=[public(q) for q in s['questions']],answers=s.get('answers',{}),draft_revision=s.get('draft_revision',0),hints=s.get('hints',[]),submitted=s.get('submitted',False),result=s.get('result'),batch_size=3)
    return result
def start(lid,mode):
    if mode not in ('practice','check','unit'):raise ValueError('Unknown activity.')
    if mode=='practice':pause_checks_for_help(lid)
    if mode=='unit':
        unit=next((u for u in CAT['units'] if u['id']==lid),None)
        if not unit:raise ValueError('Unknown unit.')
        if not all(STATE['lessons'].get(l['id'],{}).get('check_passed') for l in unit['lessons']):raise ValueError('Complete the lesson checks before the unit test.')
    elif lid not in LESSONS and lid!='bridge':raise ValueError('Unknown lesson.')
    elif mode=='check' and not unlocked(lid):raise ValueError('Pass the preceding lesson check first.')
    elif mode=='check' and lid.startswith('5-') and not STATE['bridge_passed']:raise ValueError('Complete the foundation check before Algebra II checks.')
    for s in reversed(list(STATE['sessions'].values())):
        if s['lesson_id']==lid and s['mode']==mode and not s.get('submitted') and not s.get('paused_for_help'):return export_session(s)
    seed=random.SystemRandom().randint(1000,99999999);q=[]
    seen={item['prompt'] for old in STATE['sessions'].values() for item in old['questions']}
    seen.update(q['prompt'] for s in STATE.get('learning_support',{}).get('reviews',{}).values() for q in s['questions'])
    def fresh(slug,seed,count=3):
        selected=[]
        # Keep a mix of applications and concepts, selecting unused variants where available.
        indices=[0,1,2] if count==3 else [0,2]
        for index in indices:
            candidate=None
            for attempt in range(200):
                candidate=questions(slug,seed+attempt*997+index*71)[index]
                if candidate['prompt'] not in seen and all(candidate['prompt']!=x['prompt'] for x in selected):break
            candidate['previously_exposed']=candidate['prompt'] in seen or any(candidate['prompt']==x['prompt'] for x in selected)
            selected.append(candidate)
        return selected
    if mode=='unit':
        for l in unit['lessons']:
            items=fresh(l['slug'],seed+l['index'],2)
            for item in items:item['lesson_id']=l['id']
            q.extend(items)
    else:
        q=fresh('bridge' if lid=='bridge' else LESSONS[lid]['slug'],seed)
        for item in q:item['lesson_id']=lid
    # Already exposed items never acquire independent status merely because the seed changed.
    if mode!='practice' and any(item['previously_exposed'] for item in q):raise ValueError('The available fresh variations for this topic have been used. Bring your saved work to the tutor for a new independent check; repeating exposed answers would not measure readiness.')
    s=dict(id=uuid.uuid4().hex,lesson_id=lid,mode=mode,seed=seed,questions=q,created_at=now(),answers={},hints=[])
    STATE['sessions'][s['id']]=s;record('activity_started',session_id=s['id'],lesson_id=lid,mode=mode);save();return export_session(s)
def submit(s,answers):
    if s.get('submitted'):return s['result']
    if s.get('paused_for_help'):raise ValueError('This check was paused after help. Start a fresh check to establish independent readiness.')
    if any(not str(answers.get(q['id'],'')).strip() for q in s['questions']):raise ValueError('Answer every question before submitting this check.')
    results=[]
    for q in s['questions']:
        value=str(answers[q['id']])[:1000];correct=grade(q,value)
        independent=q['id'] not in s['hints'] and not q['previously_exposed']
        results.append(dict(id=q['id'],lesson_id=q['lesson_id'],prompt=q['prompt'],response=value,correct=correct,independent=independent,explanation=q['explanation'],answer=q['answer'],previously_exposed=q['previously_exposed']))
    score=sum(r['correct'] for r in results);independent_score=sum(r['correct'] and r['independent'] for r in results)
    if s['mode']=='unit':
        lids={q['lesson_id'] for q in s['questions']};covered=all(any(r['lesson_id']==lid and r['correct'] and r['independent'] for r in results) for lid in lids)
        passed=independent_score/len(results)>=.8 and covered
    else:passed=independent_score==len(results)
    result=dict(score=score,total=len(results),independent_score=independent_score,passed=passed,items=results,needs_fresh_review=any(r['previously_exposed'] for r in results))
    s.update(submitted=True,answers=answers,result=result,submitted_at=now())
    lid=s['lesson_id']
    if s['mode']=='check':
        if lid=='bridge':STATE['bridge_passed']=STATE['bridge_passed'] or passed
        else:
            l=STATE['lessons'].setdefault(lid,{});l['last_check']=result;l['check_passed']=l.get('check_passed',False) or passed
            l['status']='ready_to_advance' if l['check_passed'] else 'needs_practice'
            if passed:l['review_due']=(datetime.now(timezone.utc)+timedelta(days=2)).date().isoformat()
    elif s['mode']=='unit':STATE['unit_tests'][lid]=dict(passed=passed,last_result=result)
    for help_lid in {q['lesson_id'] for q in s['questions']}:pause_checks_for_help(help_lid)
    record('activity_assessed',session_id=s['id'],lesson_id=lid,mode=s['mode'],score=score,total=len(results),independent_score=independent_score,passed=passed)
    save();return result

def roadmap():
    global ROADMAP
    if ROADMAP is None:
        ROADMAP=json.loads(ROADMAP_FILE.read_text(encoding='utf-8')) if ROADMAP_FILE.exists() else {'version':1,'courses':[]}
        for overlay_file in (ADVANCED_GUIDES_FILE, APP/'completed-guides-foundations.json', APP/'completed-guides-college.json'):
            if not overlay_file.exists():continue
            topics={t['id']:t for c in ROADMAP['courses'] for t in c.get('topics',[])}
            seen=set()
            for addition in json.loads(overlay_file.read_text(encoding='utf-8'))['topics']:
                tid=addition['id']
                if tid not in topics or tid in seen or topics[tid].get('lesson'):
                    raise ValueError('An advanced guide must extend one unique, previously unguided topic: '+tid)
                seen.add(tid)
                for key in ('lesson','connections','application','writing'):
                    if key in addition:topics[tid][key]=addition[key]
                topics[tid]['guide_depth']='extended'
        scaffold_file=APP/'legacy-scaffolds.json'
        if scaffold_file.exists():
            topics={t['id']:t for c in ROADMAP['courses'] for t in c.get('topics',[])}
            for scaffold in json.loads(scaffold_file.read_text(encoding='utf-8'))['topics']:
                tid=scaffold['id']
                if tid not in topics or topics[tid].get('lesson') or not topics[tid].get('existing_lesson_id'):
                    raise ValueError('A legacy scaffold must extend a legacy lesson without a guide: '+tid)
                topics[tid]['scaffold']={k:v for k,v in scaffold.items() if k!='id'}
    return ROADMAP

def topic_index():
    return {topic['id']:topic for course in roadmap()['courses'] for topic in course.get('topics',[])}

def public_roadmap():
    data=json.loads(json.dumps(roadmap()))
    videos=video_index()
    for course in data['courses']:
        for topic in course.get('topics',[]):
            if topic['id'] in videos:
                v=videos[topic['id']]
                topic['video']={'url':'/'+v['video_path']+'/final.mp4','duration_seconds':v['duration_seconds'],'available':(ROOT/v['video_path']/'final.mp4').is_file(),'route':'#watch/'+topic['id']}
                topic['availability']='lesson' if topic.get('existing_lesson_id') else 'video'
                topic['scope_note']='A narrated concept lesson and written practice are available. This focused lesson introduces the objective; it is not an exhaustive university course.'
            lesson=topic.get('lesson',{})
            lesson.pop('independent_check',None)
            lesson['practice']=[public(q) for q in lesson.get('practice',[])]
    return data

def pause_topic_checks(topic_id,include_mixed=True,include_learning=True):
    normalize(STATE)
    studio.pause_for_topics(STATE, {topic_id})
    if include_mixed:review.pause_for_topics(STATE, {topic_id})
    if include_learning:learning_support.pause_for_topics(STATE, {topic_id})
    for session in STATE['topic_sessions'].values():
        if session['topic_id']==topic_id and session['mode']=='check' and not session.get('submitted') and not session.get('paused_for_help'):
            session['paused_for_help']=True
            record('topic_check_paused_for_help',topic_id=topic_id,session_id=session['id'])

def support_scope(topic_ids,include_mixed=True,include_learning=True):
    topics=topic_index()
    for tid in set(topic_ids):
        if tid not in topics:continue
        pause_topic_checks(tid,include_mixed,include_learning)
        if topics[tid].get('existing_lesson_id'):
            pause_checks_for_help(topics[tid]['existing_lesson_id'],include_mixed,include_learning)

def topic_help(topic_id):
    topic=topic_index().get(topic_id)
    if not topic:raise ValueError('Unknown topic.')
    pause_topic_checks(topic_id)
    if topic.get('existing_lesson_id'):pause_checks_for_help(topic['existing_lesson_id'])
    record('topic_help_viewed',topic_id=topic_id);save()

def calculator_support(topic_id=None,kind='calculate'):
    """A general-purpose calculator can answer any pending check, regardless of page."""
    topics=topic_index()
    if topic_id is not None and topic_id not in topics:raise ValueError('Unknown calculator topic.')
    scope={topic_id} if topic_id else set()
    legacy_ids=set()
    for session in STATE.get('sessions',{}).values():
        if session.get('mode') in ('check','unit') and not session.get('submitted') and not session.get('paused_for_help'):
            legacy_ids.update(q['lesson_id'] for q in session.get('questions',[]))
    scope.update(tid for tid,t in topics.items() if t.get('existing_lesson_id') in legacy_ids)
    scope.update(s['topic_id'] for s in STATE.get('topic_sessions',{}).values() if s.get('mode')=='check' and not s.get('submitted') and not s.get('paused_for_help'))
    for session in STATE.get('review',{}).get('sessions',{}).values():
        if session.get('mode')=='review' and not session.get('submitted'):
            scope.update(review.relevant_topics(session.get('skill_ids',[])))
    for session in STATE.get('studio',{}).get('sessions',{}).values():
        if session.get('stage')=='review' and not session.get('submitted') and not session.get('paused_for_help'):
            scope.update(studio.related_topics(session['project_id']))
    for session in STATE.get('learning_support',{}).get('reviews',{}).values():
        if not session.get('submitted'):scope.update(q['topic_id'] for q in session['questions'])
    support_scope(scope)
    for lid in legacy_ids:pause_checks_for_help(lid)
    record('calculator_support',topic_id=topic_id,support_kind=str(kind)[:40],mastery_changed=False)
    save()
    return {'saved':True,'mastery_changed':False}

def studio_help_scope(project_id):
    """Mark related evidence as supported without recursively invoking help routes."""
    topics=topic_index()
    for tid in studio.related_topics(project_id):
        pause_topic_checks(tid)
        if topics.get(tid,{}).get('existing_lesson_id'):
            pause_checks_for_help(topics[tid]['existing_lesson_id'])

def coach_reference(topic):
    entry=video_index().get(topic['id'],{})
    path=ROOT/entry['video_path']/'narration.txt' if entry.get('video_path') else None
    return lesson_coach.reference(topic,path.read_text(encoding='utf-8') if path and path.is_file() else '')

def recall_legacy_candidates(topic,seen):
    lid=topic.get('existing_lesson_id')
    if lid not in LESSONS:return []
    selected=[]
    seed=random.SystemRandom().randint(1000,99999999)
    for attempt in range(100):
        for q in questions(LESSONS[lid]['slug'],seed+attempt*997):
            mark=learning_support.normalize_text(q['prompt'])
            if mark not in seen and mark not in {learning_support.normalize_text(x['prompt']) for x in selected}:
                q['lesson_id']=lid;selected.append(q)
        if len(selected)>=9:break
    return selected[:9]

def coach_blocked(context,topic):
    projects={p['id']:set(p.get('topic_ids',[]))|set(p.get('prerequisite_ids',[])) for p in studio.content()['projects']} if STATE.get('studio') else {}
    return lesson_coach.blocked_reason(STATE,context,topic,projects)

def export_topic_session(session):
    return dict(id=session['id'],topic_id=session['topic_id'],mode=session['mode'],difficulty=session['difficulty'],questions=[public(q) for q in session['questions']],answers=session.get('answers',{}),draft_revision=session.get('draft_revision',0),hints=session.get('hints',[]),submitted=session.get('submitted',False),paused_for_help=session.get('paused_for_help',False),result=session.get('result'),batch_size=3)

def start_topic(topic_id,difficulty,mode):
    normalize(STATE)
    if difficulty not in ('gentle','standard','stretch'):raise ValueError('Choose gentle, standard or stretch.')
    if mode not in ('practice','check'):raise ValueError('Choose practice or check.')
    topic=topic_index().get(topic_id)
    if not topic:raise ValueError('Unknown topic.')
    lesson=topic.get('lesson',{})
    if not lesson.get('practice'):raise ValueError('This topic is on the roadmap; its practice is not yet authored.')
    if mode=='practice':pause_topic_checks(topic_id)
    for session in reversed(list(STATE['topic_sessions'].values())):
        if session['topic_id']==topic_id and session['mode']==mode and (mode=='check' or session['difficulty']==difficulty) and not session.get('submitted') and not session.get('paused_for_help'):
            return export_topic_session(session)
    seen={q['prompt'] for session in STATE['topic_sessions'].values() for q in session['questions']}
    seen.update(q['prompt'] for s in STATE.get('learning_support',{}).get('reviews',{}).values() for q in s['questions'])
    practice=lesson.get('practice',[])
    selected=[]
    if mode=='practice':
        candidates=[q for q in practice if q['difficulty']==difficulty]
        candidates.sort(key=lambda q:q['prompt'] in seen)
        selected=candidates[:3]
        if len(selected)<3:raise ValueError('Three practice questions at this difficulty have not been authored yet.')
    else:
        candidates=lesson.get('independent_check',[])+practice
        for level in ('gentle','standard','stretch'):
            q=next((q for q in candidates if q['difficulty']==level and q['prompt'] not in seen and q['prompt'] not in {x['prompt'] for x in selected}),None)
            if q:selected.append(q)
        if len(selected)!=3:
            raise ValueError('This topic needs a fresh independent variation at each difficulty. Continue practice or ask the tutor for a new check; repeating exposed questions would not measure readiness.')
    items=json.loads(json.dumps(selected))
    for q in items:
        q['previously_exposed']=q['prompt'] in seen
        q.setdefault('tolerance',1e-5)
    session=dict(id=uuid.uuid4().hex,topic_id=topic_id,difficulty=difficulty if mode=='practice' else 'mixed',mode=mode,questions=items,answers={},hints=[],created_at=now())
    STATE['topic_sessions'][session['id']]=session
    record('topic_activity_started',topic_id=topic_id,session_id=session['id'],mode=mode,difficulty=session['difficulty'])
    save();return export_topic_session(session)

def submit_topic(session,answers):
    if session.get('submitted'):return session['result']
    if session.get('paused_for_help'):raise ValueError('This check was paused after help. Start a fresh independent check.')
    if not isinstance(answers,dict) or any(not str(answers.get(q['id'],'')).strip() for q in session['questions']):raise ValueError('Answer all three questions before submitting.')
    items=[]
    for q in session['questions']:
        response=str(answers[q['id']])[:1000]
        correct=grade(q,response)
        independent=q['id'] not in session['hints'] and not q['previously_exposed']
        items.append(dict(id=q['id'],prompt=q['prompt'],difficulty=q['difficulty'],response=response,correct=correct,independent=independent,previously_exposed=q['previously_exposed'],answer=q['answer'],explanation=q['explanation']))
    score=sum(q['correct'] for q in items);independent_score=sum(q['correct'] and q['independent'] for q in items)
    passed=independent_score==len(items)
    result=dict(score=score,total=len(items),independent_score=independent_score,passed=passed,items=items,explain_back_pending=session['mode']=='check' and passed,needs_fresh_review=any(q['previously_exposed'] for q in items),mastery_assessed=False)
    session.update(submitted=True,answers={q['id']:str(answers[q['id']])[:1000] for q in session['questions']},result=result,submitted_at=now())
    tid=session['topic_id'];state=STATE['topics'].setdefault(tid,{})
    state['last_activity']=session['id'];state['attempts']=state.get('attempts',0)+1
    if session['mode']=='check':
        state['last_check']=result
        state['check_passed']=state.get('check_passed',False) or passed
        if state['check_passed']:
            state['status']='explain_back_pending';state['explain_back_pending']=True
            state['review_due']=(datetime.now(timezone.utc)+timedelta(days=2)).date().isoformat()
        else:state['status']='needs_practice'
    else:
        state['last_practice']=result
    pause_topic_checks(tid)
    record('topic_activity_assessed',topic_id=tid,session_id=session['id'],mode=session['mode'],score=score,total=len(items),independent_score=independent_score,passed=passed,mastery_assessed=False)
    save();return result

def save_preferences(data):
    normalize(STATE);allowed={course['id'] for course in roadmap()['courses']}
    selected=data.get('starting_course')
    if selected is not None:
        if selected not in allowed:raise ValueError('Choose a course in the roadmap.')
        STATE['preferences']['starting_course']=selected
    if 'pace' in data:
        if data['pace'] not in ('steady','explore','fast','self_paced'):raise ValueError('Choose a supported pace.')
        STATE['preferences']['pace']=data['pace']
    if 'basic_support' in data:
        if not isinstance(data['basic_support'],bool):raise ValueError('Basic support must be true or false.')
        STATE['preferences']['basic_support']=data['basic_support']
    STATE['preferences'].update(placement_source='self_selected',assessed_placement=False,updated_at=now())
    record('learning_preferences_saved',preferences=STATE['preferences'].copy());save()
    return dict(preferences=STATE['preferences'],mastery_changed=False)

def configure(state_dir=None,student='original'):
    global STORE,STATE,STATE_DIR
    original=Path(state_dir).resolve() if state_dir else ROOT/'student'
    original.mkdir(parents=True,exist_ok=True)
    STORE=ProfileStore(ROOT,original,student,isolated=state_dir is not None)
    STATE_DIR=STORE.path(student);STATE=STORE.load(student,empty,normalize)
    if not (STATE_DIR/'dashboard_progress.json').exists():save()

class Handler(BaseHTTPRequestHandler):
    server_version='Catalyst/2.0'
    def log_message(self,*args):pass
    def cookie_name(self):return f'{STORE.cookie_name}_{self.server.server_address[1]}'
    def local_request(self):
        hosts=self.headers.get_all('Host',[]);port=self.server.server_address[1]
        accepted={f'127.0.0.1:{port}',f'localhost:{port}'}
        if port==80:accepted.update(('127.0.0.1','localhost'))
        if len(hosts)!=1 or hosts[0].lower() not in accepted:
            self.json({'error':'This learning app accepts localhost requests only.'},403);return False
        origin=self.headers.get('Origin')
        if origin and origin.lower()!=f'http://{hosts[0].lower()}':
            self.json({'error':'Use this local dashboard to make changes.'},403);return False
        if self.headers.get('Sec-Fetch-Site')=='cross-site':
            self.json({'error':'Cross-site requests are not accepted.'},403);return False
        return True
    @contextmanager
    def learner(self):
        global STATE,STATE_DIR
        with LOCK:
            if STORE is None:raise ValueError('Learner storage is not initialized.')
            cookies=SimpleCookie()
            try:cookies.load(self.headers.get('Cookie',''))
            except Exception:pass
            cookie=cookies.get(self.cookie_name())
            token,profile_id,is_new=STORE.resolve(cookie.value if cookie else '')
            self.profile_token=token;self.profile_id=profile_id
            if is_new:self.cookie_to_set=token
            old_state,old_dir=STATE,STATE_DIR
            STATE=STORE.load(profile_id,empty,normalize);STATE_DIR=STORE.path(profile_id)
            try:yield
            finally:STATE,STATE_DIR=old_state,old_dir
    def choose_profile(self,profile_id):
        global STATE,STATE_DIR
        # A profile switch rotates the cookie. Also invalidate an in-flight AI
        # response still carrying the old token, without changing saved evidence.
        STORE.ai_cancelled_tokens=getattr(STORE,'ai_cancelled_tokens',set())|{self.profile_token}
        self.profile_token=STORE.select(self.profile_token,profile_id);self.cookie_to_set=self.profile_token;self.profile_id=profile_id
        STATE=STORE.load(profile_id,empty,normalize);STATE_DIR=STORE.path(profile_id)
        if not (STATE_DIR/'dashboard_progress.json').exists():save()
        return dict(current=STORE.descriptor(profile_id),progress=progress(),local_only=True)
    def json(self,value,status=200):
        data=json.dumps(visual_response(value),ensure_ascii=False).encode();self.send_response(status);self.send_header('Content-Type','application/json; charset=utf-8');self.send_header('Content-Length',str(len(data)));self.send_header('Cache-Control','no-store');self.send_header('X-Content-Type-Options','nosniff')
        if getattr(self,'cookie_to_set',None):self.send_header('Set-Cookie',f'{self.cookie_name()}={self.cookie_to_set}; Path=/; Max-Age=31536000; HttpOnly; SameSite=Strict')
        self.end_headers();self.wfile.write(data)
    def do_GET(self):
        if not self.local_request():return
        path=unquote(urlparse(self.path).path)
        try:
            if path=='/api/health':return self.json({'app':'catalyst','version':2,'downloads':{name:(ROOT.parent/'releases'/('catalyst-'+name+'.zip')).is_file() for name in ('source','offline')}})
            if path=='/api/catalog':
                data=json.loads(json.dumps(CAT))
                for u in data['units']:
                    for l in u['lessons']:
                        l['homework']=json.loads((ROOT/l['lesson_path']/'practice.json').read_text(encoding='utf-8'))['batches']
                        l['transcript']=(ROOT/l['video_path']/'narration.txt').read_text(encoding='utf-8')
                        l['video_available']=(ROOT/l['video_path']/'final.mp4').is_file()
                return self.json(data)
            if path=='/api/roadmap':return self.json(public_roadmap())
            if path=='/api/video-catalog':return self.json(public_videos())
            if path=='/api/tour':return self.json(public_tour())
            if path=='/api/missions':
                source=APP/'mission-content.json'
                return self.json(json.loads(source.read_text(encoding='utf-8')) if source.is_file() else {})
            if path=='/api/coach/status':
                status=tutor_ai.status()
                return self.json(dict(status,authored_available=True,message='An installed local model can reply to your questions.' if status['available'] else 'Authored lesson guidance is ready. No local model is connected.'))
            if path=='/api/studio':return self.json(studio.public_content())
            if path=='/api/review/catalog':return self.json(review.public_catalog())
            if path=='/api/review/state':
                with self.learner():
                    if review.sync_existing(STATE,topic_index()):save()
                    return self.json(dict(profile_id=self.profile_id,**review.export_state(STATE)))
            if path=='/api/feedback':
                with self.learner():return self.json(dict(profile_id=self.profile_id,**feedback.export_state(STATE),sources=feedback.sources(STATE,topic_index()),criteria=feedback.guidance()))
            if path=='/api/studio/ai/status':return self.json(tutor_ai.status())
            if path=='/api/studio/state':
                with self.learner():return self.json(dict(profile_id=self.profile_id,**studio.export_state(STATE)))
            if path=='/api/profiles':
                with self.learner():return self.json(dict(profiles=STORE.list_profiles(),current=STORE.descriptor(self.profile_id),local_only=True))
            if path=='/api/learning':
                with self.learner():
                    if learning_support.sync_reviews(STATE,topic_index()):save()
                    return self.json(dict(profile_id=self.profile_id,**learning_support.export_state(STATE,topic_index())))
            if path=='/api/ai-learning':return self.json(json.loads((APP/'ai-learning-path.json').read_text(encoding='utf-8')))
            if path=='/api/purpose-paths':return self.json(json.loads((APP/'purpose-paths.json').read_text(encoding='utf-8')))
            if path=='/api/learning/projects':return self.json(learning_support.project_content())
            if path=='/api/progress':
                with self.learner():return self.json(progress())
            if path=='/api/placement':
                with self.learner():return self.json(placement.export(placement.current(STATE)))
            if path=='/api/export':
                with self.learner():return self.json(dict(profile=STORE.descriptor(self.profile_id),progress=progress(),events=STATE['events'],placement=placement.export(placement.current(STATE)),placement_responses=[{k:v for k,v in r.items() if k!='submission'} for r in (placement.current(STATE) or {}).get('responses',[])],sessions=[export_session(s) for s in STATE['sessions'].values()],topic_sessions=[export_topic_session(s) for s in STATE['topic_sessions'].values()],studio=studio.export_state(STATE),review=review.export_state(STATE),feedback=feedback.export_state(STATE),learning_support=learning_support.export_state(STATE,topic_index(),all_reviews=True)))
            self.serve(path)
        # Seeking or leaving a video can close the range response mid-stream.
        # Handle these OSError subclasses before trying to send an error body.
        except (BrokenPipeError,ConnectionResetError,ConnectionAbortedError):pass
        except (OSError,ValueError,KeyError) as e:self.json({'error':str(e)},400)
    def studio_ai(self,data):
        # Snapshot one learner under the lock; inference must not block other learners.
        with self.learner():
            bound=self.profile_id
            bound_token=self.profile_token
            if self.headers.get('X-Catalyst-Profile')!=bound:
                return self.json({'error':'Your learning space changed. Reload before asking the tutor.'},409)
            topics=topic_index();tid=data.get('topic_id');pid=data.get('project_id')
            feedback_id=data.get('feedback_entry_id');feedback_version=None;feedback_topics=[]
            if tid not in topics:raise ValueError('Choose a topic before asking the tutor.')
            question=studio.bounded_text(data.get('question',''),3000)
            if not question.strip():raise ValueError('Write a question for the tutor.')
            prompt=studio.brief(STATE,data,topics)['prompt']
            if feedback_id:
                entry=feedback.get_entry(STATE,feedback_id)
                feedback_topics=entry['source'].get('topic_ids',[])
                if tid not in feedback_topics:raise ValueError('Choose the topic belonging to this written explanation.')
                feedback_version=entry['versions'][-1]['number']
                written_brief=feedback.brief(STATE,{'id':feedback_id},topics)['brief']
                excerpt_note='\nThis is an excerpt of a longer explanation. Review only the visible steps and ask for missing context; do not judge the whole argument.\n' if len(written_brief)>10000 else ''
                prompt=prompt[:5000]+'\n\nSelected written reasoning to review:\n'+written_brief[:10000]+excerpt_note
            t=topics[tid];lesson=t.get('lesson',{})
            reference={'topic':t['title'],'objective':t['objective']}
            for key in ('intuition','examples','misconception'):
                if key in lesson:reference[key]=lesson[key]
            if pid:
                p=studio.project(pid)
                reference['application']={k:p[k] for k in ('title','context','assumptions','why','examples')}
            prompt=prompt[:15500]+'\n\nAuthored reference (not assessment keys):\n'+json.dumps(reference,ensure_ascii=False)[:8000]
        reply=tutor_ai.generate(data.get('model'),prompt,question)
        # The shared browser cookie may have switched profiles during inference.
        with self.learner():
            if self.profile_id!=bound or self.headers.get('X-Catalyst-Profile')!=bound or bound_token in getattr(STORE,'ai_cancelled_tokens',set()):
                return self.json({'error':'The learning space changed while the tutor was replying. The reply was not saved; reload to continue.'},409)
            if feedback_id and feedback.get_entry(STATE,feedback_id)['versions'][-1]['number']!=feedback_version:
                return self.json({'error':'Your explanation changed while the tutor was replying. Ask again using the current version.'},409)
            topic_help(tid)
            if pid:studio_help_scope(pid)
            if feedback_topics:support_scope(feedback_topics)
            current=studio.workspace(STATE)
            record_data={**reply,'id':uuid.uuid4().hex,'created_at':now(),'topic_id':tid,'project_id':pid,'question':question,'feedback_entry_id':feedback_id,'feedback_version':feedback_version}
            current['ai_history']=[*current.get('ai_history',[]),record_data][-10:]
            record('studio_ai_help',topic_id=tid,project_id=pid,model=reply['model'],mastery_changed=False)
            save();return self.json(dict(profile_id=bound,**record_data,mastery_changed=False))
    def coach_message(self,data):
        # The slow optional model call is outside LOCK. Page and learner identity
        # are checked again before a reply or support exposure can be committed.
        with self.learner():
            bound=self.profile_id;bound_token=self.profile_token;store=STORE
            if self.headers.get('X-Catalyst-Profile')!=bound:
                raise lesson_coach.ConflictError('Your learning space changed. Keep your question and reload before sending it.')
            context=lesson_coach.current_context(STORE,bound_token,bound,data)
            tid=context['topic_id'];topic=topic_index()[tid]
            reason=coach_blocked(context,topic)
            if reason:raise lesson_coach.ConflictError(reason)
            request=lesson_coach.prepare(STATE,tid,data)
            if request.get('replay'):
                return self.json(dict(profile_id=bound,context_id=context['context_id'],**lesson_coach.result(STATE,tid,request['replay'])))
            pending=getattr(store,'coach_pending',{})
            key=(bound,tid)
            if key in pending:
                raise lesson_coach.ConflictError('The coach is finishing a reply for this lesson. Keep your question and try again shortly.')
            reference=coach_reference(topic)
            brief=lesson_coach.model_brief(STATE,tid,request,reference) if request['mode']=='local' else None
            marker=uuid.uuid4().hex;pending[key]=marker;store.coach_pending=pending
        try:
            reply=tutor_ai.generate(request['model'],brief,request['question']) if request['mode']=='local' else lesson_coach.authored_reply(request,reference)
            with self.learner():
                if (self.profile_id!=bound or self.headers.get('X-Catalyst-Profile')!=bound or
                        bound_token in getattr(STORE,'ai_cancelled_tokens',set())):
                    raise lesson_coach.ConflictError('Your learning space changed while the coach was replying. The old reply was discarded.')
                current=lesson_coach.current_context(STORE,bound_token,bound,data)
                reason=coach_blocked(current,topic)
                if reason:raise lesson_coach.ConflictError(reason)
                message=lesson_coach.commit(STATE,tid,request,reply)
                support_scope({tid})
                record('lesson_coach_help',topic_id=tid,source=request['mode'],request_id=request['request_id'],mastery_changed=False)
                save()
                return self.json(dict(profile_id=bound,context_id=current['context_id'],**lesson_coach.result(STATE,tid,message)))
        finally:
            with LOCK:
                if getattr(store,'coach_pending',{}).get(key)==marker:store.coach_pending.pop(key,None)

    def do_HEAD(self):
        if self.local_request():self.serve(unquote(urlparse(self.path).path),head=True)
    def do_POST(self):
        if not self.local_request():return
        if self.headers.get('Content-Type','').split(';')[0]!='application/json':return self.json({'error':'Use JSON.'},415)
        try:
            size=int(self.headers.get('Content-Length','0'))
            if not 0<size<=131072:raise ValueError('Request is empty or too large.')
            data=json.loads(self.rfile.read(size));path=urlparse(self.path).path
            if not isinstance(data,dict):raise ValueError('Request must be a JSON object.')
            # Optional studio AI POST handler: snapshot under learner(), run inference
            # outside LOCK, then reacquire learner() and recheck the bound profile.
            if path=='/api/studio/ai':return self.studio_ai(data)
            if path=='/api/coach/message':return self.coach_message(data)
            with self.learner():
                if path not in ('/api/profiles/create','/api/profiles/select') and self.headers.get('X-Catalyst-Profile')!=self.profile_id:
                    return self.json({'error':'Your learning space changed or could not be confirmed. Copy any unsaved work, then reload before saving.'},409)
                if path=='/api/profiles/create':
                    descriptor=STORE.create(data['id'],data['name'])
                    return self.json(self.choose_profile(descriptor['id']))
                if path=='/api/profiles/select':return self.json(self.choose_profile(data['id']))
                if path.startswith('/api/learning/'):
                    action=path.rsplit('/',1)[-1]
                    if action=='notes':result=learning_support.save_notes(STATE,data,topic_index())
                    elif action=='repair':
                        result=learning_support.save_repair(STATE,data,topic_index())
                        if data['active']:support_scope({data['from_topic_id'],data['topic_id']})
                    elif action=='project':result=learning_support.save_project(STATE,data)
                    elif action=='mission-design':result=visual_learning.save_mission(STATE,data,topic_index())
                    elif action=='ai':result=visual_learning.save_ai(STATE,data)
                    elif action=='purpose':result=visual_learning.save_purpose(STATE,data)
                    elif action=='support':
                        ids=data.get('topic_ids')
                        if not isinstance(ids,list) or len(ids)>159 or any(tid not in topic_index() for tid in ids):raise ValueError('Choose known lesson topics.')
                        support_scope(ids);result={'saved':True,'mastery_changed':False}
                    elif action=='recall-start':result=learning_support.start_review(STATE,data,topic_index(),recall_legacy_candidates)
                    elif action in ('recall-draft','recall-submit'):
                        result=learning_support.review_action(STATE,data,action.split('-')[1])
                        if action=='recall-submit':support_scope({q['topic_id'] for q in result['items']},True,False)
                    elif action=='pilot':result=learning_support.pilot_action(STATE,data)
                    else:raise ValueError('Unknown learning action.')
                    save();return self.json(dict(profile_id=self.profile_id,**result))
                if path=='/api/calculator/support':
                    return self.json(dict(profile_id=self.profile_id,**calculator_support(data.get('topic_id'),data.get('kind','calculate'))))
                if path=='/api/topic/mission':
                    tid=data.get('topic_id')
                    if tid not in topic_index():raise ValueError('Unknown mission topic.')
                    revision=data.get('revision')
                    if not isinstance(revision,int) or isinstance(revision,bool) or revision<0:raise ValueError('Use a valid draft revision.')
                    fields={key:data.get(key,'') for key in ('prediction','explanation')}
                    if any(not isinstance(v,str) or len(v)>6000 for v in fields.values()):raise ValueError('Keep each mission note within 6000 characters.')
                    target=STATE.setdefault('topics',{}).setdefault(tid,{})
                    if revision>=target.get('mission',{}).get('revision',0):
                        target['mission']={**fields,'revision':revision,'updated_at':now()};save()
                    return self.json({'saved':True,'profile_id':self.profile_id,'mastery_changed':False})
                if path=='/api/coach/context':
                    return self.json(lesson_coach.bind_context(STORE,self.profile_token,self.profile_id,data,topic_index()))
                if path=='/api/coach/open':
                    context=lesson_coach.current_context(STORE,self.profile_token,self.profile_id,data)
                    tid=context['topic_id'];topic=topic_index()[tid];reason=coach_blocked(context,topic)
                    if reason:return self.json({'profile_id':self.profile_id,'context_id':context['context_id'],'topic_id':tid,'blocked':True,'reason':reason})
                    result={'profile_id':self.profile_id,'context_id':context['context_id'],'topic_id':tid,'blocked':False,
                            'thread':lesson_coach.export_thread(STATE,tid),'greeting':lesson_coach.greeting(coach_reference(topic)),'mastery_changed':False}
                    support_scope({tid});record('lesson_coach_opened',topic_id=tid,mastery_changed=False);save()
                    return self.json(result)
                if path.startswith('/api/review/'):
                    action=path.rsplit('/',1)[-1]
                    if action=='start':
                        result=review.start(STATE,data,topic_index())
                        if result['mode']=='practice':support_scope(review.relevant_topics(result['skill_ids']),False)
                    elif action=='draft':result=review.draft(STATE,data)
                    elif action=='hint':
                        result=review.hint(STATE,data)
                        session=next(s for s in review.export_state(STATE)['sessions'] if s['id']==data['session_id'])
                        question=next(q for q in session['questions'] if q['id']==data['question_id'])
                        support_scope(question['topic_ids'],False)
                    elif action=='submit':
                        result=review.submit(STATE,data)
                        support_scope({tid for q in result['items'] for tid in q['topic_ids']},False)
                    elif action=='feedback':
                        session=next(s for s in review.export_state(STATE)['sessions'] if s['id']==data.get('session_id'))
                        if not session.get('submitted'):raise ValueError('Complete this set before reading feedback.')
                        support_scope(review.relevant_topics(session['skill_ids']))
                        result={'saved':True,'mastery_changed':False}
                    else:raise ValueError('Unknown review action.')
                    save();return self.json(dict(profile_id=self.profile_id,**result))
                if path.startswith('/api/feedback/'):
                    action=path.rsplit('/',1)[-1]
                    if action=='save':result=feedback.save(STATE,data,topic_index())
                    elif action=='note':result=feedback.add_note(STATE,data)
                    elif action=='revise':result=feedback.revise(STATE,data)
                    elif action=='brief':result=feedback.brief(STATE,data,topic_index())
                    elif action=='open':
                        entry=next(e for e in feedback.export_state(STATE)['entries'] if e['id']==data.get('id'))
                        result={'entry':entry,'mastery_changed':False}
                    else:raise ValueError('Unknown reasoning review action.')
                    support_scope(result.get('topic_ids',result.get('entry',{}).get('source',{}).get('topic_ids',[])))
                    save();return self.json(dict(profile_id=self.profile_id,**result))
                if path=='/api/topic/writing':
                    tid=data.get('topic_id');topic=topic_index().get(tid,{})
                    allowed={p['id'] for p in topic.get('writing',{}).get('parts',[])}
                    if not allowed:raise ValueError('This guide has no structured writing task.')
                    answers=data.get('answers')
                    if not isinstance(answers,dict) or any(k not in allowed for k in answers):raise ValueError('Use the writing prompts for this guide.')
                    snapshot={'answers':{k:studio.bounded_text(v) for k,v in answers.items()}}
                    previous=STATE['topics'].get(tid,{}).get('writing')
                    revision,changed=studio.check_revision(previous,data.get('revision'),snapshot,('answers',))
                    if changed:
                        STATE['topics'].setdefault(tid,{})['writing']={**snapshot,'revision':revision,'updated_at':now(),'status':'pending_tutor_review'}
                        record('structured_reasoning_saved',topic_id=tid,mastery_changed=False);save()
                    return self.json({'saved':True,'revision':revision,'mastery_changed':False})
                if path.startswith('/api/studio/'):
                    action=path.rsplit('/',1)[1]
                    if action=='save':result=studio.save_project(STATE,data)
                    elif action=='preferences':result=studio.save_preferences(STATE,data,topic_index())
                    elif action=='start':result=studio.start(STATE,data)
                    elif action=='draft':result=studio.draft(STATE,data)
                    elif action=='help':
                        result=studio.help_project(STATE,data.get('project_id'));studio_help_scope(data['project_id'])
                    elif action=='hint':
                        result=studio.hint(STATE,data);studio_help_scope(studio.get_session(STATE,data.get('session_id'))['project_id'])
                    elif action=='submit':
                        result=studio.submit(STATE,data);studio_help_scope(studio.get_session(STATE,data.get('session_id'))['project_id'])
                    elif action=='brief':result=studio.brief(STATE,data,topic_index())
                    else:raise ValueError('Unknown applied learning action.')
                    save();return self.json(dict(profile_id=self.profile_id,**result))
                if path.startswith('/api/placement/'):
                    action=path.rsplit('/',1)[1]
                    if action=='start':result=placement.start(STATE)
                    elif action=='answer':result=placement.answer(STATE,data,topic_index())
                    elif action=='draft':result=placement.draft(STATE,data)
                    elif action=='exposure':result=placement.expose(STATE,data)
                    else:raise ValueError('Unknown placement action.')
                    save();return self.json(result)
                if path in ('/api/preferences','/api/placement'):return self.json(save_preferences(data))
                if path=='/api/topic/video':
                    tid=data['topic_id'];entry=video_index().get(tid)
                    if not entry:raise ValueError('Unknown video topic.')
                    seconds=float(data['seconds'])
                    if not __import__('math').isfinite(seconds) or seconds<0:raise ValueError('Invalid playback time.')
                    revision=data.get('revision',0)
                    if isinstance(revision,bool) or not isinstance(revision,int) or not 0<=revision<=9007199254740991:raise ValueError('Invalid playback revision.')
                    state=STATE['topics'].setdefault(tid,{})
                    if revision>=state.get('video_revision',0):
                        state['video_seconds']=min(seconds,entry['duration_seconds']);state['video_revision']=revision
                        state['video_updated_at']=now();pause_topic_checks(tid)
                        record('topic_video_position',topic_id=tid,seconds=state['video_seconds']);save()
                    return self.json({'saved':True,'video_revision':state.get('video_revision',0),'mastery_changed':False})
                if path=='/api/topic/homework':
                    tid=data['topic_id'];entry=video_index().get(tid)
                    if not entry or not entry.get('practice'):raise ValueError('Unknown written activity.')
                    allowed={q['id'] for q in entry['practice']}
                    if not isinstance(data.get('answers'),dict):raise ValueError('Expected written answers.')
                    answers={k:str(v)[:6000] for k,v in data['answers'].items() if k in allowed}
                    state=STATE['topics'].setdefault(tid,{})
                    revision=int(data.get('revision',0))
                    if revision>=state.get('homework_revision',0):
                        state.setdefault('homework',{}).update(answers);state['homework_revision']=revision
                        state['homework_status']='pending_tutor_review';save()
                    return self.json({'saved':True,'mastery_changed':False})
                if path=='/api/topic/activity':return self.json(start_topic(data['topic_id'],data.get('difficulty','standard'),data['mode']))
                if path=='/api/topic/help':topic_help(data['topic_id']);return self.json({'saved':True})
                if path=='/api/topic/reflection':
                    tid=data['topic_id']
                    if tid not in topic_index():raise ValueError('Unknown topic.')
                    response=str(data.get('text','')).strip()
                    if len(response)>6000:raise ValueError('Write an explanation of at most 6000 characters.')
                    state=STATE['topics'].setdefault(tid,{})
                    old=state.get('reflection') or {}
                    revision=data.get('revision',old.get('revision',0)+1 if isinstance(old,dict) else 1)
                    if not isinstance(revision,int) or isinstance(revision,bool) or revision<0:raise ValueError('Invalid reflection revision.')
                    if isinstance(old,dict) and revision<=old.get('revision',-1):return self.json({'saved':True,'reflection':old,'mastery_changed':False})
                    state['reflection']=dict(text=response,status='pending_tutor_review',revision=revision,updated_at=now())
                    record('topic_reflection_saved',topic_id=tid,review_status='pending_tutor_review');save()
                    return self.json({'saved':True,'reflection':state['reflection'],'mastery_changed':False})
                if path in ('/api/topic/submit','/api/topic/draft','/api/topic/hint'):
                    session=STATE['topic_sessions'][data['session_id']]
                    if path=='/api/topic/submit':return self.json(submit_topic(session,data['answers']))
                    if session.get('submitted'):raise ValueError('This activity is already submitted.')
                    if path=='/api/topic/draft':
                        revision=int(data.get('revision',0))
                        if revision>=session.get('draft_revision',0):
                            allowed={q['id'] for q in session['questions']}
                            session['answers']={k:str(v)[:1000] for k,v in data['answers'].items() if k in allowed};session['draft_revision']=revision;save()
                        return self.json({'saved':True})
                    if session['mode']!='practice':raise ValueError('Return to practice for help; independent checks do not reveal hints.')
                    q=next(q for q in session['questions'] if q['id']==data['question_id'])
                    if q['id'] not in session['hints']:session['hints'].append(q['id'])
                    pause_topic_checks(session['topic_id']);save()
                    return self.json({'hint':q.get('hint','Name the relationship being used, then try one smaller step. You can return to the worked examples for more help.')})
                if path=='/api/activity':return self.json(start(data['lesson_id'],data['mode']))
                if path=='/api/homework':
                    lid=data['lesson_id']
                    if lid not in LESSONS:raise ValueError('Unknown lesson.')
                    allowed={q['id'] for b in json.loads((ROOT/LESSONS[lid]['lesson_path']/'practice.json').read_text(encoding='utf-8'))['batches'] for q in b}
                    answers={k:str(v)[:6000] for k,v in data['answers'].items() if k in allowed}
                    revision=int(data.get('revision',0))
                    if revision>=STATE['homework_revisions'].get(lid,0):
                        STATE['homework'].setdefault(lid,{}).update(answers);STATE['homework_revisions'][lid]=revision
                        record('homework_saved',lesson_id=lid,item_ids=list(answers));save()
                    return self.json({'saved':True,'revision':STATE['homework_revisions'].get(lid,0)})
                if path=='/api/video':
                    lid=data['lesson_id']
                    if lid not in LESSONS:raise ValueError('Unknown lesson.')
                    l=STATE['lessons'].setdefault(lid,{});l['video_seconds']=max(l.get('video_seconds',0),min(float(data['seconds']),LESSONS[lid]['duration_seconds']));pause_checks_for_help(lid);save();return self.json({'saved':True})
                if path in ('/api/submit','/api/draft','/api/hint'):
                    s=STATE['sessions'][data['session_id']]
                    if path=='/api/submit':return self.json(submit(s,data['answers']))
                    if s.get('submitted'):raise ValueError('This activity is already submitted.')
                    if path=='/api/draft':
                        revision=int(data.get('revision',0))
                        if revision>=s.get('draft_revision',0):
                            allowed={q['id'] for q in s['questions']};s['answers']={k:str(v)[:1000] for k,v in data['answers'].items() if k in allowed};s['draft_revision']=revision;save()
                        return self.json({'saved':True})
                    q=next(q for q in s['questions'] if q['id']==data['question_id'])
                    if s['mode']!='practice':raise ValueError('Return to practice for help; the check remains independent.')
                    if q['id'] not in s['hints']:s['hints'].append(q['id'])
                    pause_checks_for_help(s['lesson_id']);save();return self.json({'hint':q['hint']})
                raise ValueError('Unknown request.')
        except (studio.ConflictError,review.ConflictError,feedback.ConflictError,lesson_coach.ConflictError,learning_support.ConflictError) as e:self.json({'error':str(e)},409)
        except (ValueError,KeyError,TypeError,StopIteration,FileExistsError) as e:self.json({'error':str(e)},400)
    def serve(self,path,head=False):
        if path=='/':path='/index.html'
        if path.startswith('/videos/courses/'):
            p=(ROOT/path.lstrip('/')).resolve();base=(ROOT/'videos/courses').resolve()
            if p.suffix not in ('.mp4','.txt'):return self.send_error(404)
        elif path.startswith('/videos/catalyst-tour/'):
            base=(ROOT/'videos/catalyst-tour').resolve();p=(ROOT/path.lstrip('/')).resolve()
            if p.parent!=base or p.name not in ('final.mp4','narration.txt','captions.vtt','poster.jpg'):return self.send_error(404)
        elif path.startswith('/videos/catalog/'):
            base=(ROOT/'videos/catalog').resolve();p=(ROOT/path.lstrip('/')).resolve()
            if p.name not in ('final.mp4','narration.txt','captions.vtt','poster.jpg'):return self.send_error(404)
        elif path.startswith('/thumbnails/'):
            base=(COURSE/'qa').resolve();p=(base/path.split('/')[-1]).resolve()
            if p.suffix not in ('.jpg','.png'):return self.send_error(404)
        elif path.startswith('/downloads/'):
            if path not in ('/downloads/catalyst-source.zip','/downloads/catalyst-offline.zip'):return self.send_error(404)
            base=(ROOT.parent/'releases').resolve();p=(base/path.split('/')[-1]).resolve()
        else:
            base=APP.resolve();p=(APP/path.lstrip('/')).resolve()
            allowed={'/index.html','/style.css','/app.js','/labs.js','/mark.svg','/learning.js','/catalyst.css','/reasoning.js','/reasoning.css','/catalyst-logo.svg','/favicon.ico','/video-catalog.js','/video-catalog.css','/placement.js','/placement.css','/studio.js','/studio.css','/studio-labs.js','/mixed-review.js','/mixed-review.css','/feedback.js','/feedback.css'}
            allowed.update({'/playground.js','/playground.css','/tour.js','/tour.css','/GETTING_STARTED.md'})
            allowed.update({'/calculator.js','/calculator.css','/calculator-engine.js','/lesson-coach.js','/lesson-coach.css','/lesson-missions.js','/lesson-missions.css','/mission-math.js','/mission-content.json','/lesson-flow.css','/skill-tree.js','/skill-tree.css'})
            allowed.update({'/learning-path.js','/learning-path.css','/project-journeys.js','/step-checker.js','/step-workspace.js','/step-workspace.css','/math-input.js','/math-input.css','/LEARNER_PILOT.md'})
            allowed.update({'/card-art.js','/card-art.css','/answer-visuals.js','/answer-visuals.css','/mission-calculations.js','/mission-calculations.css','/ai-math.js','/ai-learning.js','/ai-learning.css'})
            allowed.update({'/autosave.js','/focus.css','/parametric-motion.js','/purpose-math.js','/purpose-paths.js','/purpose-paths.css','/purpose-paths.json'})
            if path not in allowed:return self.send_error(404)
        if not p.is_relative_to(base) or not p.is_file():return self.send_error(404)
        size=p.stat().st_size;start=0;end=size-1;status=200
        ranges=self.headers.get('Range')
        if ranges:
            match=re.fullmatch(r'bytes=(\d*)-(\d*)',ranges)
            if not match:return self.send_error(416)
            left,right=match.groups()
            if left:start=int(left);end=min(int(right),end) if right else end
            elif right:start=max(0,size-int(right))
            if start> end or start>=size:return self.send_error(416)
            status=206
        self.send_response(status);self.send_header('Content-Type','application/zip' if p.suffix=='.zip' else mimetypes.guess_type(str(p))[0] or 'application/octet-stream');self.send_header('Content-Length',str(end-start+1));self.send_header('Accept-Ranges','bytes');self.send_header('Cache-Control','no-cache')
        if p.suffix=='.zip':self.send_header('Content-Disposition',f'attachment; filename="{p.name}"')
        self.send_header('X-Content-Type-Options','nosniff')
        if status==206:self.send_header('Content-Range',f'bytes {start}-{end}/{size}')
        self.end_headers()
        if not head:
            try:
                with p.open('rb') as f:
                    f.seek(start);remaining=end-start+1
                    while remaining:
                        chunk=f.read(min(1024*1024,remaining))
                        if not chunk:break
                        self.wfile.write(chunk);remaining-=len(chunk)
            except (BrokenPipeError,ConnectionResetError):pass

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--port',type=int,default=8766);parser.add_argument('--student',default='original');parser.add_argument('--state-dir',type=Path,help='Explicit isolated state directory for development verification')
    args=parser.parse_args()
    configure(args.state_dir,args.student)
    print(f'Catalyst: http://127.0.0.1:{args.port}',flush=True)
    ThreadingHTTPServer(('127.0.0.1',args.port),Handler).serve_forever()
