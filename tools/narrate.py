"""Generate local Kokoro narration and scene timing from a lesson narration.json."""
import argparse
import hashlib
import json
from pathlib import Path
import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro


def narrate(lesson: Path, voice: str = "af_heart", speed: float = 0.95):
    root = Path(__file__).resolve().parents[1]
    parts = json.loads((lesson / "narration.json").read_text(encoding="utf-8"))
    engine = Kokoro(str(root / "tools/models/kokoro-v1.0.onnx"), str(root / "tools/models/voices-v1.0.bin"))
    audio_dir = lesson / "audio_parts"
    audio_dir.mkdir(exist_ok=True)
    assembled, timings = [], []
    cursor = 0
    for index, part in enumerate(parts):
        samples, rate = engine.create(part["text"], voice=voice, speed=speed, lang="en-us")
        samples = np.asarray(samples, dtype=np.float32)
        lead = np.zeros(round(rate * part.get("lead", 0.35)), dtype=np.float32)
        tail = np.zeros(round(rate * part.get("tail", 0.8)), dtype=np.float32)
        chunk = np.concatenate([lead, samples, tail])
        minimum = round(rate * part.get("min_duration", 0))
        if len(chunk) < minimum:
            chunk = np.pad(chunk, (0, minimum - len(chunk)))
        # Align each beat to the render frame grid for deterministic synchronization.
        frames = int(np.ceil(len(chunk) / rate * 30))
        chunk = np.pad(chunk, (0, round(frames / 30 * rate) - len(chunk)))
        sf.write(audio_dir / f"{index + 1:02d}.wav", chunk, rate, subtype="PCM_16")
        timings.append({**part, "start": cursor, "duration": len(chunk) / rate, "audio": f"audio_parts/{index + 1:02d}.wav"})
        cursor += len(chunk) / rate
        assembled.append(chunk)
        print(f"Scene {index + 1}: {len(chunk) / rate:.2f}s", flush=True)
    sf.write(lesson / "narration.wav", np.concatenate(assembled), rate, subtype="PCM_16")
    (lesson / "timings.json").write_text(json.dumps(timings, indent=2) + "\n", encoding="utf-8")
    (lesson / "narration.txt").write_text("\n\n".join(p["title"] + "\n" + p["text"] for p in parts) + "\n", encoding="utf-8")
    metadata = {"engine": "kokoro-onnx", "voice": voice, "speed": speed, "sample_rate": rate, "duration": cursor, "model_sha256": hashlib.sha256((root / "tools/models/kokoro-v1.0.onnx").read_bytes()).hexdigest()}
    (lesson / "narration_metadata.json").write_text(json.dumps(metadata, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("lesson", type=Path)
    parser.add_argument("--voice", default="af_heart")
    parser.add_argument("--speed", type=float, default=0.95)
    args = parser.parse_args()
    narrate(args.lesson.resolve(), voice=args.voice, speed=args.speed)
