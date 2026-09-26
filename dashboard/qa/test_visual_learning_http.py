"""Real local HTTP contracts for visual drafts, using temporary learners only."""
from copy import deepcopy
from http.cookiejar import CookieJar
from http.server import ThreadingHTTPServer
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import HTTPCookieProcessor, Request, build_opener
import json
import shutil
import subprocess
import sys
import tempfile
import threading
import unittest

DASH = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(DASH))
import server as app

ORBIT_TOPIC = 'arithmetic.exponents'


class VisualLearningHTTP(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        node = shutil.which('node')
        if not node:
            raise unittest.SkipTest('Node is needed to verify the real v1 AI normalizer contract.')
        cls.node = node
        module = (DASH / 'ai-math.js').as_uri()
        cls.module = module
        code = f"""import {{normalizeAIState,trainAI,snapshotAI}} from {json.dumps(module)};
const s=normalizeAIState();s.stageId='gradients';s.sampleId='S2';
s.models.linear=trainAI('linear',s.models.linear,s.learningRate,3).model;
s.notes.gradients='The update changes each weight using its own loss gradient.';
s.practices.gradients={{choice:1,shown:true}};s.visited=['features','gradients'];
console.log(JSON.stringify(snapshotAI(s)));"""
        result = subprocess.run([node, '--input-type=module', '-e', code], capture_output=True, text=True, check=True, timeout=15)
        cls.ai_draft = json.loads(result.stdout)

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(prefix='catalyst-visual-http-')
        self.directory = Path(self.tmp.name)
        app.configure(self.directory)
        self.http = ThreadingHTTPServer(('127.0.0.1', 0), app.Handler)
        self.thread = threading.Thread(target=self.http.serve_forever, daemon=True)
        self.thread.start()
        self.a, self.b = self.client(), self.client()
        self.a('/api/profiles')
        self.b('/api/profiles')
        self.a('/api/profiles/create', {'id': 'visual_a', 'name': 'Visual QA A'})
        self.b('/api/profiles/create', {'id': 'visual_b', 'name': 'Visual QA B'})
        self.original_file = self.directory / 'dashboard_progress.json'
        self.original_bytes = self.original_file.read_bytes()

    def tearDown(self):
        self.http.shutdown()
        self.http.server_close()
        self.thread.join(timeout=5)
        self.assertFalse(self.thread.is_alive())
        self.assertEqual(self.original_bytes, self.original_file.read_bytes(), 'The temporary original profile must stay untouched.')
        self.tmp.cleanup()

    def client(self):
        opener = build_opener(HTTPCookieProcessor(CookieJar()))
        bound = None

        def request(path, data=None, *, expected=200, binding='auto'):
            nonlocal bound
            headers = {'Content-Type': 'application/json'}
            profile = bound if binding == 'auto' else binding
            if data is not None and profile is not None:
                headers['X-Catalyst-Profile'] = profile
            body = None if data is None else json.dumps(data).encode('utf-8')
            req = Request(f'http://127.0.0.1:{self.http.server_address[1]}{path}', data=body, headers=headers)
            try:
                response = opener.open(req, timeout=10)
            except HTTPError as error:
                response = error
            with response:
                text = response.read()
                self.assertEqual(response.status, expected, text)
                result = json.loads(text)
            if expected == 200 and path in ('/api/profiles', '/api/profiles/create', '/api/profiles/select'):
                bound = result['current']['id']
            return result
        return request

    def mission(self, revision=2):
        return {'topic_id': ORBIT_TOPIC, 'revision': revision,
                'draft': {'version': 1, 'modelId': 'orbit',
                          'controls': {'body': 'moon', 'altitudeKm': 100, 'speedKmS': 1.7, 'progress': 0},
                          'calculation': {'answer': 'sqrt(4^3)', 'factor': 4, 'time': 1, 'ran': True}}}

    def ai(self, revision=2):
        return {'revision': revision, 'draft': deepcopy(self.ai_draft)}

    def test_v1_contract_survives_disk_reload_and_full_export_per_profile(self):
        initial_progress = self.a('/api/progress')
        payloads = [('/api/learning/mission-design', self.mission()), ('/api/learning/ai', self.ai())]
        for path, data in payloads:
            saved = self.a(path, data)
            self.assertEqual(saved['profile_id'], 'visual_a')
            self.assertFalse(saved['mastery_changed'])
            self.assertEqual(saved['record']['draft'], data['draft'])
        isolated = self.b('/api/learning')
        self.assertFalse(isolated.get('mission_designs'))
        self.assertFalse(isolated.get('ai_path'))
        exported = self.a('/api/export')
        self.assertEqual(exported['learning_support']['mission_designs'][ORBIT_TOPIC]['draft'], self.mission()['draft'])
        self.assertEqual(exported['learning_support']['ai_path']['draft'], self.ai_draft)
        # Re-create the store from disk, as a server restart would. All paths are
        # under this test's temporary directory; no production profile is read.
        with app.LOCK:
            app.configure(self.directory)
        reloaded = self.a('/api/learning')
        self.assertEqual(reloaded['mission_designs'][ORBIT_TOPIC]['draft'], self.mission()['draft'])
        self.assertEqual(reloaded['ai_path']['draft'], self.ai_draft)
        code = f"import fs from 'node:fs';import {{normalizeAIState}} from {json.dumps(self.module)};console.log(JSON.stringify(normalizeAIState(JSON.parse(fs.readFileSync(0,'utf8')))));"
        normalized = subprocess.run([self.node, '--input-type=module', '-e', code], input=json.dumps(reloaded['ai_path']['draft']), capture_output=True, text=True, check=True, timeout=15)
        self.assertEqual(json.loads(normalized.stdout), self.ai_draft)
        after = self.a('/api/progress')
        for key in ('topics', 'lessons', 'bridge_passed'):
            self.assertEqual(initial_progress.get(key), after.get(key))

    def test_stale_revisions_and_shared_cookie_tab_binding_are_rejected(self):
        routes = [('/api/learning/mission-design', self.mission()), ('/api/learning/ai', self.ai())]
        for path, data in routes:
            self.a(path, data)
            self.a(path, deepcopy(data))  # Same snapshot/revision is idempotent.
            self.a(path, {**data, 'revision': 1}, expected=409)
            conflicting = deepcopy(data)
            if path.endswith('/ai'):
                conflicting['draft']['notes']['gradients'] = 'A conflicting tab.'
            else:
                conflicting['draft']['calculation']['answer'] = '4'
            self.a(path, conflicting, expected=409)
            self.b(path, data, expected=409, binding='visual_a')
            self.a(path, data, expected=409, binding=None)
        before_a = self.a('/api/learning')
        before_b = self.b('/api/learning')
        # Same cookie jar now selects B, while an old tab still claims A.
        self.a('/api/profiles/select', {'id': 'visual_b'})
        for path, data in routes:
            rejected = self.a(path, {**data, 'revision': 10}, expected=409, binding='visual_a')
            self.assertIn('reload', rejected['error'].lower())
        self.assertEqual(before_b, self.b('/api/learning'))
        self.a('/api/profiles/select', {'id': 'visual_a'})
        self.assertEqual(before_a, self.a('/api/learning'))

    def test_actual_support_sequence_pauses_only_relevant_pending_checks(self):
        tid = 'calculus-1.chain-rule'
        untouched = 'number-sense.counting'
        sessions = {}
        for topic in (ORBIT_TOPIC, tid, untouched):
            sessions[topic] = self.a('/api/topic/activity', {'topic_id': topic, 'mode': 'check', 'difficulty': 'standard'})
        # This mirrors mountMission's onSupport call before its saved calculation.
        self.a('/api/topic/help', {'topic_id': ORBIT_TOPIC})
        self.a('/api/learning/mission-design', self.mission())
        # The AI UI calls the explicit support endpoint for the current stage and
        # its dependencies. Saving a draft by itself is not an assessment event.
        self.a('/api/learning/support', {'topic_ids': [tid]})
        self.a('/api/learning/ai', self.ai())
        exported = self.a('/api/export')
        by_id = {s['id']: s for s in exported['topic_sessions']}
        for topic in (ORBIT_TOPIC, tid):
            self.assertTrue(by_id[sessions[topic]['id']]['paused_for_help'])
        self.assertFalse(by_id[sessions[untouched]['id']].get('paused_for_help', False))
        for s in by_id.values():
            self.assertFalse(s['submitted'])
            self.assertTrue(all('answer' not in q and q['visual']['phase'] == 'problem' for q in s['questions']))
        self.assertTrue(all(not p.get('check_passed') for p in exported['progress']['topics'].values()))
        self.assertFalse(exported['progress'].get('bridge_passed', False))
        self.assertFalse(self.b('/api/export')['topic_sessions'])

    def test_bad_payloads_fail_without_overwriting_good_drafts(self):
        self.a('/api/learning/mission-design', self.mission())
        self.a('/api/learning/ai', self.ai())
        before = self.a('/api/learning')
        bad_mission = self.mission(3)
        bad_mission['draft']['controls']['speedKmS'] = 99
        self.a('/api/learning/mission-design', bad_mission, expected=400)
        bad_ai = self.ai(3)
        bad_ai['draft']['models']['network']['parameters'] = [1] * 8
        self.a('/api/learning/ai', bad_ai, expected=400)
        bad_ai = self.ai(3)
        bad_ai['draft']['version'] = 2
        self.a('/api/learning/ai', bad_ai, expected=400)
        self.assertEqual(before, self.a('/api/learning'))

    def test_purpose_paths_keep_separate_drafts_and_reject_stale_saves(self):
        content = self.a('/api/purpose-paths')
        for field in content['fields']:
            if not field['stages']:continue
            draft = {'version': 1, 'stage': 1,
                'controls': {key: spec['default'] for key,spec in field['controls'].items()},
                'predictions': {field['stages'][0]['id']: 'I expect it to change.'}}
            payload = {'field_id': field['id'], 'draft': draft, 'revision': 2}
            result = self.a('/api/learning/purpose', payload)
            self.assertEqual(result['record']['draft'], draft)
            self.assertFalse(result['mastery_changed'])
            self.a('/api/learning/purpose', {**payload, 'revision': 1}, expected=409)
            bad=deepcopy(payload);bad['revision']=3;bad['draft']['controls']['unknown']=1
            self.a('/api/learning/purpose', bad, expected=400)
            bad=deepcopy(payload);bad['revision']=3;bad['draft']['stage']=99
            self.a('/api/learning/purpose', bad, expected=400)
        self.assertEqual(len(self.a('/api/learning')['purpose_paths']), 5)
        self.assertFalse(self.b('/api/learning')['purpose_paths'])
        exported = self.a('/api/export')
        self.assertEqual(len(exported['learning_support']['purpose_paths']), 5)
        self.assertFalse(exported['progress']['topics'])
        with app.LOCK:app.configure(self.directory)
        self.assertEqual(len(self.a('/api/learning')['purpose_paths']), 5)

    def test_parametric_draft_survives_reload_without_touching_orbit_answers(self):
        payload = self.mission(3);payload['topic_id']='precalculus.parametric-equations'
        payload['draft']['activity']={'stage':2,'seconds':2,'a':6,'b':3,'answer':'-8/2','shown':True}
        self.a('/api/learning/mission-design',payload)
        with app.LOCK:app.configure(self.directory)
        saved=self.a('/api/learning')['mission_designs'][payload['topic_id']]['draft']
        self.assertEqual(saved,payload['draft'])
        bad=deepcopy(payload);bad['revision']=4;bad['draft']['activity']['seconds']=float('nan')
        self.a('/api/learning/mission-design',bad,expected=400)
        bad=deepcopy(payload);bad['revision']=4;bad['topic_id']=ORBIT_TOPIC
        self.a('/api/learning/mission-design',bad,expected=400)
        self.assertFalse(self.b('/api/learning')['mission_designs'])


if __name__ == '__main__':
    unittest.main(verbosity=2)
