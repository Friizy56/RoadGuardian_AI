import asyncio
import httpx
import json
import time
from datetime import datetime
from sqlalchemy import select
from app.database import async_session_factory
from app.models.hazard import User, Hazard

API_URL = "http://127.0.0.1:8000"

async def test_recurring_patterns():
    print("=== Starting Recurring Pattern Detection Test Suite ===")

    async with httpx.AsyncClient(timeout=30.0) as client:
        # 1. Create 5 reports at SAME location (13.0827, 80.2707)
        # with different phone numbers and different message types (all about potholes)
        print("\n[STEP 1] Creating 5 WhatsApp reports at (13.0827, 80.2707)...")
        reports = [
            {"From": "whatsapp:+919876540001", "Body": "pothole on central road"},
            {"From": "whatsapp:+919876540002", "Body": "huge pothole near station road"},
            {"From": "whatsapp:+919876540003", "Body": "deep pothole in front of station entrance"},
            {"From": "whatsapp:+919876540004", "Body": "dangerous pothole middle of track road"},
            {"From": "whatsapp:+919876540005", "Body": "another pothole at same spot near central station"}
        ]

        for i, rep in enumerate(reports, 1):
            res = await client.post(
                f"{API_URL}/whatsapp/webhook",
                data={
                    "From": rep["From"],
                    "Body": rep["Body"],
                    "Latitude": "13.0827",
                    "Longitude": "80.2707"
                }
            )
            assert res.status_code == 200, f"Webhook POST failed at message {i}"
        print(f"✓ All {len(reports)} reports registered.")

        # 2. Call API predictions endpoint
        print("\n[STEP 2] Calling GET /hazards/recurring-patterns endpoint...")
        resp = await client.get(f"{API_URL}/hazards/recurring-patterns")
        assert resp.status_code == 200, resp.text
        data = resp.json()
        print("✓ Response received:")
        print(json.dumps(data, indent=2))

        # 3. Assertions
        print("\n[STEP 3] Asserting E2E validation parameters...")
        patterns = data["recurring_patterns"]
        assert len(patterns) >= 1, f"Expected at least 1 recurring pattern, found {len(patterns)}"
        
        # Find Central Station pattern
        cs_pattern = next((p for p in patterns if "Central Station" in p["location"]), None)
        assert cs_pattern is not None, "Central Station recurring pattern not detected!"
        print("✓ Central Station recurring pattern successfully detected!")

        assert cs_pattern["hazard_type"] == "pothole", f"Expected hazard_type 'pothole', got '{cs_pattern['hazard_type']}'"
        assert cs_pattern["occurrences"] >= 5, f"Expected occurrences >= 5, got {cs_pattern['occurrences']}"
        assert cs_pattern["suggested_action"] == "Permanent repair required", f"Expected 'Permanent repair required', got '{cs_pattern['suggested_action']}'"
        
        # Verify date format is YYYY-MM-DD
        last_rep = cs_pattern["last_reported"]
        # Throws exception if format is wrong
        parsed_date = datetime.strptime(last_rep, "%Y-%m-%d")
        print(f"✓ Last reported date verified: {last_rep}")

    print("\n=== ALL RECURRING PATTERN DETECTION TESTS PASSED SUCCESSFULLY! ===")

if __name__ == "__main__":
    asyncio.run(test_recurring_patterns())
