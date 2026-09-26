"""Check authored guide assessment, honest exposure and resumable API behavior."""
from http.cookiejar import CookieJar
from http.server import ThreadingHTTPServer
from pathlib import Path
from urllib.request import Request,build_opener,HTTPCookieProcessor
from urllib.error import HTTPError
import json
import sys
import tempfile
import threading

sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import server as app
from question_bank import grade

topics=[t for t in app.topic_index().values() if t.get('lesson',{}).get('practice')]
assert topics,'No authored practice found'
checked=[];fresh_sets={}
with tempfile.TemporaryDirectory(prefix='catalyst-topic-') as temporary:
    app.STATE_DIR=Path(temporary)
    for topic in topics:
        app.STATE=app.empty();tid=topic['id']
        lesson=topic['lesson']
        for q in lesson['practice']+lesson.get('independent_check',[]):
            assert grade(q,str(q['answer'])),(tid,q['id'])
            assert q['difficulty'] in ('gentle','standard','stretch')
            if q['kind']=='choice':assert len(q['options'])==len(set(q['options']))
        prompts=[]
        for level in ('gentle','standard','stretch'):
            public=app.start_topic(tid,level,'practice')
            assert len(public['questions'])==3
            assert all('answer' not in q and 'explanation' not in q and 'hint' not in q for q in public['questions'])
            session=app.STATE['topic_sessions'][public['id']]
            prompts.extend(q['prompt'] for q in session['questions'])
            result=app.submit_topic(session,{q['id']:str(q['answer']) for q in session['questions']})
            assert result['score']==3 and not app.STATE['topics'][tid].get('check_passed')
        unused=[q for q in lesson.get('independent_check',[]) if q['prompt'] not in prompts]
        assert len(unused)==len(lesson.get('independent_check',[])),(tid,'A reserved check repeats practice.')
        assert len(unused)==len({q['prompt'] for q in unused}),(tid,'Reserved checks repeat a prompt.')
        expected_sets=min(len({q['prompt'] for q in unused if q['difficulty']==level}) for level in ('gentle','standard','stretch'))
        assert expected_sets>=2,(tid,'A failed first check needs at least one fresh replacement after practice.')
        for attempt in range(expected_sets):
            public=app.start_topic(tid,'standard','check')
            session=app.STATE['topic_sessions'][public['id']]
            assert {q['difficulty'] for q in session['questions']}=={'gentle','standard','stretch'}
            assert not (set(prompts)&{q['prompt'] for q in session['questions']})
            assert all(not q['previously_exposed'] for q in session['questions'])
            prompts.extend(q['prompt'] for q in session['questions'])
            try:app.submit_topic(session,{});raise AssertionError('Accepted blank check')
            except ValueError:pass
            # A failed initial attempt must leave new questions for a genuine retry.
            answers={q['id']:'incorrect' if attempt==0 else str(q['answer']) for q in session['questions']}
            result=app.submit_topic(session,answers)
            assert not result['mastery_assessed']
            if attempt==0:
                assert result['score']==0 and not result['passed']
                assert not app.STATE['topics'][tid].get('check_passed')
            else:
                assert result['passed'] and result['independent_score']==3 and result['explain_back_pending']
                assert app.STATE['topics'][tid]['status']=='explain_back_pending'
            assert app.submit_topic(session,{})==result
        fresh_sets[tid]=expected_sets
        try:app.start_topic(tid,'standard','check');raise AssertionError('Recycled exposed questions')
        except ValueError:pass
        repeated=app.start_topic(tid,'gentle','practice')
        session=app.STATE['topic_sessions'][repeated['id']]
        result=app.submit_topic(session,{q['id']:str(q['answer']) for q in session['questions']})
        assert result['score']==3 and result['independent_score']==0 and not result['passed']
        checked.append(tid)
    tid=topics[0]['id'];app.STATE=app.empty()
    # Even after all practice has been seen, help on a check leaves fresh reserved items.
    for level in ('gentle','standard','stretch'):
        session=app.STATE['topic_sessions'][app.start_topic(tid,level,'practice')['id']]
        app.submit_topic(session,{q['id']:str(q['answer']) for q in session['questions']})
    old=app.STATE['topic_sessions'][app.start_topic(tid,'standard','check')['id']]
    app.topic_help(tid)
    assert old['paused_for_help']
    try:app.submit_topic(old,{q['id']:str(q['answer']) for q in old['questions']});raise AssertionError('Accepted helped check')
    except ValueError:pass
    fresh=app.STATE['topic_sessions'][app.start_topic(tid,'standard','check')['id']]
    assert fresh['id']!=old['id']
    assert not ({q['prompt'] for q in old['questions']}&{q['prompt'] for q in fresh['questions']})

with tempfile.TemporaryDirectory(prefix='catalyst-topic-api-') as temporary:
    app.configure(state_dir=Path(temporary))
    http=ThreadingHTTPServer(('127.0.0.1',0),app.Handler);thread=threading.Thread(target=http.serve_forever,daemon=True);thread.start()
    base=f'http://127.0.0.1:{http.server_address[1]}'
    opener=build_opener(HTTPCookieProcessor(CookieJar()))
    expected_profile=None
    def request(path,data=None,status=200):
        global expected_profile
        headers={'Content-Type':'application/json'}
        if data is not None and expected_profile:headers['X-Catalyst-Profile']=expected_profile
        req=Request(base+path,data=json.dumps(data).encode() if data is not None else None,headers=headers)
        try:response=opener.open(req,timeout=10)
        except HTTPError as error:response=error
        payload=json.loads(response.read());assert response.status==status,(path,response.status,payload)
        if response.status==200 and path in ('/api/profiles','/api/profiles/create','/api/profiles/select'):expected_profile=payload['current']['id']
        return payload
    try:
        assert request('/api/profiles')['current']['id']=='original'
        assert request('/api/progress')['profile_id']=='original'
        roadmap=request('/api/roadmap')
        for course in roadmap['courses']:
            for topic in course['topics']:
                assert 'independent_check' not in topic.get('lesson',{})
                for q in topic.get('lesson',{}).get('practice',[]):assert not ({'answer','explanation','hint','tolerance'}&q.keys())
        preferences=request('/api/preferences',{'starting_course':roadmap['courses'][0]['id'],'pace':'fast','basic_support':True})
        assert not preferences['mastery_changed'] and not preferences['preferences']['assessed_placement']
        request('/api/preferences',{'starting_course':'unknown-course'},status=400)
        session=request('/api/topic/activity',{'topic_id':tid,'difficulty':'gentle','mode':'practice'})
        qid=session['questions'][0]['id']
        request('/api/topic/draft',{'session_id':session['id'],'answers':{qid:'draft newest'},'revision':2})
        request('/api/topic/draft',{'session_id':session['id'],'answers':{qid:'old network request'},'revision':1})
        resumed=request('/api/topic/activity',{'topic_id':tid,'difficulty':'gentle','mode':'practice'})
        assert resumed['id']==session['id'] and resumed['answers'][qid]=='draft newest'
        request('/api/topic/hint',{'session_id':session['id'],'question_id':qid})
        raw=app.STATE['topic_sessions'][session['id']]
        result=request('/api/topic/submit',{'session_id':session['id'],'answers':{q['id']:str(q['answer']) for q in raw['questions']}})
        assert result['score']==3 and result['independent_score']==2 and not result['passed']
        check=request('/api/topic/activity',{'topic_id':tid,'difficulty':'standard','mode':'check'})
        request('/api/topic/hint',{'session_id':check['id'],'question_id':check['questions'][0]['id']},status=400)
        request('/api/topic/help',{'topic_id':tid})
        pending=request('/api/progress')['topic_sessions']
        assert any(s['id']==check['id'] and s['paused_for_help'] for s in pending)
        reflection=request('/api/topic/reflection',{'topic_id':tid,'text':'My explanation needs a human review.'})
        assert reflection['reflection']['status']=='pending_tutor_review' and not reflection['mastery_changed']
        persisted=json.loads((Path(temporary)/'dashboard_progress.json').read_text(encoding='utf-8'))
        assert persisted['topics'][tid]['reflection']['status']=='pending_tutor_review'
        assert persisted['preferences']['placement_source']=='self_selected'
    finally:http.shutdown();http.server_close();thread.join()

report={'topics_checked':checked,'fresh_mixed_check_sets_after_all_practice':fresh_sets,'failed_check_fresh_retry':True,'all_fresh_sets_tested_then_exhaustion_rejected':True,'private_keys_stripped':True,'practice_per_difficulty':3,'checks_across_difficulties':True,'blank_rejected':True,'exposed_items_never_independent':True,'fresh_help_replacement_after_all_practice':True,'draft_revision_and_resume':True,'explain_back_review_pending':True,'self_selected_route_not_mastery':True,'original_learner_untouched':True}
(Path(__file__).parent/'topic-learning-check.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))
