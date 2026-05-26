import os
import shutil
from PIL import Image

# Exact absolute paths of generated seed images
SEED_LOGO = r"C:\Users\Mahak\.gemini\antigravity-ide\brain\d6c613ed-be54-48af-b55f-fec23eca94f8\pwa_logo_1779832061924.png"
SEED_DASHBOARD = r"C:\Users\Mahak\.gemini\antigravity-ide\brain\d6c613ed-be54-48af-b55f-fec23eca94f8\pwa_dashboard_1779832081710.png"

# Target static folders
STATIC_DIR = os.path.dirname(os.path.abspath(__file__))
ICONS_DIR = os.path.join(STATIC_DIR, "icons")
SCREENSHOTS_DIR = os.path.join(STATIC_DIR, "screenshots")

def compile_pwa_assets():
    print("[INFO] Booting PWA assets resizing compiler...")

    # Create target directories if missing
    os.makedirs(ICONS_DIR, exist_ok=True)
    os.makedirs(SCREENSHOTS_DIR, exist_ok=True)
    print("[DIR] Target folders 'icons/' and 'screenshots/' successfully created/verified.")

    # 1. Resize seed logo into required home-screen, shortcut, splash sizes
    sizes = {
        "icon-72.png": (72, 72),
        "report.png": (96, 96),
        "icon-192.png": (192, 192),
        "icon-512.png": (512, 512)
    }

    if os.path.exists(SEED_LOGO):
        with Image.open(SEED_LOGO) as img:
            for filename, dims in sizes.items():
                resized_img = img.resize(dims, Image.Resampling.LANCZOS)
                target_path = os.path.join(ICONS_DIR, filename)
                
                # Save as PNG
                resized_img.save(target_path, "PNG")
                print(f"[OK] Generated icon asset: {filename} ({dims[0]}x{dims[1]}) -> {target_path}")
    else:
        print(f"[ERROR] Seed logo not found at: {SEED_LOGO}")

    # 2. Resize seed dashboard screenshot
    if os.path.exists(SEED_DASHBOARD):
        with Image.open(SEED_DASHBOARD) as img:
            # Convert to RGB if necessary for JPEG format saving
            rgb_img = img.convert("RGB")
            target_dims = (1280, 720)
            resized_screenshot = rgb_img.resize(target_dims, Image.Resampling.LANCZOS)
            target_path = os.path.join(SCREENSHOTS_DIR, "dashboard.jpg")
            
            # Save as JPEG
            resized_screenshot.save(target_path, "JPEG", quality=90)
            print(f"[OK] Generated screenshot asset: dashboard.jpg (1280x720) -> {target_path}")
    else:
        print(f"[ERROR] Seed dashboard screenshot not found at: {SEED_DASHBOARD}")

    print("\n=== PWA ASSETS COMPILATION SUCCESSFULLY COMPLETED! ===")

if __name__ == "__main__":
    compile_pwa_assets()
