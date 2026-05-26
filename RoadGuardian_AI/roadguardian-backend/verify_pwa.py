import os
import json
from PIL import Image

STATIC_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static")
MANIFEST_PATH = os.path.join(STATIC_DIR, "manifest.json")
SW_PATH = os.path.join(STATIC_DIR, "sw.js")

def verify_pwa_system():
    print("=== Booting PWA Verification Test Suite ===")

    # 1. Verify manifest.json exists and is valid JSON
    assert os.path.exists(MANIFEST_PATH), "manifest.json does not exist in static folder"
    with open(MANIFEST_PATH, "r") as f:
        manifest = json.load(f)
    
    print("[OK] manifest.json successfully compiled and read.")
    assert manifest["name"] == "RoadGuardian AI - Road Safety Platform"
    assert manifest["short_name"] == "RoadGuardian"
    assert manifest["start_url"] == "/static/index.html"
    assert manifest["display"] == "standalone"
    print("[OK] PWA Metadata fields fully correct.")

    # 2. Verify sw.js exists and has core listeners
    assert os.path.exists(SW_PATH), "sw.js does not exist in static folder"
    with open(SW_PATH, "r") as f:
        sw_code = f.read()
    assert "install" in sw_code, "Service Worker missing 'install' event listener"
    assert "activate" in sw_code, "Service Worker missing 'activate' event listener"
    assert "fetch" in sw_code, "Service Worker missing 'fetch' event listener"
    print("[OK] Service Worker sw.js matches standard caching specifications.")

    # 3. Check exact dimensions of icons and screenshots
    icons_to_test = {
        "icons/icon-72.png": (72, 72),
        "icons/report.png": (96, 96),
        "icons/icon-192.png": (192, 192),
        "icons/icon-512.png": (512, 512),
        "screenshots/dashboard.jpg": (1280, 720)
    }

    for relative_path, expected_dims in icons_to_test.items():
        full_path = os.path.join(STATIC_DIR, relative_path)
        assert os.path.exists(full_path), f"Asset {relative_path} is missing!"
        
        with Image.open(full_path) as img:
            width, height = img.size
            assert (width, height) == expected_dims, f"Dimension mismatch for {relative_path}! Expected {expected_dims}, got ({width}, {height})"
            print(f"[OK] Verified PWA asset: {relative_path} (Exact {width}x{height} dimensions match!)")

    print("\n=== ALL PWA SPECIFICATIONS PASSED SUCCESSFULLY! ===")

if __name__ == "__main__":
    verify_pwa_system()
