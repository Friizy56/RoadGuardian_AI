import asyncio
import httpx
import os
import time
from datetime import datetime
from sqlalchemy import select

from app.database import async_session_factory
from app.models.hazard import User, Hazard, GamificationBadge

API_URL = "http://127.0.0.1:8000"

async def test_full_regression():
    print("====================================================")
    print("ROADGUARDIAN AI - FEATURE REGRESSION TEST SUITE (P4)")
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

        # 1. Setup - Register & Login Citizen User
        citizen_email = f"citizen_reg_{int(time.time())}@roadguardian.ai"
        print(f"\n[SETUP] Registering Citizen: {citizen_email}")
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

        # 2. Setup - Register, Elevate & Login Authority User
        authority_email = f"authority_reg_{int(time.time())}@roadguardian.ai"
        print(f"\n[SETUP] Registering Authority: {authority_email}")
        reg_auth_resp = await client.post(
            f"{API_URL}/auth/register",
            json={
                "email": authority_email,
                "password": "OfficerPassword123",
                "full_name": "Officer Bobby"
            }
        )
        assert reg_auth_resp.status_code == 201
        
        print("[DB] Elevating Officer Bobby to authority...")
        async with async_session_factory() as session:
            result = await session.execute(select(User).where(User.email == authority_email))
            user = result.scalar_one()
            user.role = "authority"
            await session.commit()
        print("[OK] Authority elevated in DB.")
        
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

        # ====================================================
        # A) Traditional Hazard Report (Form-based)
        # ====================================================
        print("\n--- [PART A] Traditional Hazard Report (Form-based) ---")
        mock_img = "regression_mock.jpg"
        with open(mock_img, "wb") as f:
            f.write(b"mock image content")
            
        try:
            with open(mock_img, "rb") as f_img:
                upload_resp = await client.post(
                    f"{API_URL}/hazards/upload",
                    headers={"Authorization": f"Bearer {citizen_token}"},
                    data={
                        "hazard_type": "pothole",
                        "latitude": 13.0827,
                        "longitude": 80.2707,
                        "description": "Form-based visual report"
                    },
                    files={"image": ("hazard.jpg", f_img, "image/jpeg")}
                )
            assert upload_resp.status_code == 201, f"Expected 201, got {upload_resp.status_code}"
            hazard_data = upload_resp.json()
            hazard_id = hazard_data["id"]
            print(f"✓ Form-based hazard #{hazard_id} created successfully via /report logic.")
            
            # Severity Calculation Verification
            severity = hazard_data["severity_score"]
            print(f"  - Assessed Severity Score: {severity}")
            assert 0.0 <= severity <= 10.0, f"Severity {severity} out of bounds!"
            print("✓ Severity score calculated correctly.")
            
            # Dashboard Analytics presence check
            dash_resp = await client.get(f"{API_URL}/hazards/dashboard")
            assert dash_resp.status_code == 200
            dash_data = dash_resp.json()
            recent_ids = [h["id"] for h in dash_data["recent_hazards"]]
            assert hazard_id in recent_ids, f"Hazard #{hazard_id} not visible in dashboard recent list!"
            print("✓ Hazard appears correctly on dashboard.")
            
            # Authority View verification
            pending_resp = await client.get(
                f"{API_URL}/hazards/authority/pending",
                headers={"Authorization": f"Bearer {auth_token}"}
            )
            assert pending_resp.status_code == 200
            pending_ids = [h["id"] for h in pending_resp.json()]
            assert hazard_id in pending_ids, f"Hazard #{hazard_id} not visible in authority pending review!"
            print("✓ Authority can see the reported hazard.")
            
        finally:
            if os.path.exists(mock_img):
                os.remove(mock_img)

        # ====================================================
        # B) Authority Dashboard Operations
        # ====================================================
        print("\n--- [PART B] Authority Dashboard Operations ---")
        
        # 1. Filter hazards (verify we can fetch pending vs active)
        print("Verifying authority review queues...")
        pending_resp_before = await client.get(
            f"{API_URL}/hazards/authority/pending",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert pending_resp_before.status_code == 200
        print(f"  - Pending queue count: {len(pending_resp_before.json())}")
        
        # 2. Assign to department/crew
        print(f"Assigning hazard #{hazard_id} to Crew Alpha...")
        assign_resp = await client.post(
            f"{API_URL}/hazards/authority/assign/{hazard_id}",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={"crew_name": "Crew Alpha"}
        )
        assert assign_resp.status_code == 200
        assign_data = assign_resp.json()
        assert assign_data["assigned_to"] == "Crew Alpha", "Assignment failed!"
        print("✓ Successfully assigned to department/crew.")
        
        # 3. Mark Resolved with resolution notes and image
        mock_proof = "regression_proof.jpg"
        with open(mock_proof, "wb") as f:
            f.write(b"mock resolution image content")
            
        try:
            with open(mock_proof, "rb") as f_proof:
                resolve_resp = await client.post(
                    f"{API_URL}/hazards/authority/resolve/{hazard_id}",
                    headers={"Authorization": f"Bearer {auth_token}"},
                    data={"resolution_notes": "Patched with hot asphalt, rolled and sealed."},
                    files={"resolved_image": ("repaired.jpg", f_proof, "image/jpeg")}
                )
            assert resolve_resp.status_code == 200
            resolve_data = resolve_resp.json()
            assert resolve_data["status"] == "resolved", "Status is not resolved!"
            print("✓ Successfully marked hazard as resolved.")
        finally:
            if os.path.exists(mock_proof):
                os.remove(mock_proof)
                
        # 4. Statistics update check
        print("Verifying updated dashboard statistics...")
        dash_resp_after = await client.get(f"{API_URL}/hazards/dashboard")
        assert dash_resp_after.status_code == 200
        dash_data_after = dash_resp_after.json()
        print(f"  - Total hazards: {dash_data_after['total_hazards']}")
        print(f"  - Resolved count: {dash_data_after['resolved_count']}")
        print(f"  - Pending count: {dash_data_after['pending_count']}")
        assert dash_data_after["resolved_count"] >= 1
        print("✓ Dashboard statistics update correctly.")

        # ====================================================
        # C) Leaderboard Operations
        # ====================================================
        print("\n--- [PART C] Leaderboard Operations ---")
        
        # 1. Send 5 WhatsApp messages from a new proxy phone to trigger points calculation
        wa_from = "whatsapp:+919875551234"
        wa_email = "919875551234@whatsapp.roadguardian.gov"
        print(f"Sending 5 WhatsApp reports from {wa_from} to award gamification points...")
        for i in range(1, 6):
            res_wa = await client.post(
                f"{API_URL}/whatsapp/webhook",
                data={
                    "From": wa_from,
                    "Body": f"Debris report from whatsapp #{i}",
                    "Latitude": "13.0827",
                    "Longitude": "80.2707"
                }
            )
            assert res_wa.status_code == 200
            
        print("✓ All 5 WhatsApp reports successfully registered.")
        
        # Verify points & badges for the proxy user in DB
        async with async_session_factory() as session:
            stmt_wa_user = select(User).where(User.email == wa_email)
            res_wa_user = await session.execute(stmt_wa_user)
            wa_user = res_wa_user.scalar_one_or_none()
            assert wa_user is not None
            print(f"  - Proxy user points in DB: {wa_user.points}")
            assert wa_user.points >= 100, f"Expected points >= 100, got {wa_user.points}"
            
            stmt_wa_badges = select(GamificationBadge).where(GamificationBadge.user_id == wa_user.id)
            res_wa_badges = await session.execute(stmt_wa_badges)
            wa_badges = res_wa_badges.scalars().all()
            print(f"  - Proxy user badges in DB: {[b.badge_name for b in wa_badges]}")
            assert len(wa_badges) >= 1
            assert wa_badges[0].badge_name == "civic_sentinel"
        print("✓ Points calculated successfully for WhatsApp reports.")

        # 2. Get Leaderboard and check rankings & visibility
        leaderboard_resp = await client.get(f"{API_URL}/auth/leaderboard?period=all_time")
        assert leaderboard_resp.status_code == 200
        leaderboard = leaderboard_resp.json()
        print(f"  - Leaderboard count: {len(leaderboard)}")
        
        # Verify sorted by points desc
        for i in range(len(leaderboard) - 1):
            assert leaderboard[i]["points"] >= leaderboard[i+1]["points"], "Leaderboard is not correctly sorted by points!"
        print("✓ Citizens ranked correctly by points contributions.")
        
        # Verify our WhatsApp user is visible in the leaderboard
        wa_leaderboard_entry = next((u for u in leaderboard if u["email"] == wa_email), None)
        assert wa_leaderboard_entry is not None, f"WhatsApp user {wa_email} not visible on leaderboard!"
        print(f"✓ Top/active reporters including WhatsApp users are visible: '{wa_leaderboard_entry['full_name']}' with {wa_leaderboard_entry['points']} pts.")

        # ====================================================
        # D) Heatmap
        # ====================================================
        print("\n--- [PART D] Heatmap ---")
        
        # 1. Fetch Heatmap clusters
        heatmap_resp = await client.get(f"{API_URL}/hazards/heatmap")
        assert heatmap_resp.status_code == 200
        heatmap = heatmap_resp.json()
        print(f"  - Heatmap clusters fetched: {len(heatmap)}")
        
        # Verify WhatsApp coordinates are present in the heatmap cluster view
        # We sent reports at (13.0827, 80.2707) which clusters to grid (13.08, 80.27)
        found_cluster = False
        for cluster in heatmap:
            # check proximity
            if abs(cluster["center_lat"] - 13.08) < 0.02 and abs(cluster["center_lng"] - 80.27) < 0.02:
                found_cluster = True
                print(f"  - Found cluster: ({cluster['center_lat']}, {cluster['center_lng']}), count: {cluster['hazard_count']}")
                assert cluster["hazard_count"] >= 1, "Cluster count should be >= 1"
                
        assert found_cluster, "WhatsApp reports and form-based reports not visible in heatmap coordinate clusters!"
        print("✓ WhatsApp and traditional reports successfully appear and cluster on map.")

        # ====================================================
        # E) Profile Details
        # ====================================================
        print("\n--- [PART E] Profile Details ---")
        
        # 1. Query the Citizen's profile (/auth/me) to assert badges and stats
        cit_profile_resp = await client.get(
            f"{API_URL}/auth/me",
            headers={"Authorization": f"Bearer {citizen_token}"}
        )
        assert cit_profile_resp.status_code == 200
        cit_profile = cit_profile_resp.json()
        print(f"  - Profile Email: {cit_profile['email']}")
        print(f"  - Profile Points: {cit_profile['points']}")
        print(f"  - Profile Badges count: {len(cit_profile['badges'])}")
        assert "points" in cit_profile
        assert "badges" in cit_profile
        print("✓ Citizen profile shows contribution stats and badge history successfully.")
        
        # 2. Query the WhatsApp proxy user's profile details in DB
        async with async_session_factory() as session:
            stmt_user = select(User).where(User.email == wa_email)
            res_user = await session.execute(stmt_user)
            wa_user = res_user.scalar_one()
            
            stmt_user_badges = select(GamificationBadge).where(GamificationBadge.user_id == wa_user.id)
            res_user_badges = await session.execute(stmt_user_badges)
            wa_user_badges = res_user_badges.scalars().all()
            
            print(f"  - WhatsApp Proxy user: {wa_user.full_name}")
            print(f"  - Stats (points): {wa_user.points}")
            print(f"  - Badge History: {[b.badge_name for b in wa_user_badges]}")
            assert wa_user.points >= 100
            assert len(wa_user_badges) >= 1
            print("✓ WhatsApp proxy user details, badge history, and stats are verified.")

    print("\n====================================================")
    print("ALL FEATURE REGRESSION TESTS PASSED SUCCESSFULLY!")
    print("====================================================")

if __name__ == "__main__":
    asyncio.run(test_full_regression())
