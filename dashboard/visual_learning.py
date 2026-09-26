"""Bounded, profile-owned drafts for visual experiments. No mastery awards."""
from copy import deepcopy
from pathlib import Path
import json
import math
from learning_support import store, revision, text, now

STAGES = ('features', 'weighted-sum', 'loss', 'gradients', 'probability', 'network', 'attention')
SAMPLES = tuple(f'{kind}{n}' for kind in ('R', 'S') for n in range(1, 5))
CONTROL_BOUNDS = {
    'orbit': {'altitudeKm': (10, 600000), 'speedKmS': (.02, 12), 'progress': (0, 100)},
    'rocket': {'dryMass': (500, 10000), 'propellant': (0, 20000), 'flow': (5, 500), 'exhaust': (1000, 4500), 'progress': (0, 100)},
    'supply': {'crew': (1, 8), 'days': (1, 14), 'perPerson': (.5, 4)},
    'signal': {'frequency': (80, 440), 'harmonic': (1, 6), 'mix': (0, 1), 'phase': (0, 360)},
    'camera': {'angle': (-180, 180), 'sx': (-2.5, 2.5), 'sy': (-2.5, 2.5), 'pan': (-2, 2)},
    'energy': {'peak': (0, 10), 'capacity': (0, 24), 'load': (0, 3)},
    'network': {'ridge': (1, 15), 'crater': (1, 15), 'failure': (0, 40), 'packets': (1, 100)},
}


def number(value, low, high, integer=False):
    if type(value) not in (int, float) or not math.isfinite(value) or not low <= value <= high or (integer and value != int(value)):
        raise ValueError(f'Use a finite {"whole " if integer else ""}number from {low} to {high}.')
    return int(value) if integer else value


def obj(value):
    if not isinstance(value, dict):
        raise ValueError('Use a structured experiment draft.')
    return value


def save_record(state, key, data, draft, item=None):
    support = store(state)
    target = support.setdefault(key, {}) if item else support
    name = item or key
    old = target.get(name)
    stamp = revision(data, old, draft)
    record = {'draft': draft, 'revision': stamp, 'updated_at': now().isoformat()}
    target[name] = record
    return {'saved': True, 'record': deepcopy(record), 'mastery_changed': False}


def save_mission(state, data, topics):
    tid = data.get('topic_id')
    if tid not in topics:
        raise ValueError('Choose a lesson in the roadmap.')
    content = json.loads((Path(__file__).with_name('mission-content.json')).read_text(encoding='utf-8'))
    model = next((m['model_id'] for m in content['missions'] if m['topic_id'] == tid), None)
    draft = obj(data.get('draft'))
    if draft.get('version') != 1 or draft.get('modelId') != model:
        raise ValueError('This experiment belongs to a different lesson model.')
    controls = obj(draft.get('controls', {}))
    clean = {}
    for name, value in controls.items():
        if model == 'orbit' and name == 'body' and value in ('moon', 'earth-moon'):
            clean[name] = value
        elif name in CONTROL_BOUNDS[model]:
            clean[name] = number(value, *CONTROL_BOUNDS[model][name], integer=name in ('crew', 'days', 'harmonic', 'packets'))
        else:
            raise ValueError('Unknown model control.')
    if model == 'orbit' and 'altitudeKm' in clean:
        number(clean['altitudeKm'], 2000 if clean.get('body') == 'earth-moon' else 10, 600000 if clean.get('body') == 'earth-moon' else 20000)
    calc = obj(draft.get('calculation', {}))
    if type(calc.get('ran', False)) is not bool:
        raise ValueError('Use a valid calculation state.')
    calculation = {'answer': text(calc.get('answer', ''), 120), 'factor': number(calc.get('factor', 4), 1, 8),
                   'time': number(calc.get('time', 1), 0, 16), 'ran': calc.get('ran', False)}
    result = {'version': 1, 'modelId': model, 'controls': clean, 'calculation': calculation}
    if 'stage' in draft:
        result['stage'] = number(draft['stage'], 0, 2, True)
    if 'activity' in draft:
        if tid != 'precalculus.parametric-equations':
            raise ValueError('This coordinate activity belongs to the parametric lesson.')
        activity = obj(draft['activity'])
        result['activity'] = {'stage': number(activity.get('stage', 0), 0, 2, True),
            'seconds': number(activity.get('seconds', 0), 0, 8), 'a': number(activity.get('a', 4), 1, 7),
            'b': number(activity.get('b', 2), 1, 4), 'answer': text(activity.get('answer', ''), 120),
            'shown': activity.get('shown', False)}
        if type(result['activity']['shown']) is not bool:
            raise ValueError('Use a valid coordinate comparison state.')
    return save_record(state, 'mission_designs', data, result, tid)


def clean_ai(draft):
    draft = obj(draft)
    if draft.get('version') != 1 or draft.get('stageId') not in STAGES or draft.get('sampleId') not in SAMPLES:
        raise ValueError('Choose a stage and a sample in the AI learning path.')
    probe = obj(draft.get('probe'))
    query = draft.get('query')
    if not isinstance(query, list) or len(query) != 2:
        raise ValueError('The attention query needs two coordinates.')
    models = obj(draft.get('models'))
    cleaned_models = {}
    for name, count in (('linear', 3), ('logistic', 3), ('network', 9)):
        model = obj(models.get(name))
        params, history = model.get('parameters'), model.get('history')
        if not isinstance(params, list) or len(params) != count or not isinstance(history, list) or len(history) > 81:
            raise ValueError('Invalid model dimensions or history length.')
        steps = number(model.get('steps'), 0, 1000, True)
        clean_history = [{'step': number(obj(h).get('step'), 0, steps, True), 'loss': number(h.get('loss'), 0, 4000)} for h in history]
        if any(a['step'] > b['step'] for a, b in zip(clean_history, clean_history[1:])):
            raise ValueError('Training history must follow step order.')
        cleaned_models[name] = {'parameters': [number(p, -12, 12) for p in params], 'steps': steps, 'history': clean_history}
    notes, practices = obj(draft.get('notes', {})), obj(draft.get('practices', {}))
    if any(k not in STAGES for k in (*notes, *practices)):
        raise ValueError('Unknown AI learning stage.')
    clean_practices = {}
    for key, value in practices.items():
        value = obj(value)
        choice = value.get('choice')
        if choice is not None:
            choice = number(choice, 0, 2, True)
        if type(value.get('shown')) is not bool:
            raise ValueError('Invalid practice state.')
        clean_practices[key] = {'choice': choice, 'shown': value['shown']}
    visited = draft.get('visited', [])
    if not isinstance(visited, list) or len(visited) > 7 or any(v not in STAGES for v in visited) or len(set(visited)) != len(visited):
        raise ValueError('Invalid visited-stage list.')
    return {'version': 1, 'stageId': draft['stageId'], 'sampleId': draft['sampleId'],
            'probe': {'brightness': number(probe.get('brightness'), 0, 255, True), 'texture': number(probe.get('texture'), 0, 100, True)},
            'learningRate': number(draft.get('learningRate'), .01, .4), 'query': [number(q, -3, 3) for q in query],
            'models': cleaned_models, 'notes': {k: text(v, 1200) for k, v in notes.items()},
            'practices': clean_practices, 'visited': list(visited)}


def save_ai(state, data):
    return save_record(state, 'ai_path', data, clean_ai(data.get('draft')))


def save_purpose(state, data):
    content = json.loads(Path(__file__).with_name('purpose-paths.json').read_text(encoding='utf-8'))
    field_id = data.get('field_id')
    field = next((f for f in content['fields'] if f['id'] == field_id and f['stages']), None)
    if field is None:
        raise ValueError('Choose a field with an interactive learning path.')
    draft = obj(data.get('draft'))
    if draft.get('version') != 1:
        raise ValueError('Use the current learning-path draft format.')
    controls, predictions = obj(draft.get('controls', {})), obj(draft.get('predictions', {}))
    allowed = field['controls']
    if any(k not in allowed for k in controls):
        raise ValueError('Unknown control for this field.')
    clean = {key: number(controls.get(key, spec['default']), spec['min'], spec['max']) for key, spec in allowed.items()}
    ids = {s['id'] for s in field['stages']}
    if any(k not in ids for k in predictions):
        raise ValueError('Unknown learning-path step.')
    result = {'version': 1, 'stage': number(draft.get('stage', 0), 0, len(ids)-1, True),
        'controls': clean, 'predictions': {key: text(value, 1200) for key, value in predictions.items()}}
    return save_record(state, 'purpose_paths', data, result, field_id)
