import asyncio
import httpx
import sqlite3
import os
import time

API_URL = "http://127.0.0.1:8000"

async def test_authority_flow():
    print("=== Starting Authority Dashboard End-to-End Test ===")

    # Wait for uvicorn server to be ready
    async with httpx.AsyncClient() as client:
        for i in range(5):
            try:
                response = await client.get(f"{API_URL}/hazards/heatmap")
                if response.status_code == 200:
                    print("[OK] Backend server is online!")
                    break
            except Exception:
                pass
            print("[WAIT] Waiting for backend server...")
            await asyncio.sleep(2)
        else:
            raise Exception("Backend server not responding.")

        # 1. Register a Citizen
        citizen_email = f"citizen_{int(time.time())}@roadguardian.ai"
        print(f"\n[SIGNUP] Registering Citizen user: {citizen_email}")
        reg_response = await client.post(
            f"{API_URL}/auth/register",
            json={
                "email": citizen_email,
                "password": "SecurePassword123",
                "full_name": "Citizen Jane"
            }
        )
        assert reg_response.status_code == 201, f"Registration failed: {reg_response.text}"
        citizen_data = reg_response.json()
        print(f"[OK] Citizen registered successfully: {citizen_data}")

        # 2. Login Citizen
        print("\n[LOGIN] Logging in Citizen...")
        login_response = await client.post(
            f"{API_URL}/auth/login",
            json={
                "email": citizen_email,
                "password": "SecurePassword123"
            }
        )
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        token_data = login_response.json()
        citizen_token = token_data["access_token"]
        print("[OK] Citizen logged in, received JWT access token.")

        # 3. Submit a visual hazard report (multipart form-data)
        print("\n[REPORT] Citizen Jane reporting a hazard (visual report)...")
        # Create a mock image file for upload
        mock_image_path = "test_mock_hazard.jpg"
        with open(mock_image_path, "wb") as f:
            f.write(b"fake jpeg data")

        try:
            with open(mock_image_path, "rb") as img_file:
                upload_response = await client.post(
                    f"{API_URL}/hazards/upload",
                    headers={"Authorization": f"Bearer {citizen_token}"},
                    data={
                        "hazard_type": "pothole",
                        "latitude": 13.0827,
                        "longitude": 80.2707,
                        "description": "Large pothole near central station."
                    },
                    files={"image": ("hazard.jpg", img_file, "image/jpeg")}
                )
            assert upload_response.status_code == 201, f"Hazard upload failed: {upload_response.text}"
            hazard_1 = upload_response.json()
            print(f"[OK] Visual Hazard created successfully: {hazard_1}")
        finally:
            if os.path.exists(mock_image_path):
                os.remove(mock_image_path)

        # 4. Submit a voice hazard report (multipart form-data)
        print("\n[VOICE] Citizen Jane reporting another hazard using voice...")
        mock_audio_path = "test_mock_voice.wav"
        with open(mock_audio_path, "wb") as f:
            f.write(b"fake wav data")

        try:
            with open(mock_audio_path, "rb") as aud_file:
                voice_response = await client.post(
                    f"{API_URL}/hazards/voice-report",
                    headers={"Authorization": f"Bearer {citizen_token}"},
                    data={
                        "latitude": 13.0900,
                        "longitude": 80.2800
                    },
                    files={"audio": ("voice.wav", aud_file, "audio/wav")}
                )
            assert voice_response.status_code == 201, f"Voice report upload failed: {voice_response.text}"
            hazard_2 = voice_response.json()
            print(f"[OK] Voice Hazard created successfully: {hazard_2}")
        finally:
            if os.path.exists(mock_audio_path):
                os.remove(mock_audio_path)

        # 5. Register an Authority User
        authority_email = f"authority_{int(time.time())}@roadguardian.ai"
        print(f"\n[SIGNUP] Registering Authority user: {authority_email}")
        reg_auth_resp = await client.post(
            f"{API_URL}/auth/register",
            json={
                "email": authority_email,
                "password": "SecurePassword123",
                "full_name": "Officer Bobby"
            }
        )
        assert reg_auth_resp.status_code == 201, f"Authority user signup failed: {reg_auth_resp.text}"
        auth_data = reg_auth_resp.json()
        print(f"[OK] Authority user signed up: {auth_data}")

        # 6. Manually elevate user role to "authority" in SQLite database
        print("\n[DB] Directly promoting Officer Bobby to 'authority' role in SQLite database...")
        conn = sqlite3.connect("roadguardian_dev.db")
        cursor = conn.cursor()
        cursor.execute("UPDATE users SET role = 'authority' WHERE email = ?", (authority_email,))
        conn.commit()
        conn.close()
        print("[OK] Promotion completed in SQLite database.")

        # 7. Login Authority User
        print("\n[LOGIN] Logging in Officer Bobby...")
        auth_login_resp = await client.post(
            f"{API_URL}/auth/login",
            json={
                "email": authority_email,
                "password": "SecurePassword123"
            }
        )
        assert auth_login_resp.status_code == 200, f"Authority login failed: {auth_login_resp.text}"
        auth_token = auth_login_resp.json()["access_token"]
        print("[OK] Officer Bobby logged in, received authority JWT.")

        # 8. Check profile role matches authority
        profile_resp = await client.get(
            f"{API_URL}/auth/me",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert profile_resp.status_code == 200
        profile_data = profile_resp.json()
        assert profile_data["role"] == "authority", f"Expected role to be authority, got: {profile_data['role']}"
        print(f"[OK] Profile verified: Role = {profile_data['role']}")

        # 9. Access Authority Pending endpoint (should contain hazard_1 and hazard_2)
        print("\n[PENDING] Officer Bobby fetching pending review hazards...")
        pending_resp = await client.get(
            f"{API_URL}/hazards/authority/pending",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert pending_resp.status_code == 200, f"Failed to fetch pending: {pending_resp.text}"
        pending_list = pending_resp.json()
        print(f"[OK] Found {len(pending_list)} pending hazards (ordered by severity score):")
        for idx, h in enumerate(pending_list):
            print(f"  [{idx + 1}] ID: {h['id']}, Type: {h['hazard_type']}, Severity: {h['severity_score']}, Status: {h['status']}")

        # Ensure our newly reported hazards are present and pending
        pending_ids = [h["id"] for h in pending_list]
        assert hazard_1["id"] in pending_ids, "Visual report hazard missing from pending feed"
        assert hazard_2["id"] in pending_ids, "Voice report hazard missing from pending feed"

        # 10. Test Single Crew Assignment (Assign hazard_1 to Crew Alpha)
        print(f"\n[ASSIGN] Dispatching Crew Alpha to hazard #{hazard_1['id']}...")
        assign_resp = await client.post(
            f"{API_URL}/hazards/authority/assign/{hazard_1['id']}",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={"crew_name": "Crew Alpha"}
        )
        assert assign_resp.status_code == 200, f"Assignment failed: {assign_resp.text}"
        assign_data = assign_resp.json()
        print(f"[OK] Assignment success: {assign_data}")
        assert assign_data["assigned_to"] == "Crew Alpha"
        assert assign_data["status"] == "verified"  # Should auto-verify a pending hazard

        # 11. Test Bulk Verification on remaining pending hazards (hazard_2)
        print(f"\n[BULK] Bulk verifying hazard #{hazard_2['id']}...")
        bulk_resp = await client.post(
            f"{API_URL}/hazards/authority/verify-bulk",
            headers={"Authorization": f"Bearer {auth_token}"},
            json=[hazard_2["id"]]
        )
        assert bulk_resp.status_code == 200, f"Bulk verification failed: {bulk_resp.text}"
        bulk_data = bulk_resp.json()
        print(f"[OK] Bulk verification success: {bulk_data}")
        assert bulk_data["verified_count"] == 1

        # 12. Check pending feed again (should be completely empty now!)
        print("\n[PENDING] Checking pending list again...")
        pending_resp_2 = await client.get(
            f"{API_URL}/hazards/authority/pending",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert pending_resp_2.status_code == 200
        pending_list_2 = pending_resp_2.json()
        print(f"[OK] Verified: Pending hazards remaining count = {len(pending_list_2)}")
        assert len(pending_list_2) == 0, f"Expected 0 pending, got {len(pending_list_2)}"

        # 13. Verify Citizen Jane's points have increased due to verification rewards
        print("\n[POINTS] Checking Citizen Jane's updated gamification points...")
        citizen_profile = await client.get(
            f"{API_URL}/auth/me",
            headers={"Authorization": f"Bearer {citizen_token}"}
        )
        assert citizen_profile.status_code == 200
        citizen_profile_data = citizen_profile.json()
        print(f"[OK] Citizen Jane now has: {citizen_profile_data['points']} points!")
        assert citizen_profile_data["points"] > 0, "Citizen did not receive verification points!"

        print("\n=== ALL TESTS COMPLETED SUCCESSFULLY! ===")

if __name__ == "__main__":
    asyncio.run(test_authority_flow())
