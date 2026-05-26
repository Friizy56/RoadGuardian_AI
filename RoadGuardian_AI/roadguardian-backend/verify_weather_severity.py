import asyncio
import httpx
import os
import time
from unittest.mock import patch, MagicMock

API_URL = "http://127.0.0.1:8000"

async def test_weather_and_traffic_services():
    print("\n--- 1. Testing Weather & Traffic Services Internally ---")
    
    # Temporarily import modules
    from app.services.weather_service import WeatherService, TrafficService
    from app.config import settings
    
    # Ensure standard clear fallback when API key is missing
    print("[TEST] get_weather_condition with empty key...")
    with patch.object(settings, "OPENWEATHER_API_KEY", ""):
        weather_res = await WeatherService.get_weather_condition(13.0827, 80.2707)
        print(f"  Result: {weather_res}")
        assert weather_res["condition"] == "clear"
        assert weather_res["severity_modifier"] == 0.0
        
    # Ensure custom modifiers are mapped correctly
    print("[TEST] get_weather_condition mock response mapping...")
    with patch.object(settings, "OPENWEATHER_API_KEY", "dummy_key"):
        # Mock client session get
        class MockResponse:
            def __init__(self, json_data, status=200):
                self._json_data = json_data
                self.status = status
            async def __aenter__(self):
                return self
            async def __aexit__(self, exc_type, exc_val, exc_tb):
                pass
            async def json(self):
                return self._json_data

        def mock_get(url, *args, **kwargs):
            return MockResponse({
                "weather": [{"main": "Thunderstorm"}],
                "main": {"temp": 298.15, "humidity": 80}
            })

        with patch("aiohttp.ClientSession.get", side_effect=mock_get):
            weather_res = await WeatherService.get_weather_condition(13.0827, 80.2707)
            print(f"  Result: {weather_res}")
            assert weather_res["condition"] == "thunderstorm"
            assert weather_res["severity_modifier"] == 2.5
            assert abs(weather_res["temperature"] - 25.0) < 0.1
            assert weather_res["humidity"] == 80

    # Ensure hourly traffic density runs correctly
    print("[TEST] get_traffic_density simulator...")
    traffic_res = await TrafficService.get_traffic_density(13.0827, 80.2707)
    print(f"  Result: {traffic_res}")
    assert "density" in traffic_res
    assert "severity_modifier" in traffic_res
    assert traffic_res["source"] == "mock"
    print("[OK] Internal service tests passed!")


async def test_severity_endpoint():
    print("\n--- 2. Testing /analyze-severity Endpoint ---")
    async with httpx.AsyncClient() as client:
        # Pothole (base score 7.0) * confidence 0.9 = 6.3
        
        # Test weather drizzle (+1.5) and traffic high (+2.0)
        # Expected: 6.3 + 1.5 + 2.0 = 9.8 (capped at 10.0 => 9.8)
        print("[TEST] Drizzle and High Traffic (expected severity around 9.8)...")
        payload = {
            "hazard_type": "pothole",
            "confidence_score": 0.9,
            "traffic_density": "high",
            "weather_condition": "drizzle"
        }
        res = await client.post(f"{API_URL}/hazards/analyze-severity", json=payload)
        assert res.status_code == 200, res.text
        data = res.json()
        print(f"  Result: {data}")
        assert data["severity_score"] == 9.8
        assert data["urgency_level"] == "critical"

        # Test thunderstorm (+2.5) and traffic high (+2.0)
        # Expected: 6.3 + 2.5 + 2.0 = 10.8 (capped at 10.0)
        print("[TEST] Capping at 10.0 verification...")
        payload = {
            "hazard_type": "pothole",
            "confidence_score": 0.9,
            "traffic_density": "high",
            "weather_condition": "thunderstorm"
        }
        res = await client.post(f"{API_URL}/hazards/analyze-severity", json=payload)
        assert res.status_code == 200, res.text
        data = res.json()
        print(f"  Result: {data}")
        assert data["severity_score"] == 10.0
        assert data["urgency_level"] == "critical"

        # Test clouds (+0.5) and traffic low (+0.0)
        # Expected: 6.3 + 0.5 + 0.0 = 6.8
        print("[TEST] Clouds and Low Traffic verification...")
        payload = {
            "hazard_type": "pothole",
            "confidence_score": 0.9,
            "traffic_density": "low",
            "weather_condition": "clouds"
        }
        res = await client.post(f"{API_URL}/hazards/analyze-severity", json=payload)
        assert res.status_code == 200, res.text
        data = res.json()
        print(f"  Result: {data}")
        assert data["severity_score"] == 6.8
        assert data["urgency_level"] == "high"
    print("[OK] Endpoint severity analysis tests passed!")


async def test_live_hazard_creation():
    print("\n--- 3. Testing Dynamic Severity Calculation on Hazard Upload ---")
    async with httpx.AsyncClient() as client:
        # Register a Citizen
        citizen_email = f"tester_{int(time.time())}@roadguardian.ai"
        print(f"[SIGNUP] Registering Citizen: {citizen_email}")
        reg_response = await client.post(
            f"{API_URL}/auth/register",
            json={
                "email": citizen_email,
                "password": "SecurePassword123",
                "full_name": "Weather Tester"
            }
        )
        assert reg_response.status_code == 201
        
        # Login Citizen
        print("[LOGIN] Logging in Citizen...")
        login_response = await client.post(
            f"{API_URL}/auth/login",
            json={
                "email": citizen_email,
                "password": "SecurePassword123"
            }
        )
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]

        # Submit visual report
        print("[REPORT] Reporting a pothole with coordinates...")
        mock_image_path = "test_weather_hazard.jpg"
        with open(mock_image_path, "wb") as f:
            f.write(b"fake visual image")

        try:
            with open(mock_image_path, "rb") as img_file:
                upload_response = await client.post(
                    f"{API_URL}/hazards/upload",
                    headers={"Authorization": f"Bearer {token}"},
                    data={
                        "hazard_type": "pothole",
                        "latitude": 13.0827,
                        "longitude": 80.2707,
                        "description": "Dynamic weather severity test"
                    },
                    files={"image": ("hazard.jpg", img_file, "image/jpeg")}
                )
            assert upload_response.status_code == 201, upload_response.text
            hazard_data = upload_response.json()
            print(f"[OK] Hazard created with resolved attributes:")
            print(f"  Severity Score: {hazard_data['severity_score']}")
            print(f"  Urgency Level: {hazard_data['urgency_level']}")
            
            # Since OPENWEATHER_API_KEY is empty, weather defaults to clear (modifier 0)
            # local hour will dictate traffic modifier (high: 2.0, medium: 1.0, low: 0.0)
            # base pothole score is 7.0, upload confidence is 1.0 (default for upload route is parsed or 1.0)
            # expected score is 7.0 * 1.0 + traffic_mod + 0.0 = 7.0 + traffic_mod
            from datetime import datetime
            hour = datetime.now().hour
            expected_traffic = 2.0 if (8 <= hour <= 10 or 17 <= hour <= 19) else (1.0 if 11 <= hour <= 16 else 0.0)
            expected_severity = round(7.0 * hazard_data["confidence_score"] + expected_traffic, 2)
            
            print(f"  Expected Severity: {expected_severity} (calculated based on traffic modifier {expected_traffic})")
            assert abs(hazard_data['severity_score'] - expected_severity) < 0.1
        finally:
            if os.path.exists(mock_image_path):
                os.remove(mock_image_path)
    print("[OK] Dynamic hazard upload severity integration test passed!")


async def run_all_tests():
    print("====================================================")
    print("ROADGUARDIAN AI - WEATHER & TRAFFIC E2E TESTER")
    print("====================================================")
    
    # Verify server is online
    async with httpx.AsyncClient() as client:
        try:
            res = await client.get(f"{API_URL}/hazards/heatmap")
            assert res.status_code == 200
            print("[OK] Backend server is listening!")
        except Exception:
            print("[ERROR] Please make sure the backend uvicorn server is running on port 8000 before running tests.")
            return

    await test_weather_and_traffic_services()
    await test_severity_endpoint()
    await test_live_hazard_creation()
    
    print("\n====================================================")
    print("ALL WEATHER & TRAFFIC E2E TESTS PASSED SUCCESSFULLY!")
    print("====================================================")

if __name__ == "__main__":
    asyncio.run(run_all_tests())
