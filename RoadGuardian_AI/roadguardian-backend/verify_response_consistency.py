import asyncio
import httpx
import time
import xml.etree.ElementTree as ET
from sqlalchemy import select

from app.database import async_session_factory
from app.models.hazard import User

API_URL = "http://127.0.0.1:8000"

async def test_api_response_consistency():
    print("====================================================")
    print("ROADGUARDIAN AI - API RESPONSE CONSISTENCY TEST")
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

        # ====================================================
        # 1. Test GET /hazards/dashboard
        # ====================================================
        print("\n[STEP 1] Testing GET /hazards/dashboard...")
        dash_resp = await client.get(f"{API_URL}/hazards/dashboard")
        assert dash_resp.status_code == 200, f"Expected 200 OK, got {dash_resp.status_code}"
        
        dash_data = dash_resp.json()
        print("[OK] Response received for dashboard.")
        
        # Verify schema fields
        required_dash_fields = ["total_hazards", "pending_count", "resolved_count", "avg_severity", "high_urgency_count", "recent_hazards"]
        for field in required_dash_fields:
            assert field in dash_data, f"Required field '{field}' not found in dashboard analytics response!"
            assert dash_data[field] is not None, f"Field '{field}' should not be NULL!"
        print("[OK] Dashboard analytics core fields verified.")
        
        # Verify recent_hazards items contain expected fields [id, hazard_type, severity_score, status, ...]
        recent_hazards = dash_data["recent_hazards"]
        print(f"[OK] Found {len(recent_hazards)} recent hazards in dashboard.")
        if len(recent_hazards) > 0:
            item = recent_hazards[0]
            expected_hazard_fields = ["id", "hazard_type", "severity_score", "status", "latitude", "longitude", "created_at"]
            for field in expected_hazard_fields:
                assert field in item, f"Hazard item missing required field '{field}'!"
                assert item[field] is not None, f"Hazard field '{field}' should not be NULL!"
            print("[OK] Recent hazard item schema and fields validated successfully.")

        # ====================================================
        # 2. Test GET /hazards/predict-hotspots
        # ====================================================
        print("\n[STEP 2] Testing GET /hazards/predict-hotspots...")
        # Needs authority user to access predict-hotspots
        auth_email = f"officer_consistency_{int(time.time())}@roadguardian.ai"
        print(f"[SIGNUP] Registering Authority: {auth_email}")
        reg_auth_resp = await client.post(
            f"{API_URL}/auth/register",
            json={
                "email": auth_email,
                "password": "OfficerPassword123",
                "full_name": "Officer Consistency"
            }
        )
        assert reg_auth_resp.status_code == 201
        
        # Elevate to 'authority' in DB
        print("[DB] Elevating Officer Consistency to authority...")
        async with async_session_factory() as session:
            result = await session.execute(select(User).where(User.email == auth_email))
            user = result.scalar_one()
            user.role = "authority"
            await session.commit()
        print("[OK] Role updated in database.")
        
        # Login Authority
        auth_login_resp = await client.post(
            f"{API_URL}/auth/login",
            json={
                "email": auth_email,
                "password": "OfficerPassword123"
            }
        )
        assert auth_login_resp.status_code == 200
        auth_token = auth_login_resp.json()["access_token"]
        print("[OK] Authority logged in.")

        # Request predict-hotspots alias
        predict_resp = await client.get(
            f"{API_URL}/hazards/predict-hotspots",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert predict_resp.status_code == 200, f"Expected 200 OK, got {predict_resp.status_code}"
        
        predict_data = predict_resp.json()
        print("[OK] Response received for predict-hotspots.")
        
        # Verify schema fields [predicted_hotspots, confidence, ...]
        assert "predicted_hotspots" in predict_data, "Field 'predicted_hotspots' not found in hotspots response!"
        assert "confidence" in predict_data, "Field 'confidence' not found in hotspots response!"
        assert predict_data["predicted_hotspots"] is not None, "'predicted_hotspots' should not be NULL!"
        assert predict_data["confidence"] is not None, "'confidence' should not be NULL!"
        print("[OK] Hotspot predictions fields verified successfully.")

        # ====================================================
        # 3. Test POST /whatsapp/webhook
        # ====================================================
        print("\n[STEP 3] Testing POST /whatsapp/webhook...")
        webhook_resp = await client.post(
            f"{API_URL}/whatsapp/webhook",
            data={
                "From": "whatsapp:+919876543210",
                "Body": "heavy waterlogging at station entrance",
                "Latitude": "13.0827",
                "Longitude": "80.2707"
            }
        )
        assert webhook_resp.status_code == 200, f"Expected 200 OK, got {webhook_resp.status_code}"
        
        content_type = webhook_resp.headers.get("content-type", "")
        print(f"[OK] Response Content-Type: {content_type}")
        assert "xml" in content_type.lower(), f"Expected XML media type, got '{content_type}'"
        
        response_text = webhook_resp.text
        print("[OK] Response body received (TwiML XML):")
        print(response_text)
        
        # Parse XML and assert <Message> tag
        root = ET.fromstring(response_text.encode('utf-8'))
        assert root.tag == "Response", f"Expected root tag 'Response', got '{root.tag}'"
        message_elem = root.find("Message")
        assert message_elem is not None, "Message element not found in TwiML response!"
        print(f"[OK] Found Message tag in response with content: {message_elem.text}")

        print("\n=== ALL RESPONSE CONSISTENCY TESTS PASSED SUCCESSFULLY! ===")

if __name__ == "__main__":
    asyncio.run(test_api_response_consistency())
