"""Prepare the public Catalyst launch film's documented scenes from local narration."""
from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]
P = ROOT / 'videos/catalyst-launch'

def prepare():
    timings = json.loads((P / 'timings.json').read_text())
    # The preset's automatic palette matching selected gold as green. Restore
    # the actual brand roles explicitly; these are public application colors.
    frame = (P / 'frame.md').read_text(encoding='utf-8')
    for old, new in {'#614913':'#315c47','#4C3A0F':'#243e34','#785B18':'#617465','#F1E0B9':'#edf0fc','JetBrains Mono':'Consolas'}.items():
        frame = frame.replace(old, new)
    (P / 'frame.md').write_text(frame, encoding='utf-8')
    scenes = [
        ('hook','assets/catalyst-logo.svg','0–2.8s: a few original mathematical symbols resolve into one clean graph, leaving generous space. 2.8–4.8s: the actual logo and Catalyst name reveal. 4.8–end: See it. / Try it. / Make it click. reveal on the spoken cues. Cream canvas, forest ink, gold and lavender diagram accents. Large type. Do not use a screenshot in this opening.'),
        ('setup','assets/catalyst-logo.svg','0–3s: a large 01 beside Python 3.10+ and Extract offline ZIP. 3–5.6s: 02 and Windows: Start Catalyst.cmd. 5.6–9.2s: adjacent Mac / Linux terminal types python3 start.py. 9.2–end: 03 and http://127.0.0.1:8766 in a large browser address strip. A clean graphic of these instructions, not a forged GitHub screenshot. Keep only the currently relevant step prominent; keep the final address fully readable for 3s.'),
        ('courses','assets/home.png, assets/courses.png','0–3.4s: cream layout, left title Find your starting point. / Placement or a course. and actual home screenshot on the right. 3.4–end: clean cut to actual courses screenshot at a readable scale, plus Counting → College and 159 introductory videos as brief left-side annotations. No invented course completions. Use the screenshot with measured crop, not a rebuilt app. Primary panel x=620,y=170,w=1200,h=690; source plate 1265×712.'),
        ('practice','assets/watch.png, assets/practice.png, assets/example.png','0–2.6s: real watch screenshot, small heading Watch the idea. 2.6–5s: real practice screenshot with Try three problems. 5–end: real example screenshot and See why the step works. UI dominant at x=600,y=170,w=1220,h=690, headline left x=100 width440. Use clean cuts between images timed to narration, with slight opacity/lift entrance only; do not pan microscopic text.'),
        ('applications','assets/orbit-before.png, assets/orbit-after.png, assets/gears-before.png, assets/gears-after.png, assets/ai-before.png, assets/ai-after.png','0–3.3s: actual orbital model before then after control. 3.3–5.2s: gear screenshot swaps before/after with exact 40 → 26.67 rpm overlay. 5.2–end: actual AI training screenshot before/after with Train a tiny model. Small field label each time, large real screen dominant. Screens are 1265×712, use a centered 1480×833 panel beginning y=120 or an appropriate measured crop. Do not invent outcomes or fake interaction. No persistent text more than one short line.'),
        ('progress','assets/tree.png','0–4s: actual fresh learner skill tree screenshot, left headline Earn your next star. Display no fake earned achievement. 4–6.3s: the real autosave badge captured on tree or a clearly editorial label Autosave on, 60-second safety check. 6.3–end: headline Come back. Keep growing. plus Review → practice → check. UI panel x=600,y=160,w=1220,h=700. Stars in the illustrative heading are illustrative; never change the captured learner evidence.'),
        ('close','assets/catalyst-logo.svg','0–2.8s: centered logo and wordmark, Free · Open source · Local first. 2.8–5.3s: Start with one idea. in display type, with gold underline drawing on. 5.3–end: Build from there. smaller, all elements hold. Cream ground; original logo unchanged. No unverified public URL; setup guide is delivered alongside the video.')
    ]
    doc = '---\nformat: 1920x1080\nduration: 60s\nmessage: See the idea. Try it. Make math click.\narc: Demo Loop\naudience: Independent math learners and contributors\nmode: autonomous\n---\n\n## Video direction\n\nA warm, energetic current-interface tour. Original Catalyst logo; cream, forest green, gold, lavender. Narration gives the detail. One short headline at a time. Safe bounds x=90..1830, y=80..910. Caption keep-out band y=950..1060; the root owns captions and audio. Clean cuts between scenes; no shared-element handoffs. Each frame is 1920×1080, no body margins. Every frame must have its own full-duration background clip and a registered paused GSAP timeline. Read assets relative to project root in assembled output, including nested frame files: use assets/ paths. Do not load remote fonts or scripts. Local GSAP is assets/gsap.min.js. Original captures are not rebuilt. Subcomposition IDs launch-01 through launch-07.\n'
    inventory = '# Capture inventory\n\nActual screenshots use an isolated local demo on port 8787; personal progress is never loaded.\n'
    for i, ((slug,assets,direction), t) in enumerate(zip(scenes,timings),1):
        doc += f'\n## Frame {i} — {t["title"]}\n\n- scene: {t["title"]}\n- duration: {t["duration"]:.8f}s\n- transition_in: cut\n- status: outline\n- blueprint: compose\n- asset_candidates: {assets}\n- src: compositions/frames/{i:02}-{slug}.html\n- voiceover: {t["text"]}\n\n{direction}\n\nUse restrained opacity + y entrance adapted from the installed soft-blur-in registry component, without blur on screenshots. One shot develops across the full narrated beat. Root provides captions and narration. Do not add audio or captions yourself.\n'
        inventory += f'\nFrame {i}: {assets}\n'
    (P/'STORYBOARD.md').write_text(doc,encoding='utf-8')
    (P/'SCRIPT.md').write_text('\n\n'.join(f'## Frame {i}\n\n{t["text"]}' for i,t in enumerate(timings,1)),encoding='utf-8')
    (P/'capture/extracted/asset-descriptions.md').write_text(inventory,encoding='utf-8')
    (P/'capture/extracted/visible-text.txt').write_text('Catalyst. One idea at a time. Courses. Apply the math. Skill tree. Try three problems. See an example. Calculator. Math for physics, mechanical engineering, electrical engineering, architecture, finance and AI. Saved. 159 introductory videos, 29 courses.\n',encoding='utf-8')
    print(f'Prepared {len(timings)} narrated frames, {sum(t["duration"] for t in timings):.2f} seconds.')

if __name__ == '__main__':
    prepare()
