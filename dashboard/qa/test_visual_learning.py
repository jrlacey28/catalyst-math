"""Experiment persistence must stay separate from assessment evidence."""
from copy import deepcopy
from pathlib import Path
import json, subprocess, sys, tempfile, unittest
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import server
import visual_learning as visual
import learning_support as support


class VisualLearning(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        server.configure(Path(self.tmp.name))
        self.topics = server.topic_index()
    def tearDown(self):self.tmp.cleanup()
    def ai(self):
        module = (Path(__file__).resolve().parents[1] / 'ai-math.js').as_uri()
        result = subprocess.run(['node', '--input-type=module', '-e', f'import {{normalizeAIState}} from "{module}";console.log(JSON.stringify(normalizeAIState()));'], capture_output=True, check=True, text=True)
        return {'revision': 2, 'draft': json.loads(result.stdout)}
    def mission(self):return {'topic_id': 'arithmetic.exponents', 'revision': 2, 'draft': {'version': 1, 'modelId': 'orbit', 'controls': {'body': 'moon', 'altitudeKm': 100, 'speedKmS': 1.7, 'progress': 0}, 'calculation': {'answer': 'sqrt(4^3)', 'factor': 4, 'time': 1, 'ran': True}}}
    def test_ai_js_python_contract_roundtrip(self):
        payload = self.ai();before = deepcopy(server.STATE['topics'])
        visual.save_ai(server.STATE, payload)
        view = support.export_state(server.STATE, self.topics)
        self.assertEqual(view['ai_path']['draft'], payload['draft']);self.assertEqual(server.STATE['topics'], before)
        view['ai_path']['draft']['query'][0] = 999
        self.assertNotEqual(server.STATE['learning_support']['ai_path']['draft']['query'][0], 999)
        server.save();self.assertEqual(json.loads((Path(self.tmp.name)/'dashboard_progress.json').read_text())['learning_support']['ai_path']['draft'], payload['draft'])
    def test_ai_rejects_unsafe_or_malformed_values_without_changing_state(self):
        original=self.ai()
        for key,value in [('learningRate', float('nan')), ('query', [float('inf'), 0]), ('visited', ['features']*8), ('notes', {'features':'x'*1201}), ('stageId','unknown')]:
            bad=deepcopy(original);bad['draft'][key]=value
            with self.assertRaises(ValueError):visual.save_ai(server.STATE,bad)
        bad=deepcopy(original);bad['draft']['models']['network']['parameters']=[0]*8
        with self.assertRaises(ValueError):visual.save_ai(server.STATE,bad)
        self.assertNotIn('ai_path',server.STATE.get('learning_support',{}))
    def test_mission_matches_its_topic_and_revisions(self):
        data=self.mission();visual.save_mission(server.STATE,data,self.topics)
        visual.save_mission(server.STATE,data,self.topics)
        for revision in [0,1]:
            with self.assertRaises(support.ConflictError):visual.save_mission(server.STATE,{**data,'revision':revision},self.topics)
        bad=deepcopy(data);bad['draft']['calculation']['answer']='4'
        with self.assertRaises(support.ConflictError):visual.save_mission(server.STATE,bad,self.topics)
        for patch in [{'modelId':'supply'},{'controls':{'speedKmS':99}},{'controls':{'unknown':1}},{'calculation':{'time':float('nan')}}]:
            bad=deepcopy(data);bad['draft'].update(patch)
            with self.assertRaises(ValueError):visual.save_mission(server.STATE,bad,self.topics)
        self.assertEqual(server.STATE['topics'],{})
    def test_all_missions_can_save_their_own_controls(self):
        content=json.loads(Path(visual.__file__).with_name('mission-content.json').read_text())
        for item in content['missions']:
            visual.save_mission(server.STATE,{'topic_id':item['topic_id'],'revision':1,'draft':{'version':1,'modelId':item['model_id'],'controls':{},'calculation':{}}},self.topics)
        self.assertEqual(len(support.export_state(server.STATE,self.topics)['mission_designs']),159)


if __name__ == '__main__':unittest.main()
