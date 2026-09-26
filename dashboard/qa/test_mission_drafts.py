from pathlib import Path
from http.server import ThreadingHTTPServer
from http.cookiejar import CookieJar
from urllib.request import build_opener,HTTPCookieProcessor,Request
from urllib.error import HTTPError
import json,sys,tempfile,threading,unittest
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import server as app

class MissionDraftTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();app.configure(Path(self.tmp.name))
        self.server=ThreadingHTTPServer(('127.0.0.1',0),app.Handler)
        self.thread=threading.Thread(target=self.server.serve_forever,daemon=True);self.thread.start()
        self.base='http://127.0.0.1:'+str(self.server.server_port)
        self.client=build_opener(HTTPCookieProcessor(CookieJar()))
        self.client.open(self.base+'/api/profiles').read()
    def tearDown(self):
        self.server.shutdown();self.server.server_close();self.thread.join();self.tmp.cleanup()
    def post(self,data,profile='original'):
        return json.load(self.client.open(Request(self.base+'/api/topic/mission',data=json.dumps(data).encode(),headers={'Content-Type':'application/json','Origin':self.base,'X-Catalyst-Profile':profile})))
    def test_saved_draft_resumes_and_stale_revision_cannot_erase_it(self):
        data={'topic_id':'calculus-1.derivatives','prediction':'Faster initially','explanation':'The slope is velocity.','revision':2}
        self.assertFalse(self.post(data)['mastery_changed'])
        self.post({**data,'prediction':'Old text','revision':1})
        state=json.load(self.client.open(self.base+'/api/progress'))
        self.assertEqual(state['topics'][data['topic_id']]['mission']['prediction'],'Faster initially')
        self.assertNotIn('check_passed',state['topics'][data['topic_id']])
    def test_profile_binding_and_bounds(self):
        data={'topic_id':'number-sense.counting','prediction':'A','explanation':'B','revision':1}
        with self.assertRaises(HTTPError) as err:self.post(data,'different-profile')
        self.assertEqual(err.exception.code,409)
        for override in ({'prediction':'x'*6001},{'revision':-1},{'topic_id':'missing'}):
            with self.assertRaises(HTTPError) as err:self.post({**data,**override})
            self.assertEqual(err.exception.code,400)

if __name__=='__main__':unittest.main()
