from pathlib import Path
import json,re
root=Path('math-tutor');c=root/'courses/levels-4a-4b-5';m=json.loads((c/'manifest.json').read_text());ids=[];practice=0;test=0
for u in m['units']:
 keys=json.loads((c/u['id']/'tests/tutor_rubric.json').read_text())['keys']
 for l in u['lessons']:
  p=json.loads((root/l['lesson_path']/'practice.json').read_text());assert len(p['batches'])==2
  for b in p['batches']:
   assert len(b)==3
   for q in b:assert q['id'] in keys['practice'];ids.append(q['id']);practice+=1
 for f in ['A','B']:
  q=json.loads((c/u['id']/f'tests/form-{f}.json').read_text())['items'];assert len(q)==2*len(u['lessons'])
  for l in u['lessons']:assert sum(x['lesson_id']==l['id'] for x in q)==2
  for x in q:assert x['id'] in keys[f];ids.append(x['id']);test+=1
assert len(ids)==len(set(ids));assert practice==144 and test==96
broken=[]
for f in c.rglob('*.md'):
 for target in re.findall(r'\]\(([^)]+)\)',f.read_text(encoding='utf-8')):
  if not target.startswith(('http','#')) and not (f.parent/target).resolve().exists():broken.append((str(f),target))
assert not broken,broken
print('Validated 24 packages, 144 practice items, 96 test items, unique IDs, two test items per lesson per form, separate keys, and Markdown links')
