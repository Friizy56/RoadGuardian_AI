import asyncio
import httpx
import os
import time
from datetime import datetime
from sqlalchemy import select
from app.database import async_session_factory
from app.models.hazard import User, Hazard

API_URL = "http://127.0.0.1:8000"

async def test_hotspot_predictions():
    print("=== Starting Hotspot Predictions Test Suite ===")

    async with httpx.AsyncClient(timeout=30.0) as client:
        # 1. Sign up and elevate authority user
        auth_email = f"authority_hotspot_{int(time.time())}@roadguardian.ai"
        print(f"\n[STEP 1] Registering Authority user: {auth_email}")
        reg_auth_resp = await client.post(
            f"{API_URL}/auth/register",
            json={
                "email": auth_email,
                "password": "OfficerPassword123",
                "full_name": "Officer Bobby"
            }
        )
        assert reg_auth_resp.status_code == 201, reg_auth_resp.text
        auth_data = reg_auth_resp.json()

        # Elevate role
        print("[DB] Elevating user role to authority...")
        async with async_session_factory() as session:
            result = await session.execute(select(User).where(User.email == auth_email))
            user = result.scalar_one()
            user.role = "authority"
            await session.commit()
        print("✓ Promoted successfully.")

        # Login authority
        print("[LOGIN] Logging in Officer Bobby...")
        login_resp = await client.post(
            f"{API_URL}/auth/login",
            json={
                "email": auth_email,
                "password": "OfficerPassword123"
            }
        )
        assert login_resp.status_code == 200
        auth_token = login_resp.json()["access_token"]
        print("✓ Received authority token.")

        # 2. Create 10+ WhatsApp reports
        # Central Station (13.0827, 80.2707): 5 reports
        # Different area (13.0900, 80.2800): 3 reports
        # A couple of other ones to exceed 10 reports
        print("\n[STEP 2] Creating reports near Central Station (5) and other area (3)...")
        reports = [
            # Central Station (rounds to 13.08, 80.27)
            {"From": "whatsapp:+1234567801", "Body": "pothole at central station", "Lat": "13.0827", "Lng": "80.2707"},
            {"From": "whatsapp:+1234567802", "Body": "big pothole near central station", "Lat": "13.0829", "Lng": "80.2709"},
            {"From": "whatsapp:+1234567803", "Body": "deep pothole central road", "Lat": "13.0828", "Lng": "80.2708"},
            {"From": "whatsapp:+1234567804", "Body": "large pothole on main station road", "Lat": "13.0826", "Lng": "80.2706"},
            {"From": "whatsapp:+1234567805", "Body": "dangerous pothole central track", "Lat": "13.0825", "Lng": "80.2705"},
            
            # Different area (rounds to 13.09, 80.28)
            {"From": "whatsapp:+1234567806", "Body": "pothole on bridge road", "Lat": "13.0900", "Lng": "80.2800"},
            {"From": "whatsapp:+1234567807", "Body": "big pothole near bridge lane", "Lat": "13.0910", "Lng": "80.2810"},
            {"From": "whatsapp:+1234567808", "Body": "deep pothole bridge cross", "Lat": "13.0905", "Lng": "80.2805"},
            
            # Auxiliary to exceed 10 reports
            {"From": "whatsapp:+1234567809", "Body": "pavement crack other way", "Lat": "13.1100", "Lng": "80.3100"},
            {"From": "whatsapp:+1234567810", "Body": "debris blocking bypass", "Lat": "13.1200", "Lng": "80.3200"}
        ]

        for i, rep in enumerate(reports, 1):
            res = await client.post(
                f"{API_URL}/whatsapp/webhook",
                data={
                    "From": rep["From"],
                    "Body": rep["Body"],
                    "Latitude": rep["Lat"],
                    "Longitude": rep["Lng"]
                }
            )
            assert res.status_code == 200, f"Webhook POST failed at message {i}"
        print(f"✓ All {len(reports)} reports registered.")

        # Align Central Station hazards and bridge road hazards in the database for exact prediction output
        print("[DB] Aligning Central Station hazards to severity 7.2 and peak time 8 AM, and bridge road hazards to older dates...")
        async with async_session_factory() as session:
            from sqlalchemy import and_
            from datetime import timedelta
            # 1. Central Station
            stmt_cs = select(Hazard).where(
                and_(
                    Hazard.latitude >= 13.08,
                    Hazard.latitude <= 13.085,
                    Hazard.longitude >= 80.27,
                    Hazard.longitude <= 80.275
                )
            )
            res_cs = await session.execute(stmt_cs)
            cs_hazards = res_cs.scalars().all()
            print(f"Found {len(cs_hazards)} Central Station hazards to align.")
            for h in cs_hazards:
                h.severity_score = 7.2
                h.created_at = datetime.utcnow().replace(hour=8, minute=0, second=0, microsecond=0)
                
            # 2. Bridge Road (rounds to 13.09, 80.28)
            stmt_br = select(Hazard).where(
                and_(
                    Hazard.latitude >= 13.09,
                    Hazard.latitude <= 13.095,
                    Hazard.longitude >= 80.28,
                    Hazard.longitude <= 80.285
                )
            )
            res_br = await session.execute(stmt_br)
            br_hazards = res_br.scalars().all()
            print(f"Found {len(br_hazards)} bridge road hazards to set to 15 days ago.")
            for h in br_hazards:
                h.created_at = datetime.utcnow() - timedelta(days=15)
                
            await session.commit()
        print("✓ Database hazard records successfully aligned.")

        # 3. Call API predictions endpoint
        print("\n[STEP 3] Calling predict-hotspots API endpoint...")
        resp = await client.get(
            f"{API_URL}/hazards/predict-hotspots?days_lookback=30",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert resp.status_code == 200, resp.text
        data = resp.json()
        print("✓ Response received:")
        import json
        print(json.dumps(data, indent=2))

        # 4. Assertions
        print("\n[STEP 4] Asserting E2E validation parameters...")
        hotspots = data["predicted_hotspots"]
        assert len(hotspots) >= 1, f"Expected at least 1 hotspot zone, found {len(hotspots)}"
        
        # Central Station
        cs_zone = next((z for z in hotspots if z["latitude"] == 13.08 and z["longitude"] == 80.27), None)
        assert cs_zone is not None, "Central Station hotspot (13.08, 80.27) not found in the response!"
        print("✓ Central Station grid (13.08, 80.27) successfully clustered as the predicted hotspot!")

        assert cs_zone["risk_level"] == "high", f"Expected risk_level 'high', got '{cs_zone['risk_level']}'"
        assert cs_zone["expected_hazards_per_week"] == 2.5, f"Expected expected_hazards_per_week 2.5, got {cs_zone['expected_hazards_per_week']}"
        assert cs_zone["peak_time_hour"] == 8, f"Expected peak_time_hour 8, got {cs_zone['peak_time_hour']}"
        assert cs_zone["avg_severity"] == 7.2, f"Expected avg_severity 7.2, got {cs_zone['avg_severity']}"
        assert cs_zone["common_type"] == "pothole", f"Expected common_type 'pothole', got '{cs_zone['common_type']}'"
        
        # Budget evaluation: severity 7.2 * 5 hazards * 5000 = 180000.0
        print(f"  - Central Station Budget Allocation recommendation: ₹{cs_zone['recommended_budget_allocation_inr']:,}")
        assert cs_zone["recommended_budget_allocation_inr"] == 180000.0, f"Expected budget allocation 180000.0, got {cs_zone['recommended_budget_allocation_inr']}"

        # Confidence checking
        print(f"  - Confidence Score: {data['confidence']}")
        assert data["confidence"] == 0.85, f"Expected confidence 0.85, got {data['confidence']}"

    print("\n=== ALL HOTSPOT PREDICTION TESTS PASSED SUCCESSFULLY! ===")

if __name__ == "__main__":
    asyncio.run(test_hotspot_predictions())
