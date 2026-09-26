"""Cross-feature HTTP checks using disposable learner records only."""
from datetime import datetime,timedelta,timezone
from http.cookiejar import CookieJar
from http.server import ThreadingHTTPServer
from pathlib import Path
from urllib.request import Request,build_opener,HTTPCookieProcessor
from urllib.error import HTTPError
from unittest.mock import patch
import json,sys,tempfile,threading,unittest
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import server as app
import review,feedback,tutor_ai

class LearningExtensionHTTP(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory(prefix='catalyst-depth-http-')
        app.ROADMAP=None;app.configure(self.temp.name)
        self.http=ThreadingHTTPServer(('127.0.0.1',0),app.Handler)
        self.thread=threading.Thread(target=self.http.serve_forever,daemon=True);self.thread.start()
        self.client=build_opener(HTTPCookieProcessor(CookieJar()))
        self.base=f'http://127.0.0.1:{self.http.server_address[1]}/api/'
        self.profile='original';self.call('profiles')
    def tearDown(self):
        self.http.shutdown();self.http.server_close();self.thread.join();self.temp.cleanup()
    def call(self,path,data=None,status=200,profile=None):
        request=Request(self.base+path,data=None if data is None else json.dumps(data).encode(),headers={'Content-Type':'application/json','X-Catalyst-Profile':profile or self.profile})
        try:response=self.client.open(request,timeout=15)
        except HTTPError as error:response=error
        result=json.load(response);self.assertEqual(response.status,status,(path,result))
        if path in ('profiles','profiles/create','profiles/select') and response.status==200:self.profile=result['current']['id']
        return result
    def make_writing(self):
        tid='calculus-1.continuity';topic=app.topic_index()[tid]
        answer={p['id']:'I need the value to agree with the two-sided limit. WRITTEN_CONTEXT_MARKER' for p in topic['writing']['parts']}
        self.call('topic/writing',{'topic_id':tid,'revision':1,'answers':answer})
        source=next(s for s in self.call('feedback')['sources'] if tid in s['topic_ids'])
        return self.call('feedback/save',{'source_id':source['id'],'base_revision':0,'request_id':'http-review-create'})['entry']
    def test_overlay_is_available_without_exposing_check_keys(self):
        public=self.call('roadmap');topics={t['id']:t for c in public['courses'] for t in c['topics']}
        guide=topics['calculus-1.continuity']
        self.assertEqual(guide['guide_depth'],'extended');self.assertEqual(len(guide['writing']['parts']),3)
        self.assertNotIn('independent_check',guide['lesson'])
        self.assertTrue(all(not {'answer','explanation','hint'} & q.keys() for q in guide['lesson']['practice']))
        self.assertEqual(len(topics),159)
    def test_structured_work_feedback_versions_and_profile_binding(self):
        original=Path(self.temp.name)/'dashboard_progress.json';baseline=original.read_bytes()
        self.call('profiles/create',{'id':'extension-a','name':'Extension A'})
        entry=self.make_writing();self.assertEqual(entry['versions'][0]['number'],1)
        self.call('topic/writing',{'topic_id':'calculus-1.continuity','revision':1,'answers':{}},status=409)
        brief=self.call('feedback/brief',{'id':entry['id']})
        self.assertIn('WRITTEN_CONTEXT_MARKER',brief['brief']);self.assertNotIn('independent_check',brief['brief'])
        changed=self.call('feedback/revise',{'id':entry['id'],'request_id':'http-revision','base_revision':entry['revision'],'text':'A revised justification with the boundary value checked.','reflection':'I separated the value from the limit.'})['entry']
        self.assertEqual(len(changed['versions']),2)
        self.assertIn('WRITTEN_CONTEXT_MARKER',changed['versions'][0]['text'])
        self.call('profiles/create',{'id':'extension-b','name':'Extension B'})
        self.assertEqual(self.call('feedback')['entries'],[])
        self.call('feedback/open',{'id':entry['id']},status=400)
        self.call('feedback/save',{'id':entry['id']},profile='extension-a',status=409)
        self.assertEqual(original.read_bytes(),baseline)
    def test_mixed_feedback_preserves_earned_interval_and_help_pauses(self):
        fixed=datetime(2030,1,1,tzinfo=timezone.utc)
        with patch.object(review,'now',return_value=fixed):
            s=self.call('review/start',{'mode':'practice','skill_ids':['fractions','functions']})
            private=review.get_session(app.STATE,s['id'])
            self.assertTrue(all('answer' not in q and 'explanation' not in q for q in s['questions']))
            self.call('review/submit',{'session_id':s['id'],'answers':{q['id']:str(q['answer']) for q in private['questions']}})
        with patch.object(review,'now',return_value=fixed+timedelta(days=2)):
            s=self.call('review/start',{'mode':'review'})
            private=review.get_session(app.STATE,s['id'])
            r=self.call('review/submit',{'session_id':s['id'],'answers':{q['id']:str(q['answer']) for q in private['questions']}})
            self.assertEqual(r['independent_score'],3)
            self.assertTrue(all(x['interval_days']==3 for x in r['skill_results']))
            current=self.call('review/state')
            self.assertTrue(all(x['interval_days']==3 for x in current['skills'].values()))
        with patch.object(review,'now',return_value=fixed+timedelta(days=6)):
            s=self.call('review/start',{'mode':'review'})
            self.call('topic/help',{'topic_id':'arithmetic.fractions'})
            saved=next(x for x in self.call('review/state')['sessions'] if x['id']==s['id'])
            self.assertIn('fractions',saved['paused_skill_ids']);self.assertNotIn('functions',saved['paused_skill_ids'])
    def test_written_ai_receives_selected_reasoning_and_rejects_changed_version(self):
        entry=self.make_writing();seen=[]
        data={'topic_id':'calculus-1.continuity','feedback_entry_id':entry['id'],'question':'What is my first unsupported step?','model':'local:test'}
        def answer(model,brief,question):
            seen.append(brief)
            return {'model':model,'text':'Check the value and both one-sided limits separately.','verified':False}
        with patch.object(tutor_ai,'generate',side_effect=answer):result=self.call('studio/ai',data)
        self.assertIn('WRITTEN_CONTEXT_MARKER',seen[0]);self.assertNotIn('independent_check',seen[0])
        self.assertEqual(result['feedback_version'],1);self.assertFalse(result['mastery_changed'])
        def revised(model,brief,question):
            self.call('feedback/revise',{'id':entry['id'],'request_id':'changed-during-ai','base_revision':entry['revision'],'text':'The explanation changed while inference was running.','reflection':'I checked both limits.'})
            return answer(model,brief,question)
        with patch.object(tutor_ai,'generate',side_effect=revised):self.call('studio/ai',data,status=409)

if __name__=='__main__':unittest.main(verbosity=2)
