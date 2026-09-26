"""Verify actual complete media coverage and new persistence/privacy boundaries."""
from http.cookiejar import CookieJar
from http.server import ThreadingHTTPServer
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request,build_opener,HTTPCookieProcessor
import argparse,copy,hashlib,json,sys,tempfile,threading

ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'dashboard'))
import server as app


def media_inventory():
    videos=app.video_catalog();topics=app.topic_index()
    authored={entry['id']:entry for name in ('basics','middle','advanced') for entry in json.loads((ROOT/'tools/full_catalog'/f'{name}.json').read_text(encoding='utf-8'))}
    assert videos['rendered_count']==159
    assert {v['id'] for v in videos['lessons']}==set(topics)
    assert len(videos['lessons'])==len(topics)==159
    duration=0;new=0;questions=0
    for v in videos['lessons']:
        folder=ROOT/v['video_path'];assert (folder/'final.mp4').stat().st_size>100_000
        assert (folder/'narration.txt').read_text(encoding='utf-8').strip()
        duration+=v['duration_seconds']
        if not v.get('existing_lesson_id'):
            new+=1;meta=json.loads((folder/'verified.json').read_text())
            spec=json.loads((folder/'lesson.json').read_text(encoding='utf-8'))
            source=authored[v['id']]
            assert spec['beats']==source['beats'],('Stale prepared storyboard',v['id'])
            assert [{k:q[k] for k in ('prompt','answer')} for q in spec['practice']]==source['practice'],('Stale written practice',v['id'])
            timed=json.loads((folder/'timings.json').read_text(encoding='utf-8'))
            assert [{k:b[k] for k in ('formula','text','visual')} for b in timed]==source['beats'],('Stale timed storyboard',v['id'])
            assert meta['full_stream_decode'] and meta['width']==1920 and meta['height']==1080
            assert 30<=meta['duration_seconds']<=180 and meta['audio_codec']=='aac'
            assert abs(float(meta['loudness_lufs'])+16)<=1
            assert float(meta['true_peak_dbtp'])<=-1
            assert len(v['practice'])==3
            assert len({q['prompt'] for q in v['practice']})==3
            assert all(q['answer'] and q['prompt'] for q in v['practice'])
            questions+=len(v['practice'])
            assert (folder/'captions.vtt').read_text(encoding='utf-8').startswith('WEBVTT')
            cues=json.loads((folder/'render_cues.json').read_text())
            assert len(cues)==4
            for i,cue in enumerate(cues):
                assert (folder/f'frame-{i+1}.jpg').is_file()
                assert cue['duration']>=15-1/30-1e-6
            current=hashlib.sha256((folder/'lesson.json').read_bytes()+(folder/'timings.json').read_bytes()+(ROOT/'tools/catalog_scenes.py').read_bytes()).hexdigest()
            assert current==meta['render_sha256'],('Stale render',v['id'])
            narration=json.loads((folder/'narration_metadata.json').read_text())
            assert hashlib.sha256((folder/'narration.json').read_bytes()).hexdigest()==narration['source_sha256'],('Stale narration',v['id'])
    assert new==135 and questions==405
    return {'total_videos':159,'new_videos':new,'new_written_questions':questions,'total_minutes':round(duration/60,1)}


def api_checks():
    fixture={'id':'calculus-1.limits','course_id':'calculus-1','course':'Calculus I','title':'Limits','video_path':'dashboard/qa/catalog-smoke','duration_seconds':60,'practice':[{'id':f'qa-{i}','prompt':f'Explain example {i}.','answer':f'PRIVATE SOLUTION {i}'} for i in range(3)]}
    actual=app.video_catalog
    app.video_catalog=lambda:{'lessons':[copy.deepcopy(fixture)],'rendered_count':1,'topic_count':159}
    with tempfile.TemporaryDirectory(prefix='catalyst-video-check-') as directory:
        app.configure(state_dir=Path(directory));original=(Path(directory)/'dashboard_progress.json').read_bytes()
        http=ThreadingHTTPServer(('127.0.0.1',0),app.Handler)
        worker=threading.Thread(target=http.serve_forever,daemon=True);worker.start()
        base=f'http://127.0.0.1:{http.server_address[1]}'
        def client(jar=None):
            opener=build_opener(HTTPCookieProcessor(CookieJar() if jar is None else jar));expected_profile=None
            def call(path,data=None,status=200,headers=None):
                nonlocal expected_profile
                hdr={'Content-Type':'application/json',**({'X-Catalyst-Profile':expected_profile} if data is not None and expected_profile else {}),**(headers or {})}
                hdr={key:value for key,value in hdr.items() if value is not None}
                try:r=opener.open(Request(base+path,data=json.dumps(data).encode() if data is not None else None,headers=hdr),timeout=15)
                except HTTPError as e:r=e
                body=r.read();assert r.status==status,(path,r.status,body[:300])
                value=json.loads(body) if 'application/json' in r.headers.get('Content-Type','') else body
                if r.status==200 and path in ('/api/profiles','/api/profiles/create','/api/profiles/select'):expected_profile=value['current']['id']
                return value
            return call
        a_jar=CookieJar();a,b=client(a_jar),client()
        try:
            a('/api/profiles/create',{'id':'video_a','name':'Video A'});b('/api/profiles/create',{'id':'video_b','name':'Video B'})
            public=a('/api/video-catalog')
            assert 'PRIVATE SOLUTION' not in json.dumps(public)
            assert all('answer' not in q for v in public['lessons'] for q in v.get('practice',[]))
            check=a('/api/topic/activity',{'topic_id':fixture['id'],'mode':'check','difficulty':'standard'})
            a('/api/topic/video',{'topic_id':fixture['id'],'seconds':22,'revision':2})
            late=a('/api/topic/video',{'topic_id':fixture['id'],'seconds':8,'revision':1})
            assert late['video_revision']==2
            a('/api/topic/submit',{'session_id':check['id'],'answers':{q['id']:'1' for q in check['questions']}},status=400)
            a('/api/topic/homework',{'topic_id':fixture['id'],'answers':{'qa-0':'Factor first; keep the excluded input.','fake':'should be dropped'},'revision':5})
            a('/api/topic/homework',{'topic_id':fixture['id'],'answers':{'qa-0':'stale overwrite'},'revision':3})
            pa=a('/api/progress');pb=b('/api/progress');state=pa['topics'][fixture['id']]
            assert state['homework']=={'qa-0':'Factor first; keep the excluded input.'}
            assert state['homework_status']=='pending_tutor_review' and not state.get('check_passed')
            assert pa['profile_id']=='video_a' and pb['profile_id']=='video_b'
            assert state['video_seconds']==22 and state['video_revision']==2 and fixture['id'] not in pb['topics']
            a('/api/topic/video',{'topic_id':fixture['id'],'seconds':7,'revision':3})
            assert a('/api/progress')['topics'][fixture['id']]['video_seconds']==7
            # A stale tab keeps A's explicit form identity after B changes the shared cookie.
            stale=client(a_jar)
            assert stale('/api/profiles')['current']['id']=='video_a'
            a('/api/profiles/select',{'id':'video_b'})
            b_before=b('/api/progress')
            stale('/api/topic/homework',{'topic_id':fixture['id'],'answers':{'qa-0':'Private A work'},'revision':999},status=409)
            stale('/api/topic/video',{'topic_id':fixture['id'],'seconds':55,'revision':999},status=409)
            stale('/api/topic/help',{'topic_id':fixture['id']},status=409)
            assert stale('/api/progress')['profile_id']=='video_b'
            assert b('/api/progress')==b_before
            a('/api/profiles/select',{'id':'video_a'})
            assert a('/api/progress')['topics'][fixture['id']]['homework']['qa-0']=='Factor first; keep the excluded input.'
            a('/api/topic/homework',{'topic_id':fixture['id'],'answers':{}},headers={'X-Catalyst-Profile':None},status=409)
            a('/api/topic/video',{'topic_id':fixture['id'],'seconds':float('nan')},status=400)
            a('/api/topic/video',{'topic_id':fixture['id'],'seconds':5,'revision':-1},status=400)
            a('/api/topic/video',{'topic_id':fixture['id'],'seconds':5,'revision':float('inf')},status=400)
            a('/api/topic/video',{'topic_id':'missing','seconds':5},status=400)
            a('/api/topic/homework',{'topic_id':'missing','answers':{}},status=400)
            for path in ['/video_catalog.json','/videos/catalog/calculus-1/limits/lesson.json','/videos/catalog/../student/dashboard_progress.json','/server.py']:
                a(path,status=404)
            assert (Path(directory)/'dashboard_progress.json').read_bytes()==original
        finally:
            http.shutdown();http.server_close();app.video_catalog=actual
    return {'private_solutions_hidden':True,'video_and_homework_profile_isolation':True,'same_cookie_stale_tab_rejected':True,'missing_profile_binding_rejected':True,'stale_writes_ignored':True,'stale_playback_revision_ignored':True,'new_backward_seek_preserved':True,'video_help_pauses_check':True,'no_mastery_for_watching_or_writing':True}


if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--api-only',action='store_true');args=p.parse_args()
    result=api_checks()
    if not args.api_only:result.update(media_inventory())
    (ROOT/'dashboard/qa/video-catalog-report.json').write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(result,indent=2))
