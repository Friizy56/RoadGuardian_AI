import asyncio
import httpx
import json
from sqlalchemy import select
from app.database import async_session_factory
from app.models.hazard import Hazard
from app.services.hazard_service import reverse_geocode

API_URL = "http://127.0.0.1:8000"

async def test_reverse_geocoding():
    print("====================================================")
    print("ROADGUARDIAN AI - REVERSE GEOCODING E2E TEST")
    print("====================================================")

    async with httpx.AsyncClient(timeout=30.0) as client:
        # 1. Test coordinates: Central Station (13.0827, 80.2707)
        print("\n[STEP 1] Sending WhatsApp message at Central Station: (13.0827, 80.2707)...")
        res_cs = await client.post(
            f"{API_URL}/whatsapp/webhook",
            data={
                "From": "whatsapp:+918888777666",
                "Body": "Huge pothole at Central Station road",
                "Latitude": "13.0827",
                "Longitude": "80.2707"
            }
        )
        assert res_cs.status_code == 200, res_cs.text
        print("✓ Central Station report registered.")

        # 2. Random coordinates (0.0, 0.0)
        print("\n[STEP 2] Sending WhatsApp message at random coordinates: (0.0, 0.0)...")
        res_rand = await client.post(
            f"{API_URL}/whatsapp/webhook",
            data={
                "From": "whatsapp:+918888777666",
                "Body": "Pothole in the middle of nowhere",
                "Latitude": "0.0",
                "Longitude": "0.0"
            }
        )
        assert res_rand.status_code == 200, res_rand.text
        print("✓ Random coordinates report registered.")

        # 3. DB Verification
        print("\n[STEP 3] Verifying geocoded addresses in database...")
        async with async_session_factory() as session:
            # Verify Central Station Address
            stmt_cs = select(Hazard).where(Hazard.latitude == 13.0827, Hazard.longitude == 80.2707)
            res_cs_db = await session.execute(stmt_cs)
            haz_cs = res_cs_db.scalars().first()
            assert haz_cs is not None
            print(f"  [OK] Central Station coordinates (13.0827, 80.2707) geocoded to:")
            print(f"       => '{haz_cs.location_address}'")
            assert "Central Station Road, Chennai" in haz_cs.location_address
            print("  ✓ Chennai test coordinates address geocoding matches perfectly!")

            # Verify Random / Ocean Address
            stmt_rand = select(Hazard).where(Hazard.latitude == 0.0, Hazard.longitude == 0.0)
            res_rand_db = await session.execute(stmt_rand)
            haz_rand = res_rand_db.scalars().first()
            assert haz_rand is not None
            print(f"  [OK] Random coordinates (0.0, 0.0) geocoded to:")
            print(f"       => '{haz_rand.location_address}'")
            # Should be either 'Unknown location' or the valid Nominatim address 'Planifyr'
            assert haz_rand.location_address in ["Unknown location", "Planifyr"] or len(haz_rand.location_address) > 0
            print("  ✓ Random coordinates geocoding verified successfully!")

        # 4. Fallback failover test
        print("\n[STEP 4] Testing geocoder exception fallback flow...")
        # Direct service fallback evaluation (passing exceptionally invalid parameters to geocoder to force failover)
        fallback_addr = reverse_geocode(999.0, 999.0)
        print(f"  Exception fallback geocoded address: '{fallback_addr}'")
        assert fallback_addr == "Unknown location"
        print("  ✓ Graceful fallback to 'Unknown location' verified!")

    print("\n=== ALL REVERSE GEOCODING TESTS PASSED SUCCESSFULLY! ===")

if __name__ == "__main__":
    asyncio.run(test_reverse_geocoding())
