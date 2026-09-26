"""Local learning tools, short repairs, project drafts and dated topic recall.

The HTTP owner holds the learner lock and saves atomically. Nothing here awards
lesson stars, certifies proofs or changes diagnostic/mastery records.
"""
from copy import deepcopy
from datetime import datetime, timedelta, timezone
from pathlib import Path
import json
import math
import random
import uuid
from question_bank import grade, public
from review_bank import normalize_text

INTERVALS = (1, 3, 7, 14, 30)


class ConflictError(ValueError):
    pass


def now():
    return datetime.now(timezone.utc)


def date(value):
    try:
        value = datetime.fromisoformat(value.replace('Z', '+00:00'))
        return value.astimezone(timezone.utc) if value.tzinfo else None
    except (ValueError, TypeError, AttributeError):
        return None


def store(state):
    return state.setdefault('learning_support', {'notes': {}, 'repairs': {}, 'projects': {},
        'reviews': {}, 'recall': {}, 'sources': {}, 'pilot': None})


def text(value, limit=6000):
    if not isinstance(value, str) or len(value) > limit:
        raise ValueError(f'Use text of at most {limit} characters.')
    return value


def revision(data, previous, snapshot):
    n = data.get('revision')
    if type(n) is not int or not 0 <= n <= 9007199254740991:
        raise ValueError('Use a valid save revision.')
    if previous and n < previous['revision']:
        raise ConflictError('A newer draft is already saved. Reload before editing it.')
    if previous and n == previous['revision'] and snapshot != previous['draft']:
        raise ConflictError('This draft version has different content. Reload it.')
    return n


def clean_step_draft(value):
    if not isinstance(value, dict):
        raise ValueError('Use a step-workspace draft.')
    lines = value.get('lines', [])
    if not isinstance(lines, list) or len(lines) > 12:
        raise ValueError('Use at most twelve steps.')
    return {'version': 1, 'lines': [text(v, 500) for v in lines],
        'assumptions': text(value.get('assumptions', ''), 500),
        'reflection': text(value.get('reflection', ''), 2000)}


def save_notes(state, data, topics):
    tid, kind = data.get('topic_id'), data.get('kind')
    if tid not in topics or kind not in ('steps', 'scaffold'):
        raise ValueError('Choose a lesson and a supported notebook.')
    value = data.get('draft')
    if kind == 'steps':
        snapshot = clean_step_draft(value)
    else:
        if not isinstance(value, dict) or value.get('stage') not in ('example', 'complete', 'independent'):
            raise ValueError('Choose a guided-practice stage.')
        example, hidden = value.get('example', 0), value.get('hidden', 1)
        if type(example) is not int or not 0 <= example < 20 or type(hidden) is not int or not 1 <= hidden <= 12:
            raise ValueError('Invalid example or number of missing steps.')
        snapshot = {'stage': value['stage'], 'example': example, 'hidden': hidden,
            'response': text(value.get('response', ''), 4000),
            'compared': value.get('compared') is True}
    notes = store(state)['notes'].setdefault(tid, {})
    n = revision(data, notes.get(kind), snapshot)
    notes[kind] = {'draft': snapshot, 'revision': n, 'updated_at': now().isoformat()}
    return {'saved': True, 'revision': n, 'mastery_changed': False}


def save_repair(state, data, topics):
    source, target = data.get('from_topic_id'), data.get('topic_id')
    if source not in topics or target not in topics or source == target:
        raise ValueError('Choose a different foundation to revisit.')
    active = data.get('active')
    if type(active) is not bool:
        raise ValueError('Repair status must be true or false.')
    value = {'from_topic_id': source, 'topic_id': target, 'active': active,
        'updated_at': now().isoformat(), 'reason': text(data.get('reason', ''), 800)}
    # A repair describes a chosen learning activity, not a diagnosed deficiency.
    store(state)['repairs'][source] = value
    return {'repair': value, 'mastery_changed': False}


def project_content():
    return json.loads(Path(__file__).with_name('project-journeys.json').read_text(encoding='utf-8'))


def save_project(state, data):
    pid = data.get('project_id')
    project = next((p for p in project_content()['projects'] if p['id'] == pid), None)
    if not project:
        raise ValueError('Choose a project in the library.')
    draft = data.get('draft')
    if not isinstance(draft, dict):
        raise ValueError('Expected a project draft.')
    stage = draft.get('stage', 0)
    if type(stage) is not int or not 0 <= stage < len(project['stages']):
        raise ValueError('Unknown project stage.')
    models = draft.get('models', {})
    if not isinstance(models, dict) or len(models) > 7:
        raise ValueError('Invalid saved model controls.')
    clean_models = {}
    allowed_models = {s['model_id'] for s in project['stages']}
    for model, controls in models.items():
        if model not in allowed_models or not isinstance(controls, dict) or len(controls) > 20:
            raise ValueError('Invalid model controls.')
        clean_models[model] = {}
        for key, val in controls.items():
            if not isinstance(key, str) or len(key) > 40:
                raise ValueError('Invalid control name.')
            if key == 'body' and val in ('moon', 'earth-moon'):
                clean_models[model][key] = val
            elif type(val) in (int, float) and math.isfinite(val) and abs(val) <= 1e9:
                clean_models[model][key] = val
            else:
                raise ValueError('A control must be a finite number.')
    responses = draft.get('responses', {})
    if not isinstance(responses, dict) or any(k not in {s['id'] for s in project['stages']} for k in responses):
        raise ValueError('Use the project prompts.')
    clean_responses = {}
    for key, value in responses.items():
        if not isinstance(value, dict):
            raise ValueError('Expected stage responses.')
        clean_responses[key] = {k: text(value.get(k, ''), 4000) for k in ('prediction', 'decision', 'connection')}
    snapshot = {'stage': stage, 'models': clean_models, 'responses': clean_responses}
    current = store(state)['projects']
    n = revision(data, current.get(pid), snapshot)
    current[pid] = {'draft': snapshot, 'revision': n, 'updated_at': now().isoformat(), 'status': 'awaiting_review'}
    return {'saved': True, 'revision': n, 'mastery_changed': False}


def all_exposures(state):
    questions = []
    for key in ('sessions', 'topic_sessions'):
        questions.extend(q for s in state.get(key, {}).values() for q in s.get('questions', []))
    for key in ('review', 'studio'):
        questions.extend(q for s in state.get(key, {}).get('sessions', {}).values() for q in s.get('questions', []))
    questions.extend(q for s in state.get('learning_support', {}).get('reviews', {}).values() for q in s.get('questions', []))
    return {normalize_text(q.get('prompt', '')) for q in questions}


def sync_reviews(state, topics):
    """Only dated, complete, unaided checks schedule a topic; flags alone do not."""
    legacy = {t['existing_lesson_id']: tid for tid, t in topics.items() if t.get('existing_lesson_id')}
    support = state.get('learning_support', {})
    sources = support.get('sources', {})
    changed = False
    for key in ('topic_sessions', 'sessions'):
        for sid, session in state.get(key, {}).items():
            source = key + ':' + sid
            if source in sources or session.get('mode') != 'check' or not session.get('submitted') or session.get('paused_for_help'):
                continue
            timestamp, created = date(session.get('submitted_at')), date(session.get('created_at'))
            result = session.get('result', {})
            items, questions = result.get('items', []), session.get('questions', [])
            tid = session.get('topic_id') if key == 'topic_sessions' else legacy.get(session.get('lesson_id'))
            if tid not in topics or not timestamp or timestamp > now() or (created and created > timestamp):
                continue
            if not result.get('passed') or len(items) < 3 or len(items) != len(questions):
                continue
            if len({q.get('id') for q in questions}) != len(questions) or {q.get('id') for q in questions} != {i.get('id') for i in items}:
                continue
            if any(not i.get('correct') or not i.get('independent') or i.get('previously_exposed') for i in items):
                continue
            support = store(state); sources = support['sources']
            sources[source] = timestamp.isoformat()
            previous = support['recall'].get(tid, {})
            old = date(previous.get('last_check_at'))
            if not old or timestamp > old:
                last_support = max(date(previous.get('last_support_at')) or timestamp,
                                   date(support.get('last_support',{}).get(tid)) or timestamp)
                anchor = max(timestamp, last_support)
                support['recall'][tid] = {**previous, 'topic_id': tid, 'interval_index': 0,
                    'status': 'scheduled', 'last_check_at': timestamp.isoformat(),
                    'last_support_at': last_support.isoformat(),
                    'due_at': (anchor + timedelta(days=1)).isoformat(),
                    'recall_successes': previous.get('recall_successes', 0)}
            changed = True
    return changed


def pause_for_topics(state, ids):
    if not ids:
        return
    support = store(state)
    stamp = now()
    for tid in set(ids):
        support.setdefault('last_support',{})[tid] = stamp.isoformat()
        if tid in support.get('recall', {}):
            record = support['recall'][tid]
            record.update(last_support_at=stamp.isoformat(), status='supported_practice', interval_index=0,
                due_at=(stamp+timedelta(days=1)).isoformat())
    for session in support.get('reviews', {}).values():
        if not session.get('submitted'):
            affected = set(ids) & {q['topic_id'] for q in session['questions']}
            session['paused_topic_ids'] = sorted(set(session.get('paused_topic_ids', [])) | affected)


def export_session(session):
    return {**{k: deepcopy(v) for k, v in session.items() if k not in ('questions', 'due_snapshot')},
        'questions': [{**public(q), 'topic_id': q['topic_id'], 'topic_title': q['topic_title']} for q in session['questions']]}


def export_state(state, topics, *, all_reviews=False):
    support = state.get('learning_support', {})
    records = deepcopy(support.get('recall', {}))
    due = sorted([tid for tid, r in records.items() if date(r.get('due_at')) and date(r['due_at']) <= now()],
                 key=lambda tid: (records[tid]['due_at'], tid))
    for tid, record in records.items():
        record['title'] = topics.get(tid, {}).get('title', tid)
    return {'notes': deepcopy(support.get('notes', {})), 'repairs': deepcopy(support.get('repairs', {})),
        'projects': deepcopy(support.get('projects', {})), 'mission_designs': deepcopy(support.get('mission_designs', {})),
        'ai_path': deepcopy(support.get('ai_path')), 'purpose_paths': deepcopy(support.get('purpose_paths', {})), 'recall': records, 'due_topic_ids': due,
        'reviews': [export_session(s) for s in (list(support.get('reviews', {}).values()) if all_reviews else list(support.get('reviews', {}).values())[-8:])],
        'pilot': deepcopy(support.get('pilot')), 'mastery_changed': False}


def start_review(state, data, topics, legacy_factory=None):
    sync_reviews(state, topics)
    support = store(state)
    for session in reversed(list(support['reviews'].values())):
        if not session.get('submitted') and not session.get('paused_topic_ids'):
            return export_session(session)
    due = export_state(state, topics)['due_topic_ids']
    if not due:
        raise ValueError('No topic is due yet. Continue your lesson; independent checks schedule future recall.')
    seen = all_exposures(state)
    buckets = {}
    for tid in due:
        topic = topics[tid]
        candidates = deepcopy(topic.get('lesson', {}).get('independent_check', []))
        if not candidates and legacy_factory:
            candidates = legacy_factory(topic, seen)
        candidates = [q for q in candidates if normalize_text(q['prompt']) not in seen]
        # Spread difficulty within each topic and reserve each exact prompt once.
        random.SystemRandom().shuffle(candidates)
        levels = [[q for q in candidates if q.get('difficulty','standard')==level]
                  for level in ('gentle','standard','stretch')]
        buckets[tid] = [group[index] for index in range(max(map(len,levels),default=0))
                        for group in levels if index < len(group)]
    selected = []
    for round_ in range(3):
        for tid in due:
            while buckets[tid]:
                q = buckets[tid].pop(0)
                normalized = normalize_text(q['prompt'])
                if normalized in seen:
                    continue
                q.update(topic_id=tid, topic_title=topics[tid]['title'], previously_exposed=False)
                selected.append(q); seen.add(normalized)
                break
            if len(selected) == 3:
                break
        if len(selected) == 3:
            break
    if not selected:
        raise ValueError('The available fresh recall questions are used. Choose the generated mixed review or ask a tutor for a new task; repeated questions cannot establish fresh recall.')
    sid = uuid.uuid4().hex
    session = {'id': sid, 'questions': selected, 'answers': {}, 'revision': 0, 'submitted': False,
        'created_at': now().isoformat(), 'paused_topic_ids': [],
        'due_snapshot': {q['topic_id']: support['recall'][q['topic_id']]['due_at'] for q in selected}}
    support['reviews'][sid] = session
    return export_session(session)


def review_answers(session, data, complete=False):
    raw = data.get('answers')
    allowed = {q['id'] for q in session['questions']}
    if not isinstance(raw, dict) or any(k not in allowed for k in raw):
        raise ValueError('Use the questions from this recall set.')
    answers = {key: text(value, 1000) for key, value in raw.items()}
    if complete and any(not answers.get(key, '').strip() for key in allowed):
        raise ValueError('Answer the whole short set before checking.')
    n = data.get('revision')
    if type(n) is not int or not 0 <= n <= 9007199254740991:
        raise ValueError('Use a valid draft revision.')
    if n < session['revision'] or (n == session['revision'] and answers != session['answers']):
        raise ConflictError('A newer or different draft is already saved. Reload the recall set.')
    return answers, n


def review_action(state, data, action):
    session = store(state)['reviews'].get(data.get('session_id'))
    if not session:
        raise ValueError('This recall set belongs to a different learning space or no longer exists.')
    if action not in ('draft', 'submit'):
        raise ValueError('Unknown recall action.')
    answers, n = review_answers(session, data, action == 'submit')
    if session['submitted']:
        if answers != session['answers']:
            raise ConflictError('This set already has submitted answers.')
        return deepcopy(session['result'])
    session.update(answers=answers, revision=n)
    if action == 'draft':
        return {'saved': True, 'revision': n}
    stamp, opened = now(), date(session['created_at'])
    support = store(state)
    items = []
    for q in session['questions']:
        tid = q['topic_id']; record = support['recall'][tid]
        due, assistance = date(session['due_snapshot'][tid]), date(record.get('last_support_at'))
        independent = bool(due and opened and due <= opened and tid not in session['paused_topic_ids'] and (not assistance or assistance <= opened))
        items.append({'id': q['id'], 'topic_id': tid, 'prompt': q['prompt'], 'response': answers[q['id']],
            'answer': q['answer'], 'explanation': q['explanation'], 'correct': grade(q, answers[q['id']]),
            'independent': independent})
    for tid in {q['topic_id'] for q in items}:
        group = [q for q in items if q['topic_id'] == tid]
        retained = all(q['correct'] and q['independent'] for q in group)
        record = support['recall'][tid]
        index = min(record['interval_index']+1, len(INTERVALS)-1) if retained else 0
        record.update(interval_index=index, status='recall_supported' if retained else 'needs_practice',
            last_attempt_at=stamp.isoformat(), last_support_at=stamp.isoformat(),
            due_at=(stamp+timedelta(days=INTERVALS[index])).isoformat(),
            recall_successes=record.get('recall_successes', 0)+int(retained))
    result = {'score': sum(q['correct'] for q in items), 'total': len(items),
        'independent_score': sum(q['correct'] and q['independent'] for q in items), 'items': items,
        'mastery_changed': False, 'scope_note': 'Recall evidence for these tasks only. Your earned stars stay unchanged; written reasoning still needs review.'}
    session.update(submitted=True, submitted_at=stamp.isoformat(), result=result)
    return deepcopy(result)


def pilot_action(state, data):
    action = data.get('action')
    if action == 'enroll':
        if data.get('consent') is not True:
            raise ValueError('Choose to join before saving pilot observations.')
        current = store(state).get('pilot')
        if not current:
            current = {'id': uuid.uuid4().hex, 'started_at': now().isoformat(), 'observations': [],
                'consent': 'Local voluntary usability pilot; no automatic upload, grade or research claim.'}
            store(state)['pilot'] = current
        return deepcopy(current)
    current = state.get('learning_support', {}).get('pilot')
    if not current:
        raise ValueError('Join the voluntary pilot first.')
    if action == 'observe':
        if current.get('stopped_at'):
            raise ValueError('This pilot is stopped; no new observations will be saved.')
        if not text(data.get('task',''),4000).strip():
            raise ValueError('Describe the lesson or task you tried.')
        current['observations'].append({'time': now().isoformat(),
            **{key: text(data.get(key, ''), 4000) for key in ('task', 'worked', 'stuck', 'next_day')}})
        return deepcopy(current)
    if action == 'stop':
        current['stopped_at'] = now().isoformat()
        return deepcopy(current)
    raise ValueError('Unknown pilot action.')
