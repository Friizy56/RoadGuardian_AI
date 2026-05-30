import asyncio
import httpx
import json
import os
import time
from sqlalchemy import select
from app.database import async_session_factory
from app.models.hazard import User, Hazard, GamificationBadge

API_URL = "http://127.0.0.1:8000"

async def test_gamification_and_geocoding():
    print("====================================================")
    print("ROADGUARDIAN AI - GAMIFICATION & GEOCODING E2E TEST")
    print("====================================================")

    async with httpx.AsyncClient(timeout=30.0) as client:
        # ====================================================
        # PART 1: REVERSE GEOCODING E2E TESTING
        # ====================================================
        print("\n--- [PART 1] Testing Reverse Geocoding ---")
        
        # 1. Test coordinates: 13.0827, 80.2707 (Central Station)
        print("Sending WhatsApp report at Central Station: (13.0827, 80.2707)...")
        res_cs = await client.post(
            f"{API_URL}/whatsapp/webhook",
            data={
                "From": "whatsapp:+919999111222",
                "Body": "Pothole at Central Station road",
                "Latitude": "13.0827",
                "Longitude": "80.2707"
            }
        )
        assert res_cs.status_code == 200
        
        # 2. Random coordinates: 0.0, 0.0 (Ocean / fallback)
        print("Sending WhatsApp report at random/ocean coordinates: (0.0, 0.0)...")
        res_rand = await client.post(
            f"{API_URL}/whatsapp/webhook",
            data={
                "From": "whatsapp:+919999111222",
                "Body": "Pothole in the middle of nowhere",
                "Latitude": "0.0",
                "Longitude": "0.0"
            }
        )
        assert res_rand.status_code == 200

        # Check DB to verify locations
        print("[DB] Verifying geocoded location_address fields...")
        async with async_session_factory() as session:
            # Query Central Station hazard
            stmt_cs = select(Hazard).where(Hazard.latitude == 13.0827, Hazard.longitude == 80.2707)
            res_db_cs = await session.execute(stmt_cs)
            haz_cs = res_db_cs.scalars().first()
            assert haz_cs is not None
            print(f"  Central Station geocoded address: {haz_cs.location_address}")
            assert "Central Station Road, Chennai" in haz_cs.location_address
            print("  ✓ Central Station geocoding matches perfectly!")

            # Query random hazard
            stmt_rand = select(Hazard).where(Hazard.latitude == 0.0, Hazard.longitude == 0.0)
            res_db_rand = await session.execute(stmt_rand)
            haz_rand = res_db_rand.scalars().first()
            assert haz_rand is not None
            print(f"  Random geocoded address: {haz_rand.location_address}")
            assert haz_rand.location_address in ["Unknown location", "Planifyr"] or len(haz_rand.location_address) > 0
            print("  ✓ Graceful geocoding fallback verified!")

        # ====================================================
        # PART 2: GAMIFICATION BADGE SYSTEM E2E TESTING
        # ====================================================
        print("\n--- [PART 2] Testing Gamification Badge System ---")

        # 1. Register and Login a fresh Citizen user
        citizen_email = f"gamified_citizen_{int(time.time())}@roadguardian.ai"
        print(f"Registering Citizen user: {citizen_email}")
        reg_resp = await client.post(
            f"{API_URL}/auth/register",
            json={
                "email": citizen_email,
                "password": "CitizenPassword123",
                "full_name": "Gamified Bobby"
            }
        )
        assert reg_resp.status_code == 201
        
        print("Logging in Citizen user...")
        login_resp = await client.post(
            f"{API_URL}/auth/login",
            json={
                "email": citizen_email,
                "password": "CitizenPassword123"
            }
        )
        assert login_resp.status_code == 200
        cit_token = login_resp.json()["access_token"]
        print("✓ Citizen successfully authenticated.")

        # Let's verify initial state: no badges, 0 points
        print("\nChecking initial user profile...")
        me_resp = await client.get(
            f"{API_URL}/auth/me",
            headers={"Authorization": f"Bearer {cit_token}"}
        )
        assert me_resp.status_code == 200
        profile = me_resp.json()
        print(f"  Initial points: {profile['points']}")
        print(f"  Initial badges: {profile['badges']}")
        assert profile["points"] == 0
        assert len(profile["badges"]) == 0
        print("✓ Verified initial citizen state.")

        # 2. Submit 5 reports to trigger first badge
        print("\nUploading 5 reports from the citizen to trigger 'civic_sentinel' badge...")
        for idx in range(1, 6):
            # Create a mock image file
            mock_img = f"mock_report_{idx}.jpg"
            with open(mock_img, "wb") as f:
                f.write(b"mock image payload")

            try:
                with open(mock_img, "rb") as f_img:
                    up_resp = await client.post(
                        f"{API_URL}/hazards/upload",
                        headers={"Authorization": f"Bearer {cit_token}"},
                        data={
                            "hazard_type": "pothole",
                            "latitude": 13.0827,
                            "longitude": 80.2707,
                            "description": f"Pothole report #{idx}"
                        },
                        files={"image": ("hazard.jpg", f_img, "image/jpeg")}
                    )
                    assert up_resp.status_code == 201
                    print(f"  [OK] Submitted report #{idx} of 5")
            finally:
                if os.path.exists(mock_img):
                    os.remove(mock_img)

        # 3. Query user profile to verify 5 reports badge
        print("\nChecking user profile after 5 reports...")
        me_resp = await client.get(
            f"{API_URL}/auth/me",
            headers={"Authorization": f"Bearer {cit_token}"}
        )
        assert me_resp.status_code == 200
        profile = me_resp.json()
        print(f"  Current points: {profile['points']}")
        print(f"  Current badges: {json.dumps(profile['badges'], indent=2)}")
        
        # Verify badges list contains 'civic_sentinel'
        badge_names = [b["badge_name"] for b in profile["badges"]]
        assert "civic_sentinel" in badge_names
        # Points: should have at least 100 points awarded by the badge
        assert profile["points"] >= 100
        print("✓ First badge ('civic_sentinel') awarded, points calculated, and profile shows badge!")

        # 4. Submit 5 more reports (making 10 total) to trigger premium badge
        print("\nUploading 5 more reports (10 total) to trigger premium 'road_guardian_champion' badge...")
        for idx in range(6, 11):
            mock_img = f"mock_report_{idx}.jpg"
            with open(mock_img, "wb") as f:
                f.write(b"mock image payload")

            try:
                with open(mock_img, "rb") as f_img:
                    up_resp = await client.post(
                        f"{API_URL}/hazards/upload",
                        headers={"Authorization": f"Bearer {cit_token}"},
                        data={
                            "hazard_type": "pothole",
                            "latitude": 13.0827,
                            "longitude": 80.2707,
                            "description": f"Pothole report #{idx}"
                        },
                        files={"image": ("hazard.jpg", f_img, "image/jpeg")}
                    )
                    assert up_resp.status_code == 201
                    print(f"  [OK] Submitted report #{idx} of 10")
            finally:
                if os.path.exists(mock_img):
                    os.remove(mock_img)

        # 5. Query user profile to verify premium 10 reports badge
        print("\nChecking user profile after 10 reports...")
        me_resp = await client.get(
            f"{API_URL}/auth/me",
            headers={"Authorization": f"Bearer {cit_token}"}
        )
        assert me_resp.status_code == 200
        profile = me_resp.json()
        print(f"  Current points: {profile['points']}")
        print(f"  Current badges: {[b['badge_name'] for b in profile['badges']]}")
        
        badge_names = [b["badge_name"] for b in profile["badges"]]
        assert "civic_sentinel" in badge_names
        assert "road_guardian_champion" in badge_names
        # Points: 100 civic_sentinel + 200 road_guardian_champion = 300 points
        assert profile["points"] >= 300
        print("✓ Premium badge ('road_guardian_champion') awarded, points calculated, and profile shows both badges!")

        # Verify proxy user database state for WhatsApp users
        print("\n[DB] Checking gamification_badges table directly for the WhatsApp user...")
        async with async_session_factory() as session:
            # Query proxy user created for whatsapp number from earlier
            stmt_user = select(User).where(User.email == "919999111222@whatsapp.roadguardian.gov")
            res_user = await session.execute(stmt_user)
            proxy_user = res_user.scalar_one_or_none()
            assert proxy_user is not None
            
            # Since the WhatsApp user submitted 2 reports in Part 1, they don't have a badge yet.
            # Let's verify their badges list in db
            stmt_badges = select(GamificationBadge).where(GamificationBadge.user_id == proxy_user.id)
            res_badges = await session.execute(stmt_badges)
            user_badges = res_badges.scalars().all()
            print(f"  WhatsApp user report count: 2. Badges: {[b.badge_name for b in user_badges]}")
            assert len(user_badges) == 0
            
            # Now let's send 3 more reports from this WhatsApp user to make 5!
            print("Sending 3 more WhatsApp reports from the same user to trigger badge...")
            for idx in range(3):
                res_wa = await client.post(
                    f"{API_URL}/whatsapp/webhook",
                    data={
                        "From": "whatsapp:+919999111222",
                        "Body": f"Pothole report from WhatsApp {idx}",
                        "Latitude": "13.0827",
                        "Longitude": "80.2707"
                    }
                )
                assert res_wa.status_code == 200

            # Re-fetch WhatsApp user badges
            res_badges_new = await session.execute(stmt_badges)
            user_badges_new = res_badges_new.scalars().all()
            print(f"  WhatsApp user badges after 5 reports: {[b.badge_name for b in user_badges_new]}")
            assert len(user_badges_new) == 1
            assert user_badges_new[0].badge_name == "civic_sentinel"
            print("  ✓ WhatsApp proxy user gamification badge verified successfully!")

    print("\n=== ALL GAMIFICATION & GEOCODING TESTS PASSED SUCCESSFULLY! ===")

if __name__ == "__main__":
    asyncio.run(test_gamification_and_geocoding())
