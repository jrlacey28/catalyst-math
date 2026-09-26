"""Per-learner cumulative practice and delayed retrieval; never course mastery.

The HTTP owner supplies the learner lock, profile binding, and persistence. This
module mutates only state['review'] and appends evidence events. It never changes
legacy checks, placement, lesson unlocks, or tutor mastery records.
"""
from copy import deepcopy
from datetime import datetime, timedelta, timezone
from pathlib import Path
import hashlib
import json
import random
import uuid

from question_bank import grade
import review_bank as bank


INTERVALS = (1, 3, 7, 14, 30)
CONTENT_FILES = tuple(Path(__file__).with_name(name) for name in
                      ('curriculum_catalog.json', 'studio_content.json', 'video_catalog.json', 'advanced_guides.json', 'completed-guides-foundations.json', 'completed-guides-college.json'))


class ConflictError(ValueError):
    """The supplied draft or submission conflicts with saved work."""


def now():
    return datetime.now(timezone.utc)


def parse_time(value):
    if not isinstance(value, str):
        return None
    try:
        date = datetime.fromisoformat(value.replace('Z', '+00:00'))
        return date.astimezone(timezone.utc) if date.tzinfo is not None else None
    except ValueError:
        return None


def public_catalog():
    return bank.public_catalog()


def relevant_topics(skill_ids):
    return set(tid for sid in skill_ids if sid in bank.SKILLS for tid in bank.SKILLS[sid]['topic_ids'])


def workspace(state):
    current = state.setdefault('review', {})
    current.setdefault('version', 1)
    for name in ('skills', 'sessions', 'exposures', 'source_evidence'):
        current.setdefault(name, {})
    current.setdefault('counter', 0)
    current.setdefault('generation_salt', uuid.uuid4().hex)
    return current


def skill_record(current, sid):
    return current['skills'].setdefault(sid, {
        'eligible': False, 'status': 'exploring', 'interval_index': 0,
        'interval_days': INTERVALS[0], 'streak': 0, 'independent_successes': 0,
        'attempts': 0, 'practice_successes': 0,
    })


def event(state, kind, **fields):
    state.setdefault('events', []).append({'type': kind, 'time': now().isoformat(), **fields})


def set_due(record, timestamp, index):
    due = timestamp + timedelta(days=INTERVALS[index])
    record.update(interval_index=index, interval_days=INTERVALS[index],
                  due_at=due.isoformat(), due_date=due.date().isoformat())


def _support(state, skill_ids, reason, reset=True):
    """Record support and invalidate only matching skills in open review sets.

    Feedback after grading passes reset=False: it anchors the earned interval,
    rather than erasing the successful delayed attempt that just happened.
    """
    wanted = set(skill_ids) & bank.SKILLS.keys()
    if not wanted:
        return False
    current = workspace(state)
    timestamp = now()
    for sid in wanted:
        record = skill_record(current, sid)
        record['last_support_at'] = timestamp.isoformat()
        if record['eligible']:
            index = 0 if reset else record['interval_index']
            if reset:
                record.update(streak=0, status='supported_practice')
            set_due(record, timestamp, index)
    for session in current['sessions'].values():
        if session['mode'] != 'review' or session.get('submitted'):
            continue
        affected = wanted & set(session['skill_ids'])
        if affected:
            session['paused_skill_ids'] = sorted(set(session.get('paused_skill_ids', [])) | affected)
            session['assistance_reason'] = reason
    return True


def pause_for_topics(state, ids):
    ids = set(ids)
    wanted = {sid for sid, skill in bank.SKILLS.items() if ids & set(skill['topic_ids'])}
    return _support(state, wanted, 'Relevant teaching, feedback, or a hint was opened.')


def sync_existing(state, topics):
    """Import only dated, fully independent successful check sessions once.

    Sticky check_passed flags and displayed video/homework progress are not
    evidence sources. Missing/naive/future dates do not establish eligibility.
    No eligible new source means no new review workspace and returns False.
    """
    current = state.get('review', {})
    imported = current.get('source_evidence', {})
    candidates = []
    lesson_topics = {t.get('existing_lesson_id'): tid for tid, t in topics.items() if t.get('existing_lesson_id')}
    for store, label in (('topic_sessions', 'topic'), ('sessions', 'legacy')):
        for key, session in state.get(store, {}).items():
            if session.get('mode') != 'check' or not session.get('submitted') or session.get('paused_for_help'):
                continue
            timestamp = parse_time(session.get('submitted_at'))
            created = parse_time(session.get('created_at'))
            if timestamp is None or timestamp > now() or (created and created > timestamp):
                continue
            result = session.get('result', {})
            items = result.get('items', [])
            questions = session.get('questions', [])
            if not result.get('passed') or len(items) < 3 or len(items) != len(questions):
                continue
            qids = {q.get('id') for q in questions}
            if None in qids or len(qids) != len(questions) or qids != {item.get('id') for item in items}:
                continue
            if any(not r.get('correct') or not r.get('independent') or r.get('assisted') or r.get('previously_exposed') for r in items):
                continue
            if any(q.get('previously_exposed') or q.get('id') in session.get('hints', []) for q in questions):
                continue
            tid = session.get('topic_id') if label == 'topic' else lesson_topics.get(session.get('lesson_id'))
            bridge = label == 'legacy' and session.get('lesson_id') == 'bridge'
            if tid not in topics and not bridge:
                continue
            for sid, skill in bank.SKILLS.items():
                evidence_id = f'{label}:{key}:{sid}'
                bridge_binomial = any('(x+4)^2' in bank.normalize_text(q.get('prompt', '')) for q in questions)
                supported = (sid == 'functions' or (sid == 'binomial' and bridge_binomial)) if bridge else tid in skill.get('evidence_topic_ids', skill['topic_ids'])
                if supported and evidence_id not in imported:
                    candidates.append((timestamp, evidence_id, sid, tid or 'bridge'))
    if not candidates:
        return False
    current = workspace(state)
    for timestamp, evidence_id, sid, tid in sorted(candidates):
        record = skill_record(current, sid)
        current['source_evidence'][evidence_id] = {'skill_id': sid, 'topic_id': tid, 'checked_at': timestamp.isoformat()}
        if not record['eligible']:
            anchor = max(timestamp, parse_time(record.get('last_support_at')) or timestamp)
            record.update(eligible=True, status='scheduled', eligibility_source='existing_independent_check',
                          eligibility_at=timestamp.isoformat(), source_evidence_id=evidence_id)
            set_due(record, anchor, 0)
    return True


def export_session(session):
    from answer_visuals import prepare_feedback, prepare_question
    keys = ('id', 'mode', 'skill_ids', 'answers', 'revision', 'submitted', 'created_at',
            'submitted_at', 'paused_skill_ids', 'assistance_reason')
    result = {key: deepcopy(session[key]) for key in keys if key in session}
    result['questions'] = [dict(bank.public_question(q), visual=prepare_question(q, next(iter(q.get('topic_ids', [])), ''))) for q in session['questions']]
    result['paused_for_help'] = bool(session.get('paused_skill_ids'))
    result['batch_size'] = 3
    if session.get('submitted'):
        result['result'] = deepcopy(session['result'])
        questions = {q['id']: q for q in session['questions']}
        for item in result['result'].get('items', []):
            if item.get('id') in questions:
                item['visual'] = prepare_feedback(questions[item['id']], item, next(iter(item.get('topic_ids', [])), ''))
    return result


def export_state(state):
    current = state.get('review', {})
    records = deepcopy(current.get('skills', {}))
    due = []
    for sid, record in records.items():
        at = parse_time(record.get('due_at'))
        record['due'] = bool(record.get('eligible') and at and at <= now())
        if record['due']:
            due.append(sid)
    sessions = list(current.get('sessions', {}).values())
    shown = [s for s in sessions if not s.get('submitted')] + [s for s in sessions if s.get('submitted')][-50:]
    return {'version': 1, 'skills': records, 'due_skill_ids': due,
            'sessions': [export_session(s) for s in shown], 'session_count': len(sessions),
            'mastery_changed': False, 'interval_days': list(INTERVALS)}


def _strings(value):
    if isinstance(value, str):
        yield value
    elif isinstance(value, list):
        for item in value:
            yield from _strings(item)
    elif isinstance(value, dict):
        for key, item in value.items():
            if key not in ('answer', 'response', 'answers', 'id', 'title'):
                yield from _strings(item)


def exposure_index(state, topics):
    """Conservatively exclude authored examples/banks, even if not yet opened.

    Exact normalized prompts and core mathematical expressions are screened.
    This does not pretend to prove semantic equivalence of arbitrary prose.
    Generated families additionally have stable parameter fingerprints and
    expression signatures, so changing a seed or question ID cannot refresh one.
    """
    texts = list(_strings(topics))
    for file in CONTENT_FILES:
        if file.is_file():
            texts.extend(_strings(json.loads(file.read_text(encoding='utf-8'))))
    for key in ('sessions', 'topic_sessions'):
        for session in state.get(key, {}).values():
            texts.extend(_strings(session.get('questions', [])))
    for session in state.get('studio', {}).get('sessions', {}).values():
        texts.extend(_strings(session.get('questions', [])))
    for session in state.get('learning_support', {}).get('reviews', {}).values():
        texts.extend(_strings(session.get('questions', [])))
    exposures = state.get('review', {}).get('exposures', {})
    normalized = {bank.normalize_text(t) for t in texts}
    previous_forms = set()
    for item in exposures.values():
        normalized.add(item['prompt'])
        previous_forms.update(item.get('forms', []))
    return {'fingerprints': set(exposures), 'texts': normalized, 'corpus': '\n'.join(normalized), 'forms': previous_forms}


def blocked(question, index):
    if question['fingerprint'] in index['fingerprints'] or bank.normalize_text(question['prompt']) in index['texts']:
        return True
    for form in question.get('avoid_forms', []):
        form = bank.normalize_text(form)
        if form in index['forms'] or (len(form) >= 8 and form in index['corpus']):
            return True
    return False


def _reserve(question, index):
    index['fingerprints'].add(question['fingerprint'])
    index['texts'].add(bank.normalize_text(question['prompt']))
    index['forms'].update(bank.normalize_text(v) for v in question.get('avoid_forms', []))


def _validate_skills(values, required=False):
    if values is None and not required:
        return None
    if not isinstance(values, list) or not 1 <= len(values) <= len(bank.SKILLS) or any(not isinstance(s, str) or s not in bank.SKILLS for s in values):
        raise ValueError('Choose one or more available review skills.')
    return sorted(set(values))


def start(state, data, topics):
    mode = data.get('mode')
    if mode not in ('practice', 'review'):
        raise ValueError('Choose supported practice or due review.')
    requested = _validate_skills(data.get('skill_ids'), required=mode == 'practice')
    seed = data.get('seed')
    if seed is not None and (type(seed) is not int or not 0 <= seed <= 2**63-1):
        raise ValueError('Use a nonnegative integer seed no larger than 2^63-1.')
    sync_existing(state, topics)
    current = workspace(state)
    request_key = {'mode': mode, 'skill_ids': requested}
    for old in reversed(list(current['sessions'].values())):
        if not old.get('submitted') and not old.get('paused_skill_ids') and old.get('request_key') == request_key:
            return export_session(old)
    if mode == 'practice':
        eligible = requested
    else:
        due = export_state(state)['due_skill_ids']
        eligible = [sid for sid in due if requested is None or sid in requested]
        if not eligible:
            raise ValueError('No selected skills are due yet. Supported practice is available now; watching alone does not schedule review.')
    counter = current['counter']
    raw_seed = str(seed) if seed is not None else f"{current['generation_salt']}:{counter}"
    rng = random.Random(raw_seed)
    eligible = sorted(eligible, key=lambda sid: (current['skills'].get(sid, {}).get('due_at', ''), sid))
    # Practice is an explicit selection; randomize within it. Due review first
    # takes the oldest skills, so repeatedly starting cannot starve an old one.
    if mode == 'practice':
        rng.shuffle(eligible)
    order = eligible[:3]
    while len(order) < 3:
        order.append(eligible[len(order) % len(eligible)])
    index = exposure_index(state, topics)
    selected = []
    chosen_reps = {}
    for slot, sid in enumerate(order):
        reps = bank.SKILLS[sid]['representations']
        history = sum(item.get('skill_id') == sid for item in current['exposures'].values())
        first = (history + chosen_reps.get(sid, 0)) % len(reps)
        found = None
        # Bounded search; exhausted families are never silently recycled.
        for attempt in range(1800):
            rep = reps[(first + attempt // 600) % len(reps)]
            token = f'{raw_seed}:{counter}:{slot}:{attempt}:{sid}'
            generated_seed = int(hashlib.sha256(token.encode()).hexdigest()[:15], 16)
            candidate = bank.generate(sid, generated_seed, rep)
            if not blocked(candidate, index):
                found = candidate
                break
        if found is None:
            raise ValueError(f"Fresh reviewed variations for {bank.SKILLS[sid]['title']} are currently exhausted. Choose another skill or ask a tutor to author a new family; exposed questions will not be counted again.")
        selected.append(found)
        chosen_reps[sid] = chosen_reps.get(sid, 0)+1
        _reserve(found, index)
    covered = sorted(set(order))
    if mode == 'practice':
        _support(state, covered, 'Supported mixed practice was opened.')
    session_id = uuid.uuid4().hex
    session = {'id': session_id, 'mode': mode, 'skill_ids': covered, 'request_key': request_key,
               'questions': selected, 'answers': {}, 'revision': 0, 'hints': [],
               'created_at': now().isoformat(), 'submitted': False, 'paused_skill_ids': [],
               'due_snapshot': {sid: current['skills'].get(sid, {}).get('due_at') for sid in covered}}
    current['sessions'][session_id] = session
    current['counter'] += 1
    for q in selected:
        current['exposures'][q['fingerprint']] = {
            'skill_id': q['skill_id'], 'family': q['family'], 'parameters': q['parameters'],
            'prompt': bank.normalize_text(q['prompt']), 'forms': [bank.normalize_text(v) for v in q.get('avoid_forms', [])],
            'first_seen_at': now().isoformat(), 'session_id': session_id,
        }
    event(state, 'mixed_review_started', session_id=session_id, mode=mode, skill_ids=covered)
    return export_session(session)


def get_session(state, session_id):
    if not isinstance(session_id, str):
        raise ValueError('Choose a saved review session.')
    session = state.get('review', {}).get('sessions', {}).get(session_id)
    if session is None:
        raise ValueError('That review session does not belong to this learner.')
    return session


def clean_answers(session, values, require_all=False):
    if not isinstance(values, dict):
        raise ValueError('Send the answers for this review set.')
    allowed = {q['id'] for q in session['questions']}
    if any(k not in allowed for k in values) or any(not isinstance(v, str) or len(v) > 1000 for v in values.values()):
        raise ValueError('Use short text answers belonging to this review set.')
    if require_all and any(not values.get(qid, '').strip() for qid in allowed):
        raise ValueError('Answer all three questions before checking your work.')
    return dict(values)


def _revision(session, value, answers):
    if type(value) is not int or not 0 <= value <= 9007199254740991:
        raise ValueError('Use a nonnegative integer save revision.')
    old = session.get('revision', 0)
    if value < old or (value == old and answers != session['answers']):
        raise ConflictError('This work changed in another tab. Copy your unsaved work and reload before saving.')
    return value


def draft(state, data):
    session = get_session(state, data.get('session_id'))
    if session.get('submitted'):
        raise ConflictError('This set is already submitted. Reload its saved feedback.')
    answers = clean_answers(session, data.get('answers'))
    number = _revision(session, data.get('revision'), answers)
    session.update(answers=answers, revision=number)
    return {'saved': True, 'revision': number}


def hint(state, data):
    session = get_session(state, data.get('session_id'))
    if session.get('submitted'):
        raise ValueError('This set already has saved feedback.')
    question = next((q for q in session['questions'] if q['id'] == data.get('question_id')), None)
    if question is None:
        raise ValueError('Choose a question in this review set.')
    if question['id'] not in session['hints']:
        session['hints'].append(question['id'])
    _support(state, {question['skill_id']}, 'A hint was requested for this skill.')
    event(state, 'mixed_review_hint', session_id=session['id'], question_id=question['id'], skill_id=question['skill_id'])
    return {'hint': question['hint'], 'skill_id': question['skill_id'], 'topic_ids': question['topic_ids'], 'mastery_changed': False}


def submit(state, data):
    from answer_visuals import prepare_feedback
    session = get_session(state, data.get('session_id'))
    answers = clean_answers(session, data.get('answers'), require_all=True)
    if session.get('submitted'):
        if answers != session['answers']:
            raise ConflictError('This set already has different submitted answers. Reload its saved feedback.')
        return deepcopy(session['result'])
    number = data.get('revision')
    if number is None:
        if session['revision'] and answers != session['answers']:
            raise ConflictError('Save your latest answers before submitting, or include their newer revision.')
        number = session['revision'] + (answers != session['answers'])
    number = _revision(session, number, answers)
    current = workspace(state)
    timestamp = now()
    items = []
    hinted_skills = {q['skill_id'] for q in session['questions'] if q['id'] in session['hints']}
    for q in session['questions']:
        sid = q['skill_id']
        assisted = sid in hinted_skills or sid in session['paused_skill_ids']
        # A second legacy tab/help call may have moved the deadline after this
        # review was opened. Require the original due snapshot to remain valid.
        due = parse_time(session['due_snapshot'].get(sid))
        last_support = parse_time(current['skills'].get(sid, {}).get('last_support_at'))
        opened = parse_time(session['created_at'])
        if session['mode'] == 'review' and last_support and opened and last_support > opened:
            assisted = True
        independent = session['mode'] == 'review' and bool(due and opened and due <= opened) and not assisted and not q.get('previously_exposed')
        items.append({'id': q['id'], 'skill_id': sid, 'topic_ids': q['topic_ids'], 'prompt': q['prompt'],
                      'response': answers[q['id']], 'answer': q['answer'], 'correct': grade(q, answers[q['id']]),
                      'explanation': q['explanation'], 'assisted': assisted, 'independent': independent,
                      'previously_exposed': q.get('previously_exposed', False)})
        if 'display_answer' in q:
            items[-1]['display_answer'] = q['display_answer']
        items[-1]['visual'] = prepare_feedback(q, items[-1], next(iter(q.get('topic_ids', [])), ''))
    skill_results = []
    for sid in session['skill_ids']:
        record = skill_record(current, sid)
        group = [item for item in items if item['skill_id'] == sid]
        correct = all(item['correct'] for item in group)
        fresh_unassisted = all(not item['assisted'] and not item['previously_exposed'] for item in group)
        retained = session['mode'] == 'review' and correct and all(item['independent'] for item in group)
        record.update(attempts=record['attempts']+len(group), last_attempt_at=timestamp.isoformat(), last_session_id=session['id'])
        if session['mode'] == 'practice':
            if correct and fresh_unassisted:
                record['practice_successes'] += 1
                if not record['eligible']:
                    record.update(eligible=True, eligibility_source='mixed_practice', eligibility_at=timestamp.isoformat())
                record['status'] = 'scheduled'
            else:
                record['status'] = 'needs_practice'
            record['streak'] = 0
            if record['eligible']:
                set_due(record, timestamp, 0)
        elif retained:
            index = min(record['interval_index']+1, len(INTERVALS)-1)
            record.update(streak=record['streak']+1, independent_successes=record['independent_successes']+len(group),
                          last_independent_success_at=timestamp.isoformat(), status='recall_supported')
            set_due(record, timestamp, index)
        else:
            record.update(streak=0, status='needs_practice' if not correct else 'assisted_practice')
            set_due(record, timestamp, 0)
        skill_results.append({'skill_id': sid, 'correct': correct, 'retention_supported': retained,
                              'eligible': record['eligible'], 'status': record['status'], 'due_at': record.get('due_at'),
                              'due_date': record.get('due_date'), 'interval_days': record['interval_days']})
    score = sum(item['correct'] for item in items)
    independent_score = sum(item['correct'] and item['independent'] for item in items)
    result = {'score': score, 'total': len(items), 'independent_score': independent_score,
              'practice_only': session['mode'] != 'review' or not any(item['independent'] for item in items),
              'items': items, 'skill_results': skill_results, 'mastery_changed': False,
              'written_reasoning_status': 'not_assessed',
              'scope_note': 'This result concerns these specific tasks. It does not change course mastery or lesson unlocks.'}
    session.update(answers=answers, revision=number, submitted=True, submitted_at=timestamp.isoformat(), result=result)
    _support(state, session['skill_ids'], 'Feedback on this skill was shown.', reset=False)
    event(state, 'mixed_review_assessed', session_id=session['id'], mode=session['mode'], score=score,
          total=len(items), independent_score=independent_score, mastery_changed=False)
    return deepcopy(result)
