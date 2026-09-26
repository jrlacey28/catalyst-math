"""Download the public Kokoro model and voices for local synthesis."""
from pathlib import Path
from urllib.request import urlretrieve

BASE = "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.1/"
root = Path(__file__).resolve().parent / "models"
root.mkdir(exist_ok=True)
for name in ("kokoro-v1.0.onnx", "voices-v1.0.bin"):
    target = root / name
    if not target.exists():
        partial = target.with_suffix(target.suffix + ".part")
        urlretrieve(BASE + name, partial)
        partial.replace(target)
    print(f"{name}: {target.stat().st_size} bytes")
