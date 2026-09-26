"""Build, resume and verify every missing narrated roadmap video locally.

Usage: python tools/build_catalog_videos.py --prepare --narrate --render --workers 4
All output is shared instructional material. This never writes learner records.
"""
from pathlib import Path
from concurrent.futures import ProcessPoolExecutor, ThreadPoolExecutor, as_completed
import argparse
import hashlib
import json
import math
import os
import subprocess
import sys
import time

ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'tools/full_catalog'
VIDEO=ROOT/'videos/catalog'
MANIFEST=ROOT/'dashboard/video_catalog.json'
ENGINE=None


def read(p):return json.loads(Path(p).read_text(encoding='utf-8'))
def write(p,data):
    p=Path(p);p.parent.mkdir(parents=True,exist_ok=True)
    temporary=p.with_suffix(p.suffix+'.tmp')
    temporary.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    os.replace(temporary,p)


def content():
    entries=[]
    for name in ('basics','middle','advanced'):
        p=SOURCE/(name+'.json')
        if p.exists():entries.extend(read(p))
    return entries


def prepare(only=None):
    import typst
    roadmap=read(ROOT/'dashboard/curriculum_catalog.json')
    index={t['id']:(c,t,i+1) for c in roadmap['courses'] for i,t in enumerate(c['topics'])}
    entries=content();seen=set();count=0
    for entry in entries:
        tid=entry['id']
        if tid in seen:raise ValueError('Duplicate '+tid)
        seen.add(tid)
        if only and tid not in only:continue
        c,t,i=index[tid]
        if t.get('existing_lesson_id'):raise ValueError('Do not overwrite existing video '+tid)
        if len(entry['beats'])!=4 or len(entry['practice'])!=3:raise ValueError('Four beats / three prompts required: '+tid)
        words=sum(len(b['text'].split()) for b in entry['beats'])
        if not 100<=words<=240:raise ValueError(f'Narration needs 100–240 words: {tid} {words}')
        for b in entry['beats']:
            try:typst.compile(('#set page(width: 30cm, height: auto)\n$ '+b['formula']+' $').encode(),format='svg')
            except Exception as e:raise ValueError(tid+' invalid formula '+b['formula']+' '+str(e))
            from catalog_scenes import expression
            if b['visual']['kind']=='graph':
                for curve in b['visual']['curves']:expression(curve['f'])
        course,slug=tid.split('.',1);folder=VIDEO/course/slug;folder.mkdir(parents=True,exist_ok=True)
        meta={**entry,'course':c['title'],'course_id':c['id'],'title':t['title'],'objective':t['objective'],
              'index':i,'total':len(c['topics']),'prerequisites':t.get('prerequisites',[])}
        for j,q in enumerate(meta['practice'],1):q['id']=f'{tid}.video-practice-{j}'
        write(folder/'lesson.json',meta)
        write(folder/'narration.json',[{**b,'title':f'Idea {j+1}','lead':.4,'tail':.9,'min_duration':15} for j,b in enumerate(entry['beats'])])
        (folder/'scene.py').write_text("from pathlib import Path\nimport sys\nsys.path.insert(0,str(Path(__file__).resolve().parents[4]/'tools'))\nfrom catalog_scenes import CatalogScene\nclass FunctionLesson(CatalogScene):\n    lesson_path=Path(__file__).resolve().parent\n",encoding='utf-8')
        (folder/'notes.md').write_text(f"# {t['title']}\n\n{t['objective']}\n\n{entry['takeaway']}\n\nScope: {entry['scope']}\n\nFour synchronized mathematical scenes, local Kokoro af_heart narration. Written practice is reviewed by a tutor; viewing does not establish mastery.\n",encoding='utf-8')
        (folder/'BRIEF.md').write_text(f"# {c['title']} — {t['title']}\n\nBuild: Manim, local Kokoro. Original mathematical explanation, black canvas, minimal text, 1080p/30fps for this full catalog. Lesson {i}/{len(c['topics'])}. A complete rendered MP4 with embedded narration is required. See lesson.json for the mathematical storyboard. Preserve the learner's records.\n",encoding='utf-8')
        count+=1
    print(f'Prepared and typeset {count} complete video specifications.',flush=True)


def fingerprint(folder,name):
    p=folder/name
    return hashlib.sha256(p.read_bytes()).hexdigest()


def init_voice():
    global ENGINE
    import onnxruntime as ort
    from kokoro_onnx import Kokoro
    options=ort.SessionOptions();options.intra_op_num_threads=2;options.inter_op_num_threads=1
    session=ort.InferenceSession(str(ROOT/'tools/models/kokoro-v1.0.onnx'),sess_options=options,providers=['CPUExecutionProvider'])
    ENGINE=Kokoro.from_session(session,str(ROOT/'tools/models/voices-v1.0.bin'))


def narrate(folder):
    import numpy as np
    import soundfile as sf
    folder=Path(folder);source_hash=fingerprint(folder,'narration.json')
    if (folder/'narration_metadata.json').exists() and read(folder/'narration_metadata.json').get('source_sha256')==source_hash and (folder/'narration.wav').exists():return folder.name+' narration cached'
    parts=read(folder/'narration.json');audio=folder/'audio_parts';audio.mkdir(exist_ok=True)
    # Diagram corrections do not change the spoken recording. Refresh the complete
    # timed storyboard while retaining already verified audio and exact timings.
    if (folder/'timings.json').exists() and (folder/'narration_metadata.json').exists() and (folder/'narration.wav').exists():
        previous=read(folder/'timings.json');metadata=read(folder/'narration_metadata.json')
        audio_fields=('text','lead','tail','min_duration')
        same_voice=metadata.get('voice')=='af_heart' and metadata.get('speed')==.95
        reusable=same_voice and len(previous)==len(parts) and all(
            all(old.get(key)==new.get(key) for key in audio_fields)
            and old.get('duration',0)>0 and (folder/old.get('audio','missing')).is_file()
            for old,new in zip(previous,parts))
        if reusable:
            write(folder/'timings.json',[{**new,**{key:old[key] for key in ('start','duration','audio')}} for old,new in zip(previous,parts)])
            write(folder/'narration_metadata.json',{**metadata,'source_sha256':source_hash})
            return f'{folder.parent.name}.{folder.name} storyboard refreshed; audio reused'
    assembled=[];timings=[];cursor=0
    for i,b in enumerate(parts):
        samples,rate=ENGINE.create(b['text'],voice='af_heart',speed=.95,lang='en-us')
        chunk=np.concatenate([np.zeros(round(rate*.4),dtype=np.float32),np.asarray(samples,dtype=np.float32),np.zeros(round(rate*.9),dtype=np.float32)])
        frames=math.ceil(max(len(chunk)/rate,b['min_duration'])*30)
        chunk=np.pad(chunk,(0,round(frames/30*rate)-len(chunk)))
        name=f'audio_parts/{i+1:02d}.wav';sf.write(folder/name,chunk,rate,subtype='PCM_16')
        timings.append({**b,'start':cursor,'duration':len(chunk)/rate,'audio':name});cursor+=len(chunk)/rate;assembled.append(chunk)
    sf.write(folder/'narration.wav',np.concatenate(assembled),rate,subtype='PCM_16')
    write(folder/'timings.json',timings)
    (folder/'narration.txt').write_text('\n\n'.join(b['text'] for b in parts)+'\n',encoding='utf-8')
    # Timing-matched WebVTT is an optional accessible caption track, not burned-in text.
    def stamp(t):
        ms=round(t*1000);h,ms=divmod(ms,3600000);m,ms=divmod(ms,60000);s,ms=divmod(ms,1000)
        return f'{h:02d}:{m:02d}:{s:02d}.{ms:03d}'
    vtt=['WEBVTT','']
    for b in timings:
        sentences=[s.strip() for s in b['text'].split('. ') if s.strip()]
        total=sum(len(s.split()) for s in sentences);t=b['start']+.4;available=b['duration']-1.3
        for sentence in sentences:
            end=t+available*len(sentence.split())/total
            vtt.extend([f'{stamp(t)} --> {stamp(end)}',sentence,'']);t=end
    (folder/'captions.vtt').write_text('\n'.join(vtt),encoding='utf-8')
    write(folder/'narration_metadata.json',dict(engine='kokoro-onnx',voice='af_heart',speed=.95,sample_rate=rate,duration=cursor,source_sha256=source_hash))
    return f'{folder.parent.name}.{folder.name} narration {cursor:.1f}s'


def render_one(folder):
    import imageio_ffmpeg
    import av
    folder=Path(folder)
    current=hashlib.sha256((folder/'lesson.json').read_bytes()+(folder/'timings.json').read_bytes()+(ROOT/'tools/catalog_scenes.py').read_bytes()).hexdigest()
    if (folder/'verified.json').exists() and read(folder/'verified.json').get('render_sha256')==current and (folder/'final.mp4').exists():return folder.name+' render cached'
    begun=time.time()
    for script,args,log in [('render_lesson.py',['--width','1920','--height','1080','--fps','30','--output','rendered.mp4'],'render.log'),('finish_lesson.py',['--source','rendered.mp4','--output','final.mp4'],'finish.log')]:
        with (folder/log).open('w',encoding='utf-8') as out:
            r=subprocess.run([sys.executable,str(ROOT/'tools'/script),str(folder),*args],stdout=out,stderr=subprocess.STDOUT)
        if r.returncode:raise RuntimeError(str(folder)+'\n'+(folder/log).read_text(encoding='utf-8')[-2100:])
    ffmpeg=imageio_ffmpeg.get_ffmpeg_exe()
    cues=read(folder/'render_cues.json')
    for i,cue in enumerate(cues):
        subprocess.run([ffmpeg,'-y','-hide_banner','-loglevel','error','-ss',str(cue['start']+min(8,cue['duration']/2)),'-i',str(folder/'final.mp4'),'-frames:v','1','-vf','scale=960:540',str(folder/f'frame-{i+1}.jpg')],check=True,capture_output=True)
    subprocess.run([ffmpeg,'-y','-hide_banner','-loglevel','error','-i',str(folder/'frame-1.jpg'),'-vf','scale=640:360',str(folder/'poster.jpg')],check=True,capture_output=True)
    # Decode both complete streams. Metadata-only checking would miss truncated output.
    result=subprocess.run([ffmpeg,'-v','error','-i',str(folder/'final.mp4'),'-f','null','-'],capture_output=True,text=True)
    if result.returncode or result.stderr.strip():raise RuntimeError('Decode failed '+str(folder)+' '+result.stderr[-1000:])
    with av.open(str(folder/'final.mp4')) as container:
        video=container.streams.video[0];audio=container.streams.audio[0];duration=container.duration/1e6
        assert video.width==1920 and video.height==1080 and audio.sample_rate==48000
        assert 30<=duration<=180,(folder,duration)
        metadata={'duration_seconds':round(duration,3),'width':video.width,'height':video.height,'fps':float(video.average_rate),'audio_codec':audio.codec_context.name}
    loudness=read(folder/'loudness.json')
    if abs(float(loudness['output_i'])+16)>1 or float(loudness['output_tp'])>-1.0:raise ValueError('Unexpected loudness '+str(folder))
    if any(c['bounds'][0]<-7 or c['bounds'][1]>7 or c['bounds'][2]<-3.9 or c['bounds'][3]>2.5 for c in cues):raise ValueError('Diagram bounds '+str(folder))
    write(folder/'verified.json',{**metadata,'render_sha256':current,'full_stream_decode':True,'loudness_lufs':loudness['output_i'],'true_peak_dbtp':loudness['output_tp'],'render_wall_seconds':round(time.time()-begun,1)})
    return f'{folder.parent.name}.{folder.name} rendered + decoded {duration:.1f}s ({time.time()-begun:.0f}s wall)'


def publish_manifest():
    roadmap=read(ROOT/'dashboard/curriculum_catalog.json')
    legacy=read(ROOT/'courses/levels-4a-4b-5/manifest.json')
    old={l['id']:l for u in legacy['units'] for l in u['lessons']}
    lessons=[]
    for c in roadmap['courses']:
        for i,t in enumerate(c['topics'],1):
            item={'id':t['id'],'course_id':c['id'],'course':c['title'],'title':t['title'],'objective':t['objective'],'index':i,'total':len(c['topics'])}
            if t.get('existing_lesson_id'):
                l=old[t['existing_lesson_id']];item.update(existing_lesson_id=l['id'],video_path=l['video_path'],duration_seconds=l['duration_seconds'],status='ready',poster='/thumbnails/'+l['id']+'-0.jpg')
            else:
                course,slug=t['id'].split('.',1);folder=VIDEO/course/slug
                if not (folder/'verified.json').exists():continue
                spec=read(folder/'lesson.json');verified=read(folder/'verified.json')
                item.update(video_path=folder.relative_to(ROOT).as_posix(),duration_seconds=verified['duration_seconds'],status='ready',poster='/'+folder.relative_to(ROOT).as_posix()+'/poster.jpg',takeaway=spec['takeaway'],scope=spec['scope'],practice=spec['practice'],chapters=[{'start':b['start'],'title':label} for b,label in zip(read(folder/'timings.json'),['See the idea','Work through it','Connect the steps','Use it carefully'])])
            lessons.append(item)
    write(MANIFEST,{'version':1,'title':'Complete Catalyst video curriculum','lessons':lessons,'topic_count':159,'rendered_count':len(lessons)})
    print(f'Published {len(lessons)}/159 rendered video entries.',flush=True)


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--prepare',action='store_true');parser.add_argument('--narrate',action='store_true');parser.add_argument('--render',action='store_true');parser.add_argument('--publish',action='store_true');parser.add_argument('--workers',type=int,default=4);parser.add_argument('--only',nargs='*');args=parser.parse_args()
    if args.prepare:prepare(args.only)
    folders=[p.parent for p in sorted(VIDEO.glob('*/*/lesson.json')) if not args.only or read(p)['id'] in args.only]
    errors=[]
    if args.narrate:
        with ProcessPoolExecutor(max_workers=min(args.workers,3),initializer=init_voice) as pool:
            futures={pool.submit(narrate,str(f)):f for f in folders}
            for future in as_completed(futures):
                try:print(future.result(),flush=True)
                except Exception as e:errors.append(str(e));print('FAILED '+str(e),flush=True)
    if args.render:
        with ThreadPoolExecutor(max_workers=args.workers) as pool:
            futures={pool.submit(render_one,str(f)):f for f in folders if (f/'timings.json').exists()}
            for future in as_completed(futures):
                try:print(future.result(),flush=True)
                except Exception as e:errors.append(str(e));print('FAILED '+str(e),flush=True)
    if args.publish:publish_manifest()
    if errors:
        write(SOURCE/'build-errors.json',errors)
        raise SystemExit(f'{len(errors)} build failures; see full_catalog/build-errors.json')


if __name__=='__main__':main()
