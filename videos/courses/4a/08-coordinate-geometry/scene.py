from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[4]/'tools'))
from course_scenes import CourseScene
class FunctionLesson(CourseScene):
    lesson_path=Path(__file__).resolve().parent
