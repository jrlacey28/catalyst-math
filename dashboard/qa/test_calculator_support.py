"""Calculator assistance cannot become independent evidence by changing pages."""
from pathlib import Path
import sys,tempfile,unittest
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import server as app

class CalculatorSupportTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory()
        app.configure(Path(self.tmp.name))
    def tearDown(self):self.tmp.cleanup()
    def test_generic_calculator_pauses_checks_across_topics(self):
        first=app.start_topic('number-sense.counting','standard','check')
        second=app.start_topic('arithmetic.fractions','standard','check')
        legacy=app.start('4A-01','check')
        bridge=app.start('bridge','check')
        app.calculator_support()
        for key in (first['id'],second['id']):self.assertTrue(app.STATE['topic_sessions'][key]['paused_for_help'])
        for key in (legacy['id'],bridge['id']):self.assertTrue(app.STATE['sessions'][key]['paused_for_help'])
        self.assertFalse(any(x.get('check_passed') for x in app.STATE['topics'].values()))
    def test_unrelated_lesson_calculator_also_pauses_pending_check(self):
        attempt=app.start_topic('number-sense.counting','standard','check')
        app.calculator_support('calculus-1.derivatives','graph')
        self.assertTrue(app.STATE['topic_sessions'][attempt['id']]['paused_for_help'])
    def test_no_pending_check_does_not_invent_unrelated_support(self):
        app.calculator_support()
        self.assertFalse(app.STATE.get('review'))
        self.assertFalse(app.STATE.get('studio'))
        self.assertEqual(app.STATE['topics'],{})
    def test_unknown_topic_rejected(self):
        with self.assertRaises(ValueError):app.calculator_support('missing')

if __name__=='__main__':unittest.main()
