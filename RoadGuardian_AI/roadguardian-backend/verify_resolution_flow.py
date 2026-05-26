import asyncio
import httpx
import sqlite3
import os
import time

API_URL = "http://127.0.0.1:8000"

async def test_resolution_flow():
    print("=== Starting Before/After Image Resolution E2E Test ===")

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
        citizen_email = f"jane_{int(time.time())}@roadguardian.ai"
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
        citizen_token = login_response.json()["access_token"]
        print("[OK] Citizen logged in, received JWT access token.")

        # 3. Submit a visual hazard report (multipart form-data)
        print("\n[REPORT] Citizen Jane reporting a hazard (visual report)...")
        mock_image_path = "test_res_hazard.jpg"
        with open(mock_image_path, "wb") as f:
            f.write(b"fake visual report image")

        try:
            with open(mock_image_path, "rb") as img_file:
                upload_response = await client.post(
                    f"{API_URL}/hazards/upload",
                    headers={"Authorization": f"Bearer {citizen_token}"},
                    data={
                        "hazard_type": "pothole",
                        "latitude": 13.0827,
                        "longitude": 80.2707,
                        "description": "Visual pothole proof"
                    },
                    files={"image": ("hazard.jpg", img_file, "image/jpeg")}
                )
            assert upload_response.status_code == 201, f"Hazard upload failed: {upload_response.text}"
            hazard_1 = upload_response.json()
            print(f"[OK] Visual Hazard created successfully: {hazard_1}")
        finally:
            if os.path.exists(mock_image_path):
                os.remove(mock_image_path)

        # 4. Submit a voice hazard report
        print("\n[VOICE] Citizen Jane reporting another hazard using voice...")
        mock_audio_path = "test_res_voice.wav"
        with open(mock_audio_path, "wb") as f:
            f.write(b"fake voice audio")

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
            assert voice_response.status_code == 201, f"Voice report failed: {voice_response.text}"
            hazard_2 = voice_response.json()
            print(f"[OK] Voice Hazard created successfully: {hazard_2}")
        finally:
            if os.path.exists(mock_audio_path):
                os.remove(mock_audio_path)

        # 5. Register an Authority User
        authority_email = f"officer_{int(time.time())}@roadguardian.ai"
        print(f"\n[SIGNUP] Registering Authority user: {authority_email}")
        reg_auth_resp = await client.post(
            f"{API_URL}/auth/register",
            json={
                "email": authority_email,
                "password": "SecurePassword123",
                "full_name": "Officer Bobby"
            }
        )
        assert reg_auth_resp.status_code == 201
        print("[OK] Authority user signed up.")

        # 6. Manually elevate user role to "authority" in SQLite database
        print("\n[DB] Elevating Officer Bobby to 'authority' in SQLite...")
        conn = sqlite3.connect("roadguardian_dev.db")
        cursor = conn.cursor()
        cursor.execute("UPDATE users SET role = 'authority' WHERE email = ?", (authority_email,))
        conn.commit()
        conn.close()
        print("[OK] Elevation successfully written.")

        # 7. Login Authority User
        print("\n[LOGIN] Logging in Officer Bobby...")
        auth_login_resp = await client.post(
            f"{API_URL}/auth/login",
            json={
                "email": authority_email,
                "password": "SecurePassword123"
            }
        )
        assert auth_login_resp.status_code == 200
        auth_token = auth_login_resp.json()["access_token"]
        print("[OK] Officer Bobby logged in.")

        # 8. Dispatch Crew Alpha to Hazard 1 (marks verified & assigned)
        print(f"\n[DISPATCH] Officer Bobby dispatching Crew Alpha to hazard #{hazard_1['id']}...")
        assign_resp = await client.post(
            f"{API_URL}/hazards/authority/assign/{hazard_1['id']}",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={"crew_name": "Crew Alpha"}
        )
        assert assign_resp.status_code == 200
        print(f"[OK] Dispatch completed: {assign_resp.json()}")

        # 9. Verify GET /authority/active contains Hazard 1
        print("\n[ACTIVE] Fetching active dispatches (should contain hazard 1)...")
        active_resp = await client.get(
            f"{API_URL}/hazards/authority/active",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert active_resp.status_code == 200
        active_list = active_resp.json()
        print(f"[OK] Found {len(active_list)} active crew dispatches:")
        for idx, h in enumerate(active_list):
            print(f"  [{idx + 1}] ID: {h['id']}, Crew: {h['assigned_to']}, Status: {h['status']}")
        
        active_ids = [h["id"] for h in active_list]
        assert hazard_1["id"] in active_ids, "Hazard 1 was not found in active crew list"

        # 10. Submit Resolution Proof for Hazard 1 (multipart form-data)
        print(f"\n[RESOLVE] Officer Bobby resolving hazard #{hazard_1['id']} with repaired proof image...")
        mock_proof_path = "test_proof_repair.jpg"
        with open(mock_proof_path, "wb") as f:
            f.write(b"fake repaired proof image")

        try:
            with open(mock_proof_path, "rb") as prf_file:
                resolve_resp = await client.post(
                    f"{API_URL}/hazards/authority/resolve/{hazard_1['id']}",
                    headers={"Authorization": f"Bearer {auth_token}"},
                    data={
                        "resolution_notes": "Filled with high-durability cold-mix asphalt, leveled, and steam-rolled."
                    },
                    files={"resolved_image": ("repaired.jpg", prf_file, "image/jpeg")}
                )
            assert resolve_resp.status_code == 200, f"Resolution failed: {resolve_resp.text}"
            resolved_hazard = resolve_resp.json()
            print(f"[OK] Hazard successfully resolved! Response Details:")
            print(f"  Status: {resolved_hazard['status']}")
            print(f"  Proof Image URL: {resolved_hazard['resolved_image_url']}")
            print(f"  Notes: {resolved_hazard['resolution_notes']}")
            print(f"  Resolved By Name: {resolved_hazard['resolved_by_name']}")
            
            assert resolved_hazard["status"] == "resolved"
            assert resolved_hazard["resolved_image_url"] is not None
            assert resolved_hazard["resolved_by_name"] == "Officer Bobby"
        finally:
            if os.path.exists(mock_proof_path):
                os.remove(mock_proof_path)

        # 11. Test Direct Resolution on pending voice report (hazard 2) without initial verification
        print(f"\n[RESOLVE] Officer Bobby directly resolving voice report hazard #{hazard_2['id']} (should auto-verify in-transaction)...")
        mock_proof_path_2 = "test_proof_repair_2.jpg"
        with open(mock_proof_path_2, "wb") as f:
            f.write(b"fake repaired proof image 2")

        try:
            with open(mock_proof_path_2, "rb") as prf_file:
                resolve_resp_2 = await client.post(
                    f"{API_URL}/hazards/authority/resolve/{hazard_2['id']}",
                    headers={"Authorization": f"Bearer {auth_token}"},
                    data={
                        "resolution_notes": "Directly repaired divider and signs."
                    },
                    files={"resolved_image": ("repaired_2.jpg", prf_file, "image/jpeg")}
                )
            assert resolve_resp_2.status_code == 200, f"Direct resolution failed: {resolve_resp_2.text}"
            resolved_hazard_2 = resolve_resp_2.json()
            print(f"[OK] Direct resolution success! Status: {resolved_hazard_2['status']}")
            assert resolved_hazard_2["status"] == "resolved"
        finally:
            if os.path.exists(mock_proof_path_2):
                os.remove(mock_proof_path_2)

        # 12. Check pending list and active list again (should both be completely empty now!)
        print("\n[VERIFY] Checking pending and active lists...")
        pending_check = await client.get(
            f"{API_URL}/hazards/authority/pending",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        active_check = await client.get(
            f"{API_URL}/hazards/authority/active",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert len(pending_check.json()) == 0
        assert len(active_check.json()) == 0
        print("[OK] Confirmed: Active and Pending lists are now completely clean!")

        # 13. Verify Citizen points increased
        citizen_profile = await client.get(
            f"{API_URL}/auth/me",
            headers={"Authorization": f"Bearer {citizen_token}"}
        )
        points = citizen_profile.json()["points"]
        print(f"\n[POINTS] Citizen Jane points verified: {points} points!")
        assert points == 100, f"Expected 100 points, got {points}"

        print("\n=== ALL TESTS PASSED SUCCESSFULLY! ===")

if __name__ == "__main__":
    asyncio.run(test_resolution_flow())
