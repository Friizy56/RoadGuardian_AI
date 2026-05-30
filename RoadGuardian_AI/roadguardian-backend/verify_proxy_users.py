import asyncio
import httpx
from sqlalchemy import select
from app.database import async_session_factory
from app.models.hazard import User, Hazard

API_URL = "http://127.0.0.1:8000"

async def test_proxy_user_creation():
    print("=== Starting Proxy User Creation Test Suite ===")

    phone1 = "+919876543210"
    phone2 = "+919999888777"

    async with httpx.AsyncClient(timeout=30.0) as client:
        # 1. Send report from phone1
        print(f"\n[STEP 1] Sending report from {phone1}...")
        res1 = await client.post(
            f"{API_URL}/whatsapp/webhook",
            data={
                "From": f"whatsapp:{phone1}",
                "Body": "first pothole report",
                "Latitude": "13.0827",
                "Longitude": "80.2707"
            }
        )
        assert res1.status_code == 200, f"Failed: {res1.status_code}"

        # 2. Send report from phone2
        print(f"[STEP 2] Sending report from {phone2}...")
        res2 = await client.post(
            f"{API_URL}/whatsapp/webhook",
            data={
                "From": f"whatsapp:{phone2}",
                "Body": "second pothole report",
                "Latitude": "13.0827",
                "Longitude": "80.2707"
            }
        )
        assert res2.status_code == 200, f"Failed: {res2.status_code}"

        # 3. Query DB to verify the two users were created correctly
        print("\n[STEP 3] Verifying user records in database...")
        async with async_session_factory() as session:
            stmt = (
                select(User)
                .where(User.email.like("%@whatsapp.roadguardian.gov"))
                .order_by(User.created_at.desc())
            )
            res = await session.execute(stmt)
            users = res.scalars().all()
            
            print(f"Found {len(users)} WhatsApp proxy users in DB:")
            for u in users:
                print(f"  ID: {u.id} | Email: {u.email} | Name: {u.full_name} | Role: {u.role}")

            user1 = next((u for u in users if u.email == "919876543210@whatsapp.roadguardian.gov"), None)
            user2 = next((u for u in users if u.email == "919999888777@whatsapp.roadguardian.gov"), None)

            assert user1 is not None, "User 1 not found in database!"
            assert user2 is not None, "User 2 not found in database!"

            # Assert properties
            assert user1.full_name == f"WhatsApp Citizen ({phone1})", f"Expected 'WhatsApp Citizen ({phone1})', got '{user1.full_name}'"
            assert user2.full_name == f"WhatsApp Citizen ({phone2})", f"Expected 'WhatsApp Citizen ({phone2})', got '{user2.full_name}'"
            assert user1.role == "citizen", f"Expected role 'citizen', got '{user1.role}'"
            assert user2.role == "citizen", f"Expected role 'citizen', got '{user2.role}'"
            print("✓ Users correctly created with correct email formats, names, and roles!")

            user1_id_initial = user1.id

        # 4. Send 2 more reports from FIRST phone
        print(f"\n[STEP 4] Sending 2 more reports from {phone1}...")
        res3 = await client.post(
            f"{API_URL}/whatsapp/webhook",
            data={
                "From": f"whatsapp:{phone1}",
                "Body": "another pothole report",
                "Latitude": "13.0827",
                "Longitude": "80.2707"
            }
        )
        assert res3.status_code == 200

        res4 = await client.post(
            f"{API_URL}/whatsapp/webhook",
            data={
                "From": f"whatsapp:{phone1}",
                "Body": "yet another pothole report",
                "Latitude": "13.0827",
                "Longitude": "80.2707"
            }
        )
        assert res4.status_code == 200

        # 5. Verify no new user was created, and same user_id is assigned
        print("\n[STEP 5] Verifying that no duplicate user was created and user_id matches...")
        async with async_session_factory() as session:
            # Check user count for phone1
            stmt_users = select(User).where(User.email == "919876543210@whatsapp.roadguardian.gov")
            res_users = await session.execute(stmt_users)
            user_records = res_users.scalars().all()
            assert len(user_records) == 1, f"Expected exactly 1 user record, found {len(user_records)}"
            assert user_records[0].id == user1_id_initial, "User ID changed!"
            print("✓ Verified: Exactly 1 user record exists for the phone number.")

            # Check hazards linked to this user
            stmt_hazards = select(Hazard).where(Hazard.user_id == user1_id_initial)
            res_hazards = await session.execute(stmt_hazards)
            hazards = res_hazards.scalars().all()
            assert len(hazards) == 3, f"Expected 3 hazards for this user, found {len(hazards)}"
            print(f"✓ Verified: All 3 hazards correctly link to the same user ID ({user1_id_initial})!")

    print("\n=== ALL PROXY USER TESTS PASSED SUCCESSFULLY! ===")

if __name__ == "__main__":
    asyncio.run(test_proxy_user_creation())
