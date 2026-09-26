"""Autosaved explanations persist without grading; late writes cannot erase them."""
from pathlib import Path
from http.server import ThreadingHTTPServer
from http.cookiejar import CookieJar
from urllib.request import build_opener, HTTPCookieProcessor, Request
from urllib.error import HTTPError
import json, sys, tempfile, threading, unittest
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import server as app

class AutosaveTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();app.configure(Path(self.tmp.name))
        self.server=ThreadingHTTPServer(('127.0.0.1',0),app.Handler)
        self.thread=threading.Thread(target=self.server.serve_forever,daemon=True);self.thread.start()
        self.base='http://127.0.0.1:'+str(self.server.server_port)
        self.client=build_opener(HTTPCookieProcessor(CookieJar()))
        self.client.open(self.base+'/api/profiles').read()
    def tearDown(self):
        self.server.shutdown();self.server.server_close();self.thread.join();self.tmp.cleanup()
    def post(self,text,revision,profile='original'):
        payload={'topic_id':'arithmetic.fractions','text':text,'revision':revision}
        return json.load(self.client.open(Request(self.base+'/api/topic/reflection',data=json.dumps(payload).encode(),
            headers={'Content-Type':'application/json','Origin':self.base,'X-Catalyst-Profile':profile})))
    def test_reload_stale_write_clear_and_no_mastery(self):
        self.assertFalse(self.post('Equal pieces',20)['mastery_changed'])
        self.assertEqual(self.post('Old text',19)['reflection']['text'],'Equal pieces')
        self.assertEqual(self.post('Equal pieces',20)['reflection']['revision'],20)
        state=json.load(self.client.open(self.base+'/api/progress'))
        self.assertFalse(state['topics']['arithmetic.fractions'].get('check_passed'))
        self.assertEqual(self.post('',21)['reflection']['text'],'')
        stored=json.loads((Path(self.tmp.name)/'dashboard_progress.json').read_text(encoding='utf-8'))
        self.assertEqual(stored['topics']['arithmetic.fractions']['reflection']['revision'],21)
        self.assertEqual(stored['topics']['arithmetic.fractions']['reflection']['text'],'')
    def test_profile_and_revision_validation(self):
        self.post('Keep this',10)
        for text,revision,profile,status in [('wrong learner',11,'someone-else',409),('invalid',-1,'original',400),('invalid',True,'original',400),('x'*6001,12,'original',400)]:
            with self.assertRaises(HTTPError) as error:self.post(text,revision,profile)
            self.assertEqual(error.exception.code,status)
        self.assertEqual(self.post('stale',9)['reflection']['text'],'Keep this')

if __name__=='__main__':unittest.main()
