import os
import sys
import subprocess

# Force UTF-8 stdout encoding on Windows
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

def run_backend_tests():
    print("================================================================")
    print("DENTAI FASTAPI BACKEND 300+ TEST SUITE & EXCEL ANALYZER")
    print("================================================ fall\n")
    
    script_dir = os.path.dirname(os.path.abspath(__file__))
    js_runner = os.path.join(script_dir, "test_runner.js")
    
    try:
        result = subprocess.run(["node", js_runner], cwd=script_dir, check=True)
        sys.exit(result.returncode)
    except Exception as e:
        print(f"Error running test runner: {e}")
        sys.exit(1)

if __name__ == "__main__":
    run_backend_tests()
