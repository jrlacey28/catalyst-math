"""Parse the exact UTF-8 modules served to browsers, including nested templates."""
from pathlib import Path
import shutil,subprocess,unittest

class BrowserModuleSyntax(unittest.TestCase):
    def test_served_module_sources(self):
        node=shutil.which('node')
        if not node:self.skipTest('Node is needed for optional JavaScript syntax checks.')
        for source in Path(__file__).resolve().parents[1].glob('*.js'):
            with self.subTest(module=source.name):
                result=subprocess.run([node,'--input-type=module','--check'],input=source.read_bytes(),capture_output=True)
                self.assertEqual(result.returncode,0,result.stderr.decode('utf-8',errors='replace'))

if __name__=='__main__':unittest.main()
