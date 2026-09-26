"""Assemble the public launch-film frames, captions and existing local narration."""
from pathlib import Path
import json, html, re, hashlib

ROOT = Path(__file__).resolve().parents[1]
P = ROOT/'videos/catalyst-launch'
SLUGS = ['hook','setup','courses','practice','applications','progress','close']

def stamp(value):
    milliseconds=round(value*1000)
    h, rest=divmod(milliseconds,3600000); m,rest=divmod(rest,60000); s,ms=divmod(rest,1000)
    return f'{h:02}:{m:02}:{s:02}.{ms:03}'

def build():
    timings=json.loads((P/'timings.json').read_text())
    duration=sum(t['duration'] for t in timings)
    captions=[]
    for t in timings:
        sentences=re.findall(r'[^.!?]+[.!?]?',t['text'])
        chunks=[]
        for sentence in sentences:
            words=sentence.strip().split(); line=[]
            for word in words:
                if len(' '.join(line+[word]))>68 and line:
                    chunks.append(' '.join(line)); line=[]
                line.append(word)
            if line:chunks.append(' '.join(line))
        spoken=t['duration']-t['lead']-t['tail']
        count=sum(len(c.split()) for c in chunks); start=t['start']+t['lead']
        for c in chunks:
            length=spoken*len(c.split())/count
            captions.append({'start':start,'duration':length,'text':c})
            start+=length
    vtt='WEBVTT\n\n'+'\n\n'.join(f'{i}\n{stamp(c["start"])} --> {stamp(c["start"]+c["duration"])}\n{c["text"]}' for i,c in enumerate(captions,1))+'\n'
    (P/'captions.vtt').write_text(vtt,encoding='utf-8')
    # Cue timing follows local narration scene boundaries, with sentence duration
    # proportional to spoken words. This is not represented as forced alignment.
    (P/'caption_groups.json').write_text(json.dumps(captions,indent=2),encoding='utf-8')
    caption_html=''.join(f'<div id="caption-{i}" class="clip caption-line" data-start="{c["start"]:.8f}" data-duration="{c["duration"]:.8f}"><span>{html.escape(c["text"])}</span></div>' for i,c in enumerate(captions,1))
    (P/'compositions/captions.html').write_text(f'''<template><style>
    #root{{position:relative;width:1920px;height:1080px;pointer-events:none}}
    .caption-line{{position:absolute;inset:950px 80px auto;height:94px;display:flex;align-items:center;justify-content:center;text-align:center;font:400 36px/1.3 'Segoe UI',system-ui,sans-serif;color:#fff}}
    .caption-line span{{background:#243e34;padding:12px 28px;border-radius:8px;max-width:1720px}}
    </style><div id="root" data-composition-id="captions" data-width="1920" data-height="1080" data-duration="{duration:.8f}">{caption_html}</div><script>window.__timelines=window.__timelines||{{}};window.__timelines.captions=gsap.timeline({{paused:true}});</script></template>''',encoding='utf-8')
    mounts=[]
    for i,(slug,t) in enumerate(zip(SLUGS,timings),1):
        path=P/f'compositions/frames/{i:02}-{slug}.html'
        assert path.is_file(),path
        source=path.read_text(encoding='utf-8')
        assert f'data-composition-id="launch-{i:02}"' in source
        mounts.append(f'<div class="clip" id="scene-{i}" data-composition-id="launch-{i:02}" data-composition-src="compositions/frames/{i:02}-{slug}.html" data-start="{t["start"]:.8f}" data-duration="{t["duration"]:.8f}" data-width="1920" data-height="1080" data-track-index="0"></div>')
    index=f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Catalyst — Make it click</title><script src="assets/gsap.min.js"></script><style>
    *{{box-sizing:border-box}}html,body{{margin:0;width:1920px;height:1080px;overflow:hidden;background:#f6f7f0}}#root{{width:100%;height:100%;position:relative;background:#f6f7f0}}.clip{{position:absolute}}#root>.clip{{inset:0}}
    </style></head><body><div id="root" data-composition-id="main" data-width="1920" data-height="1080" data-duration="{duration:.8f}">{''.join(mounts)}
    <div class="clip" id="caption-track" data-track-kind="captions" data-composition-id="captions" data-composition-src="compositions/captions.html" data-start="0" data-duration="{duration:.8f}" data-width="1920" data-height="1080" data-track-index="2"></div>
    <audio id="launch-voice" src="assets/narration.mp3" data-start="0" data-duration="{duration:.8f}" data-track-index="10" data-volume="1"></audio>
    </div><script>window.__timelines=window.__timelines||{{}};window.__timelines.main=gsap.timeline({{paused:true}});</script></body></html>'''
    (P/'index.html').write_text(index,encoding='utf-8')
    story=(P/'STORYBOARD.md').read_text(encoding='utf-8').replace('- status: outline','- status: animated')
    (P/'STORYBOARD.md').write_text(story,encoding='utf-8')
    images=[{'file':f'assets/{f.name}','sha256':hashlib.sha256(f.read_bytes()).hexdigest()} for f in sorted((P/'assets').glob('*.png'))]
    (P/'capture_metadata.json').write_text(json.dumps({'source':'Actual Catalyst browser interface','release':'0.10.2','capture_method':'CUA screenshot','isolated_demo':True,'private_learner_records':False,'frames':images,'model_changes':{'orbit_speed_km_s':[1.7,2],'gear_teeth':[36,54],'gear_output_rpm':[40,26.67],'ai_actual_updates':[0,1],'ai_mean_square_error':[.26715,.20006]},'caption_timing':'Scene-aligned sentence cues; proportional timing within each spoken scene'},indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'seconds':duration,'scenes':len(mounts),'caption_cues':len(captions)}))

if __name__=='__main__':build()
