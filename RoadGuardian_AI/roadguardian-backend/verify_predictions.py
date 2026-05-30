import asyncio
import httpx
import os
import time
from datetime import datetime

from sqlalchemy import select

from app.database import async_session_factory
from app.models.hazard import User

API_URL = "http://127.0.0.1:8000"

async def run_prediction_tests():
    print("====================================================")
    print("ROADGUARDIAN AI - PREDICTIVE ANALYTICS E2E TESTER")
    print("====================================================")
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        # Verify server is online
        try:
            res = await client.get(f"{API_URL}/hazards/heatmap")
            assert res.status_code == 200
            print("[OK] Backend server is listening!")
        except Exception:
            print("[ERROR] Please make sure the backend uvicorn server is running on port 8000.")
            return

        # 1. Register and Login Citizen User
        citizen_email = f"citizen_{int(time.time())}@roadguardian.ai"
        print(f"\n[SIGNUP] Registering Citizen: {citizen_email}")
        reg_resp = await client.post(
            f"{API_URL}/auth/register",
            json={
                "email": citizen_email,
                "password": "CitizenPassword123",
                "full_name": "Citizen Jane"
            }
        )
        assert reg_resp.status_code == 201
        
        login_resp = await client.post(
            f"{API_URL}/auth/login",
            json={
                "email": citizen_email,
                "password": "CitizenPassword123"
            }
        )
        assert login_resp.status_code == 200
        citizen_token = login_resp.json()["access_token"]
        print("[OK] Citizen logged in.")

        # 2. Assert 403 Forbidden for Citizen on predictions endpoints
        print("\n[SECURITY] Verifying citizen access restriction (expecting 403)...")
        hotspot_resp = await client.get(
            f"{API_URL}/hazards/predictions/hotspots",
            headers={"Authorization": f"Bearer {citizen_token}"}
        )
        assert hotspot_resp.status_code == 403
        
        recurring_resp = await client.get(
            f"{API_URL}/hazards/predictions/recurring",
            headers={"Authorization": f"Bearer {citizen_token}"}
        )
        assert recurring_resp.status_code == 403
        print("[OK] Citizen successfully blocked from predictive endpoints!")

        # 3. Register and Elevate Authority User
        authority_email = f"officer_{int(time.time())}@roadguardian.ai"
        print(f"\n[SIGNUP] Registering Authority: {authority_email}")
        reg_auth_resp = await client.post(
            f"{API_URL}/auth/register",
            json={
                "email": authority_email,
                "password": "OfficerPassword123",
                "full_name": "Officer Bobby"
            }
        )
        assert reg_auth_resp.status_code == 201
        
        # Elevate to 'authority' in Postgres via the app's async session
        print("[DB] Elevating Officer Bobby to authority...")
        async with async_session_factory() as session:
            result = await session.execute(select(User).where(User.email == authority_email))
            user = result.scalar_one()
            user.role = "authority"
            await session.commit()
        print("[OK] Role updated in database.")
        
        # Login Authority
        auth_login_resp = await client.post(
            f"{API_URL}/auth/login",
            json={
                "email": authority_email,
                "password": "OfficerPassword123"
            }
        )
        assert auth_login_resp.status_code == 200
        auth_token = auth_login_resp.json()["access_token"]
        print("[OK] Authority logged in.")

        # 4. Upload mock hazards to satisfy minimum lookback count (needs >= 5 reports for hotspots, >= 3 in a grid)
        print("\n[DATA-LOAD] Uploading 5 mock hazards to trigger prediction thresholds...")
        coordinates = [
            # Grid (13.08, 80.27) - Group of 3 closely overlapping potholes (recurring & hotspot cluster!)
            (13.0827, 80.2707, "pothole"),
            (13.0829, 80.2709, "pothole"),
            (13.0828, 80.2708, "pothole"),
            # Grid (13.09, 80.28) - 2 auxiliary cracks to meet 5-hazard lookback minimum
            (13.0900, 80.2800, "crack"),
            (13.0910, 80.2810, "crack")
        ]
        
        hazard_ids = []
        for idx, (lat, lng, htype) in enumerate(coordinates):
            mock_img = f"mock_{idx}.jpg"
            with open(mock_img, "wb") as f:
                f.write(b"mock image payload")
            
            try:
                with open(mock_img, "rb") as f_img:
                    upload_resp = await client.post(
                        f"{API_URL}/hazards/upload",
                        headers={"Authorization": f"Bearer {citizen_token}"},
                        data={
                            "hazard_type": htype,
                            "latitude": lat,
                            "longitude": lng,
                            "description": f"Prediction test hazard {idx}"
                        },
                        files={"image": ("hazard.jpg", f_img, "image/jpeg")}
                    )
                assert upload_resp.status_code == 201
                haz_id = upload_resp.json()["id"]
                hazard_ids.append(haz_id)
                print(f"  [OK] Created {htype} #{haz_id} at ({lat}, {lng})")
            finally:
                if os.path.exists(mock_img):
                    os.remove(mock_img)

        # 5. Verify & Assign dispatches (Transition hazards to 'verified' status so they are picked up in hotspots)
        print("\n[VERIFICATION] Authority verifying all hazards...")
        for haz_id in hazard_ids:
            assign_resp = await client.post(
                f"{API_URL}/hazards/authority/assign/{haz_id}",
                headers={"Authorization": f"Bearer {auth_token}"},
                json={"crew_name": "Crew Alpha"}
            )
            assert assign_resp.status_code == 200
            print(f"  [OK] Verified & assigned hazard #{haz_id}")

        # 6. Fetch Predictions - Hotspots
        print("\n[PREDICTIONS] Querying /predictions/hotspots...")
        hotspots_resp = await client.get(
            f"{API_URL}/hazards/predictions/hotspots",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert hotspots_resp.status_code == 200, hotspots_resp.text
        hotspots_data = hotspots_resp.json()
        print(f"[OK] Hotspots payload successfully fetched:")
        print(f"  Confidence Score: {hotspots_data['confidence']}")
        print(f"  Total Analyzed: {hotspots_data['total_hazards_analyzed']}")
        print(f"  Predictions List: {hotspots_data['predicted_hotspots']}")
        
        assert hotspots_data["total_hazards_analyzed"] >= 5
        assert len(hotspots_data["predicted_hotspots"]) >= 1
        
        zone = hotspots_data["predicted_hotspots"][0]
        # Coordinates rounded to 0.01 + 0.005 = 13.08 + 0.005 = 13.085
        assert abs(zone["latitude"] - 13.085) < 0.01
        assert abs(zone["longitude"] - 80.275) < 0.01
        assert zone["risk_level"] == "high"
        assert zone["expected_hazards_per_week"] >= 1.5
        assert zone["common_type"] == "pothole"

        # 7. Fetch Predictions - Recurring Patterns
        print("\n[PREDICTIONS] Querying /predictions/recurring...")
        rec_resp = await client.get(
            f"{API_URL}/hazards/predictions/recurring",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert rec_resp.status_code == 200, rec_resp.text
        rec_data = rec_resp.json()
        print(f"[OK] Recurring hazards payload successfully fetched:")
        print(f"  Recurring Count: {len(rec_data['recurring_hazards'])}")
        for rec in rec_data["recurring_hazards"]:
            print(f"  - ID {rec['id']} ({rec['type']}) recurring {rec['recurrence_count']} times")
            
        assert len(rec_data["recurring_hazards"]) >= 1
        top_rec = rec_data["recurring_hazards"][0]
        assert top_rec["type"] == "pothole"
        assert top_rec["recurrence_count"] >= 3

    print("\n====================================================")
    print("ALL PREDICTIVE ANALYTICS E2E TESTS PASSED SUCCESSFULLY!")
    print("====================================================")

if __name__ == "__main__":
    asyncio.run(run_prediction_tests())
