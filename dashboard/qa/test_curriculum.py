"""Validate curriculum coverage, dependencies, privacy boundaries, and selected math keys.

This checks authored content, not learner ability. It writes no learner state.
Run with: math-tutor/.venv/Scripts/python.exe math-tutor/dashboard/qa/test_curriculum.py
"""
import json
import math
import sys
import unittest
from collections import Counter
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
CATALOG = json.loads((ROOT / 'curriculum_catalog.json').read_text(encoding='utf-8'))
COURSES = {c['id']: c for c in CATALOG['courses']}
TOPICS = {t['id']: t for c in COURSES.values() for t in c['topics']}
GUIDES = {key: topic['lesson'] for key, topic in TOPICS.items() if 'lesson' in topic}
QUESTIONS = {
    q['id']: q
    for lesson in GUIDES.values()
    for field in ('practice', 'independent_check')
    for q in lesson[field]
}


def require_acyclic(nodes):
    active, done = set(), set()

    def visit(key):
        if key in active:
            raise AssertionError(f'Prerequisite cycle through {key}')
        if key in done:
            return
        active.add(key)
        for dependency in nodes[key]['prerequisites']:
            if dependency not in nodes:
                raise AssertionError(f'Missing prerequisite {dependency} for {key}')
            visit(dependency)
        active.remove(key)
        done.add(key)

    for key in nodes:
        visit(key)


class CurriculumTests(unittest.TestCase):
    def test_complete_course_inventory(self):
        expected = {
            'number-sense', 'arithmetic', 'pre-algebra', 'algebra-1', 'geometry',
            'statistics-basics', 'algebra-2', 'trigonometry', 'precalculus',
            'calculus-1', 'calculus-2', 'multivariable', 'linear-algebra',
            'discrete-math', 'probability', 'statistics', 'proof-foundations',
            'real-analysis', 'complex-analysis', 'abstract-algebra', 'number-theory',
            'differential-equations', 'optimization', 'numerical-analysis',
            'topology', 'differential-geometry', 'measure-theory',
            'stochastic-processes', 'functional-analysis',
        }
        self.assertEqual(set(COURSES), expected)
        self.assertEqual(len(CATALOG['courses']), len(COURSES))
        self.assertEqual(sum(len(c['topics']) for c in COURSES.values()), len(TOPICS))
        self.assertGreaterEqual(len(TOPICS), 159)

    def test_named_branch_topics(self):
        for key in ('abstract-algebra.groups', 'abstract-algebra.rings',
                    'abstract-algebra.fields', 'differential-equations.odes',
                    'differential-equations.pdes', 'linear-algebra.eigenvectors',
                    'probability.bayes-theorem', 'statistics.confidence-intervals',
                    'multivariable.surface-integrals', 'calculus-2.taylor-series'):
            self.assertIn(key, TOPICS)

    def test_dependency_graphs_have_no_missing_links_or_cycles(self):
        require_acyclic(COURSES)
        require_acyclic(TOPICS)

    def test_course_and_topic_metadata(self):
        for course in COURSES.values():
            for field in ('title', 'level', 'description', 'color'):
                self.assertTrue(course[field], (course['id'], field))
            for topic in course['topics']:
                self.assertTrue(topic['id'].startswith(course['id'] + '.'))
                self.assertTrue(topic['objective'])
                self.assertTrue(topic['scope_note'])
                self.assertIn(topic['availability'], ('lesson', 'reference', 'planned'))
                self.assertEqual(len(topic['prerequisites']), len(set(topic['prerequisites'])))
                if topic['availability'] == 'reference':
                    self.assertIn('lesson', topic)
                    self.assertNotIn('existing_lesson_id', topic)
                elif topic['availability'] == 'planned':
                    self.assertNotIn('lesson', topic)
                    self.assertNotIn('existing_lesson_id', topic)

    def test_existing_videos_map_once(self):
        manifest = json.loads((ROOT.parent / 'courses/levels-4a-4b-5/manifest.json').read_text(encoding='utf-8'))
        expected = {lesson['id'] for unit in manifest['units'] for lesson in unit['lessons']}
        actual = [t['existing_lesson_id'] for t in TOPICS.values() if 'existing_lesson_id' in t]
        self.assertEqual(len(actual), 24)
        self.assertEqual(len(set(actual)), len(actual))
        self.assertEqual(set(actual), expected)
        for topic in TOPICS.values():
            if topic['availability'] == 'lesson':
                self.assertIn(topic.get('existing_lesson_id'), expected)

    def test_guides_contain_explanations_and_varied_private_banks(self):
        self.assertGreaterEqual(len(GUIDES), 28)
        all_ids = []
        for tid, lesson in GUIDES.items():
            self.assertGreater(len(lesson['intuition']), 80, tid)
            self.assertGreaterEqual(len(lesson['examples']), 2, tid)
            self.assertTrue(lesson['misconception'], tid)
            self.assertTrue(lesson['explain_back'], tid)
            for example in lesson['examples']:
                self.assertGreaterEqual(len(example['steps']), 2, tid)
                self.assertTrue(example['note'], tid)
                for step in example['steps']:
                    self.assertTrue(step['expression'])
                    self.assertTrue(step['reason'])
            self.assertEqual(Counter(q['difficulty'] for q in lesson['practice']),
                             {'gentle': 3, 'standard': 3, 'stretch': 3}, tid)
            self.assertEqual(Counter(q['difficulty'] for q in lesson['independent_check']),
                             {'gentle': 3, 'standard': 3, 'stretch': 3}, tid)
            practice_prompts = {q['prompt'] for q in lesson['practice']}
            check_prompts = {q['prompt'] for q in lesson['independent_check']}
            self.assertEqual(len(practice_prompts), 9, tid)
            self.assertEqual(len(check_prompts), 9, tid)
            self.assertFalse(practice_prompts & check_prompts, tid)
            for q in lesson['practice'] + lesson['independent_check']:
                all_ids.append(q['id'])
                self.assertTrue(q['id'].startswith(tid + '.'))
                self.assertTrue(q['prompt'])
                self.assertTrue(q['explanation'])
                if q['kind'] == 'number':
                    self.assertIsInstance(q['answer'], (int, float))
                    self.assertTrue(math.isfinite(q['answer']))
                    self.assertLessEqual(q['tolerance'], 1e-5)
                else:
                    self.assertEqual(q['kind'], 'choice')
                    self.assertEqual(q['options'].count(q['answer']), 1)
                    self.assertEqual(len(q['options']), len(set(q['options'])))
                    self.assertGreaterEqual(len(q['options']), 3)
        self.assertEqual(len(all_ids), len(set(all_ids)))

    def test_selected_math_keys_against_independent_calculations(self):
        # Fractions, ambiguous signs, composition order, derivative rules,
        # signed integration, coordinates, and matrix order are high-risk cases.
        expectations = {
            'number-sense.order-of-operations.check-3': 3*(2**2+5)-7,
            'arithmetic.fractions.practice-8': ((2/3)+(1/6))/(5/4),
            'arithmetic.negative-numbers.practice-6': -(2**2),
            'arithmetic.exponents.practice-8': (3**2*3**-4)**-1,
            'arithmetic.percentages.practice-7': 200*1.1*0.9,
            'pre-algebra.multi-step-equations.practice-7': 5,
            'algebra-1.polynomials.practice-7': 2*5+0.2,
            'algebra-2.rational-functions.practice-7': 3,
            'algebra-2.radicals.practice-7': 1/(math.sqrt(7+9)+3),
            'precalculus.composite-functions.practice-9': (2+3)**2-(2**2+3),
            'trigonometry.identities.practice-7': 2*(3/5),
            'calculus-1.limits.practice-7': (2+2)/(2+3),
            'calculus-1.derivatives.check-2': 6*(2**2)-5,
            'calculus-1.product-quotient-rule.practice-6': (1*2-6*(-1))/(2**2),
            'calculus-1.chain-rule.practice-9': -2*2/(2**2+4)**2,
            'calculus-2.integrals.practice-7': (3**2-4*3)-0,
            'calculus-2.integrals.practice-8': 4+1,
            'calculus-2.integrals.check-3': 3+(2**2+2),
            'multivariable.partial-derivatives.check-2': 3**2+4*2,
            'multivariable.partial-derivatives.check-3': 10*2,
            'linear-algebra.vectors.practice-7': 3*2-2*(-1),
            'linear-algebra.matrices.practice-5': 1*3+2*4,
            'linear-algebra.matrices.practice-7': 2*(1+1),
        }
        for qid, expected in expectations.items():
            self.assertAlmostEqual(QUESTIONS[qid]['answer'], expected, msg=qid)

    def test_public_question_filter_removes_all_answer_data(self):
        sys.path.insert(0, str(ROOT))
        import question_bank
        for question in QUESTIONS.values():
            public = question_bank.public(question)
            self.assertFalse({'answer', 'explanation', 'hint', 'tolerance'} & set(public))
            self.assertEqual(public['prompt'], question['prompt'])


if __name__ == '__main__':
    print(f'Curriculum: {len(COURSES)} courses; {len(TOPICS)} topics; '
          f'{len(GUIDES)} guides; {len(QUESTIONS)} authored questions.')
    unittest.main(verbosity=2)
