"""Render and finish requested course units with bounded subprocess concurrency."""
from pathlib import Path
import json,subprocess,sys,argparse
from concurrent.futures import ThreadPoolExecutor,as_completed
root=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser();p.add_argument('--unit',required=True);p.add_argument('--workers',type=int,default=2);p.add_argument('--only',nargs='*');p.add_argument('--force',action='store_true');a=p.parse_args()
m=json.loads((root/'courses/levels-4a-4b-5/manifest.json').read_text());lessons=next(u['lessons'] for u in m['units'] if u['id']==a.unit)
if a.only:lessons=[l for l in lessons if l['id'] in a.only]
def run(l):
 folder=root/l['video_path']
 if (folder/'final.mp4').exists() and not a.force:return l['id']+' already rendered'
 for script,args,log in [('render_lesson.py',['--output','rendered.mp4'],'render.log'),('finish_lesson.py',['--source','rendered.mp4','--output','final.mp4'],'finish.log')]:
  with (folder/log).open('w',encoding='utf-8') as f:
   r=subprocess.run([sys.executable,str(root/'tools'/script),str(folder),*args],stdout=f,stderr=subprocess.STDOUT)
  if r.returncode:raise RuntimeError(l['id']+' failed: '+(folder/log).read_text(encoding='utf-8')[-1800:])
 return l['id']+' complete'
with ThreadPoolExecutor(max_workers=a.workers) as pool:
 for f in as_completed([pool.submit(run,l) for l in lessons]):print(f.result(),flush=True)
