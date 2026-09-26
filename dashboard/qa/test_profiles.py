"""Exercise browser profile isolation over real HTTP using temporary learner files."""
from concurrent.futures import ThreadPoolExecutor
from http.cookiejar import CookieJar
from http.server import ThreadingHTTPServer
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request, build_opener, HTTPCookieProcessor
import json
import sys
import tempfile
import threading

sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import server as app


def client(base,jar=None):
    jar=CookieJar() if jar is None else jar
    opener=build_opener(HTTPCookieProcessor(jar));expected_profile=None
    def request(path,data=None,headers=None,expected=200):
        nonlocal expected_profile
        body=json.dumps(data).encode() if data is not None else None
        hdr={'Content-Type':'application/json',**({'X-Catalyst-Profile':expected_profile} if data is not None and expected_profile else {}),**(headers or {})}
        hdr={key:value for key,value in hdr.items() if value is not None}
        try:response=opener.open(Request(base+path,data=body,headers=hdr),timeout=10)
        except HTTPError as error:response=error
        payload=response.read();assert response.status==expected,(path,response.status,payload)
        value=json.loads(payload) if 'application/json' in response.headers.get('Content-Type','') else payload
        if response.status==200 and path in ('/api/profiles','/api/profiles/create','/api/profiles/select'):expected_profile=value['current']['id']
        return value,response.headers
    return request,jar


with tempfile.TemporaryDirectory(prefix='catalyst-profiles-') as temporary:
    state_dir=Path(temporary)
    app.configure(state_dir=state_dir)
    original=(state_dir/'dashboard_progress.json').read_bytes()
    http=ThreadingHTTPServer(('127.0.0.1',0),app.Handler)
    worker=threading.Thread(target=http.serve_forever,daemon=True);worker.start()
    base=f'http://127.0.0.1:{http.server_address[1]}'
    first,first_jar=client(base);second,second_jar=client(base)
    try:
        descriptor,headers=first('/api/profiles')
        assert descriptor['current']['id']=='original' and descriptor['local_only']
        cookie=headers['Set-Cookie']
        assert 'HttpOnly' in cookie and 'SameSite=Strict' in cookie and 'Max-Age=31536000' in cookie and 'original' not in cookie
        health=first('/api/health')[0]
        assert health['app']=='catalyst' and health['version']==2
        a=first('/api/profiles/create',{'id':'learner_a','name':'Learner A'})[0]
        b=second('/api/profiles/create',{'id':'learner_b','name':'Learner B'})[0]
        for value,identity in ((a,'learner_a'),(b,'learner_b')):
            assert value['current']['id']==identity
            assert value['progress']['profile_id']==identity
            assert value['progress']['lessons']=={} and value['progress']['topics']=={}
            assert value['progress']['homework']=={} and not value['progress']['bridge_passed']
        root=state_dir/'local_profiles/students'
        for identity in ('learner_a','learner_b'):
            profile=root/identity
            mastery=json.loads((profile/'student/mastery.json').read_text())
            assert mastery['skills']=={}
            assert json.loads((profile/'student/skill_map.json').read_text())['assessment']['status']=='not_started'
        homework=json.loads((app.ROOT/app.LESSONS['4A-01']['lesson_path']/'practice.json').read_text())
        qid=homework['batches'][0][0]['id']
        unchanged=first('/api/progress')[0]
        rejected=first('/api/homework',{'lesson_id':'4A-01','answers':{qid:'missing learner binding'}},headers={'X-Catalyst-Profile':None},expected=409)[0]
        assert 'Copy any unsaved work' in rejected['error']
        first('/api/preferences',{'starting_course':'geometry'},headers={'X-Catalyst-Profile':'learner_b'},expected=409)
        assert first('/api/progress')[0]==unchanged
        def save_many(request,label):
            for index in range(12):
                value=f'{label} answer {index}'
                request('/api/homework',{'lesson_id':'4A-01','answers':{qid:value}})
                progress=request('/api/progress')[0]
                assert progress['homework']['4A-01'][qid].startswith(label)
        with ThreadPoolExecutor(max_workers=2) as pool:
            futures=[pool.submit(save_many,first,'A'),pool.submit(save_many,second,'B')]
            for future in futures:future.result()
        assert first('/api/progress')[0]['homework']['4A-01'][qid]=='A answer 11'
        assert second('/api/progress')[0]['homework']['4A-01'][qid]=='B answer 11'
        first('/api/homework',{'lesson_id':'4A-01','answers':{qid:'A newest revision'},'revision':9})
        first('/api/homework',{'lesson_id':'4A-01','answers':{qid:'A stale request'},'revision':8})
        assert first('/api/progress')[0]['homework']['4A-01'][qid]=='A newest revision'
        session=first('/api/activity',{'lesson_id':'4A-01','mode':'practice'})[0]
        second('/api/draft',{'session_id':session['id'],'answers':{}},expected=400)
        assert all(s['id']!=session['id'] for s in second('/api/export')[0]['sessions'])
        # Switching is per browser; old requests retain their original opaque token.
        first('/api/profiles/select',{'id':'learner_b'})
        assert first('/api/progress')[0]['homework']['4A-01'][qid]=='B answer 11'
        second('/api/profiles/select',{'id':'learner_a'})
        assert second('/api/progress')[0]['homework']['4A-01'][qid]=='A newest revision'
        # Two tabs share cookies, but each form remains bound to its displayed learner.
        stale_tab,_=client(base,first_jar)
        assert stale_tab('/api/profiles')[0]['current']['id']=='learner_b'
        first('/api/profiles/select',{'id':'learner_a'})
        before=first('/api/progress')[0]
        assert before['profile_id']=='learner_a'
        stale_tab('/api/homework',{'lesson_id':'4A-01','answers':{qid:'B work from a stale tab'},'revision':999},expected=409)
        # A progress read reports the actual profile but does not silently rebind a form.
        assert stale_tab('/api/progress')[0]['profile_id']=='learner_a'
        stale_tab('/api/preferences',{'starting_course':'arithmetic'},expected=409)
        assert first('/api/progress')[0]==before
        first('/api/profiles/select',{'id':'learner_b'})
        assert (state_dir/'dashboard_progress.json').read_bytes()==original
        for bad in ('../escape','ORIGINAL','con','original','slash/name'):
            first('/api/profiles/create',{'id':bad,'name':'Invalid'},expected=400)
        first('/api/profiles/select',{'id':'missing'},expected=400)
        first('/api/profiles/create',{'id':'learner_a','name':'Duplicate'},expected=400)
        first('/api/profiles',headers={'Host':'evil.example'},expected=403)
        first('/api/homework',{'lesson_id':'4A-01','answers':{}},headers={'Origin':'https://evil.example'},expected=403)
        first('/api/progress',headers={'Sec-Fetch-Site':'cross-site'},expected=403)
        for path in ('/server.py','/profile_store.py','/curriculum_catalog.json','/qa/test_profiles.py','/qa/blocked.js','/downloads/../student/dashboard_progress.json'):
            first(path,expected=404)
        # Persisted answers survive a fresh store process; no global learner pointer is saved.
        app.configure(state_dir=state_dir)
        assert first('/api/profiles')[0]['current']['id']=='learner_b'
        assert second('/api/profiles')[0]['current']['id']=='learner_a'
        reopened,_=client(base)
        reopened('/api/profiles/select',{'id':'learner_a'})
        assert reopened('/api/progress')[0]['homework']['4A-01'][qid]=='A newest revision'
    finally:
        http.shutdown();http.server_close();worker.join()

report={'isolated_profiles':True,'simultaneous_browser_requests':24,'original_unchanged':True,'no_inherited_mastery':True,'opaque_httponly_same_site_cookie':True,'cross_profile_session_rejected':True,'same_cookie_stale_tab_rejected':True,'missing_profile_binding_rejected':True,'progress_exposes_profile_id':True,'host_origin_checks':True,'private_source_blocked':True,'reload_persistence':True,'profile_selection_survives_restart':True,'homework_revision_protected':True}
(Path(__file__).parent/'profiles-check.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))
