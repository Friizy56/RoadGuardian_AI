import asyncio
import httpx
from datetime import datetime
from sqlalchemy import select
from app.database import async_session_factory
from app.models.hazard import Hazard

API_URL = "http://127.0.0.1:8000"

async def test_db_integrity():
    print("=== Starting Database Integrity Test Suite ===")

    messages = [
        "huge pothole on main street",
        "major water logging near bridge",
        "broken divider blocking traffic",
        "street light fault at intersection",
        "dangerous road debris on highway"
    ]

    async with httpx.AsyncClient(timeout=30.0) as client:
        # 1. Send 5 messages from different mock numbers
        print("\n[STEP 1] Sending 5 WhatsApp reports...")
        for i, msg in enumerate(messages, 1):
            phone_number = f"+1987555000{i}"
            res = await client.post(
                f"{API_URL}/whatsapp/webhook",
                data={
                    "From": f"whatsapp:{phone_number}",
                    "Body": msg,
                    "Latitude": "13.0827",
                    "Longitude": "80.2707"
                }
            )
            assert res.status_code == 200, f"Failed at message {i}"
        print("✓ All 5 messages successfully processed by webhook.")

        # 2. Query database and assert integrity
        print("\n[STEP 2] Querying database for integrity checks...")
        async with async_session_factory() as session:
            stmt = (
                select(Hazard)
                .where(Hazard.description.like("[WhatsApp Report]%"))
                .order_by(Hazard.created_at.desc())
                .limit(5)
            )
            res = await session.execute(stmt)
            hazards = res.scalars().all()

            assert len(hazards) == 5, f"Expected 5 WhatsApp hazards in database, found {len(hazards)}"
            print("✓ Retrieved exactly 5 WhatsApp hazard records from DB.")

            for h in hazards:
                print(f"\nChecking Hazard Record #{h.id}:")
                # Field Population Checks
                print(f"  - User ID: {h.user_id}")
                assert h.user_id is not None, "user_id is NULL"
                
                print(f"  - Hazard Type: {h.hazard_type}")
                assert h.hazard_type in ["pothole", "waterlogging", "broken_dividers", "street_light_fault", "road_debris", "other"], f"Invalid hazard_type: {h.hazard_type}"
                
                print(f"  - Latitude: {h.latitude} | Longitude: {h.longitude}")
                assert h.latitude == 13.0827, f"Invalid latitude: {h.latitude}"
                assert h.longitude == 80.2707, f"Invalid longitude: {h.longitude}"
                
                print(f"  - Severity Score: {h.severity_score} | Confidence: {h.confidence_score}")
                assert isinstance(h.severity_score, float), "severity_score is not a float"
                assert 0.0 <= h.severity_score <= 10.0, f"severity_score out of range: {h.severity_score}"
                assert 0.0 <= h.confidence_score <= 1.0, f"confidence_score out of range: {h.confidence_score}"
                
                print(f"  - Urgency Level: {h.urgency_level}")
                assert h.urgency_level in ["low", "medium", "high", "critical"], f"Invalid urgency_level: {h.urgency_level}"
                
                print(f"  - Status: {h.status}")
                assert h.status in ["pending", "verified", "resolved"], f"Invalid status: {h.status}"
                
                print(f"  - Location Address: '{h.location_address}'")
                assert h.location_address is not None and len(h.location_address) > 0, "location_address is NULL or empty"
                
                print(f"  - Linked Department: {h.linked_department}")
                assert h.linked_department is not None and len(h.linked_department) > 0, "linked_department is NULL or empty"
                
                print(f"  - Created At: {h.created_at}")
                assert isinstance(h.created_at, datetime), "created_at is not a valid datetime"

                print(f"✓ Hazard #{h.id} integrity checks passed successfully!")

    print("\n=== DATABASE INTEGRITY CHECKS PASSED SUCCESSFULLY! ===")

if __name__ == "__main__":
    asyncio.run(test_db_integrity())
