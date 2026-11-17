import os
import sys
import tempfile

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Tests dürfen nie in den echten Datenordner schreiben
os.environ["ZEITERFASSUNG_DATEN"] = tempfile.mkdtemp(prefix="zeiterfassung-test-")
