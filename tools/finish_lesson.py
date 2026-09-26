"""Normalize embedded narration and save a streamable, versioned lesson MP4."""
import argparse
import json
import re
import shutil
import subprocess
from pathlib import Path
import imageio_ffmpeg


def finish(lesson: Path, source: str, output: str):
    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    destination = lesson / output
    run = subprocess.run([
        ffmpeg, '-y', '-hide_banner', '-i', str(lesson/source),
        '-map', '0:v:0', '-map', '0:a:0', '-c:v', 'copy',
        '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json',
        '-c:a', 'aac', '-b:a', '192k', '-ar', '48000',
        '-movflags', '+faststart', str(destination)
    ], capture_output=True, text=True, check=True)
    matches = re.findall(r'\{\s*"input_i"[\s\S]*?\}', run.stderr)
    if not matches:
        raise RuntimeError('Missing loudness report')
    (lesson/'loudness.json').write_text(json.dumps(json.loads(matches[-1]),indent=2)+'\n')
    if destination.name != 'final.mp4':
        shutil.copyfile(destination,lesson/'final.mp4')
    subprocess.run([ffmpeg,'-y','-hide_banner','-i',str(destination),'-vn','-c:a','copy',str(lesson/'narration-listen.m4a')],capture_output=True,check=True)
    print(destination)


if __name__ == '__main__':
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('lesson',type=Path)
    p.add_argument('--source',default='rendered-v2.mp4')
    p.add_argument('--output',default='final-v2.mp4')
    a=p.parse_args()
    finish(a.lesson.resolve(),a.source,a.output)
