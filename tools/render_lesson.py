"""Render a checked Manim scene using the project's local runtime."""
import argparse
import importlib.util
from pathlib import Path
import shutil
from manim import tempconfig
from pydub import AudioSegment
import imageio_ffmpeg


def render(lesson: Path, width=1920, height=1080, fps=60, output="final.mp4"):
    AudioSegment.converter = imageio_ffmpeg.get_ffmpeg_exe()
    # Bound each encoder during batch production. Manim 0.21 passes its PyAV
    # stream to this job before starting the encoding thread; configure it there.
    from manim.scene.scene_file_writer import _PartialMovieEncodeJob
    original_job_init = _PartialMovieEncodeJob.__init__
    def bounded_encoder(self, *args, **kwargs):
        stream = kwargs.get('stream', args[3] if len(args)>3 else None)
        if stream is not None:
            stream.codec_context.thread_count = 2
            stream.options = {**stream.options, 'preset': 'veryfast'}
        original_job_init(self, *args, **kwargs)
    _PartialMovieEncodeJob.__init__ = bounded_encoder
    spec = importlib.util.spec_from_file_location("lesson_scene", lesson / "scene.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    with tempconfig({"pixel_width": width, "pixel_height": height, "frame_rate": fps,
                     "media_dir": str(lesson / "media"), "output_file": "lesson",
                     "max_inflight_encoders": 2, "encoder_queue_size": 2,
                     "disable_caching": True, "preview": False, "verbosity": "WARNING"}):
        scene = module.FunctionLesson()
        scene.render()
        source = Path(scene.renderer.file_writer.movie_file_path)
    shutil.copyfile(source, lesson / output)
    print(f"Rendered {lesson / output}", flush=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("lesson", type=Path)
    parser.add_argument("--width", type=int, default=1920)
    parser.add_argument("--height", type=int, default=1080)
    parser.add_argument("--fps", type=int, default=60)
    parser.add_argument("--output", default="final.mp4")
    args = parser.parse_args()
    render(args.lesson.resolve(), args.width, args.height, args.fps, args.output)
