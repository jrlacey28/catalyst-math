"""Studio behavior and HTTP isolation. All evidence is written to temporary profiles."""
from copy import deepcopy
from datetime import datetime, timedelta, timezone
from http.cookiejar import CookieJar
from http.server import ThreadingHTTPServer
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import HTTPCookieProcessor, Request, build_opener
from unittest.mock import patch
import json
import sys
import tempfile
import threading
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import server as app
import studio


def fixture():
    projects = []
    for pid, tid in [('recipe', 'arithmetic.fractions'), ('plans', 'geometry.angles')]:
        questions = []
        for stage in studio.STAGES:
            for i in range(3):
                q = dict(id=f'{pid}.{stage}-{i}', stage=stage, kind='number', prompt=f'{pid} {stage} fixture: {i}+2?', answer=i+2, explanation=f'Add two to {i}; the total is {i+2}.', hint='Count forward two.', tolerance=1e-5)
                if i == 2:
                    q.update(kind='choice', answer='four', options=['four', 'three', 'five'])
                questions.append(q)
        projects.append(dict(id=pid, title=f'{pid} fixture', context='A bounded test scenario.', decision='Compare the quantities.', topic_ids=[tid], prerequisite_ids=[], examples=[{'title': 'Small'}, {'title': 'Connected'}], challenges=[{'id': 'design', 'prompt': 'Explain your choice.'}], prediction={'prompt': 'What happens?', 'options': ['doubles', 'halves'], 'answer': 'doubles', 'explanation': 'Both equal parts count.'}, questions=questions))
    return {'version': 1, 'projects': projects}


class StudioLogicTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='catalyst-studio-logic-')
        path = Path(self.temp.name) / 'content.json'
        path.write_text(json.dumps(fixture()), encoding='utf-8')
        self.content_patch = patch.object(studio, 'CONTENT_FILE', path)
        self.content_patch.start()
        self.state = app.empty()
        self.clock = datetime(2030, 1, 1, 12, tzinfo=timezone.utc)
        self.time_patch = patch.object(studio, 'now', side_effect=lambda: self.clock)
        self.time_patch.start()

    def tearDown(self):
        self.time_patch.stop()
        self.content_patch.stop()
        self.temp.cleanup()

    def start(self, stage='build', pid='recipe'):
        return studio.start(self.state, {'project_id': pid, 'stage': stage})

    def solve(self, session, wrong=False):
        private = studio.get_session(self.state, session['id'])
        answers = {q['id']: 'incorrect' if wrong else str(q['answer']) for q in private['questions']}
        return studio.submit(self.state, {'session_id': session['id'], 'answers': answers})

    def test_dynamic_public_content_hides_keys(self):
        result = studio.public_content()
        self.assertEqual(result['projects'][0]['practice_counts'], dict.fromkeys(studio.STAGES, 3))
        self.assertNotIn('questions', result['projects'][0])
        self.assertNotIn('answer', result['projects'][0]['prediction'])
        self.assertNotIn('explanation', result['projects'][0]['prediction'])
        with patch.object(studio, 'CONTENT_FILE', Path(self.temp.name) / 'missing.json'):
            self.assertEqual(studio.public_content()['projects'], [])

    def test_projects_save_resume_and_reject_conflicting_revisions(self):
        data = {'project_id': 'recipe', 'revision': 3, 'inputs': {'servings': 4}, 'work': {'prediction': 'doubles', 'observation': 'Observed four servings.', 'explanation': 'Two equal groups.', 'explored': 'yes', 'example_0': 'read', 'challenge_design': 'My design.', 'transfer': 'Another mixture.'}}
        self.assertTrue(studio.save_project(self.state, data)['saved'])
        self.assertTrue(studio.save_project(self.state, deepcopy(data))['saved'])
        for changed in [{**data, 'revision': 2}, {**data, 'work': {'observation': 'Different tab.'}}]:
            with self.assertRaises(studio.ConflictError):
                studio.save_project(self.state, changed)
        exported = studio.export_state(self.state)
        self.assertEqual(exported['projects']['recipe']['work']['challenge_design'], 'My design.')
        self.assertEqual(exported['projects']['recipe']['written_status'], 'pending_tutor_review')
        self.assertEqual(self.state['lessons'], {})
        self.assertEqual(self.state['topics'], {})
        self.assertFalse(self.state['bridge_passed'])
        for inputs in [{'servings': float('inf')}, {'servings': 100}, {'servings': True}, {'arbitrary': 2}, {'servings': {'code': 'x'}}]:
            with self.assertRaises(ValueError):
                studio.save_project(self.state, {**data, 'revision': 4, 'inputs': inputs})

    def test_three_question_resume_draft_and_private_feedback(self):
        session = self.start()
        self.assertEqual(len(session['questions']), 3)
        self.assertTrue(all(not {'answer', 'explanation', 'hint', 'tolerance'} & q.keys() for q in session['questions']))
        self.assertEqual(self.start()['questions'], session['questions'])
        qid = session['questions'][0]['id']
        data = {'session_id': session['id'], 'revision': 1, 'answers': {qid: '2'}}
        studio.draft(self.state, data)
        studio.draft(self.state, deepcopy(data))
        with self.assertRaises(studio.ConflictError):
            studio.draft(self.state, {**data, 'answers': {qid: '9'}})
        with self.assertRaises(studio.ConflictError):
            studio.draft(self.state, {**data, 'revision': 0})
        self.assertEqual(self.start()['answers'][qid], '2')
        with self.assertRaises(ValueError):
            studio.submit(self.state, {'session_id': session['id'], 'answers': {}})
        hint = studio.hint(self.state, {'session_id': session['id'], 'question_id': qid})
        self.assertEqual(hint['hint'], 'Count forward two.')
        result = self.solve(session)
        self.assertEqual(result['score'], 3)
        self.assertEqual(result['independent_score'], 0)
        self.assertTrue(result['items'][0]['assisted'])
        self.assertTrue(result['practice_only'])
        self.assertFalse(result['retention_established'])
        self.assertEqual(self.solve(session), result)

    def test_due_review_is_delayed_from_latest_support_and_repeats_are_honest(self):
        first = self.solve(self.start())
        self.assertEqual(first['review_due'], '2030-01-03')
        with self.assertRaises(ValueError):
            self.start('review')
        self.clock += timedelta(hours=47)
        with self.assertRaises(ValueError):
            self.start('review')
        second = self.solve(self.start('connect'))
        self.assertEqual(second['review_due'], '2030-01-05')
        self.clock += timedelta(hours=49)
        review = self.start('review')
        result = self.solve(review)
        self.assertTrue(result['retention_established'])
        self.assertFalse(result['practice_only'])
        self.assertEqual(result['independent_score'], 3)
        self.assertTrue(result['needs_fresh_variants'])
        self.clock += timedelta(days=8)
        repeat = self.start('review')
        self.assertTrue(repeat['previously_exposed'])
        repeated_result = self.solve(repeat)
        self.assertEqual(repeated_result['score'], 3)
        self.assertEqual(repeated_result['independent_score'], 0)
        self.assertFalse(repeated_result['retention_established'])
        self.assertTrue(repeated_result['practice_only'])
        self.assertIn('last_independent_success_at', studio.workspace(self.state)['reviews']['recipe'])

    def test_help_before_opening_review_reschedules_only_related_project(self):
        self.solve(self.start(pid='recipe'))
        self.solve(self.start(pid='plans'))
        self.clock += timedelta(hours=49)
        studio.pause_for_topics(self.state, {'arithmetic.fractions'})
        reviews = studio.workspace(self.state)['reviews']
        self.assertEqual(reviews['recipe']['due_date'], '2030-01-05')
        self.assertEqual(reviews['plans']['due_date'], '2030-01-03')
        with self.assertRaises(ValueError):
            self.start('review', 'recipe')
        self.assertFalse(self.start('review', 'plans')['previously_exposed'])
        self.clock += timedelta(hours=49)
        self.assertTrue(self.solve(self.start('review', 'recipe'))['retention_established'])

    def test_help_invalidates_review_and_repeats_do_not_restore_it(self):
        self.solve(self.start())
        self.clock += timedelta(days=3)
        review = self.start('review')
        studio.pause_for_topics(self.state, {'arithmetic.fractions'})
        self.assertTrue(studio.get_session(self.state, review['id'])['paused_for_help'])
        result = self.solve(review)
        self.assertEqual(result['independent_score'], 0)
        self.assertTrue(all(item['assisted'] for item in result['items']))
        self.assertFalse(result['retention_established'])
        with self.assertRaises(ValueError):
            self.start('review')
        self.clock += timedelta(days=3)
        replacement = self.start('review')
        self.assertNotEqual(replacement['id'], review['id'])
        self.assertTrue(replacement['previously_exposed'])
        self.assertFalse(self.solve(replacement)['retention_established'])

    def test_failure_does_not_create_or_extend_success(self):
        self.assertIsNone(self.solve(self.start(), wrong=True)['review_due'])
        self.assertEqual(studio.workspace(self.state)['reviews'], {})
        self.solve(self.start('connect'))
        self.clock += timedelta(days=3)
        result = self.solve(self.start('review'), wrong=True)
        self.assertFalse(result['retention_established'])
        self.assertEqual(studio.workspace(self.state)['reviews']['recipe']['status'], 'needs_practice')
        self.assertEqual(result['review_due'], '2030-01-06')

    def test_brief_uses_selected_project_but_no_assessment_history(self):
        self.state['placement_session'] = {'private': 'PRIVATE_DIAGNOSTIC_MARKER'}
        self.state['topics'] = {'other': {'private': 'PRIVATE_EVIDENCE_MARKER'}}
        studio.save_project(self.state, {'project_id': 'recipe', 'revision': 1, 'inputs': {'servings': 4}, 'work': {'observation': 'MY_SELECTED_PROJECT_WORK'}})
        topics = {'arithmetic.fractions': {'title': 'Fractions'}}
        result = studio.brief(self.state, {'project_id': 'recipe', 'topic_id': 'arithmetic.fractions', 'interests': ['everyday'], 'goal': 'Understand scaling.'}, topics)
        self.assertIn('MY_SELECTED_PROJECT_WORK', result['prompt'])
        self.assertIn('Fractions', result['prompt'])
        self.assertNotIn('PRIVATE_DIAGNOSTIC_MARKER', result['prompt'])
        self.assertNotIn('PRIVATE_EVIDENCE_MARKER', result['prompt'])
        self.assertFalse(result['uses_private_assessment_history'])


class StudioHTTPTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='catalyst-studio-http-')
        root = Path(self.temp.name)
        content_file = root / 'content.json'
        content_file.write_text(json.dumps(fixture()), encoding='utf-8')
        self.content_patch = patch.object(studio, 'CONTENT_FILE', content_file)
        self.content_patch.start()
        self.original_dir = root / 'state'
        app.configure(state_dir=self.original_dir)
        self.http = ThreadingHTTPServer(('127.0.0.1', 0), app.Handler)
        self.thread = threading.Thread(target=self.http.serve_forever, daemon=True)
        self.thread.start()
        self.base = f'http://127.0.0.1:{self.http.server_address[1]}'
        self.opener = build_opener(HTTPCookieProcessor(CookieJar()))
        self.identity = None
        self.request('profiles')

    def tearDown(self):
        self.http.shutdown()
        self.http.server_close()
        self.thread.join()
        self.content_patch.stop()
        self.temp.cleanup()

    def request(self, route, data=None, status=200, identity='current'):
        headers = {'Content-Type': 'application/json'}
        bound = self.identity if identity == 'current' else identity
        if data is not None and bound:
            headers['X-Catalyst-Profile'] = bound
        req = Request(self.base + '/api/' + route, data=json.dumps(data).encode() if data is not None else None, headers=headers)
        try:
            response = self.opener.open(req, timeout=10)
        except HTTPError as exc:
            response = exc
        result = json.loads(response.read())
        self.assertEqual(response.status, status, (route, result))
        if route in ('profiles', 'profiles/create', 'profiles/select') and response.status == 200:
            self.identity = result['current']['id']
        return result

    def test_private_state_conflicts_and_separate_profiles(self):
        initial = (self.original_dir / 'dashboard_progress.json').read_bytes()
        self.request('profiles/create', {'id': 'learner-a', 'name': 'QA A'})
        payload = {'project_id': 'recipe', 'revision': 2, 'work': {'observation': 'A only'}, 'inputs': {'servings': 6}}
        self.request('studio/save', payload, status=409, identity=None)
        self.request('studio/save', payload)
        self.request('studio/save', payload)
        self.request('studio/save', {**payload, 'revision': 1}, status=409)
        self.request('studio/save', {**payload, 'work': {'observation': 'Equal revision conflict'}}, status=409)
        self.request('studio/preferences', {'revision': 1, 'interests': ['everyday'], 'goal': 'Scale a recipe', 'topic_id': 'arithmetic.fractions'})
        session = self.request('studio/start', {'project_id': 'recipe', 'stage': 'build'})
        qid = session['questions'][0]['id']
        self.request('studio/draft', {'session_id': session['id'], 'revision': 1, 'answers': {qid: '2'}})
        self.request('profiles/create', {'id': 'learner-b', 'name': 'QA B'})
        self.request('studio/save', {**payload, 'revision': 3}, status=409, identity='learner-a')
        self.request('studio/draft', {'session_id': session['id'], 'revision': 2, 'answers': {qid: '99'}}, status=400)
        b = self.request('studio/state')
        self.assertEqual(b['profile_id'], 'learner-b')
        self.assertEqual(b['projects'], {})
        self.assertEqual(b['sessions'], [])
        self.request('profiles/select', {'id': 'learner-a'})
        app.STORE.states.pop('learner-a')
        a = self.request('studio/state')
        self.assertEqual(a['projects']['recipe']['work']['observation'], 'A only')
        self.assertEqual(a['sessions'][0]['answers'][qid], '2')
        self.assertEqual(self.request('export')['studio']['projects'], a['projects'])
        self.assertEqual((self.original_dir / 'dashboard_progress.json').read_bytes(), initial)

    def test_studio_help_pauses_legacy_and_guide_checks(self):
        legacy = self.request('activity', {'lesson_id': '4A-01', 'mode': 'check'})
        self.request('studio/help', {'project_id': 'plans'})
        self.assertTrue(app.STATE['sessions'][legacy['id']]['paused_for_help'])
        tid = 'arithmetic.fractions'
        self.assertIn('lesson', app.topic_index()[tid])
        guide = self.request('topic/activity', {'topic_id': tid, 'mode': 'check', 'difficulty': 'standard'})
        self.request('studio/help', {'project_id': 'recipe'})
        self.assertTrue(app.STATE['topic_sessions'][guide['id']]['paused_for_help'])

    def test_existing_help_pauses_studio_review_and_keys_stay_hidden(self):
        fixed = datetime(2031, 2, 1, tzinfo=timezone.utc)
        with patch.object(studio, 'now', return_value=fixed):
            activity = self.request('studio/start', {'project_id': 'recipe', 'stage': 'build'})
            private = studio.get_session(app.STATE, activity['id'])
            result = self.request('studio/submit', {'session_id': activity['id'], 'answers': {q['id']: str(q['answer']) for q in private['questions']}})
            self.assertFalse(result['retention_established'])
            self.assertEqual(result['independent_score'], 0)
        with patch.object(studio, 'now', return_value=fixed+timedelta(days=3)):
            review = self.request('studio/start', {'project_id': 'recipe', 'stage': 'review'})
            self.request('topic/help', {'topic_id': 'arithmetic.fractions'})
            current = self.request('studio/state')
            saved = next(s for s in current['sessions'] if s['id'] == review['id'])
            self.assertTrue(saved['paused_for_help'])
            self.assertTrue(all('answer' not in q and 'hint' not in q and 'explanation' not in q for q in saved['questions']))
            self.assertIn('answer', current['sessions'][0]['result']['items'][0])


if __name__ == '__main__':
    unittest.main(verbosity=2)
