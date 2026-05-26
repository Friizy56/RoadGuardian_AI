import os
from app.config import get_settings

def test_load_credentials():
    """
    Tests if the application settings, especially database credentials,
    are being loaded correctly from the .env file.
    """
    print("Attempting to load settings from .env file...")
    
    # Check if .env file exists
    if not os.path.exists(".env"):
        print("❌ ERROR: .env file not found in the root directory.")
        print("Please create a .env file with your credentials.")
        return

    try:
        settings = get_settings()
        
        print("✅ Settings loaded successfully.")
        print("-" * 30)
        
        # Print out the loaded database URL to help with debugging
        db_url = settings.DATABASE_URL
        if db_url:
            print(f"Loaded DATABASE_URL: {db_url}")
            # Mask password for security
            try:
                from urllib.parse import urlparse, urlunparse
                parsed = urlparse(db_url)
                if parsed.password:
                    safe_netloc = f"{parsed.username}:***@{parsed.hostname}:{parsed.port}"
                    safe_url = urlunparse(parsed._replace(netloc=safe_netloc))
                    print(f"Sanitized DATABASE_URL: {safe_url}")
                else:
                    print("DATABASE_URL does not contain a password.")
            except Exception as e:
                print(f"Could not parse or sanitize DATABASE_URL: {e}")
        else:
            print("⚠️ WARNING: DATABASE_URL is not set in your .env file.")

        # You can add more checks for other critical settings here
        if not settings.SUPABASE_URL:
            print("⚠️ WARNING: SUPABASE_URL is not set.")
            
        if not settings.SUPABASE_SERVICE_ROLE_KEY:
            print("⚠️ WARNING: SUPABASE_SERVICE_ROLE_KEY is not set.")

        print("-" * 30)
        print("Test finished.")

    except Exception as e:
        print(f"❌ ERROR: An unexpected error occurred while loading settings: {e}")

if __name__ == "__main__":
    test_load_credentials()
