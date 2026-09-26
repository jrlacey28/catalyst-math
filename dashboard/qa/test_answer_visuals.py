"""Pure question/feedback diagrams; all practice state is in memory, never a learner file."""
from collections import Counter
from copy import deepcopy
from fractions import Fraction
from pathlib import Path
from unittest.mock import patch
import json
import math
import shutil
import subprocess
import sys
import unittest

DASH = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(DASH))
import answer_visuals as visuals
import question_bank
import review
import review_bank
import studio

PRIVATE = {'answer', 'display_answer', 'expected', 'expected_value', 'response', 'response_value',
           'correct', 'explanation', 'hint', 'tolerance', 'witness', 'learner', 'profile_id'}
LEGACY = ['angles', 'triangles', 'congruence', 'similarity', 'circles', 'area', 'volume',
          'coordinate-geometry', 'proof', 'center', 'variance', 'standard-deviation',
          'distributions', 'correlation', 'probability', 'quadratics', 'polynomials',
          'rational-functions', 'radicals', 'complex-numbers', 'exponentials', 'logarithms',
          'sequences', 'series', 'bridge']


def corpus():
    catalog = json.loads((DASH / 'curriculum_catalog.json').read_text(encoding='utf-8'))
    topics = [t for c in catalog['courses'] for t in c['topics']]
    for name in ['advanced_guides.json', 'completed-guides-foundations.json', 'completed-guides-college.json']:
        topics += json.loads((DASH / name).read_text(encoding='utf-8'))['topics']
    for topic in topics:
        for key in ['practice', 'independent_check']:
            for q in topic.get('lesson', {}).get(key, []):
                yield topic['id'], q
    for project in json.loads((DASH / 'studio_content.json').read_text(encoding='utf-8'))['projects']:
        for q in project['questions']:
            yield project['topic_ids'][0], q
    for slug in LEGACY:
        for seed in range(4):
            for q in question_bank.questions(slug, seed):
                yield slug, q
    for sid, skill in review_bank.SKILLS.items():
        for representation in skill['representations']:
            for seed in range(12):
                yield skill['topic_ids'][0], review_bank.generate(sid, seed, representation)


def released(q, response=None):
    response = str(q['answer']) if response is None else response
    item = {key: q[key] for key in ('id', 'prompt', 'answer', 'explanation', 'display_answer') if key in q}
    item.update(response=response, correct=question_bank.grade({'tolerance': 1e-7, **q}, response))
    return item


class AnswerVisualTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.questions = list(corpus())

    def assert_public(self, obj):
        if isinstance(obj, dict):
            self.assertFalse(PRIVATE & obj.keys(), PRIVATE & obj.keys())
            for value in obj.values():
                self.assert_public(value)
        elif isinstance(obj, list):
            for value in obj:
                self.assert_public(value)

    def test_entire_authored_and_generated_corpus_keeps_keys_private(self):
        self.assertGreater(len(self.questions), 3000)
        kinds = Counter()
        for tid, q in self.questions:
            with self.subTest(q=q['id']):
                before = deepcopy(q)
                v = visuals.prepare_question(q, tid)
                self.assert_public(v)
                self.assertEqual(v['phase'], 'problem')
                kinds[v['type']] += 1
                poisoned = {**q, 'answer': 'SECRET_KEY_7654321', 'display_answer': 'PRIVATE_EXACT_FORM',
                            'explanation': 'PRIVATE_FEEDBACK', 'hint': 'PRIVATE_HINT',
                            'learner': {'name': 'PRIVATE_PERSON'}, 'profile_id': 'PRIVATE_PROFILE'}
                self.assertEqual(v, visuals.prepare_question(poisoned, tid))
                self.assertEqual(q, before)
                public = question_bank.public(q)
                for key in ('answer', 'display_answer', 'explanation', 'hint', 'tolerance'):
                    self.assertNotIn(key, public)
                self.assert_public(public['visual'])
                result = released(q)
                feedback = visuals.prepare_feedback(q, result, tid)
                self.assertEqual(feedback['correct'], result['correct'])
                self.assertFalse(feedback['mastery_changed'])
                self.assertFalse(feedback['independence_claim'])
                self.assertEqual(feedback['phase'], 'feedback')
                # Every recognized numerical model is independently reconstructed
                # from public givens and must agree with the authored key.
                if v['type'] not in ('quantity', 'choice', 'written'):
                    self.assertEqual(feedback['type'], v['type'], (q['prompt'], q['answer']))
        for kind in ('fractions', 'equivalent-fractions', 'balance', 'function', 'integral', 'accumulation', 'triangle', 'probability'):
            self.assertGreater(kinds[kind], 0, kind)

    def test_independently_computed_diagrams_and_user_witnesses(self):
        rows = [
            ('Give a fraction equivalent to 3/4 with denominator 12. Enter its numerator.', 9, '6', 'equivalent-fractions'),
            ('Give a fraction equivalent to 7/8 with denominator 40. Enter its numerator.', 35, '28', 'equivalent-fractions'),
            ('Give a fraction equivalent to 0/7 with denominator 14. Enter its numerator.', 0, '2', 'equivalent-fractions'),
            ('Give a fraction equivalent to 1/1 with denominator 16. Enter its numerator.', 16, '1', 'equivalent-fractions'),
            ('Compute 2/7 + 3/7.', Fraction(5, 7), '10/7', 'fractions'),
            ('Compute (-3/4) / (2/5).', Fraction(-15, 8), '-3/10', 'fractions'),
            ('Solve 3(x-2)=2x+5.', 11, '7', 'balance'),
            ('If f(x)=x²-1, find f(-3).', 8, '-10', 'function'),
            ('For f(x)=3x²-4x, calculate f′(2).', 8, '16', 'function'),
            ('A right triangle has legs 6 and 8. Find its hypotenuse.', 10, '9', 'triangle'),
            ('Two triangle angles are 40° and 60°. Find the third.', 80, '100', 'angles'),
            ('Find the length of (3, -4).', 5, '7', 'vectors'),
            ('Find the dot product (2, -1) · (3, 5).', 1, '11', 'vectors'),
            ('For u=(1, 4) and v=(2, -3), find the y-component of u + v.', 1, '7', 'vectors'),
            ('Find the distance from (1, 2) to (7, 10).', 10, '14', 'points'),
            ('A bag has 5 red and 3 blue balls. Draw two without replacement. Find P(two red).', Fraction(5, 14), '25/64', 'probability'),
            ('A bag has 5 red and 3 blue balls. Find P(at least one red in two draws without replacement).', Fraction(25, 28), '5/8', 'probability'),
            ('Calculate the integral from 0 to 2 of 5x^2 dx. A fraction is welcome.', Fraction(40, 3), '20', 'integral'),
            ('A tank has net flow +4 L/min for 3 minutes, then −5 L/min for 2 minutes. Assuming enough liquid remains, what is the signed change in volume in liters?', 2, '22', 'accumulation'),
        ]
        for prompt, answer, response, kind in rows:
            with self.subTest(prompt=prompt):
                q = dict(id='fixture', kind='number', prompt=prompt, answer=float(answer), explanation='An independently computed fixture.')
                result = visuals.prepare_feedback(q, released(q, response))
                self.assertEqual(result['type'], kind)
                self.assertEqual(result['scope'], 'mathematical-model')
                self.assertAlmostEqual(result['expected_value'], float(answer))
                if kind == 'balance':
                    self.assertEqual(result['witness'], {'left': 15, 'right': 19, 'difference': -4})
                if kind == 'triangle':
                    self.assertEqual(result['witness'], {'leg_square_sum': 100, 'proposed_square': 81, 'valid_length': True})
                if isinstance(answer, Fraction):
                    self.assertEqual(result['expected'], str(answer))

    def test_bad_model_never_overrides_grade_and_feedback_requires_release(self):
        q = dict(id='invalid-key', kind='number', prompt='Solve 2x=4.', answer=999, explanation='A deliberately inconsistent fixture.')
        v = visuals.prepare_feedback(q, released(q, '999'))
        self.assertTrue(v['correct'])
        self.assertEqual(v['type'], 'quantity')
        self.assertEqual(v['scope'], 'answer-comparison')
        self.assertNotIn('witness', v)
        for result in [None, {}, {'answer': 2}, {'answer': 2, 'response': '2', 'correct': 'yes'}]:
            with self.assertRaises(ValueError):
                visuals.prepare_feedback(q, result)
        # The private question key is ignored even during feedback; only the
        # explicit released result supplies the checked value.
        q2 = {**q, 'answer': 'NEVER_READ_PRIVATE'}
        self.assertEqual(v, visuals.prepare_feedback(q2, released(q, '999')))

    def test_invalid_huge_and_malicious_inputs_stay_bounded(self):
        self.assertEqual(visuals.prepare_question({'kind': 'number', 'prompt': 'Compute 1/2/3/4.'})['type'], 'quantity')
        for a, b, target in [(3, 0, 12), (3, 4, 0), (3, 4, 3), (3, 4, 10000), (5, 4, 12)]:
            prompt = f'Give a fraction equivalent to {a}/{b} with denominator {target}. Enter its numerator.'
            self.assertEqual(visuals.prepare_question({'kind': 'number', 'prompt': prompt})['type'], 'quantity')
        for prompt in ['Solve __import__("os").system("bad")=0.', 'If f(x)=x**99999, find f(2).',
                       'Solve x/x=1.', 'Solve 2x+1=2x+3.', 'Compute 1/0 + 2/3.',
                       'A right triangle has legs 0 and 8. Find its hypotenuse.']:
            q = dict(id='bounded', kind='number', prompt=prompt, answer=2)
            v = visuals.prepare_question(q)
            self.assert_public(v)
            out = visuals.prepare_feedback(q, {'answer': 2, 'correct': False, 'response': 'bad'})
            self.assertIsNone(out['response_value'])
            json.dumps(out, allow_nan=False)
        q = dict(id='generic', kind='number', prompt='Enter a finite real number.')
        for response in ['__import__("os")', 'sqrt(-1)', '1/0', '2**9999', 'nan', 'inf', 'x', '1e301', '2'*121]:
            result = visuals.prepare_feedback(q, dict(answer=0, response=response, correct=False))
            self.assertIsNone(result['response_value'])
        for expected in [float('nan'), float('inf'), 10**1000]:
            result = visuals.prepare_feedback(q, dict(answer=expected, response='2', correct=False))
            self.assertIsNone(result['expected_value'])
        out = visuals.prepare_feedback(q, dict(answer=0, response='sqrt(4)/2', correct=False))
        self.assertEqual(out['response_value'], 1)

    def test_saved_studio_and_review_results_preserve_evidence_and_purity(self):
        topics = {t: {'id': t, 'title': t} for s in review_bank.SKILLS.values() for t in s['topic_ids']}
        for mode in ('studio', 'review'):
            state = {'lessons': {'untouched': {'check_passed': True}}, 'topics': {}, 'events': []}
            other_profile = deepcopy(state)
            if mode == 'studio':
                api = studio
                s = api.start(state, {'project_id': 'recipe', 'stage': 'build'})
            else:
                api = review
                with patch.object(review, 'CONTENT_FILES', ()):
                    s = api.start(state, {'mode': 'practice', 'skill_ids': ['fractions', 'chain-rule'], 'seed': 75}, topics)
            for q in s['questions']:
                self.assert_public(q['visual'])
            private = api.get_session(state, s['id'])
            data = {'session_id': s['id'], 'answers': {q['id']: str(q['answer']) for q in private['questions']}}
            result = api.submit(state, data)
            self.assertEqual(result['score'], 3)
            self.assertEqual(result['independent_score'], 0)
            self.assertFalse(result['mastery_changed'])
            self.assertTrue(all(i['visual']['phase'] == 'feedback' for i in result['items']))
            self.assertEqual(result, api.submit(state, data))
            # An old saved result can be decorated on export without rewriting it.
            for i in private['result']['items']:
                del i['visual']
            before = deepcopy(state)
            exported = api.export_session(private)
            self.assertTrue(all(i['visual']['phase'] == 'feedback' for i in exported['result']['items']))
            self.assertEqual(before, state)
            self.assertEqual(state['lessons'], other_profile['lessons'])
            self.assertEqual(other_profile, {'lessons': {'untouched': {'check_passed': True}}, 'topics': {}, 'events': []})

    def test_all_public_and_feedback_descriptors_render_in_javascript(self):
        node = shutil.which('node')
        if not node:
            self.skipTest('Node is needed for SVG corpus verification.')
        rows = []
        for tid, q in self.questions:
            rows.append(visuals.prepare_question(q, tid))
            rows.append(visuals.prepare_feedback(q, released(q, '0' if q['kind'] == 'number' else q['options'][-1]), tid))
        result = subprocess.run([node, str(DASH / 'qa' / 'test_answer_visuals.mjs'), '--stdin'],
                                input=json.dumps(rows, allow_nan=False), text=True, encoding='utf-8', capture_output=True, timeout=60)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn(f'corpus={len(rows)}', result.stdout)


if __name__ == '__main__':
    unittest.main(verbosity=2)
