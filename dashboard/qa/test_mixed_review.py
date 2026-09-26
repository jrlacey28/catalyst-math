"""Fresh mixed review, independent arithmetic, scheduling, and isolated HTTP saves."""
from copy import deepcopy
from datetime import datetime, timedelta, timezone
from fractions import Fraction
from http.cookiejar import CookieJar
from http.server import ThreadingHTTPServer
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import HTTPCookieProcessor, Request, build_opener
from unittest.mock import patch
import json
import math
import sys
import tempfile
import threading
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import review
import review_bank as bank
from question_bank import grade


TOPICS = {tid: {'id': tid, 'title': tid} for skill in bank.SKILLS.values() for tid in skill['topic_ids']}
TOPICS['algebra-2.rational-functions']['existing_lesson_id'] = '5-03'


def multiply(a, b):
    result = [Fraction(0)]*(len(a)+len(b)-1)
    for i, x in enumerate(a):
        for j, y in enumerate(b):
            result[i+j] += x*y
    return result


def evaluate(poly, x):
    return sum(Fraction(c)*Fraction(x)**i for i, c in enumerate(poly))


def slope(poly, x):
    return evaluate([i*c for i, c in enumerate(poly)][1:], x)


def independent_numeric(q):
    """Use independent models, including polynomial convolution for calculus."""
    p, sid, rep = q['parameters'], q['skill_id'], q['representation']
    if sid == 'fractions':
        result = Fraction(p['a'], p['b'])+Fraction(p['c'], p['d'])
        return result if rep == 'calculation' else result*p['b']*p['d']
    if sid == 'distribution':
        return p['a']*p['b'] if rep == 'coefficient' else p['b']+Fraction(p['a']*p['c'], p['a'])
    if sid == 'binomial':
        poly = multiply([p['b'], 1], [p['b'], 1])
        return poly[1] if rep == 'coefficient' else evaluate(poly, p['t'])
    if sid == 'factoring':
        if rep == 'error-diagnosis':
            return 0
        roots = [x for x in range(-25, 26) if evaluate([p['r']*p['s'], -(p['r']+p['s']), 1], x) == 0]
        return max(roots)
    if sid == 'cancellation':
        if rep == 'domain':
            return p['a']
        t = p['t']
        return Fraction((t-p['a'])*(t+p['b']), t-p['a'])
    if sid == 'functions':
        if rep == 'evaluation':
            return evaluate([p['b'], p['a']], p['t'])
        if rep == 'input':
            out = evaluate([p['b'], p['a']], p['t'])
            return Fraction(out-p['b'], p['a'])
        return evaluate([p['b'], p['a']], 13+p['h'])-evaluate([p['b'], p['a']], 13)
    if sid == 'composition':
        return evaluate([p['c'], p['a']], evaluate([p['b'], 0, 1], p['t']))
    if sid == 'linear-equations':
        return Fraction(p['d']-p['b'], p['a']-p['c'])
    if sid == 'exponents':
        return Fraction(math.prod([p['a']]*p['m'])*math.prod([p['a']]*p['n']), math.prod([p['a']]*p['k']))
    if sid == 'limits':
        if rep == 'value-versus-limit':
            return evaluate([p['b'], p['m']], p['a'])
        # The quotient is linear away from its hole: two exact nearby values
        # have a midpoint equal to its limit, without evaluating at the hole.
        a, h = p['a'], Fraction(1, 10000)
        f = lambda x: Fraction(x*x-a*a, x-a)
        return (f(a-h)+f(a+h))/2
    if sid == 'derivatives':
        if rep == 'tangent-estimate':
            return Fraction(p['y'])+Fraction(p['h_tenths'], 10)*p['slope']
        poly = [p['b']]+[0]*(p['n']-1)+[p['a']]
        return slope(poly, p['c'])
    if sid == 'product-rule':
        return slope(multiply([p['a'], 1], [p['b'], 0, 1]), p['c'])
    if sid == 'chain-rule':
        if rep == 'missing-factor':
            return evaluate([p['b'], p['a']], 1)-evaluate([p['b'], p['a']], 0)
        poly = [1]
        for _ in range(p['n']):
            poly = multiply(poly, [p['b'], p['a']])
        return slope(poly, p['c'])
    if sid == 'integrals':
        if rep == 'signed-accumulation':
            return sum([p['up']]*p['left']+[-p['down']]*p['right'])
        # The coefficient is independently checked by differentiating the
        # candidate antiderivative and evaluating both definite bounds.
        antiderivative = [0]*(p['n']+1)+[Fraction(p['a'], p['n']+1)]
        assert slope(antiderivative, 2) == p['a']*2**p['n']
        return evaluate(antiderivative, p['t'])-evaluate(antiderivative, 0)
    raise AssertionError((sid, rep))


class BankTests(unittest.TestCase):
    def test_all_families_math_determinism_and_private_fields(self):
        catalog = bank.public_catalog()
        self.assertGreaterEqual(len(catalog['skills']), 12)
        covered = set()
        for sid, skill in bank.SKILLS.items():
            for rep in skill['representations']:
                for seed in range(80):
                    q = bank.generate(sid, seed, rep)
                    self.assertEqual(q, bank.generate(sid, seed, rep))
                    self.assertEqual(q['fingerprint'], bank.fingerprint(q['family'], q['parameters']))
                    self.assertTrue(grade(q, str(q['answer'])), (sid, rep, seed))
                    self.assertFalse(grade(q, '__import__("os").getcwd()'))
                    public = bank.public_question(q)
                    self.assertFalse({'answer', 'display_answer', 'explanation', 'hint', 'tolerance', 'parameters', 'avoid_forms'} & public.keys())
                    if q['kind'] == 'number':
                        self.assertAlmostEqual(q['answer'], float(independent_numeric(q)), places=8, msg=(sid, rep, seed))
                        if 'display_answer' in q:
                            self.assertEqual(Fraction(q['display_answer']), independent_numeric(q))
                    else:
                        self.assertEqual(len(q['options']), len(set(q['options'])))
                        self.assertEqual(q['options'].count(q['answer']), 1)
                    covered.add((sid, rep))
        self.assertEqual(len(covered), 42)

    def test_equivalent_authored_math_and_seed_identity(self):
        self.assertEqual(bank.normalize_text(' x² − 9 '), bank.normalize_text('x^2-9'))
        self.assertEqual(bank.normalize_text('f(x) = 3x + (−4)'), bank.normalize_text('f(x)=3x-4'))
        self.assertEqual(bank.normalize_text('x³ × x⁴'), bank.normalize_text('x^3 * x^4'))
        self.assertEqual(bank.normalize_text('x⁻² + x¹²'), bank.normalize_text('x^(-2)+x^12'))
        seen = {}
        collision = False
        for seed in range(80):
            q = bank.generate('binomial', seed, 'coefficient')
            b = q['parameters']['b']
            if b in seen:
                self.assertEqual(q['id'], seen[b]['id'])
                collision = True
            seen[b] = q
        self.assertTrue(collision, 'A seed change must not disguise the same mathematical item.')

    def test_edge_cases_are_covered(self):
        flags = dict(negative_derivative_input=False, zero_derivative_input=False, negative_tangent_step=False,
                     zero_signed_accumulation=False, negative_signed_accumulation=False, negative_distribution=False)
        for seed in range(500):
            d = bank.generate('derivatives', seed, 'power-rule')['parameters']
            flags['negative_derivative_input'] |= d['c'] < 0
            flags['zero_derivative_input'] |= d['c'] == 0
            flags['negative_tangent_step'] |= bank.generate('derivatives', seed, 'tangent-estimate')['parameters']['h_tenths'] < 0
            integral = bank.generate('integrals', seed, 'signed-accumulation')
            flags['zero_signed_accumulation'] |= integral['answer'] == 0
            flags['negative_signed_accumulation'] |= integral['answer'] < 0
            flags['negative_distribution'] |= bank.generate('distribution', seed)['parameters']['a'] < 0
            cancel = bank.generate('cancellation', seed, 'calculation')['parameters']
            self.assertNotEqual(cancel['t'], cancel['a'])
            linear = bank.generate('linear-equations', seed)['parameters']
            self.assertNotEqual(linear['a'], linear['c'])
            self.assertNotEqual(linear['b'], 0)
        self.assertTrue(all(flags.values()), flags)


class ReviewTests(unittest.TestCase):
    def setUp(self):
        self.clock = datetime(2035, 1, 1, 12, tzinfo=timezone.utc)
        self.clock_patch = patch.object(review, 'now', side_effect=lambda: self.clock)
        self.clock_patch.start()
        self.content_patch = patch.object(review, 'CONTENT_FILES', ())
        self.content_patch.start()
        self.state = {'events': [], 'sessions': {}, 'topic_sessions': {}, 'lessons': {'sentinel': {'check_passed': True}}}

    def tearDown(self):
        self.content_patch.stop()
        self.clock_patch.stop()

    def start(self, mode='practice', skills=None, **extra):
        data = {'mode': mode, **extra}
        if mode == 'practice' or skills is not None:
            data['skill_ids'] = skills or ['fractions', 'chain-rule']
        return review.start(self.state, data, TOPICS)

    def answers(self, session):
        return {q['id']: str(q['answer']) for q in review.get_session(self.state, session['id'])['questions']}

    def solve(self, session, answers=None):
        return review.submit(self.state, {'session_id': session['id'], 'answers': answers or self.answers(session)})

    def test_explicit_practice_not_mastery_and_due_only(self):
        untouched = deepcopy(self.state['lessons'])
        with self.assertRaises(ValueError):
            review.start(self.state, {'mode': 'practice'}, TOPICS)
        with self.assertRaises(ValueError):
            self.start('review')
        session = self.start()
        self.assertEqual(len(session['questions']), 3)
        self.assertEqual(len(session['skill_ids']), 2)
        self.assertFalse(any('answer' in q for q in session['questions']))
        result = self.solve(session)
        self.assertEqual(result['independent_score'], 0)
        self.assertTrue(result['practice_only'])
        self.assertFalse(result['mastery_changed'])
        for row in review.export_state(self.state)['skills'].values():
            self.assertTrue(row['eligible'])
            self.assertEqual(row['due_at'], (self.clock+timedelta(days=1)).isoformat())
        with self.assertRaises(ValueError):
            self.start('review')
        self.assertEqual(self.state['lessons'], untouched)
        # No waiting is imposed on supported practice.
        second = self.start()
        self.assertNotEqual(second['id'], session['id'])

    def test_intervals_continue_with_fresh_mixed_problems(self):
        self.solve(self.start())
        seen = set(self.state['review']['exposures'])
        for interval in (3, 7, 14, 30, 30):
            self.clock = max(review.parse_time(r['due_at']) for r in self.state['review']['skills'].values())
            s = self.start('review')
            self.assertEqual(len(s['skill_ids']), 2)
            fps = {q['fingerprint'] for q in review.get_session(self.state, s['id'])['questions']}
            self.assertFalse(fps & seen)
            seen |= fps
            result = self.solve(s)
            self.assertEqual(result['independent_score'], 3)
            self.assertFalse(result['practice_only'])
            self.assertTrue(all(r['interval_days'] == interval and r['retention_supported'] for r in result['skill_results']))
        self.assertEqual(len(seen), 18)

    def test_wrong_skill_resets_without_erasing_other_recall(self):
        self.solve(self.start())
        self.clock += timedelta(days=1)
        s = self.start('review')
        failed_skill = s['questions'][0]['skill_id']
        answers = self.answers(s)
        for q in s['questions']:
            if q['skill_id'] == failed_skill:
                answers[q['id']] = 'wrong'
        result = self.solve(s, answers)
        for row in result['skill_results']:
            self.assertEqual(row['interval_days'], 1 if row['skill_id'] == failed_skill else 3)
        self.clock += timedelta(days=1)
        replacement = self.start('review')
        self.assertEqual(replacement['skill_ids'], [failed_skill])
        self.assertFalse({q['id'] for q in s['questions']} & {q['id'] for q in replacement['questions']})

    def test_hint_assists_only_relevant_skill_and_help_before_open_reschedules(self):
        self.solve(self.start())
        self.clock += timedelta(days=1)
        s = self.start('review')
        q = s['questions'][0]
        target = q['skill_id']
        other = next(sid for sid in s['skill_ids'] if sid != target)
        original_other = deepcopy(self.state['review']['skills'][other])
        hint = review.hint(self.state, {'session_id': s['id'], 'question_id': q['id']})
        self.assertTrue(hint['hint'])
        self.assertEqual(hint['skill_id'], target)
        self.assertEqual(self.state['review']['skills'][other], original_other)
        result = self.solve(s)
        self.assertTrue(all(item['assisted'] == (item['skill_id'] == target) for item in result['items']))
        self.assertTrue(all(item['independent'] == (item['skill_id'] == other) for item in result['items']))
        self.clock += timedelta(days=4)
        original_other = deepcopy(self.state['review']['skills'][other])
        review.pause_for_topics(self.state, bank.SKILLS[target]['topic_ids'])
        self.assertEqual(self.state['review']['skills'][other], original_other)
        self.assertEqual(self.state['review']['skills'][target]['due_at'], (self.clock+timedelta(days=1)).isoformat())
        self.assertEqual(self.start('review')['skill_ids'], [other])

    def test_revision_resume_submission_idempotency_and_cross_profile(self):
        s = self.start()
        answers = self.answers(s)
        payload = {'session_id': s['id'], 'revision': 3, 'answers': answers}
        review.draft(self.state, payload)
        review.draft(self.state, payload)
        with self.assertRaises(review.ConflictError):
            review.draft(self.state, {**payload, 'revision': 2})
        with self.assertRaises(review.ConflictError):
            review.draft(self.state, {**payload, 'answers': {s['questions'][0]['id']: 'older'}})
        self.assertEqual(self.start()['id'], s['id'])
        self.assertEqual(self.start()['answers'], answers)
        with self.assertRaises(ValueError):
            review.draft({}, payload)
        result = review.submit(self.state, payload)
        snapshot = deepcopy(self.state)
        self.clock += timedelta(hours=2)
        self.assertEqual(review.submit(self.state, payload), result)
        self.assertEqual(self.state, snapshot, 'Retry must not create evidence or reset dates.')
        changed = dict(answers)
        changed[s['questions'][0]['id']] = 'different'
        with self.assertRaises(review.ConflictError):
            review.submit(self.state, {**payload, 'revision': 4, 'answers': changed})
        restored = json.loads(json.dumps(self.state))
        self.assertEqual(review.export_state(restored), review.export_state(self.state))

    def test_assisted_practice_cannot_schedule_its_skill(self):
        s = self.start(skills=['fractions'])
        review.hint(self.state, {'session_id': s['id'], 'question_id': s['questions'][0]['id']})
        result = self.solve(s)
        self.assertEqual(result['independent_score'], 0)
        self.assertTrue(all(q['assisted'] for q in result['items']))
        self.assertTrue(any('display_answer' in q for q in result['items']))
        self.assertFalse(self.state['review']['skills']['fractions']['eligible'])
        self.assertEqual(review.export_state(self.state)['due_skill_ids'], [])
        self.assertTrue(self.solve(self.start(skills=['fractions']))['skill_results'][0]['eligible'])

    def test_exposure_screens_authored_and_generated_variants(self):
        q = bank.generate('limits', 5, 'removable-hole')
        expression = q['avoid_forms'][0].replace('^2', '²').replace('-', '−')
        topics = {'example': {'lesson': {'examples': [{'steps': [{'expression': expression}]}]}}}
        index = review.exposure_index(self.state, topics)
        self.assertTrue(review.blocked(q, index))
        s = self.start()
        q = review.get_session(self.state, s['id'])['questions'][0]
        index = review.exposure_index(self.state, TOPICS)
        self.assertTrue(review.blocked(q, index))
        altered_id = {**q, 'id': 'new-id'}
        self.assertTrue(review.blocked(altered_id, index))
        exported = json.dumps(review.export_state(self.state))
        self.assertNotIn('explanation', exported)
        self.assertNotIn('parameters', exported)
        self.assertNotIn('fingerprint', exported)

    def test_exhaustion_never_silently_recycles(self):
        fixed = bank.generate('fractions', 100, 'calculation')
        with patch.object(bank, 'generate', return_value=fixed):
            with self.assertRaisesRegex(ValueError, 'exhausted'):
                self.start(skills=['fractions'])
        self.assertEqual(self.state['review']['sessions'], {})
        self.assertEqual(self.state['review']['exposures'], {})

    def test_existing_evidence_requires_actual_independent_dated_session(self):
        snapshot = deepcopy(self.state)
        self.assertFalse(review.sync_existing(self.state, TOPICS))
        self.assertEqual(self.state, snapshot)
        q = [{'id': f'q{i}', 'prompt': f'existing {i}', 'previously_exposed': False} for i in range(3)]
        result = {'passed': True, 'items': [{'id': v['id'], 'correct': True, 'independent': True, 'previously_exposed': False} for v in q]}
        base = {'id': 'existing', 'mode': 'check', 'submitted': True, 'submitted_at': self.clock.isoformat(),
                'created_at': (self.clock-timedelta(hours=1)).isoformat(), 'questions': q, 'result': result, 'hints': [], 'topic_id': 'arithmetic.fractions'}
        self.state['topic_sessions']['bad'] = {**deepcopy(base), 'submitted_at': '2035-01-01'}
        self.assertFalse(review.sync_existing(self.state, TOPICS))
        self.state['topic_sessions']['bad']['submitted_at'] = (self.clock+timedelta(days=1)).isoformat()
        self.assertFalse(review.sync_existing(self.state, TOPICS))
        self.state['topic_sessions']['good'] = deepcopy(base)
        self.state['sessions']['legacy'] = {**deepcopy(base), 'lesson_id': '5-03'}
        self.assertTrue(review.sync_existing(self.state, TOPICS))
        self.assertEqual(set(self.state['review']['skills']), {'fractions', 'cancellation'})
        before = deepcopy(self.state)
        self.assertFalse(review.sync_existing(self.state, TOPICS))
        self.assertEqual(before, self.state)
        self.state['topic_sessions']['hinted'] = {**deepcopy(base), 'topic_id': 'calculus-1.chain-rule', 'hints': ['q0']}
        self.assertFalse(review.sync_existing(self.state, TOPICS))

    def test_recent_support_delays_imported_old_success(self):
        review.pause_for_topics(self.state, {'arithmetic.fractions'})
        q = [{'id': f'old-{i}', 'prompt': str(i)} for i in range(3)]
        self.state['topic_sessions']['old'] = {
            'mode': 'check', 'submitted': True, 'topic_id': 'arithmetic.fractions',
            'submitted_at': (self.clock-timedelta(days=20)).isoformat(), 'questions': q,
            'result': {'passed': True, 'items': [{'id': v['id'], 'correct': True, 'independent': True} for v in q]},
        }
        self.assertTrue(review.sync_existing(self.state, TOPICS))
        self.assertEqual(self.state['review']['skills']['fractions']['due_at'], (self.clock+timedelta(days=1)).isoformat())
        self.assertEqual(review.export_state(self.state)['due_skill_ids'], [])

    def test_back_to_back_due_submissions_are_idempotent(self):
        self.solve(self.start())
        self.clock += timedelta(days=1)
        session = self.start('review')
        data = {'session_id': session['id'], 'answers': self.answers(session), 'revision': 1}
        result = review.submit(self.state, data)
        state = deepcopy(self.state)
        self.assertEqual(result, review.submit(self.state, data))
        self.assertEqual(self.state, state)
        self.assertTrue(all(r['interval_days'] == 3 for r in result['skill_results']))


class ReviewHTTPTests(unittest.TestCase):
    def setUp(self):
        import server
        self.app = server
        self.temp = tempfile.TemporaryDirectory(prefix='catalyst-mixed-review-')
        self.original = Path(self.temp.name)/'state'
        self.app.configure(state_dir=self.original)
        self.http = ThreadingHTTPServer(('127.0.0.1', 0), self.app.Handler)
        self.thread = threading.Thread(target=self.http.serve_forever, daemon=True)
        self.thread.start()
        self.base = f'http://127.0.0.1:{self.http.server_address[1]}/api/'
        self.opener = build_opener(HTTPCookieProcessor(CookieJar()))
        self.identity = None
        self.request('profiles')

    def tearDown(self):
        self.http.shutdown()
        self.http.server_close()
        self.thread.join()
        self.temp.cleanup()

    def request(self, path, data=None, status=200, identity='current'):
        headers = {'Content-Type': 'application/json'}
        bound = self.identity if identity == 'current' else identity
        if data is not None and bound:
            headers['X-Catalyst-Profile'] = bound
        req = Request(self.base+path, data=json.dumps(data).encode() if data is not None else None, headers=headers)
        try:
            response = self.opener.open(req, timeout=10)
        except HTTPError as exc:
            response = exc
        payload = json.loads(response.read())
        self.assertEqual(response.status, status, (path, payload))
        if path in ('profiles', 'profiles/create', 'profiles/select') and response.status == 200:
            self.identity = payload['current']['id']
        return payload

    def test_profile_binding_hidden_keys_save_reload_and_original_unchanged(self):
        original = (self.original/'dashboard_progress.json').read_bytes()
        self.assertEqual(self.request('review/state')['skills'], {})
        self.assertEqual((self.original/'dashboard_progress.json').read_bytes(), original)
        self.request('profiles/create', {'id': 'mixed-a', 'name': 'Mixed A'})
        s = self.request('review/start', {'mode': 'practice', 'skill_ids': ['limits', 'chain-rule']})
        self.assertEqual(s['profile_id'], 'mixed-a')
        self.assertTrue(all('answer' not in q and 'parameters' not in q for q in s['questions']))
        data = {'session_id': s['id'], 'revision': 4, 'answers': {s['questions'][0]['id']: 'MY_SAVED_ANSWER'}}
        self.request('review/draft', data, status=409, identity=None)
        self.request('review/draft', data)
        self.request('review/draft', {**data, 'revision': 3}, status=409)
        self.request('profiles/create', {'id': 'mixed-b', 'name': 'Mixed B'})
        self.request('review/draft', {**data, 'revision': 5}, status=409, identity='mixed-a')
        self.request('review/draft', data, status=400)
        self.assertEqual(self.request('review/state')['sessions'], [])
        self.request('profiles/select', {'id': 'mixed-a'})
        self.app.STORE.states.pop('mixed-a')
        saved = self.request('review/state')['sessions'][0]
        self.assertEqual(saved['answers'], data['answers'])
        self.assertEqual(saved['revision'], 4)
        self.assertEqual((self.original/'dashboard_progress.json').read_bytes(), original)


if __name__ == '__main__':
    unittest.main(verbosity=2)
