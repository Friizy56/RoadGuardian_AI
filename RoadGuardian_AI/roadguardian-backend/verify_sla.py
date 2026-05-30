import asyncio
import httpx
import os
import time
from datetime import datetime, timedelta
from sqlalchemy import select

from app.database import async_session_factory
from app.models.hazard import User, Hazard

API_URL = "http://127.0.0.1:8000"

async def test_sla_deadline_and_tracking():
    print("====================================================")
    print("ROADGUARDIAN AI - SLA DEADLINE & TRACKING E2E TEST")
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
        citizen_email = f"citizen_sla_{int(time.time())}@roadguardian.ai"
        print(f"\n[SIGNUP] Registering Citizen: {citizen_email}")
        reg_resp = await client.post(
            f"{API_URL}/auth/register",
            json={
                "email": citizen_email,
                "password": "CitizenPassword123",
                "full_name": "SLA Citizen"
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

        # 2. Register and Login Authority User
        authority_email = f"officer_sla_{int(time.time())}@roadguardian.ai"
        print(f"\n[SIGNUP] Registering Authority: {authority_email}")
        reg_auth_resp = await client.post(
            f"{API_URL}/auth/register",
            json={
                "email": authority_email,
                "password": "OfficerPassword123",
                "full_name": "Officer SLA"
            }
        )
        assert reg_auth_resp.status_code == 201
        
        # Elevate to 'authority' in DB
        print("[DB] Elevating Officer SLA to authority...")
        async with async_session_factory() as session:
            result = await session.execute(select(User).where(User.email == authority_email))
            user = result.scalar_one()
            user.role = "authority"
            await session.commit()
        print("[OK] Authority elevated in database.")
        
        login_auth_resp = await client.post(
            f"{API_URL}/auth/login",
            json={
                "email": authority_email,
                "password": "OfficerPassword123"
            }
        )
        assert login_auth_resp.status_code == 200
        auth_token = login_auth_resp.json()["access_token"]
        print("[OK] Authority logged in successfully.")

        # 3. Create Hazard with pothole and severity_score 8.5
        print("\n[STEP 1] Creating hazard (pothole, severity 8.5)...")
        mock_image_path = "test_sla_hazard.jpg"
        with open(mock_image_path, "wb") as f:
            f.write(b"fake visual report image for SLA")

        try:
            with open(mock_image_path, "rb") as img_file:
                upload_response = await client.post(
                    f"{API_URL}/hazards/upload",
                    headers={"Authorization": f"Bearer {citizen_token}"},
                    data={
                        "hazard_type": "pothole",
                        "latitude": 13.0827,
                        "longitude": 80.2707,
                        "description": "Critical pothole on central road",
                        "severity_score": 8.5
                    },
                    files={"image": ("hazard.jpg", img_file, "image/jpeg")}
                )
            assert upload_response.status_code == 201, f"Upload failed: {upload_response.text}"
            hazard_data = upload_response.json()
            hazard_id = hazard_data["id"]
            print(f"[OK] Hazard created with ID: {hazard_id}")
        finally:
            if os.path.exists(mock_image_path):
                os.remove(mock_image_path)

        # 4. Verify SLA Deadline and Department routing upon creation
        print("\n[STEP 2] Verifying initial SLA deadline and department routing...")
        created_at_dt = datetime.fromisoformat(hazard_data["created_at"].replace("Z", "+00:00")).replace(tzinfo=None)
        sla_deadline_dt = datetime.fromisoformat(hazard_data["sla_deadline"].replace("Z", "+00:00")).replace(tzinfo=None)
        
        expected_deadline = created_at_dt + timedelta(hours=24)
        difference = abs((sla_deadline_dt - expected_deadline).total_seconds())
        
        print(f"  - Created At: {created_at_dt}")
        print(f"  - SLA Deadline: {sla_deadline_dt}")
        print(f"  - Expected Deadline: {expected_deadline}")
        print(f"  - Difference (seconds): {difference}")
        
        assert difference < 5, f"SLA Deadline is not set to exactly 24 hours from creation (diff={difference}s)"
        print("[OK] SLA deadline set to exactly 24 hours from creation.")
        
        assert hazard_data["linked_department"] == "Road Department", f"Expected department 'Road Department', got '{hazard_data['linked_department']}'"
        print("[OK] Linked department routed correctly to 'Road Department'.")
        
        assert hazard_data["sla_breached"] is False, "Expected sla_breached to be initially FALSE"
        print("[OK] sla_breached is FALSE initially.")

        # 5. Simulate time progression to SLA Approaching (within 2 hours)
        print("\n[STEP 3] Simulating SLA approaching deadline (2 hours)...")
        async with async_session_factory() as session:
            db_hazard_res = await session.execute(select(Hazard).where(Hazard.id == hazard_id))
            db_hazard = db_hazard_res.scalar_one()
            
            # Set SLA deadline to 1 hour and 50 minutes in the future
            db_hazard.sla_deadline = datetime.utcnow() + timedelta(hours=1, minutes=50)
            await session.commit()
            print(f"[DB] SLA deadline updated to: {db_hazard.sla_deadline}")

        # Call endpoint to trigger SLA checks & check approaching logs
        print("[API] Triggering SLA evaluation check by calling /hazards/authority/sla-breaches...")
        sla_resp = await client.get(
            f"{API_URL}/hazards/authority/sla-breaches",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert sla_resp.status_code == 200
        print("[OK] SLA evaluation run for approaching state. Check backend console for warning.")

        # 6. Simulate time progression to SLA Breach (unresolved for 25 hours / past deadline)
        print("\n[STEP 4] Simulating SLA breached state (25 hours pass)...")
        async with async_session_factory() as session:
            db_hazard_res = await session.execute(select(Hazard).where(Hazard.id == hazard_id))
            db_hazard = db_hazard_res.scalar_one()
            
            # Set SLA deadline to 25 hours in the past
            db_hazard.sla_deadline = datetime.utcnow() - timedelta(hours=25)
            await session.commit()
            print(f"[DB] SLA deadline updated to: {db_hazard.sla_deadline}")

        # Call endpoint to trigger SLA breach evaluation & escalation
        print("[API] Triggering SLA evaluation check by calling /hazards/authority/sla-breaches again...")
        sla_resp2 = await client.get(
            f"{API_URL}/hazards/authority/sla-breaches",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert sla_resp2.status_code == 200
        breached_hazards = sla_resp2.json()
        
        # Verify the hazard is in the breached list
        breached_ids = [h["id"] for h in breached_hazards]
        assert hazard_id in breached_ids, f"Hazard #{hazard_id} not found in breached list!"
        print("[OK] Hazard returned successfully in the authority's breached list.")

        # Verify database field updated persistently to sla_breached = True
        async with async_session_factory() as session:
            db_hazard_res = await session.execute(select(Hazard).where(Hazard.id == hazard_id))
            db_hazard = db_hazard_res.scalar_one()
            assert db_hazard.sla_breached is True, "Expected sla_breached column to be TRUE in DB"
            print("[OK] Verified sla_breached = TRUE persistently in the database.")
            
        print("[OK] SLA breach escalation run. Check backend console for error/escalation logs.")

        print("\n=== ALL SLA TRACKING TESTS PASSED SUCCESSFULLY! ===")

if __name__ == "__main__":
    asyncio.run(test_sla_deadline_and_tracking())
