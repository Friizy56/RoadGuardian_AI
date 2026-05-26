from sqlalchemy import create_engine
from dotenv import load_dotenv
import os
from urllib.parse import urlparse

# Load environment variables from .env
load_dotenv()

print("Attempting to connect to the database using credentials from .env...")

# Fetch the full DATABASE_URL
DATABASE_URL_FULL = os.getenv("DATABASE_URL")

if not DATABASE_URL_FULL:
    print("❌ ERROR: DATABASE_URL is not set in your .env file.")
else:
    try:
        # The user's code expects individual components, but the project uses a single DATABASE_URL.
        # Let's parse the DATABASE_URL to get the components.
        # We will also adapt the provided code to work with the project's async setup.
        
        # The user's provided code uses a synchronous driver (psycopg2), let's adapt it for that.
        # We need to remove the "+asyncpg" part for the synchronous test.
        if "+asyncpg" in DATABASE_URL_FULL:
            sync_db_url = DATABASE_URL_FULL.replace("+asyncpg", "")
        else:
            sync_db_url = DATABASE_URL_FULL

        # Add sslmode=require if not present, as it's often needed for cloud databases.
        if 'sslmode' not in sync_db_url:
            sync_db_url += "?sslmode=require"

        print(f"Using connection string for test: {sync_db_url.replace(urlparse(sync_db_url).password, '***')}")

        # Create the SQLAlchemy engine
        engine = create_engine(sync_db_url)

        # Test the connection
        with engine.connect() as connection:
            print("✅✅✅ Connection successful! ✅✅✅")
            print("This confirms your hostname, password, and other credentials are correct.")

    except Exception as e:
        print(f"❌❌❌ Failed to connect: {e} ❌❌❌")
        print("\nThis error likely means:")
        print("1. The hostname in your DATABASE_URL is still incorrect.")
        print("2. The password in your DATABASE_URL is incorrect.")
        print("3. A firewall is blocking the connection to port 5432.")
        print("\nPlease double-check the host and password in your .env file.")

