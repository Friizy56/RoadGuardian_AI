import asyncio
import sys
from app.database import engine
from app.models.base import Base
import app.models.hazard  # Ensure registered

async def recreate_db():
    print("Connecting to database and dropping all tables...")
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)
            print("Dropped all tables successfully!")
            
            await conn.run_sync(Base.metadata.create_all)
            print("Recreated all tables with correct schema successfully!")
    except Exception as e:
        print(f"Error recreating database: {e}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(recreate_db())
