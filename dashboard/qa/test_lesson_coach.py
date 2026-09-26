"""Lesson coach privacy, bounded follow-ups and independent-check boundaries.

HTTP checks use fresh temporary profiles. Model replies are mocked; no model is
downloaded, no production server is used and no original learner is graded.
"""
from copy import deepcopy
from http.cookiejar import CookieJar
from http.server import ThreadingHTTPServer
from pathlib import Path
from types import SimpleNamespace
from urllib.error import HTTPError
from urllib.request import HTTPCookieProcessor, Request, build_opener
from unittest.mock import patch
import json
import sys
import tempfile
import threading
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import lesson_coach as coach
import server as app
import tutor_ai


TID = 'calculus-1.chain-rule'
OTHER = 'arithmetic.fractions'
TOPIC = {'id': TID, 'title': 'Chain rule', 'objective': 'Follow an inside and an outside rate.',
         'lesson': {'intuition': 'A composition passes one output into the next function.',
                    'examples': [{'title': 'A squared linear input', 'steps': [
                        {'expression': 'u = 2x + 1', 'reason': 'Name the inside function before finding its rate.'},
                        {'expression': 'y = u²', 'reason': 'The outside function squares its input.'},
                        {'expression': 'dy/dx = 2u · 2', 'reason': 'Multiply the outside rate by the inside rate.'}],
                        'note': 'The derivatives must exist at the input under discussion.'}],
                    'misconception': 'The inside rate is part of the chain.',
                    'explain_back': 'Why do the two rates multiply?',
                    'practice': [], 'independent_check': []},
         'private_note': 'DO NOT SEND PRIVATE NOTE'}
for index in range(9):
    TOPIC['lesson']['practice'].append({'id': f'fixture-{index}', 'kind': 'number', 'prompt': f'Compute 1 + {index}.',
        'answer': index + 1, 'explanation': 'DO NOT SEND BANK FEEDBACK', 'hint': 'DO NOT SEND BANK HINT',
        'difficulty': ('gentle', 'standard', 'stretch')[index % 3], 'tolerance': 1e-5})
TOPIC['lesson']['independent_check'] = [{**q, 'id': 'check-' + q['id'], 'answer': 'DO NOT SEND CHECK KEY'} for q in TOPIC['lesson']['practice'][:3]]
TOPICS = {TID: TOPIC, OTHER: {'id': OTHER, 'title': 'Fractions', 'objective': 'Compare equal parts.'}}


def request_data(**changes):
    return {'request_id': 'request_1', 'question': 'Show a step.', 'kind': 'step',
            'mode': 'authored', 'base_revision': 0, **changes}


class CoachUnitTests(unittest.TestCase):
    def test_public_reference_never_copies_banks_or_private_fields(self):
        ref = coach.reference(TOPIC, 'phase_1\nA rate describes change.')
        serialized = json.dumps(ref)
        self.assertIn('Name the inside function', serialized)
        self.assertNotIn('DO NOT SEND', serialized)
        for name in ('practice', 'independent_check', 'private_note', 'answer'):
            self.assertNotIn(name, ref)
        self.assertNotIn('phase_1', ref['transcript'])

    def test_authored_followups_advance_reasoned_steps_and_are_honest(self):
        state = {}
        ref = coach.reference(TOPIC)
        prepared = coach.prepare(state, TID, request_data())
        first = coach.authored_reply(prepared, ref)
        self.assertIn('u = 2x + 1', first['text'])
        self.assertIn('Why: Name the inside', first['text'])
        self.assertIn('Your turn', first['text'])
        coach.commit(state, TID, prepared, first)
        why = coach.prepare(state, TID, request_data(request_id='why_1', base_revision=1, kind='why'))
        self.assertEqual(coach.authored_reply(why, ref)['cursor'], 1)
        following = coach.prepare(state, TID, request_data(request_id='next_1', base_revision=1, kind='next'))
        self.assertIn('y = u²', coach.authored_reply(following, ref)['text'])
        unsupported = coach.prepare(state, TID, request_data(request_id='free_1', base_revision=1, kind='ask', question='Is my unrelated calculation 73/91 correct?'))
        answer = coach.authored_reply(unsupported, ref)
        self.assertEqual(answer['source'], 'authored')
        self.assertIn('has not evaluated', answer['text'])
        self.assertNotIn('correct answer', answer['text'])

    def test_video_only_topic_has_useful_labeled_fallback(self):
        ref = coach.reference(TOPICS[OTHER], 'A fraction compares a part with one whole.\n\nEqual denominators name equally sized parts.')
        self.assertEqual(ref['source'], 'video')
        self.assertIn('From the lesson narration', coach.greeting(ref)['text'])
        answer = coach.authored_reply(coach.prepare({}, OTHER, request_data()), ref)
        self.assertIn('part with one whole', answer['text'])
        self.assertIn('Try one step', answer['text'])

    def test_work_requires_explicit_opt_in_and_only_public_prompt_fields_are_used(self):
        data = request_data(problem={'prompt': 'VISIBLE PROMPT', 'answer': 'HIDDEN ATTACHED KEY'}, draft='MY PRIVATE DRAFT')
        prepared = coach.prepare({}, TID, data)
        self.assertIsNone(prepared['attachment'])
        brief = coach.model_brief({}, TID, prepared, coach.reference(TOPIC))
        self.assertNotIn('MY PRIVATE DRAFT', brief)
        self.assertNotIn('VISIBLE PROMPT', brief)
        selected = coach.prepare({}, TID, {**data, 'attach_work': True})
        brief = coach.model_brief({}, TID, selected, coach.reference(TOPIC))
        self.assertIn('MY PRIVATE DRAFT', brief)
        self.assertNotIn('HIDDEN ATTACHED KEY', brief)
        self.assertNotIn('DO NOT SEND', brief)

    def test_conversation_is_bounded_and_model_context_preserves_current_work(self):
        state = {'lessons': {'L': {'check_passed': False}}, 'homework': {'L': {'q': 'not selected'}}}
        for i in range(16):
            prepared = coach.prepare(state, TID, request_data(request_id=f'm_{i}', base_revision=i, question='"' * 1500,
                mode='local', model='installed', attach_work=True, problem={'prompt': '"' * 2000}, draft='\\' * 4000))
            brief = coach.model_brief(state, TID, prepared, coach.reference(TOPIC))
            self.assertLessEqual(len(brief), 23000)
            self.assertIn(json.dumps(prepared['attachment'], ensure_ascii=False), brief)
            coach.commit(state, TID, prepared, {'text': 'A bounded unverified reply.' * 400})
        thread = coach.export_thread(state, TID)
        self.assertEqual(len(thread['messages']), 24)
        self.assertEqual(thread['revision'], 16)
        self.assertTrue(all(len(m['text']) <= 6000 for m in thread['messages']))
        self.assertEqual(state['lessons'], {'L': {'check_passed': False}})
        self.assertEqual(state['homework'], {'L': {'q': 'not selected'}})
        thread['messages'].clear()
        self.assertEqual(len(coach.export_thread(state, TID)['messages']), 24)

    def test_context_revisions_and_all_relevant_check_types_are_enforced(self):
        store = SimpleNamespace()
        data = {'client_id': 'client', 'context_id': 'page_2', 'context_revision': 2, 'topic_id': TID}
        coach.bind_context(store, 'token', 'learner', data, TOPICS)
        with self.assertRaises(coach.ConflictError):
            coach.bind_context(store, 'token', 'learner', {**data, 'context_revision': 1}, TOPICS)
        with self.assertRaises(coach.ConflictError):
            coach.current_context(store, 'token', 'learner', {**data, 'context_id': 'old_page'})
        for state in (
            {'topic_sessions': {'s': {'topic_id': TID, 'mode': 'check'}}},
            {'sessions': {'s': {'mode': 'unit', 'questions': [{'lesson_id': '5-03'}]}}},
            {'review': {'sessions': {'s': {'mode': 'review', 'questions': [{'topic_ids': [TID]}]}}}},
            {'studio': {'sessions': {'s': {'stage': 'review', 'project_id': 'chain'}}}},
        ):
            with self.subTest(state=state):
                self.assertTrue(coach.blocked_reason(state, {}, {**TOPIC, 'existing_lesson_id': '5-03'}, {'chain': {TID}}))
        self.assertFalse(coach.blocked_reason({'topic_sessions': {'s': {'topic_id': OTHER, 'mode': 'check'}}}, {}, TOPIC))
        self.assertFalse(coach.blocked_reason({'topic_sessions': {'s': {'topic_id': TID, 'mode': 'check', 'paused_for_help': True}}}, {}, TOPIC))

    def test_invalid_or_excessive_conversation_input_is_rejected(self):
        for change in ({'question': 'q' * 1501}, {'base_revision': True}, {'request_id': '../escape'},
                       {'mode': 'cloud'}, {'kind': 'show_key'}, {'attach_work': 'yes'},
                       {'attach_work': True, 'problem': {'prompt': ''}, 'draft': ''},
                       {'attach_work': True, 'problem': {}, 'draft': 'x' * 4001}):
            with self.subTest(change=list(change)):
                with self.assertRaises(ValueError):coach.prepare({}, TID, request_data(**change))


class CoachHTTPTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='catalyst-coach-test-')
        self.addCleanup(self.temp.cleanup)
        previous = {k: getattr(app, k) for k in ('STATE', 'STATE_DIR', 'STORE')}
        self.addCleanup(lambda: [setattr(app, k, v) for k, v in previous.items()])
        app.configure(self.temp.name)
        self.original_file = Path(self.temp.name) / 'dashboard_progress.json'
        self.original = self.original_file.read_bytes()
        topics = patch.object(app, 'topic_index', return_value=deepcopy(TOPICS)); topics.start(); self.addCleanup(topics.stop)
        ref = patch.object(app, 'coach_reference', side_effect=lambda topic: coach.reference(topic, 'Public video narration.')); ref.start(); self.addCleanup(ref.stop)
        self.http = ThreadingHTTPServer(('127.0.0.1', 0), app.Handler)
        self.worker = threading.Thread(target=self.http.serve_forever, daemon=True); self.worker.start()
        self.addCleanup(self.stop_server)
        self.base = f'http://127.0.0.1:{self.http.server_address[1]}'
        self.opener = build_opener(HTTPCookieProcessor(CookieJar()))
        self.profile = 'original'
        self.call('profiles/create', {'id': 'coach_a', 'name': 'Coach QA A'})
        self.page = {'client_id': 'browser_one', 'context_id': 'page_one', 'context_revision': 1, 'topic_id': TID}
        self.call('coach/context', self.page)

    def stop_server(self):
        self.assertEqual(self.original_file.read_bytes(), self.original, 'A coach QA request wrote to its original fixture profile.')
        self.http.shutdown(); self.http.server_close(); self.worker.join(timeout=5)

    @property
    def state(self):
        return app.STORE.states['coach_a']

    def call(self, path, data=None, *, expected=200, profile=None):
        headers = {'Content-Type': 'application/json', 'X-Catalyst-Profile': self.profile if profile is None else profile}
        req = Request(self.base + '/api/' + path, data=None if data is None else json.dumps(data).encode(), headers=headers)
        try:response = self.opener.open(req, timeout=5)
        except HTTPError as error:response = error
        with response:
            result = json.load(response)
            self.assertEqual(response.status, expected, (path, result))
        if path.startswith('profiles') and result.get('current'):self.profile = result['current']['id']
        return result

    def message(self, **changes):
        return {**self.page, **request_data(**changes)}

    def test_context_is_read_only_open_is_support_and_messages_resume_idempotently(self):
        before = deepcopy(self.state)
        self.call('coach/context', self.page)
        self.assertEqual(self.state, before)
        opened = self.call('coach/open', self.page)
        self.assertFalse(opened['blocked'])
        self.assertEqual(opened['thread']['messages'], [])
        self.assertEqual(opened['greeting']['source'], 'authored')
        first = self.call('coach/message', self.message())
        self.assertFalse(first['mastery_changed'])
        self.assertEqual(first['thread']['revision'], 1)
        self.assertIn('Why:', first['reply']['text'])
        saved = deepcopy(self.state)
        replay = self.call('coach/message', self.message())
        self.assertEqual(replay, first)
        self.assertEqual(self.state, saved)
        self.call('coach/message', self.message(question='Changed text.'), expected=409)
        self.call('coach/message', self.message(request_id='late'), expected=409)
        app.configure(self.temp.name)
        self.call('coach/context', self.page)
        reopened = self.call('coach/open', self.page)
        self.assertEqual(reopened['thread'], first['thread'])
        self.assertEqual(self.state['lessons'], {})
        self.assertFalse(self.state['topics'].get(TID, {}).get('check_passed', False))

    def test_an_active_check_cannot_be_bypassed_with_a_false_page_flag(self):
        check = self.call('topic/activity', {'topic_id': TID, 'mode': 'check', 'difficulty': 'standard'})
        before = deepcopy(self.state)
        opened = self.call('coach/open', {**self.page, 'independent_check': False})
        self.assertTrue(opened['blocked'])
        self.assertNotIn('thread', opened)
        self.assertEqual(self.state, before)
        with patch.object(tutor_ai, 'generate') as generate:
            self.call('coach/message', self.message(mode='local', model='installed'), expected=409)
            generate.assert_not_called()
        # The learner deliberately leaves the check for supported practice first.
        self.call('topic/help', {'topic_id': TID})
        self.assertTrue(self.state['topic_sessions'][check['id']]['paused_for_help'])
        self.assertFalse(self.call('coach/open', self.page)['blocked'])
        self.assertFalse(self.state['topics'].get(TID, {}).get('check_passed', False))

    def test_local_followup_uses_saved_conversation_and_only_selected_work(self):
        self.call('coach/message', self.message(question='What is the inside function?', kind='ask'))
        seen = []
        def fake(model, brief, question):
            seen.append((brief, question))
            return {'text': 'Name u first, then find its rate. What is du/dx?', 'model': model, 'verified': False}
        with patch.object(tutor_ai, 'generate', side_effect=fake):
            result = self.call('coach/message', self.message(request_id='local_followup', base_revision=1,
                question='I named u. Why multiply the rates?', mode='local', model='installed', attach_work=True,
                problem={'prompt': 'Visible custom problem', 'answer': 'DO NOT SEND ATTACHED KEY'}, draft='I set u = 2x + 1.'))
        self.assertIn('What is the inside function?', seen[0][0])
        self.assertIn('I set u = 2x + 1.', seen[0][0])
        self.assertNotIn('DO NOT SEND', seen[0][0])
        self.assertFalse(result['reply']['verified'])
        self.assertEqual(result['reply']['source'], 'local')
        self.assertEqual(result['thread']['revision'], 2)

    def test_stale_context_during_inference_discards_reply_without_holding_lock(self):
        before = deepcopy(self.state)
        def fake(*args):
            self.call('coach/context', {**self.page, 'context_id': 'page_two', 'context_revision': 2, 'topic_id': OTHER})
            return {'text': 'Old-page reply', 'model': 'installed', 'verified': False}
        with patch.object(tutor_ai, 'generate', side_effect=fake):
            self.call('coach/message', self.message(mode='local', model='installed'), expected=409)
        self.assertEqual(self.state, before)
        self.assertEqual(app.STORE.coach_pending, {})

    def test_check_started_during_inference_keeps_answer_hidden(self):
        checks = []
        def fake(*args):
            checks.append(self.call('topic/activity', {'topic_id': TID, 'mode': 'check', 'difficulty': 'standard'}))
            return {'text': 'Reply that must not reach an independent check', 'model': 'installed'}
        with patch.object(tutor_ai, 'generate', side_effect=fake):
            self.call('coach/message', self.message(mode='local', model='installed'), expected=409)
        self.assertNotIn('lesson_coach', self.state)
        self.assertFalse(self.state['topic_sessions'][checks[0]['id']].get('paused_for_help', False))

    def test_profile_switch_discards_reply_and_never_leaks_to_another_learner(self):
        def fake(*args):
            self.call('profiles/create', {'id': 'coach_b', 'name': 'Coach QA B'})
            return {'text': 'A reply for learner A', 'model': 'installed'}
        with patch.object(tutor_ai, 'generate', side_effect=fake):
            self.call('coach/message', self.message(mode='local', model='installed'), expected=409)
        self.assertNotIn('lesson_coach', app.STORE.states['coach_a'])
        self.assertNotIn('lesson_coach', app.STORE.states['coach_b'])
        with patch.object(tutor_ai, 'generate') as generate:
            self.call('coach/message', self.message(mode='local', model='installed'), profile='coach_a', expected=409)
            generate.assert_not_called()

    def test_connection_failure_keeps_conversation_clean_and_authored_help_works(self):
        before = deepcopy(self.state)
        with patch.object(tutor_ai, 'generate', side_effect=ValueError('The local model is unavailable.')):
            self.call('coach/message', self.message(mode='local', model='installed'), expected=400)
        self.assertEqual(self.state, before)
        self.assertEqual(app.STORE.coach_pending, {})
        result = self.call('coach/message', self.message())
        self.assertEqual(result['reply']['source'], 'authored')
        with patch.object(tutor_ai, 'status', return_value={'available': False, 'models': [], 'message': 'Absent'}):
            status = self.call('coach/status')
            self.assertTrue(status['authored_available'])
            self.assertFalse(status['available'])

    def test_missions_missing_fallback_is_public_and_read_only(self):
        before = deepcopy(self.state)
        with patch.object(app, 'APP', Path(self.temp.name)):
            self.assertEqual(self.call('missions'), {})
            (Path(self.temp.name) / 'mission-content.json').write_text(json.dumps({'version': 1, 'missions': [{'topic_id': TID}]}))
            self.assertEqual(self.call('missions')['missions'][0]['topic_id'], TID)
        self.assertEqual(self.state, before)


if __name__ == '__main__':
    unittest.main(verbosity=2)
