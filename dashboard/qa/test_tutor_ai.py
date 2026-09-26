"""Optional AI protocol and profile isolation. Uses mocks, never downloads a model."""
from pathlib import Path
from http.server import ThreadingHTTPServer
from http.cookiejar import CookieJar
from urllib.request import Request, build_opener, HTTPCookieProcessor
from urllib.error import HTTPError
from unittest.mock import patch
import json
import sys
import tempfile
import threading
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import server as app
import tutor_ai


class LocalModelTests(unittest.TestCase):
    def test_missing_model_is_an_honest_optional_state(self):
        with patch.object(tutor_ai, 'request', side_effect=OSError('absent')):
            result=tutor_ai.status()
        self.assertFalse(result['available'])
        self.assertEqual(result['models'], [])

    def test_remote_models_excluded(self):
        names=tutor_ai.local_names({'models':[{'name':'local:small'}, {'name':'remote:cloud'},
            {'name':'remote','remote_host':'https://example.org'}, {'name':'remote2','remote_model':'remote'},
            {'name':'local:small'}, {'name':None}]})
        self.assertEqual(names,['local:small'])

    def test_protocol_is_grounded_nonstreaming_and_not_grading(self):
        calls=[]
        def fake(path,payload=None,timeout=2):
            if path=='/api/tags':return {'models':[{'name':'local:small'}]}
            calls.append((path,payload,timeout))
            return {'done':True,'message':{'content':'Explain the common factor before cancelling.'}}
        with patch.object(tutor_ai,'request',side_effect=fake):
            result=tutor_ai.generate('local:small','Authored reference: x cannot equal 2.','Why factor first?')
        self.assertFalse(result['verified'])
        self.assertEqual(calls[0][0],'/api/chat')
        self.assertFalse(calls[0][1]['stream'])
        self.assertIn('not assign grades',calls[0][1]['messages'][0]['content'])
        self.assertIn('x cannot equal 2',calls[0][1]['messages'][1]['content'])
        self.assertNotIn('tools',calls[0][1])

    def test_invalid_selection_redirect_and_empty_response_rejected(self):
        with patch.object(tutor_ai,'status',return_value={'models':['local']}):
            with self.assertRaises(ValueError):tutor_ai.generate('remote:cloud','Context','Why?')
            with self.assertRaises(ValueError):tutor_ai.generate('local','Context',' ')
            with patch.object(tutor_ai,'request',return_value={'done':True,'message':{'content':''}}):
                with self.assertRaises(ValueError):tutor_ai.generate('local','Context','Why?')
        with self.assertRaises(ValueError):tutor_ai.NoRedirect().redirect_request(None,None,302,None,None,None)


class AIProfileTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory(prefix='catalyst-ai-test-')
        app.configure(self.temp.name)
        self.http=ThreadingHTTPServer(('127.0.0.1',0),app.Handler)
        self.thread=threading.Thread(target=self.http.serve_forever,daemon=True);self.thread.start()
        self.base=f'http://127.0.0.1:{self.http.server_address[1]}'
        self.client=build_opener(HTTPCookieProcessor(CookieJar()))
        self.call('profiles')

    def tearDown(self):
        self.http.shutdown();self.http.server_close();self.thread.join();self.temp.cleanup()

    def call(self,path,data=None,profile='original'):
        headers={'Content-Type':'application/json','X-Catalyst-Profile':profile}
        req=Request(self.base+'/api/'+path,data=None if data is None else json.dumps(data).encode(),headers=headers)
        try:
            with self.client.open(req,timeout=5) as response:return response.status,json.load(response)
        except HTTPError as error:return error.code,json.load(error)

    def data(self):
        return {'topic_id':'calculus-1.chain-rule','goal':'Animate a growing circle','interests':['design'],
                'question':'Why is there an inner derivative?','model':'local:small'}

    def test_reply_is_saved_with_authored_context_without_test_keys(self):
        status,check=self.call('topic/activity',{'topic_id':'calculus-1.chain-rule','mode':'check','difficulty':'standard'})
        self.assertEqual(status,200,check)
        seen=[]
        def fake(model,brief,question):
            seen.append(brief)
            return {'text':'Start with the radius as the inside function.','model':model,'verified':False}
        with patch.object(tutor_ai,'generate',side_effect=fake):
            status,result=self.call('studio/ai',self.data())
        self.assertEqual(status,200,result)
        self.assertEqual(result['profile_id'],'original')
        self.assertFalse(result['mastery_changed'])
        self.assertTrue(app.STATE['topic_sessions'][check['id']]['paused_for_help'])
        self.assertIn('Authored reference',seen[0])
        self.assertNotIn('independent_check',seen[0])
        self.assertNotIn('"answer":',seen[0])
        _,saved=self.call('studio/state')
        self.assertEqual(saved['ai_history'][0]['text'],result['text'])
        _,progress=self.call('progress')
        self.assertEqual(progress['lessons'],{})
        self.assertEqual(progress['topics'].get('calculus-1.chain-rule',{}).get('check_passed',False),False)

    def test_missing_binding_never_calls_model(self):
        with patch.object(tutor_ai,'generate') as mocked:
            status,_=self.call('studio/ai',self.data(),profile='another-learner')
        self.assertEqual(status,409)
        mocked.assert_not_called()

    def test_profile_switch_during_inference_discards_reply(self):
        def fake(model,brief,question):
            # This synchronous request can finish only if inference released LOCK.
            status,result=self.call('profiles/create',{'id':'ai-second','name':'Second test learner'})
            self.assertEqual(status,200,result)
            return {'text':'This reply belongs to the old learner.','model':model,'verified':False}
        with patch.object(tutor_ai,'generate',side_effect=fake):
            status,result=self.call('studio/ai',self.data())
        self.assertEqual(status,409,result)
        _,current=self.call('studio/state',profile='ai-second')
        self.assertEqual(current['ai_history'],[])
        self.call('profiles/select',{'id':'original'},profile='ai-second')
        _,original=self.call('studio/state')
        self.assertEqual(original['ai_history'],[])


if __name__=='__main__':unittest.main(verbosity=2)
