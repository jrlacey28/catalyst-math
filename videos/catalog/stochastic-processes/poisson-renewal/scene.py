from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[4]/'tools'))
from catalog_scenes import CatalogScene
class FunctionLesson(CatalogScene):
    lesson_path=Path(__file__).resolve().parent
