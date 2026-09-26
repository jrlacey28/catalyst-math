"""Launch a clean local Catalyst installation."""
from pathlib import Path
import importlib.util, json, runpy, sys
root = Path(__file__).resolve().parent
(root / 'student').mkdir(exist_ok=True)
if '--student' not in sys.argv and '--state-dir' not in sys.argv:
    if not (root / 'students/learner/student').is_dir():
        spec = importlib.util.spec_from_file_location('new_student', root / 'tools/new_student.py')
        helper = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(helper)
        profile = helper.create_profile(root, 'learner')
        (profile / 'profile.json').write_text(json.dumps({'id':'learner','name':'My learning space'}), encoding='utf-8')
    sys.argv.extend(['--student', 'learner'])
sys.path.insert(0, str(root / 'dashboard'))
runpy.run_path(str(root / 'dashboard/server.py'), run_name='__main__')
