"""Profile-local applied learning, with supported practice separate from retention."""
from copy import deepcopy
from datetime import datetime, timedelta, timezone
from pathlib import Path
import json
import math
import random
import re
import uuid

from question_bank import grade, public


CONTENT_FILE = Path(__file__).with_name('studio_content.json')
STAGES = ('build', 'connect', 'transfer', 'review')
INTERESTS = {'everyday', 'engineering', 'business', 'science', 'data', 'design'}
CONTROL_RANGES = {
    'recipe': {'servings': (1, 16)},
    'plans': {'hours': (0, 16), 'feeA': (0, 40), 'feeB': (0, 40)},
    'garden': {'perimeter': (8, 48), 'width': (0, 24)},
    'motion': {'time': (0, 3), 'h': (-1, 1)},
    'chain': {'a': (0, 3), 'b': (0, 3), 'time': (0, 4)},
    'bayes': {'prevalence': (0, 100), 'sensitivity': (0, 100), 'falsePositive': (0, 100)},
    'graphics': {'sx': (-2, 3), 'sy': (-2, 3), 'angle': (0, 360), 'x': (-2, 2), 'y': (-2, 2)},
    'sampling': {'n': (1, 6), 'sample': (1, 20)},
}


class ConflictError(ValueError):
    """A save would replace newer or different work from another tab."""


def now():
    return datetime.now(timezone.utc)


def content():
    # Content can arrive while the development server is already running.
    if not CONTENT_FILE.is_file():
        return {'version': 1, 'projects': []}
    data = json.loads(CONTENT_FILE.read_text(encoding='utf-8'))
    if not isinstance(data, dict) or not isinstance(data.get('projects'), list):
        raise ValueError('The applied learning content is not available yet.')
    return data


def project(project_id):
    if not isinstance(project_id, str):
        raise ValueError('Choose an applied project.')
    result = next((p for p in content()['projects'] if p['id'] == project_id), None)
    if result is None:
        raise ValueError('That applied project is not available yet.')
    return result


def public_content():
    data = deepcopy(content())
    for item in data['projects']:
        questions = item.pop('questions', [])
        item['practice_counts'] = {stage: sum(q['stage'] == stage for q in questions) for stage in STAGES}
        prediction = item.get('prediction', {})
        prediction.pop('answer', None)
        prediction.pop('explanation', None)
    return data


def workspace(state):
    current = state.setdefault('studio', {})
    current.setdefault('version', 1)
    for key in ('projects', 'preferences', 'sessions', 'reviews', 'support'):
        current.setdefault(key, {})
    return current


def export_session(session):
    from answer_visuals import prepare_feedback
    result = {key: deepcopy(value) for key, value in session.items() if key != 'questions'}
    result['questions'] = [public(q) for q in session['questions']]
    questions = {q['id']: q for q in session['questions']}
    if session.get('submitted'):
        for item in result.get('result', {}).get('items', []):
            if item.get('id') in questions:
                item['visual'] = prepare_feedback(questions[item['id']], item)
    result['batch_size'] = 3
    return result


def export_state(state):
    current = workspace(state)
    return {
        'version': 1,
        'projects': deepcopy(current['projects']),
        'preferences': deepcopy(current['preferences']),
        'sessions': [export_session(s) for s in current['sessions'].values()],
        'reviews': deepcopy(current['reviews']),
        'ai_history': deepcopy(current.get('ai_history', [])[-10:]),
    }


def event(state, kind, **values):
    state.setdefault('events', []).append({'type': kind, 'time': now().isoformat(), **values})


def revision(value):
    if type(value) is not int or not 0 <= value <= 9007199254740991:
        raise ValueError('Use a nonnegative integer save revision.')
    return value


def check_revision(previous, value, snapshot, keys):
    value = revision(value)
    if previous is None:
        return value, True
    old = previous.get('revision', 0)
    if value < old or (value == old and any(previous.get(k) != snapshot.get(k) for k in keys)):
        raise ConflictError('This work changed in another tab. Copy your unsaved work, then reload before saving.')
    return value, value > old


def bounded_text(value, maximum=6000):
    if not isinstance(value, str) or len(value) > maximum:
        raise ValueError(f'Use text of at most {maximum:,} characters.')
    return value


def validate_inputs(values, project_id):
    if not isinstance(values, dict) or len(values) > 24:
        raise ValueError('Use a small set of numeric project controls.')
    result = {}
    for key, value in values.items():
        if not isinstance(key, str) or not re.fullmatch(r'[A-Za-z][A-Za-z0-9_]{0,39}', key):
            raise ValueError('Unknown project control.')
        if type(value) not in (int, float) or not math.isfinite(value) or abs(value) > 1e9:
            raise ValueError('Project controls must be bounded finite numbers.')
        limits = CONTROL_RANGES.get(project_id, {}).get(key)
        if limits is None or not limits[0] <= value <= limits[1]:
            raise ValueError('A project control is outside its supported range.')
        result[key] = value
    if project_id == 'garden' and result.get('width', 0) > result.get('perimeter', 24) / 2:
        raise ValueError('The garden width cannot exceed half its perimeter.')
    if project_id == 'sampling':
        if any(value != int(value) for value in result.values()):
            raise ValueError('Sample size and sample number must be whole numbers.')
        if result.get('sample', 1) > math.comb(6, int(result.get('n', 3))):
            raise ValueError('Choose an existing sample for that sample size.')
    return result


def save_project(state, data):
    item = project(data.get('project_id'))
    allowed = {'prediction', 'observation', 'explanation', 'explored', 'transfer', *(f'example_{i}' for i in range(len(item.get('examples', [])))), *(f"challenge_{q['id']}" for q in item.get('challenges', []))}
    work = data.get('work', {})
    if not isinstance(work, dict) or any(k not in allowed for k in work):
        raise ValueError('Use this project’s prediction, observations, explanation, and challenges.')
    snapshot = {'work': {k: bounded_text(v) for k, v in work.items()}, 'inputs': validate_inputs(data.get('inputs', {}), item['id'])}
    current = workspace(state)
    previous = current['projects'].get(item['id'])
    number, changed = check_revision(previous, data.get('revision'), snapshot, ('work', 'inputs'))
    if changed:
        current['projects'][item['id']] = {
            **snapshot, 'revision': number, 'updated_at': now().isoformat(),
            'written_status': 'pending_tutor_review' if any(v.strip() for v in snapshot['work'].values()) else 'not_started',
        }
        event(state, 'studio_project_saved', project_id=item['id'], revision=number)
    return {'saved': True, 'revision': number, 'mastery_changed': False}


def selected_preferences(data, topics):
    interests = data.get('interests', [])
    if not isinstance(interests, list) or len(interests) > len(INTERESTS) or any(not isinstance(v, str) or v not in INTERESTS for v in interests):
        raise ValueError('Choose supported interests.')
    topic_id = data.get('topic_id') or None
    if topic_id is not None and topic_id not in topics:
        raise ValueError('Choose a topic in the roadmap.')
    return {'interests': list(dict.fromkeys(interests)), 'goal': bounded_text(data.get('goal', ''), 2000), 'topic_id': topic_id}


def save_preferences(state, data, topics):
    snapshot = selected_preferences(data, topics)
    current = workspace(state)
    previous = current['preferences'] or None
    number, changed = check_revision(previous, data.get('revision'), snapshot, ('interests', 'goal', 'topic_id'))
    if changed:
        current['preferences'] = {**snapshot, 'revision': number, 'updated_at': now().isoformat()}
    return {'saved': True, 'revision': number, 'mastery_changed': False}


def related_topics(project_id):
    item = project(project_id)
    return set(item.get('topic_ids', [])) | set(item.get('prerequisite_ids', []))


def pause_for_topics(state, topic_ids):
    wanted = set(topic_ids)
    if not wanted or not state.get('studio'):
        return False
    projects = {p['id']: set(p.get('topic_ids', [])) | set(p.get('prerequisite_ids', [])) for p in content()['projects']}
    current = workspace(state)
    timestamp = now()
    changed = False
    for pid, topics in projects.items():
        if not wanted & topics:
            continue
        current['support'][pid] = {'last_support_at': timestamp.isoformat()}
        changed = True
        review = current['reviews'].get(pid)
        if review:
            review['last_support_at'] = timestamp.isoformat()
            due = timestamp + timedelta(days=2)
            previous_due = datetime.fromisoformat(review.get('due_at', review['due_date'] + 'T00:00:00+00:00'))
            if due > previous_due:
                review.update(due_at=due.isoformat(), due_date=due.date().isoformat())
    for session in current['sessions'].values():
        if session['stage'] == 'review' and not session.get('submitted') and not session.get('paused_for_help') and wanted & projects.get(session['project_id'], set()):
            session['paused_for_help'] = True
            session['assistance_reason'] = 'Related teaching or explanation was opened.'
            review = current['reviews'].get(session['project_id'])
            if review:
                review.update(needs_fresh_variants=True, status='fresh_variant_needed')
            event(state, 'studio_review_help_exposure', session_id=session['id'], project_id=session['project_id'])
            changed = True
    return changed


def help_project(state, project_id):
    item = project(project_id)
    pause_for_topics(state, related_topics(project_id))
    event(state, 'studio_help_viewed', project_id=project_id)
    return {'prediction': {k: item.get('prediction', {}).get(k, '') for k in ('answer', 'explanation')}, 'mastery_changed': False}


def start(state, data):
    item = project(data.get('project_id'))
    stage = data.get('stage')
    if stage not in STAGES:
        raise ValueError('Choose build, connect, transfer, or review.')
    current = workspace(state)
    if stage != 'review':
        pause_for_topics(state, related_topics(item['id']))
    for session in reversed(list(current['sessions'].values())):
        if session['project_id'] == item['id'] and session['stage'] == stage and not session.get('submitted') and not session.get('paused_for_help'):
            return export_session(session)
    if stage == 'review':
        review = current['reviews'].get(item['id'])
        if not review:
            raise ValueError('Complete a practice set successfully first. A separate delayed review will then be scheduled.')
        due = datetime.fromisoformat(review.get('due_at', review['due_date'] + 'T00:00:00+00:00'))
        last_support = current['support'].get(item['id'], {}).get('last_support_at')
        if last_support:
            due = max(due, datetime.fromisoformat(last_support) + timedelta(days=2))
        if due > now():
            raise ValueError(f"Your fresh review opens on {due.date().isoformat()}, after a delay from the latest support. Build, connect, and transfer practice remain available now.")
    selected = deepcopy([q for q in item.get('questions', []) if q['stage'] == stage])
    if len(selected) != 3:
        raise ValueError('This project’s three-question set is still being authored.')
    seen_ids = {q['id'] for s in current['sessions'].values() for q in s['questions']}
    seen_prompts = {q['prompt'] for s in current['sessions'].values() for q in s['questions']}
    session_id = uuid.uuid4().hex
    rng = random.Random(session_id)
    for q in selected:
        q['previously_exposed'] = q['id'] in seen_ids or q['prompt'] in seen_prompts
        q.setdefault('tolerance', 1e-5)
        if q['kind'] == 'choice':
            rng.shuffle(q['options'])
    session = {'id': session_id, 'project_id': item['id'], 'stage': stage, 'questions': selected, 'answers': {}, 'revision': 0, 'hints': [], 'created_at': now().isoformat(), 'submitted': False, 'paused_for_help': False, 'delayed_eligible': stage == 'review', 'previously_exposed': any(q['previously_exposed'] for q in selected)}
    current['sessions'][session_id] = session
    event(state, 'studio_activity_started', session_id=session_id, project_id=item['id'], stage=stage)
    return export_session(session)


def get_session(state, session_id):
    session = workspace(state)['sessions'].get(session_id)
    if session is None:
        raise ValueError('That practice session does not belong to this learning space.')
    return session


def clean_answers(session, answers, require_all=False):
    if not isinstance(answers, dict):
        raise ValueError('Send the answers for this practice set.')
    allowed = {q['id'] for q in session['questions']}
    if any(key not in allowed for key in answers):
        raise ValueError('An answer belongs to a different practice set.')
    cleaned = {key: bounded_text(value, 1000) for key, value in answers.items()}
    if require_all and any(not cleaned.get(key, '').strip() for key in allowed):
        raise ValueError('Answer all three questions before checking your work.')
    return cleaned


def draft(state, data):
    session = get_session(state, data.get('session_id'))
    if session.get('submitted'):
        raise ConflictError('This set has already been submitted. Reload to see its saved feedback.')
    snapshot = {'answers': clean_answers(session, data.get('answers'))}
    number, changed = check_revision(session, data.get('revision'), snapshot, ('answers',))
    if changed:
        session.update(snapshot, revision=number)
    return {'saved': True, 'revision': number}


def hint(state, data):
    session = get_session(state, data.get('session_id'))
    if session.get('submitted'):
        raise ValueError('This set already has saved feedback.')
    q = next((q for q in session['questions'] if q['id'] == data.get('question_id')), None)
    if q is None:
        raise ValueError('Choose a question in this practice set.')
    if q['id'] not in session['hints']:
        session['hints'].append(q['id'])
    pause_for_topics(state, related_topics(session['project_id']))
    event(state, 'studio_hint_viewed', session_id=session['id'], question_id=q['id'])
    return {'hint': q.get('hint', 'Name the quantities and the relationship before calculating.')}


def submit(state, data):
    from answer_visuals import prepare_feedback
    session = get_session(state, data.get('session_id'))
    if session.get('submitted'):
        return deepcopy(session['result'])
    answers = clean_answers(session, data.get('answers'), require_all=True)
    items = []
    for q in session['questions']:
        assisted = session.get('paused_for_help', False) or q['id'] in session['hints']
        independent = session['stage'] == 'review' and session['delayed_eligible'] and not assisted and not q['previously_exposed']
        items.append({'id': q['id'], 'prompt': q['prompt'], 'response': answers[q['id']], 'answer': q['answer'], 'correct': grade(q, answers[q['id']]), 'explanation': q['explanation'], 'assisted': assisted, 'independent': independent, 'previously_exposed': q['previously_exposed']})
        items[-1]['visual'] = prepare_feedback(q, items[-1])
    score = sum(q['correct'] for q in items)
    independent_score = sum(q['correct'] and q['independent'] for q in items)
    retained = session['stage'] == 'review' and independent_score == len(items)
    current = workspace(state)
    pid = session['project_id']
    review = current['reviews'].get(pid)
    if session['stage'] != 'review' and score == len(items) and review is None:
        due = now() + timedelta(days=2)
        review = {'due_date': due.date().isoformat(), 'due_at': due.isoformat(), 'status': 'scheduled', 'scheduled_at': now().isoformat(), 'source_session_id': session['id'], 'retention_established': False, 'needs_fresh_variants': False}
        current['reviews'][pid] = review
    if session['stage'] == 'review':
        review.update(last_review_at=now().isoformat(), last_session_id=session['id'], retention_established=retained, needs_fresh_variants=True)
        if retained:
            due = now() + timedelta(days=7)
            review.update(status='retained', last_independent_success_at=now().isoformat(), due_date=due.date().isoformat(), due_at=due.isoformat())
        elif not session.get('paused_for_help') and not session['previously_exposed']:
            due = now() + timedelta(days=1)
            review.update(status='needs_practice', due_date=due.date().isoformat(), due_at=due.isoformat())
        else:
            review['status'] = 'fresh_variant_needed'
    result = {'score': score, 'total': len(items), 'items': items, 'success': score == len(items), 'independent_score': independent_score, 'practice_only': session['stage'] != 'review' or session.get('paused_for_help', False) or session['previously_exposed'], 'retention_established': retained, 'review_due': review.get('due_date') if review else None, 'needs_fresh_variants': bool(review and review.get('needs_fresh_variants')), 'written_reasoning_status': 'pending_tutor_review', 'mastery_changed': False}
    session.update(answers=answers, submitted=True, submitted_at=now().isoformat(), result=result)
    # The feedback below is itself teaching. Start the next retention interval
    # after that support, while preserving evidence from the just-finished attempt.
    pause_for_topics(state, related_topics(pid))
    result['review_due'] = review.get('due_date') if review else None
    event(state, 'studio_activity_assessed', session_id=session['id'], project_id=pid, stage=session['stage'], score=score, total=len(items), independent_score=independent_score, retention_established=retained, mastery_changed=False)
    return deepcopy(result)


def brief(state, data, topics):
    prefs = workspace(state)['preferences']
    selected = selected_preferences({key: data.get(key, prefs.get(key, [] if key == 'interests' else '')) for key in ('interests', 'goal', 'topic_id')}, topics)
    item = project(data['project_id']) if data.get('project_id') else None
    lines = ['Help me learn the mathematics by reasoning through a concrete application.', 'Explain quantities, units, assumptions, and why each transformation is valid. Offer a simple example, then a connected problem. Give at most three problems at a time. Treat help as supported learning; do not infer mastery from this request.']
    if selected['goal']:
        lines.append('My goal: ' + selected['goal'])
    if selected['interests']:
        lines.append('My chosen interests: ' + ', '.join(selected['interests']))
    if selected['topic_id']:
        lines.append('My selected topic: ' + topics[selected['topic_id']]['title'])
    if item:
        lines.extend(['Current project: ' + item['title'], 'Scenario: ' + item['context'], 'Decision: ' + item['decision']])
        saved = workspace(state)['projects'].get(item['id'], {})
        if saved.get('inputs'):
            lines.append('My chosen controls: ' + json.dumps(saved['inputs'], ensure_ascii=False))
        for key, text in saved.get('work', {}).items():
            if text.strip() and key != 'explored':
                labels={'prediction':'My prediction','observation':'My observation',
                        'explanation':'My explanation','transfer':'My explanation of the new context'}
                if key.startswith('challenge_'):
                    task=next((c['prompt'] for c in item.get('challenges',[]) if key=='challenge_'+c['id']),'Project decision')
                    lines.append(task+'\nMy work: '+text[:2000])
                elif key.startswith('example_'):
                    index=int(key.split('_')[1])
                    lines.append('My proposed next step for '+item['examples'][index]['title']+': '+text[:2000])
                else:
                    lines.append(labels.get(key,'My thinking')+': '+text[:2000])
    lines.append('Review any written argument explicitly; do not grade it by matching keywords. If my work is wrong, identify the first unsupported step and suggest a fresh variation.')
    prompt = '\n\n'.join(lines)
    return {'prompt': prompt, 'brief': prompt, 'uses_private_assessment_history': False, 'mastery_changed': False}
