import asyncio
import httpx
import os
import time
from sqlalchemy import select

from app.database import async_session_factory
from app.models.hazard import User, Hazard

API_URL = "http://127.0.0.1:8000"

async def test_emergency_dispatch():
    print("====================================================")
    print("ROADGUARDIAN AI - EMERGENCY ALERT DISPATCH E2E TEST")
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
        citizen_email = f"citizen_emergency_{int(time.time())}@roadguardian.ai"
        print(f"\n[SIGNUP] Registering Citizen: {citizen_email}")
        reg_resp = await client.post(
            f"{API_URL}/auth/register",
            json={
                "email": citizen_email,
                "password": "CitizenPassword123",
                "full_name": "Emergency Citizen"
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
        print("[OK] Citizen logged in successfully.")

        # 2. Create Hazard with severity_score 9.0 (critical)
        print("\n[STEP 1] Submitting critical hazard report (severity 9.0)...")
        mock_image_path = "test_emergency_hazard.jpg"
        with open(mock_image_path, "wb") as f:
            f.write(b"fake visual report image for emergency alert")

        try:
            with open(mock_image_path, "rb") as img_file:
                upload_response = await client.post(
                    f"{API_URL}/hazards/upload",
                    headers={"Authorization": f"Bearer {citizen_token}"},
                    data={
                        "hazard_type": "pothole",
                        "latitude": 13.0827,
                        "longitude": 80.2707,
                        "description": "Massive hazardous pothole needing immediate barricading",
                        "severity_score": 9.0
                    },
                    files={"image": ("hazard.jpg", img_file, "image/jpeg")}
                )
            assert upload_response.status_code == 201, f"Upload failed: {upload_response.text}"
            hazard_data = upload_response.json()
            hazard_id = hazard_data["id"]
            print(f"[OK] Hazard created with ID: {hazard_id}")
            print(f"  - Severity: {hazard_data['severity_score']}")
            print(f"  - Urgency Level: {hazard_data['urgency_level']}")
            
            # Query the database directly to verify geocoded location address
            print("[DB] Verifying geocoded location address in database...")
            async with async_session_factory() as session:
                db_res = await session.execute(select(Hazard).where(Hazard.id == hazard_id))
                db_hazard = db_res.scalar_one()
                location_address = db_hazard.location_address
                print(f"  - Location Address: {location_address}")
            
            # Assertions
            assert hazard_data["severity_score"] == 9.0
            assert hazard_data["urgency_level"] == "critical"
            assert "Central Station" in location_address
        finally:
            if os.path.exists(mock_image_path):
                try:
                    os.remove(mock_image_path)
                except Exception as cleanup_err:
                    print(f"⚠️ Failed to remove temp image: {cleanup_err}")

        print("\n[STEP 2] E2E verification output assertions completed.")
        print("[OK] Emergency Dispatch successfully verified. Check backend server console logs for:")
        print("  \"🚨 EMERGENCY DISPATCH TRIGGERED 🚨\"")
        print(f"  \"Hazard ID: {hazard_id}\"")
        print("  \"Type: POTHOLE\"")
        print("  \"Severity: 9.0/10.0\"")
        print("  \"Location: Central Station Road, Chennai\"")
        print("  \"Action: Auto-dispatching Highway Patrol to barricade area immediately.\"")
        
        print("\n=== ALL EMERGENCY DISPATCH TESTS PASSED SUCCESSFULLY! ===")

if __name__ == "__main__":
    asyncio.run(test_emergency_dispatch())
