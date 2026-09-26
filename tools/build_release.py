"""Build shareable Catalyst archives from explicit shared-content allowlists.

Never walks learner folders, git metadata, model weights, secrets, or QA output.
Run from anywhere with Python 3.10+. Distribution needs only the standard library.
"""
from pathlib import Path
import hashlib
import json
import zipfile

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT.parent / 'releases'
APP = ROOT / 'dashboard'
CAT = json.loads((ROOT / 'courses/levels-4a-4b-5/manifest.json').read_text(encoding='utf-8'))
TOUR = ROOT / 'videos/catalyst-tour'
TOUR_SHARED_FILES = (
    'README.md', 'index.html', 'package.json', 'hyperframes.json', 'hyperframes.lock.json',
    'STORYBOARD.md', 'narration.txt', 'narration.json', 'narration_metadata.json',
    'timings.json', 'captions.vtt', 'poster.jpg', 'verified.json', 'capture_metadata.json',
    'compositions/components/simulated-cursor.html',
    'assets/gsap.min.js', 'assets/catalyst-logo.svg', 'assets/narration.mp3',
    'licenses/Apache-2.0-HyperFrames.txt',
    *(f'compositions/chapter-{number:02}.html' for number in range(1, 15)),
    *(f'assets/{name}.png' for name in (
        'home', 'profiles', 'placement', 'placement-question', 'courses', 'course',
        'watch', 'guide', 'playground', 'playground-search',
        'function-1', 'function-2', 'function-3', 'function-4',
        'reasoning', 'reasoning-final', 'compare-1', 'compare-2',
        'practice-menu', 'practice', 'practice-feedback', 'check', 'writing',
        'motion-predict', 'motion', 'motion-changed', 'homework',
        'feedback', 'feedback-revision', 'review', 'tailor', 'brief',
    )),
)

README = (ROOT / 'COMMUNITY_README.md').read_text(encoding='utf-8')

START = '''"""Launch a clean local Catalyst installation."""
from pathlib import Path
import importlib.util, json, runpy, sys
root = Path(__file__).resolve().parent
(root / 'student').mkdir(exist_ok=True)
if '--student' not in sys.argv and '--state-dir' not in sys.argv:
    if not (root / 'students/learner/student').is_dir():
        spec = importlib.util.spec_from_file_location('new_student', root / 'tools/new_student.py')
        helper = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(helper)
        profile = helper.create_profile(root, 'learner')
        (profile / 'profile.json').write_text(json.dumps({'id':'learner','name':'My learning space'}), encoding='utf-8')
    sys.argv.extend(['--student', 'learner'])
sys.path.insert(0, str(root / 'dashboard'))
runpy.run_path(str(root / 'dashboard/server.py'), run_name='__main__')
'''

def shared_files():
    files = {}
    def add(path):
        path=Path(path)
        if not path.is_file():
            raise FileNotFoundError(path)
        name=path.relative_to(ROOT).as_posix()
        files[name]=path.read_bytes()
    for name in ('index.html','style.css','catalyst.css','catalyst-logo.svg','mark.svg','app.js',
                 'labs.js','learning.js','reasoning.js','reasoning.css','server.py','profile_store.py',
                 'placement.py','placement_bank.py','placement.js','placement.css','PLACEMENT.md',
                 'question_bank.py','concept_variants.py','curriculum_catalog.json','CONTRIBUTING.md',
                 'CURRICULUM_COVERAGE.md','RESEARCH.md','THIRD_PARTY.md','video-catalog.js','video-catalog.css','video_catalog.json',
                 'studio.py','studio_content.json','studio.js','studio.css','studio-labs.js','tutor_ai.py','LEARNING_DESIGN.md',
                 'advanced_guides.json','review.py','review_bank.py','mixed-review.js','mixed-review.css','feedback.py','feedback.js','feedback.css',
                 'playground.js','playground.css','tour.js','tour.css','GETTING_STARTED.md',
                 'calculator.js','calculator.css','calculator-engine.js','lesson-coach.js','lesson-coach.css','lesson_coach.py',
                 'lesson-missions.js','lesson-missions.css','mission-math.js','mission-content.json','MISSIONS.md',
                 'lesson-flow.css','skill-tree.js','skill-tree.css',
                 'learning_support.py','learning-path.js','learning-path.css','project-journeys.js','project-journeys.json',
                 'step-checker.js','step-workspace.js','step-workspace.css','math-input.js','math-input.css','STEP_WORKSPACE.md',
                 'completed-guides-foundations.json','completed-guides-college.json','legacy-scaffolds.json','LEARNER_PILOT.md',
                 'card-art.js','card-art.css','answer_visuals.py','answer-visuals.js','answer-visuals.css',
                 'visual_learning.py','mission-calculations.js','mission-calculations.css','ai-math.js',
                 'ai-learning.js','ai-learning.css','ai-learning-path.json','VISUAL_LEARNING.md',
                 'autosave.js','focus.css','parametric-motion.js','purpose-paths.js','purpose-paths.css','purpose-paths.json','purpose-math.js'):
        add(APP/name)
    # Preserve the concurrently added, shared placement feature imported by the app.
    for name in ('placement.py','placement_bank.py','placement.js','placement.css','PLACEMENT.md'):
        if (APP/name).is_file():add(APP/name)
    for name in ('test_learning.py','test_profiles.py','test_topic_learning.py','test_curriculum.py','test_video_catalog.py','test_placement.py','test_studio.py','test_tutor_ai.py','test_advanced_guides.py','test_mixed_review.py','test_feedback.py','test_learning_extension.py','test_tour.py','test_lesson_coach.py','test_calculator.mjs','test_missions.mjs','test_skill_tree.mjs','test_calculator_support.py','test_frontend_modules.py','test_mission_drafts.py'):
        add(APP/'qa'/name)
    for name in ('test_learning_support.py','test_completed_guides.py','test_project_journeys.mjs','test_step_checker.mjs',
                 'test_mission_calculations.mjs','test_visual_learning.py','test_visual_learning_http.py','test_ai_math.mjs','test_card_art.mjs','test_answer_visuals.py','test_answer_visuals.mjs','test_parametric_motion.mjs','test_purpose_math.mjs','test_reasoning.cjs','test_ai_learning_ui.mjs','test_compact_lesson.cjs','test_autosave.mjs','test_autosave_http.py','test_profiles_ui.mjs'):
        add(APP/'qa'/name)
    for path in sorted((ROOT/'tools').rglob('*.py')):
        add(path)
    add(ROOT/'tools/requirements.txt')
    for name in ('basics.json','middle.json','advanced.json','AUTHORING.md'):
        add(ROOT/'tools/full_catalog'/name)
    add(ROOT/'curriculum/framework.md')
    add(ROOT/'curriculum/lesson_policy.md')
    files['curriculum/prerequisite_graph.md']=b'# Shared prerequisite graph\n\nSee dashboard/curriculum_catalog.json for topic and course prerequisites. These are planning dependencies, not learner evidence.\n'
    files['curriculum/visual_style.md']=b'# Visual lesson standard\n\nUse original mathematical animations, minimal text, semantic colors, small course metadata upper left and actual lesson number upper right. Narration should explain the reasoning and domain restrictions. Use local Manim/Kokoro tooling, synchronize the spoken explanation, and inspect rendered frames and audio. An unrendered scene is not a video; production does not establish mastery.\n'
    add(ROOT/'courses/levels-4a-4b-5/manifest.json')
    add(ROOT/'courses/levels-4a-4b-5/assessment_policy.md')
    for unit in CAT['units']:
        add(ROOT/'courses/levels-4a-4b-5'/unit['id']/'plan.md')
        for test_file in (ROOT/'courses/levels-4a-4b-5'/unit['id']/'tests').iterdir():
            if test_file.suffix in ('.json','.md'):add(test_file)
        for lesson in unit['lessons']:
            folder=ROOT/lesson['lesson_path']
            for name in ('practice.json','practice-1.md','practice-2.md','lesson.md'):
                add(folder/name)
            add(ROOT/'courses/levels-4a-4b-5/qa'/f"{lesson['id']}-0.jpg")
            media=ROOT/lesson['video_path']
            for name in ('scene.py','narration.txt','narration.json','notes.md','timings.json','lesson.json','render_cues.json'):
                if (media/name).is_file():add(media/name)
    for item in json.loads((APP/'video_catalog.json').read_text(encoding='utf-8'))['lessons']:
        if item.get('existing_lesson_id'):continue
        media=ROOT/item['video_path']
        for name in ('scene.py','narration.txt','narration.json','notes.md','timings.json','lesson.json','render_cues.json','captions.vtt','poster.jpg','verified.json','narration_metadata.json'):
            add(media/name)
    # Explicit tour filenames exclude source WAVs, render caches, snapshots,
    # agent instructions, raw audio parts and the offline-only final MP4.
    for name in TOUR_SHARED_FILES:
        if (TOUR/name).is_file():add(TOUR/name)
    add(ROOT/'PUBLIC_QUICKSTART.md')
    add(ROOT/'COMMUNITY_README.md')
    launch=ROOT/'videos/catalyst-launch'
    for name in ('README.md','index.html','package.json','hyperframes.json','hyperframes.lock.json','frame.md','STORYBOARD.md','SCRIPT.md','narration.txt','narration.json','narration_metadata.json','timings.json','captions.vtt','poster.jpg','verified.json','capture_metadata.json','assets/gsap.min.js','assets/catalyst-logo.svg','assets/narration.mp3','compositions/captions.html','compositions/components/soft-blur-in.html','licenses/Apache-2.0-HyperFrames.txt'):
        if (launch/name).is_file():add(launch/name)
    for name in ('01-hook','02-setup','03-courses','04-practice','05-applications','06-progress','07-close'):
        add(launch/'compositions/frames'/f'{name}.html')
    for name in ('home','courses','watch','practice','example','applications','orbit-before','orbit-after','gears-before','gears-after','ai-before','ai-after','tree'):
        add(launch/'assets'/f'{name}.png')
    files['README.md']=(ROOT / 'COMMUNITY_README.md').read_bytes()
    files['LICENSE']=(APP/'LICENSE').read_bytes()
    files['start.py']=START.encode()
    files['Start Catalyst.cmd']=b'@echo off\r\ncd /d "%~dp0"\r\npython start.py\r\npause\r\n'
    files['.gitignore']=b'student/\nstudents/\n.venv/\n__pycache__/\n*.pyc\n*.log\n*.pid\nqa/*-state/\nvideos/**/final.mp4\nvideos/**/audio_parts/\nvideos/**/media/\nvideos/**/*.wav\n'
    # Deny private paths even if a future allowlist edit accidentally includes one.
    for name in files:
        parts=Path(name).parts
        if any(p in {'student','students','diagnostic','.git','.env','models','.venv'} for p in parts):
            raise ValueError('Private path selected for release: '+name)
    return files

def build():
    catalog=json.loads((APP/'video_catalog.json').read_text(encoding='utf-8'))
    expected={t['id'] for c in json.loads((APP/'curriculum_catalog.json').read_text(encoding='utf-8'))['courses'] for t in c['topics']}
    if {v['id'] for v in catalog['lessons']}!=expected:
        raise ValueError('Finish and publish every roadmap video before packaging this release.')
    checked={t['id'] for c in json.loads((APP/'curriculum_catalog.json').read_text(encoding='utf-8'))['courses'] for t in c['topics'] if t.get('lesson') or t.get('existing_lesson_id')}
    for filename in ('advanced_guides.json','completed-guides-foundations.json','completed-guides-college.json'):
        checked.update(t['id'] for t in json.loads((APP/filename).read_text(encoding='utf-8'))['topics'])
    if checked!=expected:
        raise ValueError('Every mapped topic needs an introductory practice/check sequence before this release.')
    tour_video=TOUR/'final.mp4'
    if not tour_video.is_file():
        raise FileNotFoundError('Finish the guided Catalyst walkthrough before packaging release 0.10.2.')
    launch_video=ROOT/'videos/catalyst-launch/final.mp4'
    if not launch_video.is_file():raise FileNotFoundError('Finish the launch video before packaging.')
    OUT.mkdir(exist_ok=True)
    files=shared_files()
    stage=OUT/'catalyst-community'
    stage.mkdir(exist_ok=True)
    for name,content in files.items():
        target=stage/name
        if not target.resolve().is_relative_to(stage.resolve()):raise ValueError(name)
        target.parent.mkdir(parents=True,exist_ok=True)
        target.write_bytes(content)
    summaries=[]
    for full,name in ((False,'catalyst-source.zip'),(True,'catalyst-offline.zip')):
        target=OUT/name
        with zipfile.ZipFile(target,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=6) as z:
            for path,content in files.items():z.writestr('catalyst/'+path,content)
            if full:
                for unit in CAT['units']:
                    for lesson in unit['lessons']:
                        media=ROOT/lesson['video_path']/'final.mp4'
                        z.write(media,'catalyst/'+media.relative_to(ROOT).as_posix(),compress_type=zipfile.ZIP_STORED)
                for item in json.loads((APP/'video_catalog.json').read_text(encoding='utf-8'))['lessons']:
                    if item.get('existing_lesson_id'):continue
                    media=ROOT/item['video_path']/'final.mp4'
                    z.write(media,'catalyst/'+media.relative_to(ROOT).as_posix(),compress_type=zipfile.ZIP_STORED)
                z.write(tour_video,'catalyst/'+tour_video.relative_to(ROOT).as_posix(),compress_type=zipfile.ZIP_STORED)
                z.write(launch_video,'catalyst/'+launch_video.relative_to(ROOT).as_posix(),compress_type=zipfile.ZIP_STORED)
        with zipfile.ZipFile(target) as z:
            assert z.testzip() is None
            assert not any('/student/' in p or '/students/' in p or '/diagnostic/' in p for p in z.namelist())
        summaries.append({'file':name,'bytes':target.stat().st_size,'sha256':hashlib.sha256(target.read_bytes()).hexdigest(),'includes_video':full})
    (OUT/'release-manifest.json').write_text(json.dumps({'application':'Catalyst','version':'0.10.2','private_records_included':False,'archives':summaries},indent=2)+'\n')
    print(json.dumps(summaries,indent=2))

if __name__=='__main__':build()
