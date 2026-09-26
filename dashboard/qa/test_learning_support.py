"""Learning tools preserve work and distinguish help, check passes and recall."""
from copy import deepcopy
from datetime import datetime,timedelta,timezone
from http.cookiejar import CookieJar
from http.server import ThreadingHTTPServer
from pathlib import Path
from unittest.mock import patch
from urllib.request import Request,build_opener,HTTPCookieProcessor
from urllib.error import HTTPError
import json,sys,tempfile,threading,unittest
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import server as app
import learning_support as support

TID='arithmetic.ratios'
STAMP=datetime(2030,1,10,12,tzinfo=timezone.utc)

class LearningSupport(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();app.configure(Path(self.tmp.name));self.topics=app.topic_index()
    def tearDown(self):self.tmp.cleanup()
    def pass_check(self,tid=TID):
        session=app.start_topic(tid,'standard','check');private=app.STATE['topic_sessions'][session['id']]
        result=app.submit_topic(private,{q['id']:str(q['answer']) for q in private['questions']})
        self.assertTrue(result['passed']);private.update(created_at=(STAMP-timedelta(days=3,hours=1)).isoformat(),submitted_at=(STAMP-timedelta(days=3)).isoformat())
        return private
    def start_due(self,tid=TID):
        self.pass_check(tid)
        with patch.object(support,'now',return_value=STAMP):return support.start_review(app.STATE,{},self.topics,app.recall_legacy_candidates)
    def notes(self,revision=1,lines=None):
        return {'topic_id':TID,'kind':'steps','revision':revision,'draft':{'lines':lines or ['(x^2-1)/(x-1)','x+1'],'assumptions':'x != 1','reflection':'Why can this factor cancel?'}}
    def test_step_drafts_revisions_and_no_grade(self):
        before=deepcopy(app.STATE['topics']);support.save_notes(app.STATE,self.notes(),self.topics)
        support.save_notes(app.STATE,self.notes(),self.topics)
        with self.assertRaises(support.ConflictError):support.save_notes(app.STATE,self.notes(0),self.topics)
        with self.assertRaises(support.ConflictError):support.save_notes(app.STATE,self.notes(1,['different']),self.topics)
        with self.assertRaises(ValueError):support.save_notes(app.STATE,self.notes(2,['x']*13),self.topics)
        self.assertEqual(app.STATE['topics'],before)
        view=support.export_state(app.STATE,self.topics);view['notes'][TID]['steps']['draft']['lines'][0]='mutated'
        self.assertNotEqual(support.export_state(app.STATE,self.topics)['notes'][TID]['steps']['draft']['lines'][0],'mutated')
    def test_guidance_and_repair_are_not_mastery(self):
        support.save_notes(app.STATE,{'topic_id':TID,'kind':'scaffold','revision':1,'draft':{'stage':'complete','response':'work','hidden':2}},self.topics)
        for active in (True,False):support.save_repair(app.STATE,{'from_topic_id':TID,'topic_id':'arithmetic.fractions','active':active},self.topics)
        self.assertFalse(app.STATE['learning_support']['repairs'][TID]['active']);self.assertEqual(app.STATE['topics'],{})
        with self.assertRaises(ValueError):support.save_repair(app.STATE,{'from_topic_id':TID,'topic_id':TID,'active':True},self.topics)
    def test_project_draft_controls_and_stage_validation(self):
        data={'project_id':'lunar-expedition','revision':2,'draft':{'stage':1,'models':{'supply':{'people':4,'days':6}},'responses':{'pack':{'decision':'Compare enough water with payload mass.'}}}}
        support.save_project(app.STATE,data);self.assertEqual(support.export_state(app.STATE,self.topics)['projects']['lunar-expedition']['status'],'awaiting_review')
        for change in ({'stage':99},{'models':{'supply':{'days':float('nan')}}},{'models':{'unknown':{}}},{'responses':{'unknown':{}}}):
            bad=deepcopy(data);bad['draft'].update(change)
            with self.assertRaises(ValueError):support.save_project(app.STATE,bad)
        self.assertEqual(app.STATE['topics'],{})
    def test_dated_independent_check_is_required(self):
        app.STATE['topics'][TID]={'check_passed':True}
        with patch.object(support,'now',return_value=STAMP):self.assertFalse(support.sync_reviews(app.STATE,self.topics))
        private=self.pass_check();original=deepcopy(private)
        for change in ({'submitted_at':None},{'submitted_at':(STAMP+timedelta(days=1)).isoformat()},{'paused_for_help':True}):
            private.clear();private.update(deepcopy(original));private.update(change)
            with patch.object(support,'now',return_value=STAMP):self.assertFalse(support.sync_reviews(app.STATE,self.topics))
        private.clear();private.update(deepcopy(original));private['result']=deepcopy(original['result']);private['result']['items'][0]['independent']=False
        with patch.object(support,'now',return_value=STAMP):self.assertFalse(support.sync_reviews(app.STATE,self.topics))
        private.clear();private.update(deepcopy(original))
        with patch.object(support,'now',return_value=STAMP):
            self.assertTrue(support.sync_reviews(app.STATE,self.topics));self.assertFalse(support.sync_reviews(app.STATE,self.topics))
            self.assertEqual(support.export_state(app.STATE,self.topics)['due_topic_ids'],[TID])
    def test_question_identity_must_match_the_pass(self):
        private=self.pass_check();private['result']['items'][0]['id']='invented'
        with patch.object(support,'now',return_value=STAMP):self.assertFalse(support.sync_reviews(app.STATE,self.topics))
    def test_support_before_first_queue_import_still_delays_recall(self):
        self.pass_check()
        with patch.object(support,'now',return_value=STAMP):
            support.pause_for_topics(app.STATE,{TID})
            support.sync_reviews(app.STATE,self.topics)
            self.assertEqual(support.export_state(app.STATE,self.topics)['due_topic_ids'],[])
            self.assertEqual(app.STATE['learning_support']['recall'][TID]['due_at'],(STAMP+timedelta(days=1)).isoformat())
    def test_fresh_three_balanced_and_public_keys_hidden(self):
        session=self.start_due();questions=session['questions'];self.assertEqual(len(questions),3)
        self.assertEqual({q['difficulty'] for q in questions},{'gentle','standard','stretch'})
        for q in questions:self.assertFalse({'answer','hint','explanation'}&q.keys())
        self.assertNotIn('due_snapshot',session)
        with patch.object(support,'now',return_value=STAMP):self.assertEqual(support.start_review(app.STATE,{},self.topics)['id'],session['id'])
        prior=next(iter(app.STATE['topic_sessions'].values()))
        self.assertFalse({q['prompt'] for q in questions}&{q['prompt'] for q in prior['questions']})
    def test_success_is_delayed_recall_and_keeps_stars(self):
        session=self.start_due();stars=deepcopy(app.STATE['topics']);private=app.STATE['learning_support']['reviews'][session['id']]
        data={'session_id':session['id'],'answers':{q['id']:str(q['answer']) for q in private['questions']},'revision':2}
        with patch.object(support,'now',return_value=STAMP):
            result=support.review_action(app.STATE,data,'submit');self.assertEqual(result['independent_score'],3)
            self.assertEqual(result,support.review_action(app.STATE,data,'submit'))
        record=app.STATE['learning_support']['recall'][TID]
        self.assertEqual(record['due_at'],(STAMP+timedelta(days=3)).isoformat());self.assertEqual(record['recall_successes'],1)
        self.assertEqual(app.STATE['topics'],stars)
    def test_download_keeps_all_recall_history_and_hides_pending_keys(self):
        session=self.start_due()
        saved=deepcopy(app.STATE['learning_support']['reviews'][session['id']])
        app.STATE['learning_support']['reviews']={str(i):{**deepcopy(saved),'id':str(i)} for i in range(11)}
        self.assertEqual(len(support.export_state(app.STATE,self.topics)['reviews']),8)
        complete=support.export_state(app.STATE,self.topics,all_reviews=True)
        self.assertEqual(len(complete['reviews']),11)
        self.assertTrue(all('answer' not in q for s in complete['reviews'] for q in s['questions']))
    def test_support_during_recall_invalidates_independence(self):
        session=self.start_due();private=app.STATE['learning_support']['reviews'][session['id']]
        with patch.object(support,'now',return_value=STAMP+timedelta(minutes=1)):
            app.calculator_support('calculus-1.derivatives','graph')
            result=support.review_action(app.STATE,{'session_id':session['id'],'answers':{q['id']:str(q['answer']) for q in private['questions']},'revision':1},'submit')
        self.assertEqual(result['score'],3);self.assertEqual(result['independent_score'],0)
        self.assertTrue(app.STATE['topics'][TID]['check_passed']);self.assertEqual(app.STATE['learning_support']['recall'][TID]['recall_successes'],0)
    def test_support_only_pauses_affected_topics(self):
        self.pass_check();self.pass_check('number-sense.counting')
        with patch.object(support,'now',return_value=STAMP):
            session=support.start_review(app.STATE,{},self.topics)
            support.pause_for_topics(app.STATE,{TID})
        self.assertEqual(app.STATE['learning_support']['reviews'][session['id']]['paused_topic_ids'],[TID])
    def test_recall_draft_validation(self):
        session=self.start_due();data={'session_id':session['id'],'answers':{session['questions'][0]['id']:'working'},'revision':5}
        support.review_action(app.STATE,data,'draft')
        with self.assertRaises(support.ConflictError):support.review_action(app.STATE,{**data,'revision':4},'draft')
        with self.assertRaises(ValueError):support.review_action(app.STATE,{**data,'answers':{'foreign':'x'}},'draft')
        with self.assertRaises(ValueError):support.review_action(app.STATE,data,'submit')
    def test_reviewed_questions_do_not_become_fresh_check_items(self):
        session=self.start_due();seen={q['prompt'] for q in session['questions']}
        check=app.start_topic(TID,'standard','check')
        self.assertFalse(seen&{q['prompt'] for q in check['questions']})
    def test_bank_exhaustion_does_not_recycle_answers(self):
        self.pass_check()
        allq=deepcopy(self.topics[TID]['lesson']['independent_check'])
        app.STATE['topic_sessions']['exposure']={'questions':allq,'mode':'practice'}
        with patch.object(support,'now',return_value=STAMP):
            with self.assertRaisesRegex(ValueError,'available fresh'):support.start_review(app.STATE,{},self.topics)
    def test_legacy_checks_also_schedule_recall(self):
        s=app.start('4A-01','check');private=app.STATE['sessions'][s['id']]
        app.submit(private,{q['id']:str(q['answer']) for q in private['questions']})
        private.update(created_at=(STAMP-timedelta(days=3,hours=1)).isoformat(),submitted_at=(STAMP-timedelta(days=3)).isoformat())
        with patch.object(support,'now',return_value=STAMP):
            r=support.start_review(app.STATE,{},self.topics,app.recall_legacy_candidates)
        self.assertEqual({q['topic_id'] for q in r['questions']},{'geometry.angles'})
        self.assertEqual(len(r['questions']),3)
    def test_project_references_and_independent_written_review(self):
        projects=support.project_content()['projects'];self.assertEqual(len(projects),4);self.assertEqual(sum(len(p['stages']) for p in projects),18)
        for p in projects:
            self.assertTrue(p['assumptions'])
            for stage in p['stages']:
                self.assertIn(stage['topic_id'],self.topics)
                self.assertTrue(all(stage[k] for k in ('prediction','decision','connection')))
    def test_pilot_is_opt_in_and_stopping_is_respected(self):
        with self.assertRaises(ValueError):support.pilot_action(app.STATE,{'action':'enroll','consent':False})
        support.pilot_action(app.STATE,{'action':'enroll','consent':True})
        support.pilot_action(app.STATE,{'action':'observe','task':'Test fixture, not participant evidence','worked':'saved draft'})
        support.pilot_action(app.STATE,{'action':'stop'})
        with self.assertRaises(ValueError):support.pilot_action(app.STATE,{'action':'observe','task':'late'})
        self.assertEqual(len(support.export_state(app.STATE,self.topics)['pilot']['observations']),1)
        self.assertEqual(app.STATE['topics'],{})
    def test_http_profiles_export_and_private_banks(self):
        http=ThreadingHTTPServer(('127.0.0.1',0),app.Handler);worker=threading.Thread(target=http.serve_forever,daemon=True);worker.start()
        def client():
            opener=build_opener(HTTPCookieProcessor(CookieJar()));bound=None
            def request(path,data=None,expected=200,binding=None):
                nonlocal bound
                headers={'Content-Type':'application/json'}
                if data is not None and bound:headers['X-Catalyst-Profile']=binding or bound
                try:response=opener.open(Request(f'http://127.0.0.1:{http.server_address[1]}'+path,data=None if data is None else json.dumps(data).encode(),headers=headers),timeout=10)
                except HTTPError as e:response=e
                body=response.read();self.assertEqual(response.status,expected,body)
                value=json.loads(body) if 'application/json' in response.headers.get('Content-Type','') else body
                if expected==200 and path in ('/api/profiles','/api/profiles/create','/api/profiles/select'):bound=value['current']['id']
                return value
            return request
        try:
            a,b=client(),client();a('/api/profiles');b('/api/profiles')
            a('/api/profiles/create',{'id':'tools_a','name':'Tool tests A'});b('/api/profiles/create',{'id':'tools_b','name':'Tool tests B'})
            a('/api/learning/notes',self.notes());self.assertFalse(b('/api/learning')['notes'])
            b('/api/learning/notes',self.notes(),expected=409,binding='tools_a')
            exported=a('/api/export');self.assertEqual(exported['learning_support']['notes'][TID]['steps']['draft']['lines'][1],'x+1')
            a('/api/learning/repair',{'from_topic_id':TID,'topic_id':'arithmetic.fractions','active':True})
            self.assertFalse(b('/api/learning')['repairs'])
            for file in ('completed-guides-foundations.json','completed-guides-college.json','legacy-scaffolds.json','learning_support.py'):
                a('/'+file,expected=404)
            for file in ('learning-path.js','project-journeys.js','step-checker.js','math-input.css','LEARNER_PILOT.md'):a('/'+file)
        finally:http.shutdown();http.server_close();worker.join()

if __name__=='__main__':unittest.main()
