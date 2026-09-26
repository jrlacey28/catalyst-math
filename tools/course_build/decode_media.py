from pathlib import Path
import json,subprocess,concurrent.futures
import imageio_ffmpeg
root=Path(__file__).resolve().parents[2];course=root/'courses/levels-4a-4b-5';m=json.loads((course/'manifest.json').read_text());ff=imageio_ffmpeg.get_ffmpeg_exe()
def check(l):
 f=root/l['video_path']/'final.mp4'
 if not f.exists():return {'id':l['id'],'status':'missing'}
 r=subprocess.run([ff,'-hide_banner','-v','error','-threads','1','-i',str(f),'-map','0:v:0','-map','0:a:0','-f','null','-'],capture_output=True,text=True)
 assert r.returncode==0 and not r.stderr,(l['id'],r.stderr)
 return {'id':l['id'],'status':'full_video_and_audio_decode_passed'}
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
 out=list(pool.map(check,[l for u in m['units'] for l in u['lessons']]))
(course/'qa/decode_report.json').write_text(json.dumps(out,indent=2));print(json.dumps(out,indent=2))
