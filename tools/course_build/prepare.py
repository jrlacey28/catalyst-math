from pathlib import Path
import json,html
from geometry_data import LESSONS as G
from statistics_data import LESSONS as S
from algebra_data import LESSONS as A
ROOT=Path(__file__).resolve().parents[2]
COURSE=ROOT/'courses/levels-4a-4b-5'
UNITS=[('4a','Geometry',G),('4b','Statistics Basics',S),('5','Algebra II',A)]
# Keep test A distinct from the narrated variance example.
S[1]['test_a']=[('Treat 0, 3, 6 as a population. Calculate its variance with working.','Mean 3; squared-deviation sum 18; population variance 6.'),('Treat those same observations as a sample. Calculate the usual sample variance and explain the denominator.','9; divide 18 by n-1=2, since the mean was estimated from the sample.')]
manifest={'version':1,'title':'Levels 4A, 4B and 5','units':[],'practice_batch_size':3}
for unit,title,lessons in UNITS:
    base=COURSE/unit;base.mkdir(parents=True,exist_ok=True)
    info={'id':unit,'title':title,'lessons':[],'test_items_per_form':2*len(lessons)}
    tests={'A':[],'B':[]};keys={'practice':{},'A':{},'B':{}}
    rows=[]
    for i,l in enumerate(lessons,1):
        lid=f'{unit.upper()}-{i:02d}';folder=f'{i:02d}-{l["slug"]}'
        target=base/folder;target.mkdir(exist_ok=True)
        video=ROOT/'videos/courses'/unit/folder;video.mkdir(parents=True,exist_ok=True)
        meta={'id':lid,'unit':unit,'course':title,'index':i,'total':len(lessons),'slug':l['slug'],'title':l['title'],'objective':l['objective'],'prerequisites':l['prerequisites'],'formulas':[b[1] for b in l['beats']]}
        (video/'lesson.json').write_text(json.dumps(meta,indent=2)+'\n',encoding='utf-8')
        beats=[{'title':f'phase_{j}','text':b[0],'min_duration':17,'tail':1.0} for j,b in enumerate(l['beats'])]
        (video/'narration.json').write_text(json.dumps(beats,indent=2)+'\n',encoding='utf-8')
        (video/'scene.py').write_text("from pathlib import Path\nimport sys\nsys.path.insert(0,str(Path(__file__).resolve().parents[4]/'tools'))\nfrom course_scenes import CourseScene\nclass FunctionLesson(CourseScene):\n    lesson_path=Path(__file__).resolve().parent\n",encoding='utf-8')
        (video/'BRIEF.md').write_text(f'# {lid} — {l["title"]}\n\nObjective: {l["objective"]}\n\nUse the approved original mathematical-animation style from curriculum/visual_style.md. Four narrated visual stages, no heading cards or caption strips. Small course top left and lesson {i}/{len(lessons)} top right. Local Kokoro af_heart; 1080p/60fps. See lesson.json for mathematical stages.\n',encoding='utf-8')
        items=[]
        for j,(prompt,answer) in enumerate(l['practice'],1):
            qid=f'{lid}-P{j}';items.append({'id':qid,'prompt':prompt});keys['practice'][qid]=answer
        (target/'practice.json').write_text(json.dumps({'lesson_id':lid,'batches':[items[:3],items[3:]],'help':'Ask for help whenever stuck. Record any hints; do not count assisted answers as independent.'},indent=2)+'\n',encoding='utf-8')
        for b in range(2):
            (target/f'practice-{b+1}.md').write_text(f'# {lid} — Practice set {b+1}\n\nTry these three problems. Show enough working to explain your method. Ask questions if you get stuck; help is welcome during practice.\n\n'+'\n\n'.join(f'{j+1}. **{q["id"]}** {q["prompt"]}' for j,q in enumerate(items[b*3:(b+1)*3]))+'\n',encoding='utf-8')
        relvideo=Path('../../../../videos/courses')/unit/folder/'final.mp4'
        (target/'lesson.md').write_text(f'# {lid} — {l["title"]}\n\n**Goal:** {l["objective"]}\n\n**Prerequisites:** {l["prerequisites"]}\n\n[Watch the narrated animation]({relvideo.as_posix()}) · [Transcript]({(relvideo.parent/"narration.txt").as_posix()})\n\nAllow 15–30 minutes: watch/pause/replay, attempt [practice set 1](practice-1.md), discuss questions, then attempt [practice set 2](practice-2.md). Time is flexible; move by understanding, not a timer.\n\nBefore the next lesson, demonstrate the central objective independently. A useful default is at least 5 of 6 practice items independently correct, including the explanation/transfer item, with any essential misconception repaired on a fresh check. Hints are welcome but require a new independent variation later. The unit-end test checks cumulative readiness.\n',encoding='utf-8')
        for form,name in [('A','test_a'),('B','test_b')]:
            for j,(prompt,answer) in enumerate(l[name],1):
                qid=f'{unit.upper()}-T{form}-{len(tests[form])+1:02d}'
                tests[form].append({'id':qid,'lesson_id':lid,'objective':l['objective'],'prompt':prompt,'points':2})
                keys[form][qid]=answer
        entry={**meta,'lesson_path':str(target.relative_to(ROOT)).replace('\\','/'),'video_path':str(video.relative_to(ROOT)).replace('\\','/'),'status':'prepared_render_pending'}
        info['lessons'].append(entry);rows.append(f'| {i} | [{l["title"]}]({folder}/lesson.md) | {l["objective"]} |')
    (base/'plan.md').write_text(f'# Level {unit.upper()} — {title}\n\n{len(lessons)} focused lessons, each with a narrated animation and two practice sets of three. These provide an introductory path through the supplied scope; use targeted extensions when evidence calls for deeper work.\n\n| Lesson | Topic | Goal |\n| --- | --- | --- |\n'+'\n'.join(rows)+f'\n\nEnd test: {2*len(lessons)} questions, two per lesson, delivered three at a time. Tests and a fresh retest form are in tests/. See ../assessment_policy.md for progression decisions.\n',encoding='utf-8')
    testdir=base/'tests';testdir.mkdir(exist_ok=True)
    for form,items in tests.items():
        (testdir/f'form-{form}.json').write_text(json.dumps({'unit':unit,'form':form,'instructions':'Independent work. No hints or answer key during testing. Ask for clarification; substantive teaching makes the item assisted and requires a fresh replacement. Three questions per batch. Calculator allowed for arithmetic after writing the exact setup; no solver or answer lookup.','items':items},indent=2)+'\n',encoding='utf-8')
        for k in range(0,len(items),3):
            (testdir/f'form-{form}-batch-{k//3+1:02d}.md').write_text(f'# Level {unit.upper()} — Test {form}, set {k//3+1}\n\nWork independently and show your reasoning. Exact forms are accepted. Ask if wording is unclear; mathematical help pauses independent scoring for that item.\n\n'+'\n\n'.join(f'{j+1}. **{q["id"]}** {q["prompt"]}' for j,q in enumerate(items[k:k+3]))+'\n',encoding='utf-8')
    (testdir/'tutor_rubric.json').write_text(json.dumps({'warning':'Tutor-only; do not display before learner responses.','scoring':'2 points: correct result and sufficient mathematical reasoning. 1: valid core method with a minor slip or incomplete explanation. 0: missing/incorrect core concept. Do not penalize equivalent notation. Use assessment_policy.md for essential-objective checks.','keys':keys},indent=2)+'\n',encoding='utf-8')
    manifest['units'].append(info)
(COURSE/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
print('Prepared',sum(len(u['lessons']) for u in manifest['units']),'lessons, 144 practice items, and 96 A/B test items.')
