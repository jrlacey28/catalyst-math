from pathlib import Path
import sys,json
sys.path.insert(0,str(Path('math-tutor/tools').resolve()))
from course_scenes import CourseScene,M
from manim import tempconfig
root=Path('math-tutor'); manifest=json.loads((root/'courses/levels-4a-4b-5/manifest.json').read_text())
errors=[]
with tempconfig({'media_dir':str(root/'videos/courses/preflight-media'),'verbosity':'ERROR'}):
 for u in manifest['units']:
  for l in u['lessons']:
   s=CourseScene();s.meta=l
   for k,f in enumerate(l['formulas']):
    try:
     M(f);g=getattr(s,'draw_'+l['slug'].replace('-','_'))(k)
     assert g.width>0 and g.height>0
    except Exception as e:errors.append((l['id'],k,str(e)))
print(json.dumps(errors,indent=2));print('Checked 96 visual stages')
