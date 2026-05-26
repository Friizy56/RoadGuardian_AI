import asyncio
import subprocess
import sys
import os

scripts = [
    "verify_pwa.py",
    "verify_authority_dashboard.py",
    "verify_resolution_flow.py",
    "verify_weather_severity.py",
    "verify_predictions.py"
]

def run_script(script_name):
    print(f"\n====================================================")
    print(f"Running: {script_name}...")
    print(f"====================================================")
    
    # Run the python script and inherit stdout/stderr
    result = subprocess.run([sys.executable, script_name], capture_output=True, text=True)
    
    print(result.stdout)
    if result.stderr:
        print(f"Stderr logs:\n{result.stderr}")
        
    if result.returncode == 0:
        print(f"PASSED: {script_name}")
        return True
    else:
        print(f"FAILED: {script_name} (Exit code: {result.returncode})")
        return False

def main():
    print("====================================================")
    print("ROADGUARDIAN AI - CENTRAL MASTER PIPELINE RUNNER")
    print("====================================================")
    
    passed_all = True
    results = {}
    
    for script in scripts:
        if os.path.exists(script):
            success = run_script(script)
            results[script] = "PASSED" if success else "FAILED"
            if not success:
                passed_all = False
        else:
            print(f"Warning: Script {script} not found. Skipping.")
            results[script] = "SKIPPED"
            
    print("\n====================================================")
    print("Master Test Summary")
    print("====================================================")
    for s, res in results.items():
        icon = "[OK]" if res == "PASSED" else ("[FAIL]" if res == "FAILED" else "[SKIP]")
        print(f"  {icon} {s}: {res}")
    print("====================================================")
    
    if passed_all:
        print("SUCCESS: All E2E pipelines are fully functional!")
        sys.exit(0)
    else:
        print("FAILURE: Some validation pipelines failed.")
        sys.exit(1)

if __name__ == "__main__":
    main()
