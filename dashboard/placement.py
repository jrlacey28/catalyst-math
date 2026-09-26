"""Bounded adaptive screening, deliberately separate from mastery/unlock state.

Four algebra routing items, two probes in each other area, five targeted probes.
No psychometric calibration is claimed. Evidence is skill-specific and provisional.
"""
from datetime import datetime, timezone
import random
import uuid
from placement_bank import AREAS, BANK
from question_bank import grade, parse_number

TOTAL = 25


def now():
    return datetime.now(timezone.utc).isoformat()


def available(session, area, rung):
    seen = {r['question_id'] for r in session['responses']}
    return [q for q in BANK.values() if q['area'] == area and q['rung'] == rung and q['id'] not in seen]


def next_rung(session, area):
    rows = [r for r in session['responses'] if r['area'] == area]
    if rows:
        last = rows[-1]
        return max(0, min(len(AREAS[area][1])-1, last['rung'] + (1 if last['independent_correct'] else -1)))
    algebra = [r['rung'] for r in session['responses'] if r['area']=='algebra' and r['independent_correct']]
    best = max(algebra, default=-1)
    # The seed estimates where to probe, never awards evidence in another area.
    return min(3, max(0, best-2)) if area == 'foundations' else (2 if best >= 5 else 1 if best >= 2 else 0)


def choose(session):
    n = len(session['responses'])
    if n == 0:
        area, target = 'algebra', 2
    elif n < 4:
        area = 'algebra'; target = next_rung(session, area)
    elif n < 20:
        area = [a for a in AREAS if a != 'algebra'][(n-4)//2]
        target = next_rung(session, area)
    else:
        # Confirm a lone miss/unfamiliar/assisted response with a distinct form.
        candidates = []
        for q in BANK.values():
            rows = [r for r in session['responses'] if r['topic_id']==q['topic_id']]
            if len(rows)==1 and not rows[0]['independent_correct'] and available(session,q['area'],q['rung']):
                candidates.append(q)
        if candidates:
            area, target = candidates[0]['area'], candidates[0]['rung']
        else:
            # If no uncertain boundary remains, continue the advanced branches
            # and verify an algebra/function boundary using a fresh form.
            area = ['calculus','proof','calculus','proof','functions'][n-20]
            target = next_rung(session, area)
    for rung in sorted(range(len(AREAS[area][1])), key=lambda x:(abs(x-target), x)):
        options = available(session, area, rung)
        if options:
            q = random.SystemRandom().choice(options).copy()
            if 'options' in q:
                q['options'] = q['options'][:]
                random.SystemRandom().shuffle(q['options'])
            return q
    raise ValueError('No fresh placement question remains in this area.')


def current(state):
    return state.get('placement_session')


def start(state):
    if not current(state):
        session = dict(id=uuid.uuid4().hex, version=1, created_at=now(), responses=[],
                       status='in_progress', revision=0, draft={}, result=None)
        session['pending'] = choose(session)
        state['placement_session'] = session
    return export(current(state))


def export(session):
    if not session:
        return {'status':'not_started','total':TOTAL,'bank_size':len(BANK)}
    result = {k:session[k] for k in ('id','status','revision','result')}
    result.update(total=TOTAL, answered=len(session['responses']), draft=session.get('draft',{}),
                  bank_size=len(BANK))
    q = session.get('pending')
    if q:
        result['question'] = {k:q[k] for k in ('id','prompt','kind','topic_id','area')}
        result['question']['area_title'] = AREAS[q['area']][0]
        result['question']['assisted'] = bool(q.get('assisted'))
        if 'options' in q:result['question']['options'] = q['options']
    return result


def validate_request(session, data):
    if not session or data.get('session_id') != session['id']:
        raise ValueError('This placement belongs to a different session. Reload to resume.')
    if session['status'] != 'in_progress':
        raise ValueError('This placement is already complete.')
    if data.get('question_id') != session['pending']['id'] or data.get('revision') != session['revision']:
        raise ValueError('This question changed in another tab. Reload to resume your saved test.')


def fields(data):
    answer, reasoning = data.get('answer',''), data.get('reasoning','')
    if not isinstance(answer,str) or len(answer)>500 or not isinstance(reasoning,str) or len(reasoning)>6000:
        raise ValueError('Use a short answer and at most 6,000 characters of working.')
    confidence = data.get('confidence','not_reported')
    if confidence not in ('not_reported','confident','unsure','guess'):
        raise ValueError('Choose a supported confidence option.')
    assisted = data.get('assisted',False)
    if type(assisted) is not bool:raise ValueError('Help status must be true or false.')
    return dict(answer=answer,reasoning=reasoning,confidence=confidence,assisted=assisted)


def draft(state, data):
    session = current(state); validate_request(session,data)
    session['draft'] = fields(data)
    session['revision'] += 1
    return export(session)


def expose(state, data):
    session = current(state)
    if session and session['status']=='in_progress' and data.get('session_id')==session['id'] and data.get('question_id')==session['pending']['id']:
        session['pending']['assisted'] = True
    return {'saved':True}


def answer(state, data, topics):
    session = current(state)
    # Exact retries after a dropped response are idempotent; never count twice.
    if session and data.get('session_id')==session['id']:
        old = next((r for r in session['responses'] if r['question_id']==data.get('question_id')),None)
        if old:
            if old['submission'] == data:return export(session)
            raise ValueError('That response was already submitted. Reload to resume.')
    validate_request(session,data)
    values = fields(data)
    action = data.get('action','answer')
    if action not in ('answer','dont_know','unfamiliar'):raise ValueError('Unknown answer action.')
    q = session['pending']
    if action == 'answer':
        if not values['answer'].strip():raise ValueError('Enter an answer or choose “I don’t know yet.”')
        if q['kind']=='choice' and values['answer'] not in q['options']:raise ValueError('Choose one of the listed answers.')
        if q['kind']=='number':
            try:parse_number(values['answer'])
            except (ValueError,TypeError,ZeroDivisionError,OverflowError,SyntaxError,RecursionError):
                raise ValueError('Enter a number, fraction, or expression such as 3/4 or sqrt(2).') from None
    correct = grade(q,values['answer']) if action=='answer' else None
    independent = not (values['assisted'] or q.get('assisted') or values['confidence']=='guess')
    row = dict(question_id=q['id'],topic_id=q['topic_id'],area=q['area'],rung=q['rung'],
               prompt=q['prompt'],**values,action=action,correct=correct,independent=independent,
               independent_correct=bool(correct and independent),submitted_at=now(),
               reasoning_status='pending_tutor_review' if values['reasoning'].strip() else 'not_provided',
               error_category='unclassified' if correct is False else None,submission=data.copy())
    row['assisted'] = bool(values['assisted'] or q.get('assisted'))
    session['responses'].append(row)
    session['revision'] += 1; session['draft'] = {}
    if len(session['responses'])==TOTAL:
        session.update(status='complete',pending=None,completed_at=now())
        session['result'] = report(session,topics)
    else:session['pending'] = choose(session)
    return export(session)


def report(session, topics):
    evidence = []
    for topic_id in dict.fromkeys(q['topic_id'] for q in BANK.values()):
        rows = [r for r in session['responses'] if r['topic_id']==topic_id]
        hits = sum(r['independent_correct'] for r in rows)
        misses = sum(r['correct'] is False and r['independent'] for r in rows)
        unknown = sum(r['action'] != 'answer' for r in rows)
        status = ('unknown' if not rows else 'mixed' if hits and (misses or unknown)
                  else 'positive_evidence' if hits else 'needs_review' if misses
                  else 'not_yet_learned' if unknown else 'assisted_or_guessed')
        evidence.append(dict(topic_id=topic_id,title=topics[topic_id]['title'],status=status,
                             independent_correct=hits,incorrect=misses,attempts=len(rows),
                             confidence='corroborated' if hits>=2 or misses>=2 else 'limited',
                             evidence_ids=[r['question_id'] for r in rows]))
    areas = []
    for area,(title,rungs) in AREAS.items():
        rows = [r for r in session['responses'] if r['area']==area]
        issues = [e for e in evidence if e['topic_id'] in {t for t,_ in rungs} and e['attempts'] and e['status']!='positive_evidence']
        if issues:
            topic = issues[0]['topic_id']
            reason = 'Start with a short check here; these responses need clarification or practice.'
        else:
            highest = max((r['rung'] for r in rows if r['independent_correct']),default=-1)
            topic = rungs[min(highest+1,len(rungs)-1)][0]
            reason = 'Try the next concept with a fresh check.' if highest<len(rungs)-1 else 'Try deeper applications here; the screening ceiling was reached.'
        areas.append(dict(id=area,title=title,topic_id=topic,topic_title=topics[topic]['title'],
                          reason=reason,needs_check=bool(issues),sampled=len(rows),
                          independent_correct=sum(r['independent_correct'] for r in rows)))
    primary = next((a for a in areas if a['needs_check']),next(a for a in areas if a['id']=='calculus'))
    tested = {r['topic_id'] for r in session['responses']}
    return dict(recommendation=primary,areas=areas,skills=evidence,
                untested_topics=[dict(topic_id=tid,title=t['title']) for tid,t in topics.items() if tid not in tested],
                answered=len(session['responses']),mastery_assessed=False,provisional=True,
                reasoning_pending=sum(bool(r['reasoning'].strip()) for r in session['responses']),
                responses=[{k:v for k,v in r.items() if k!='submission'} for r in session['responses']],
                note='This 25-question adaptive screen recommends where to begin. It does not certify entire courses, review written reasoning automatically, or establish long-term mastery. Untested topics remain unknown.')
