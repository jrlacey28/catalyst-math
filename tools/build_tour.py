"""Assemble the editable Catalyst walkthrough from real, isolated browser captures.

Rebuild narration with tools/narrate.py, then this script, then HyperFrames render.
This script does not automate a browser or read learner records.
"""
from pathlib import Path
import html, json, textwrap

ROOT=Path(__file__).resolve().parents[1]
TOUR=ROOT/'videos/catalyst-tour'

# Screen names and cut times are relative to each narrated chapter. Captures are
# real UI states; the pointer is an explicitly authored tutorial annotation.
SHOTS=[
 [('home',0,'Your first session, from download to review')],
 [],[],
 [('profiles',0,'A separate learning space for each person')],
 [('placement',0,'A starting estimate — not a permanent label'),('placement-question',6,'One question at a time'),('courses',15,'Browse freely, from basics to advanced ideas')],
 [('watch',0,'Pause. Replay. Follow the chapters.'),('guide',9,'Read the reason for each transformation')],
 [('playground',0,'One directory · three ways to explore'),('playground-search',6,'Search by the idea you need'),('function-1',12,'Predict before changing a parameter'),('function-2',17,'Change the slope: the line becomes steeper'),('function-3',20,'Change the intercept: the line moves down'),('function-4',23,'Probe x = 3 → output 5')],
 [('reasoning',0,'Reveal one justified step'),('reasoning-final',6,'Keep the original restriction'),('compare-1',10,'The same values where both are defined'),('compare-2',17,'At the excluded input, the quotient has no value')],
 [('practice-menu',0,'Choose a useful level of challenge'),('practice',7,'Three problems at a time'),('practice-feedback',14,'Use feedback to choose what to revisit')],
 [('check',0,'Fresh, unassisted work gives different evidence'),('writing',13,'Explain why — a score is only part of the picture')],
 [('motion-predict',0,'Predict what the model will do'),('motion',7,'Connect position, time and rate of change'),('motion-changed',14,'Change one quantity; explain the result')],
 [('homework',0,'Your work is saved together'),('feedback',5,'Inspect your actual explanation'),('feedback-revision',14,'Keep the original and improve the reasoning')],
 [('review',0,'Return later and retrieve the idea'),('tailor',9,'Connect a topic to your interests'),('brief',17,'A tutor brief works without an AI model')],
 [('home',0,'Understand → predict → explore → try → explain → review')]
]

# Focus the captured page without distorting its proportions. These are camera
# crops of real UI states, not rearranged or fabricated interface elements.
FOCUS={
 'home':(0,0,1387,1050), 'profiles':(0,0,1265,712),
 'placement':(255,100,1090,640), 'placement-question':(255,100,1090,860),
 'courses':(255,95,1090,930), 'watch':(265,150,1070,770),
 'guide':(265,40,1070,1050),
 'playground':(255,100,1090,970), 'playground-search':(255,100,1090,760),
 'function-1':(265,55,1070,755), 'function-2':(265,155,1070,755),
 'function-3':(265,235,1070,755), 'function-4':(265,235,1070,755),
 'reasoning':(260,125,1080,590), 'reasoning-final':(260,125,1080,590),
 'compare-1':(270,290,1090,650), 'compare-2':(270,290,1090,650),
 'practice-menu':(265,110,1070,630), 'practice':(290,625,1040,590),
 'practice-feedback':(265,150,1070,960), 'check':(255,120,1090,600),
 'writing':(255,120,1090,700), 'motion-predict':(255,150,1090,740),
 'motion':(270,25,1060,815), 'motion-changed':(270,275,1060,815),
 'homework':(255,90,1090,570), 'feedback':(275,305,1060,700),
 'feedback-revision':(270,270,1060,815), 'review':(265,115,1070,910),
 'tailor':(265,100,1070,1000), 'brief':(265,220,1070,725),
}

CSS='''
*{box-sizing:border-box}html,body{margin:0;width:1920px;height:1080px;overflow:hidden;background:#f4f5ee}
#root{width:100%;height:100%;font-family:system-ui,sans-serif;color:#20372d}
.clip{position:absolute;inset:0}.chapter{position:absolute;left:70px;top:34px;font-size:28px;font-weight:650;letter-spacing:.015em;z-index:30}
.count{position:absolute;right:70px;top:34px;font-size:25px;color:#526458;z-index:30}.frame{position:absolute;left:170px;top:104px;width:1580px;height:889px;border-radius:18px;overflow:hidden;border:1px solid #ccd7c6;background:#fafbf7;box-shadow:0 16px 38px #26483113}
.screen{position:absolute;inset:0;width:100%;height:100%;object-fit:contain}.note{position:absolute;left:70px;right:70px;bottom:24px;text-align:center;font-size:28px;font-weight:550;color:#294c3b}
.progress{position:absolute;left:0;bottom:0;width:1920px;height:5px;background:#52734d;transform-origin:left center}
.setup{position:absolute;inset:140px 140px 140px;background:#e8efdf;border-radius:30px;padding:65px 80px;display:flex;flex-direction:column;justify-content:center;gap:28px}
.setup h1{font-size:65px;line-height:1.1;margin:0 0 10px;max-width:1450px;letter-spacing:-.04em}.setup p{font-size:32px;line-height:1.45;margin:0;max-width:1450px}.setup .muted{color:#4e6656;font-size:26px}
.setup code{font-family:monospace;background:#f9fbf5;padding:18px 24px;border-radius:10px;font-size:38px;display:block;color:#193e2d}.setup .row{display:flex;align-items:center;gap:28px}.setup .num{width:62px;height:62px;border:2px solid #8ba476;border-radius:50%;display:grid;place-items:center;font-size:30px;flex:none}
.launch{background:#e9ebf5}.launch code{background:#f8f9fd;color:#363d61}.end-title{position:absolute;inset:0;opacity:0;background:#eaf0df;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:28px}.end-title img{width:112px;height:112px}.end-title h1{font-size:86px;letter-spacing:-.045em;margin:0}.end-title p{font-size:35px;max-width:1450px;text-align:center;line-height:1.5;margin:0}
.cursor{position:absolute;left:0;top:0;width:42px;height:42px;pointer-events:none;z-index:20;filter:drop-shadow(0 4px 5px #17332738)}.cursor svg{width:100%;height:100%}.pulse{position:absolute;left:-12px;top:-12px;width:40px;height:40px;border:3px solid #365f45;border-radius:50%;opacity:0}
'''

def stamp(sec):
    ms=round(sec*1000);h,ms=divmod(ms,3600000);m,ms=divmod(ms,60000);s,ms=divmod(ms,1000)
    return f'{h:02}:{m:02}:{s:02}.{ms:03}'

def build():
    timings=json.loads((TOUR/'timings.json').read_text(encoding='utf-8'))
    captures=json.loads((TOUR/'capture_metadata.json').read_text(encoding='utf-8'))
    total=sum(p['duration'] for p in timings)
    comp=TOUR/'compositions';comp.mkdir(exist_ok=True)
    mounts=[];story=['# Catalyst walkthrough storyboard\n\nActual captured UI; narrated setup instructions. See verified.json for delivery validation.\n']
    for i,p in enumerate(timings):
        cid=f'chapter-{i+1:02}';dur=p['duration'];shots=SHOTS[i]
        body=f'<div class="chapter">Catalyst · {html.escape(p["title"])}</div><div class="count">{i+1:02} / 14</div>'
        js=['const tl=gsap.timeline({paused:true});']
        if i==1:
            body+='''<section class="setup"><h1>Get the supplied ZIP. Extract it.</h1><div class="row" id="download-a"><span class="num">1</span><div><p><strong>catalyst-offline.zip</strong></p><p class="muted">The app + all lesson videos · best for learning offline</p></div></div><div class="row" id="download-b"><span class="num">2</span><div><p><strong>Extract the archive into a normal folder</strong></p><p class="muted">Open the extracted catalyst folder, not the ZIP preview</p></div></div><div class="row" id="download-c"><span class="num">3</span><div><p><strong>Source, lessons, and the MIT license are included</strong></p><p class="muted">The smaller source ZIP omits MP4s · upstream repository currently private</p></div></div></section>'''
            for k,t in [('download-a',1),('download-b',13),('download-c',22)]:js.append(f'tl.fromTo("#{k}",{{opacity:0,y:16}},{{opacity:1,y:0,duration:.45}}, {t});')
        elif i==2:
            body+='''<section class="setup launch"><h1>Run Catalyst locally.</h1><p id="python">Install Python 3.10+ from python.org</p><div id="windows"><p>Windows · in the extracted folder</p><code>Start Catalyst.cmd</code></div><div id="other"><p>macOS / Linux · terminal in that folder</p><code>python3 start.py</code></div><div id="address"><p>Keep the terminal open. Open your browser to:</p><code>http://127.0.0.1:8766</code></div></section>'''
            for k,t in [('python',.2),('windows',4),('other',13),('address',20)]:js.append(f'tl.fromTo("#{k}",{{opacity:0,y:12}},{{opacity:1,y:0,duration:.4}}, {t});')
        else:
            body+='<div class="frame">'
            for j,(name,start,note) in enumerate(shots):
                asset=TOUR/'assets'/f'{name}.png'
                if not asset.is_file():raise FileNotFoundError(asset)
                sid=f'{cid}-screen-{j}'
                width,height=captures[asset.name]['width'],captures[asset.name]['height']
                crop=FOCUS.get(name,(0,0,width,height))
                if crop[0]+crop[2]>width or crop[1]+crop[3]>height:raise ValueError(f'Crop exceeds {name}')
                view=' '.join(str(n) for n in crop)
                body+=f'<svg id="{sid}" class="screen" viewBox="{view}" preserveAspectRatio="xMidYMid meet" style="opacity:{1 if j==0 else 0}" aria-label="Captured Catalyst app"><defs><clipPath id="{sid}-crop"><rect x="{crop[0]}" y="{crop[1]}" width="{crop[2]}" height="{crop[3]}"/></clipPath></defs><image href="assets/{name}.png" width="{width}" height="{height}" clip-path="url(#{sid}-crop)" data-layout-allow-overflow="true"/></svg>'
                if j:js.append(f'tl.set("#{sid}",{{opacity:1}},{start});')
                if j+1<len(shots):js.append(f'tl.set("#{sid}",{{opacity:0}},{shots[j+1][1]});')
            body+='</div>'
            for j,(_,start,note) in enumerate(shots):
                nid=f'{cid}-note-{j}';body+=f'<div class="note" id="{nid}" style="opacity:{1 if j==0 else 0}">{html.escape(note)}</div>'
                if j:js.append(f'tl.set("#{nid}",{{opacity:1}},{start});')
                if j+1<len(shots):js.append(f'tl.set("#{nid}",{{opacity:0}},{shots[j+1][1]});')
            # Adapted from HyperFrames simulated-cursor, Copyright 2026 HeyGen,
            # Inc., Apache-2.0. Changes: green styling, reduced size, navigation
            # cue timing. See licenses/Apache-2.0-HyperFrames.txt.
            # The arrow is an annotation, never presented as a live screen recording.
            if i==0:
                body+=f'<div id="{cid}-cursor" class="cursor"><div class="pulse" id="{cid}-pulse"></div><svg viewBox="0 0 24 24"><path d="M3 2.8 20.6 14 12.8 15.5 9 22 3 2.8Z" fill="#244f39" stroke="#f8faf4" stroke-width="1.5"/></svg></div>'
                # A brief pointer cue indicates the chapter's relevant navigation.
                js.append(f'gsap.set("#{cid}-cursor",{{x:350,y:850,opacity:0}});tl.set("#{cid}-cursor",{{opacity:1}},.5);tl.to("#{cid}-cursor",{{x:670,y:305,duration:.8,ease:"power2.inOut"}},.5);tl.fromTo("#{cid}-pulse",{{opacity:.8,scale:.2}},{{opacity:0,scale:2.4,duration:.5}},1.3);tl.set("#{cid}-cursor",{{opacity:0}},2.3);')
            if i==13:
                body+='<div id="final-lockup" class="end-title"><img src="assets/catalyst-logo.svg" alt="Catalyst logo"><h1>Make it make sense.</h1><p>One idea. A prediction. Three problems.</p><p>Then explain it — and come back later.</p></div>'
                js.append('tl.to("#final-lockup",{opacity:1,duration:.7},11);tl.to("#chapter-14-note-0",{opacity:0,duration:.4},11);')
        body+=f'<div class="progress" id="{cid}-progress"></div>'
        js.append(f'tl.fromTo("#{cid}-progress",{{scaleX:0}},{{scaleX:1,duration:{dur},ease:"none"}},0);window.__timelines["{cid}"]=tl;')
        page=f'<template><style>#root{{position:absolute;inset:0;overflow:hidden;background:#f4f5ee;color:#20372d;font-family:system-ui,sans-serif}}</style><div id="root" data-composition-id="{cid}" data-width="1920" data-height="1080" data-duration="{dur}">{body}</div><script>{"".join(js)}</script></template>'
        (comp/f'{cid}.html').write_text(page,encoding='utf-8')
        mounts.append(f'<div id="{cid}" class="clip" data-composition-id="{cid}" data-composition-src="compositions/{cid}.html" data-start="{p["start"]}" data-duration="{dur}" data-width="1920" data-height="1080" data-track-index="0"></div>')
        story.append(f'\n## {i+1}. {p["title"]}\n{stamp(p["start"])} · {dur:.2f}s · `compositions/{cid}.html`\nRule: discrete UI states + simulated-cursor (registry) + stat-bars-and-fills chapter progress.\nScreens: {", ".join(s[0] for s in shots) or "Authored setup instructions; no simulated operating-system UI"}.\n{p["text"]}\n')
    page=f'<!doctype html><html lang="en"><head><meta charset="utf-8"><script src="assets/gsap.min.js"></script><style>{CSS}</style></head><body><div id="root" data-composition-id="main" data-width="1920" data-height="1080" data-duration="{total}">{"".join(mounts)}<audio id="tour-voice" src="assets/narration.mp3" data-start="0" data-duration="{total}" data-track-index="10" data-volume="1"></audio></div><script>window.__timelines["main"]=gsap.timeline({{paused:true}});</script></body></html>'
    (TOUR/'index.html').write_text(page,encoding='utf-8')
    (TOUR/'STORYBOARD.md').write_text(''.join(story),encoding='utf-8')
    # Phrase captions inherit exact chapter windows; phrase boundaries are estimated
    # by word count. They remain separate selectable captions, not UI overlays.
    vtt=['WEBVTT\n']
    for p in timings:
        words=p['text'].split();chunks=[words[i:i+12] for i in range(0,len(words),12)]
        span=p['duration']-1.15;cursor=p['start']+.35
        for chunk in chunks:
            end=cursor+span*len(chunk)/len(words)
            vtt.append(f'\n{stamp(cursor)} --> {stamp(end)}\n'+ '\n'.join(textwrap.wrap(' '.join(chunk),54))+'\n');cursor=end
    (TOUR/'captions.vtt').write_text(''.join(vtt),encoding='utf-8')
    print(json.dumps({'chapters':len(timings),'duration':total,'screens':sum(len(s) for s in SHOTS)}))

if __name__=='__main__':build()
