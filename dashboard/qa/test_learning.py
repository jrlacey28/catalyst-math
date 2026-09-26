"""Behavior checks against isolated learner state; never creates real learner evidence."""
from pathlib import Path
import sys,json,tempfile,copy
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import server as app
from question_bank import questions,parse_number,grade

with tempfile.TemporaryDirectory(prefix='math-studio-check-') as tmp:
    app.STATE_DIR=Path(tmp);app.STATE=app.empty();checked=[]
    def solve(lid,mode):
        session=app.start(lid,mode);s=app.STATE['sessions'][session['id']]
        assert all('answer' not in q and 'explanation' not in q and 'hint' not in q for q in session['questions'])
        assert not any(q['previously_exposed'] for q in s['questions'])
        answers={q['id']:str(q['answer']) for q in s['questions']}
        r=app.submit(s,answers);assert r['passed'],(lid,mode,r)
        assert app.submit(s,{})==r # Submission is idempotent, not another attempt.
        return s
    try:app.start('4A-02','check');raise AssertionError('Unlocked out of order')
    except ValueError:pass
    solve('bridge','check')
    for u in app.CAT['units']:
        for l in u['lessons']:
            s=solve(l['id'],'practice')
            assert not app.STATE['lessons'].get(l['id'],{}).get('check_passed')
            if l['id']=='4A-01':
                s=app.STATE['sessions'][app.start(l['id'],'check')['id']]
                try:app.submit(s,{});raise AssertionError('Accepted blank check')
                except ValueError:pass
                bad={q['id']:'incorrect' for q in s['questions']};r=app.submit(s,bad);assert not r['passed'];assert not app.unlocked('4A-02')
            solve(l['id'],'check');assert app.STATE['lessons'][l['id']]['check_passed'];checked.append(l['id'])
        solve(u['id'],'unit')
    persisted=json.loads((Path(tmp)/'dashboard_progress.json').read_text(encoding='utf-8'));assert len(persisted['lessons'])==24
    assert all(x['passed'] for x in persisted['unit_tests'].values())
    # A high unit percentage must not conceal an entirely missing topic.
    fake=dict(id='coverage',lesson_id='4a',mode='unit',hints=[],questions=[])
    for i in range(10):fake['questions'].append(dict(id=str(i),lesson_id='topic'+str(i//2),prompt='test fixture '+str(i),answer=1,kind='number',tolerance=1e-5,explanation='Fixture.',previously_exposed=False))
    result=app.submit(fake,{str(i):'0' if i<2 else '1' for i in range(10)})
    assert result['score']==8 and not result['passed']
    # Assisted success is recorded, not upgraded to independent readiness.
    app.STATE=app.empty();s=app.STATE['sessions'][app.start('4A-01','check')['id']];s['hints']=[s['questions'][0]['id']]
    r=app.submit(s,{q['id']:str(q['answer']) for q in s['questions']});assert r['score']==3 and r['independent_score']==2 and not r['passed']
    app.STATE=app.empty();old=app.STATE['sessions'][app.start('4A-01','check')['id']];app.pause_checks_for_help('4A-01');new=app.STATE['sessions'][app.start('4A-01','check')['id']]
    assert new['id']!=old['id'] and old['paused_for_help']
    assert not ({q['prompt'] for q in old['questions']} & {q['prompt'] for q in new['questions']})
    try:app.submit(old,{q['id']:str(q['answer']) for q in old['questions']});raise AssertionError('Rescored a helped check as independent')
    except ValueError:pass
    assert parse_number('3/4')==.75 and abs(parse_number('2pi')-6.283185307179586)<1e-9 and parse_number('sqrt(49)')==7
    for s in ['__import__("os").system("echo unsafe")','open("x")','2**1000','float("nan")']:
        try:parse_number(s);raise AssertionError('Unsafe input accepted')
        except (ValueError,SyntaxError):pass
    # Each generated item grades its exact answer and has no duplicate choice text.
    for l in app.LESSONS.values():
        for seed in range(10):
            for q in questions(l['slug'],seed):
                assert grade(q,str(q['answer'])),(l['id'],q)
                if q['kind']=='choice':assert len(set(q['options']))==len(q['options'])
report=dict(lessons_checked=checked,practice_and_checks=48,unit_tests=3,blank_rejection=True,locked_progression=True,fresh_retry=True,coverage_gate=True,assistance_not_independent=True,idempotent_submission=True,isolated_state=True,safe_number_parser=True)
(Path(__file__).parent/'learning-check.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2))
