"""Placement behavior and real HTTP persistence; all learner data is temporary."""
from http.cookiejar import CookieJar
from http.server import ThreadingHTTPServer
import json
from pathlib import Path
import sys
import tempfile
import threading
import unittest
from urllib.error import HTTPError
from urllib.request import build_opener, HTTPCookieProcessor, Request

sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import placement as p
from placement_bank import BANK, AREAS
import server as app

TOPICS = app.topic_index()


def response(state, correct=True, **extra):
    s=state['placement_session'];q=s['pending']
    answer = str(q['answer']) if correct else ('999999' if q['kind']=='number' else next(x for x in q['options'] if x!=q['answer']))
    return dict(session_id=s['id'],question_id=q['id'],revision=s['revision'],answer=answer,**extra)


def complete(policy):
    state={};p.start(state)
    while state['placement_session']['status']=='in_progress':
        p.answer(state,policy(state),TOPICS)
    return state['placement_session']


class PlacementTest(unittest.TestCase):
    def test_bank_and_safe_exports(self):
        self.assertEqual(len(BANK),108)
        self.assertEqual(len({q['prompt'] for q in BANK.values()}),len(BANK))
        for q in BANK.values():
            self.assertIn(q['topic_id'],TOPICS)
            self.assertTrue(p.grade(q,str(q['answer'])),q['id'])
            if q['kind']=='choice':self.assertEqual(len(set(q['options'])),4)
        state={};public=p.start(state)
        self.assertNotIn('answer',public['question'])
        self.assertNotIn('rung',public['question'])
        self.assertEqual(p.start(state)['id'],public['id'])

    def test_strong_path_reaches_college_and_is_bounded(self):
        s=complete(lambda state:response(state))
        self.assertEqual(len(s['responses']),25)
        self.assertEqual(len({r['question_id'] for r in s['responses']}),25)
        self.assertEqual({r['area'] for r in s['responses']},set(AREAS))
        self.assertIn('differential-equations.odes',{r['topic_id'] for r in s['responses']})
        self.assertIn('abstract-algebra.groups',{r['topic_id'] for r in s['responses']})
        self.assertFalse(s['result']['mastery_assessed'])
        self.assertTrue(s['result']['untested_topics'])
        self.assertEqual(s['result']['recommendation']['id'],'calculus')

    def test_struggling_path_reaches_counting_and_confirms(self):
        s=complete(lambda state:response(state,False))
        algebra=[r['rung'] for r in s['responses'] if r['area']=='algebra']
        self.assertEqual(algebra[:3],[2,1,0])
        self.assertEqual(s['result']['recommendation']['topic_id'],'number-sense.counting')
        counting=next(e for e in s['result']['skills'] if e['topic_id']=='number-sense.counting')
        self.assertEqual(counting['confidence'],'corroborated')
        self.assertEqual(counting['incorrect'],2)

    def test_uneven_skills_do_not_flatten_to_course_score(self):
        s=complete(lambda state:response(state,state['placement_session']['pending']['area']!='functions'))
        self.assertEqual(s['result']['recommendation']['id'],'functions')
        self.assertTrue(any(r['area']=='calculus' and r['independent_correct'] for r in s['responses']))
        self.assertTrue(any(e['status']=='unknown' for e in s['result']['skills']))

    def test_unknown_is_not_an_incorrect_answer(self):
        s=complete(lambda state:response(state,action='unfamiliar'))
        self.assertTrue(all(r['correct'] is None for r in s['responses']))
        self.assertTrue(all(e['incorrect']==0 for e in s['result']['skills']))

    def test_help_guess_and_reasoning_are_honest(self):
        state={};p.start(state)
        first=response(state,confidence='guess',reasoning='I guessed this.')
        p.answer(state,first,TOPICS)
        r=state['placement_session']['responses'][0]
        self.assertTrue(r['correct']);self.assertFalse(r['independent_correct'])
        self.assertEqual(r['reasoning_status'],'pending_tutor_review')
        data=response(state)
        p.expose(state,data);p.answer(state,data,TOPICS)
        self.assertFalse(state['placement_session']['responses'][-1]['independent'])

    def test_blank_malformed_stale_and_duplicate(self):
        state={};p.start(state);data=response(state)
        for bad in ('','x=7','__import__("os").system("echo bad")','1/0'):
            with self.assertRaises(ValueError):p.answer(state,{**data,'answer':bad},TOPICS)
        self.assertEqual(len(state['placement_session']['responses']),0)
        draft=p.draft(state,{**data,'reasoning':'working'})
        self.assertEqual(draft['revision'],1)
        with self.assertRaises(ValueError):p.answer(state,data,TOPICS)
        data['revision']=1
        result=p.answer(state,data,TOPICS)
        self.assertEqual(p.answer(state,data,TOPICS),result)
        self.assertEqual(len(state['placement_session']['responses']),1)
        with self.assertRaises(ValueError):p.answer(state,{**data,'answer':'2'},TOPICS)
        with self.assertRaises(ValueError):p.draft(state,{**data,'revision':2})

    def test_http_isolation_resume_and_hidden_keys(self):
        with tempfile.TemporaryDirectory() as folder:
            app.configure(state_dir=Path(folder))
            original=(Path(folder)/'dashboard_progress.json').read_bytes()
            http=ThreadingHTTPServer(('127.0.0.1',0),app.Handler)
            thread=threading.Thread(target=http.serve_forever,daemon=True);thread.start()
            base=f'http://127.0.0.1:{http.server_port}'
            def client():
                opener=build_opener(HTTPCookieProcessor(CookieJar()))
                profile='original'
                def request(path,data=None,status=200):
                    nonlocal profile
                    req=Request(base+path,data=json.dumps(data).encode() if data is not None else None,headers={'Content-Type':'application/json','X-Catalyst-Profile':profile})
                    try:res=opener.open(req)
                    except HTTPError as err:res=err
                    raw=res.read();self.assertEqual(res.status,status,raw)
                    result=json.loads(raw) if 'application/json' in res.headers.get('Content-Type','') else raw
                    if isinstance(result,dict) and result.get('current'):profile=result['current']['id']
                    return result
                return request
            a,b=client(),client()
            try:
                a('/api/profiles/create',{'id':'placement_a','name':'A'})
                b('/api/profiles/create',{'id':'placement_b','name':'B'})
                first=a('/api/placement/start',{})
                self.assertEqual(b('/api/placement')['status'],'not_started')
                self.assertNotIn('answer',first['question'])
                for path in ('/placement_bank.py','/placement.py','/curriculum_catalog.json'):
                    a(path,status=404)
                data=dict(session_id=first['id'],question_id=first['question']['id'],revision=first['revision'],answer='7',reasoning='My saved working')
                saved=a('/api/placement/draft',data)
                app.STORE.states.clear() # Force a real disk reload.
                resumed=a('/api/placement')
                self.assertEqual(resumed['draft']['reasoning'],'My saved working')
                self.assertEqual(resumed['question'],first['question'])
                self.assertEqual(resumed['revision'],saved['revision'])
                b('/api/placement/answer',data,status=400)
                self.assertEqual((Path(folder)/'dashboard_progress.json').read_bytes(),original)
                exported=a('/api/export')
                self.assertNotIn('answer',exported['placement']['question'])
                a('/api/placement/answer',{**data,'revision':saved['revision']})
                self.assertEqual(len(a('/api/export')['placement_responses']),1)
                self.assertEqual(b('/api/progress')['placement']['status'],'not_started')
            finally:http.shutdown();http.server_close();thread.join()


if __name__=='__main__':unittest.main()
