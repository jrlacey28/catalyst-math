from pathlib import Path
import json,av
from PIL import Image,ImageDraw
ROOT=Path(__file__).resolve().parents[2];COURSE=ROOT/'courses/levels-4a-4b-5';QA=COURSE/'qa';QA.mkdir(exist_ok=True)
manifest=json.loads((COURSE/'manifest.json').read_text());report=[]
for unit in manifest['units']:
 ready=[l for l in unit['lessons'] if (ROOT/l['video_path']/'final.mp4').exists()]
 for l in ready:
  folder=ROOT/l['video_path']; video=folder/'final.mp4'; beats=json.loads((folder/'render_cues.json').read_text());container=av.open(str(video));v=container.streams.video[0];a=container.streams.audio[0]
  entry={'id':l['id'],'width':v.width,'height':v.height,'fps':str(v.average_rate),'duration':container.duration/av.time_base,'audio_codec':a.codec_context.name,'audio_rate':a.rate}
  assert v.width==1920 and v.height==1080 and v.average_rate==60
  entry['cue_duration']=sum(b['duration'] for b in beats);assert abs(entry['duration']-entry['cue_duration'])<.15
  report.append(entry)
  for k,b in enumerate(beats):
   target=b['start']+min(11,b['duration']*.7);container.seek(int(target/float(v.time_base)),stream=v)
   frame=next(f for f in container.decode(v) if float(f.pts*v.time_base)>=target)
   frame.to_image().resize((640,360)).save(QA/f'{l["id"]}-{k}.jpg',quality=91)
  container.close()
 for offset in range(0,len(ready),3):
  ls=ready[offset:offset+3];sheet=Image.new('RGB',(2560,len(ls)*395),(17,19,23));draw=ImageDraw.Draw(sheet)
  for row,l in enumerate(ls):
   draw.text((12,row*395+8),f'{l["id"]} {l["title"]}',fill='white')
   for k in range(4):sheet.paste(Image.open(QA/f'{l["id"]}-{k}.jpg'),(k*640,row*395+30))
  sheet.save(QA/f'{unit["id"]}-sheet-{offset//3+1}.jpg',quality=94)
(QA/'media_report.json').write_text(json.dumps(report,indent=2));print(f'Checked {len(report)} final files')
