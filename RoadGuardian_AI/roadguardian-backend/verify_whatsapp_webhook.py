import asyncio
import httpx
import re
import xml.etree.ElementTree as ET
from sqlalchemy import select

from app.database import async_session_factory
from app.models.hazard import User, Hazard

API_URL = "http://127.0.0.1:8000"

async def run_whatsapp_webhook_test():
    print("=== Starting WhatsApp Webhook Integration Test Suite ===")

    async with httpx.AsyncClient(timeout=30.0) as client:
        # 1. Verify health check endpoint
        print("\n[STEP 1] Checking WhatsApp Webhook Health...")
        try:
            health_response = await client.get(f"{API_URL}/whatsapp/webhook")
            assert health_response.status_code == 200, f"Health check failed: {health_response.status_code}"
            health_data = health_response.json()
            assert health_data["status"] == "ok", "Expected status 'ok'"
            print("✓ Health check succeeded:", health_data)
        except Exception as e:
            print(f"❌ Failed to reach health check endpoint: {e}")
            return

        # 2. Simulate Twilio Webhook Request (POST /whatsapp/webhook)
        print("\n[STEP 2] Simulating Twilio Webhook POST request...")
        phone_number = "+14155238886"
        message_body = "huge pothole near main street"
        
        # Twilio sends content as x-www-form-urlencoded
        payload = {
            "From": f"whatsapp:{phone_number}",
            "Body": message_body,
            "Latitude": "13.0827",
            "Longitude": "80.2707"
        }

        try:
            webhook_response = await client.post(
                f"{API_URL}/whatsapp/webhook",
                data=payload
            )
            assert webhook_response.status_code == 200, f"Webhook failed: {webhook_response.status_code}"
            response_content = webhook_response.text
            print("✓ Webhook POST response received (TwiML XML):")
            print(response_content)
        except Exception as e:
            print(f"❌ Webhook simulation failed: {e}")
            return

        # 3. Parse and Verify TwiML Response
        print("\n[STEP 3] Parsing and verifying TwiML XML...")
        try:
            root = ET.fromstring(response_content)
            message_elem = root.find("Message")
            assert message_elem is not None, "Message element not found in TwiML response!"
            message_text = message_elem.text
            print(f"✓ Message in TwiML response: {message_text}")
            
            # Verify ticket pattern
            ticket_match = re.search(r"Ticket ID: #(\d+)", message_text)
            assert ticket_match is not None, "Ticket ID not found in the response message!"
            ticket_id = int(ticket_match.group(1))
            print(f"✓ Extracted Ticket ID: #{ticket_id}")
        except Exception as e:
            print(f"❌ XML parsing/validation failed: {e}")
            return

        # 4. Connect to DB and Verify User & Hazard Record
        print("\n[STEP 4] Querying database for user auto-creation and hazard persistence...")
        async with async_session_factory() as session:
            # Check Proxy User
            proxy_email = "14155238886@whatsapp.roadguardian.gov"
            user_res = await session.execute(select(User).where(User.email == proxy_email))
            user = user_res.scalar_one_or_none()
            
            assert user is not None, f"Proxy user {proxy_email} was not auto-created in database!"
            print(f"✓ Proxy User verified: ID={user.id}, FullName={user.full_name}, Role={user.role}")

            # Check Hazard
            hazard_res = await session.execute(select(Hazard).where(Hazard.id == ticket_id))
            hazard = hazard_res.scalar_one_or_none()
            
            assert hazard is not None, f"Hazard record with ID #{ticket_id} was not found in the database!"
            print(f"✓ Hazard Record verified in DB: ID={hazard.id}")
            print(f"  - Hazard Type: {hazard.hazard_type}")
            print(f"  - Description: {hazard.description}")
            print(f"  - Severity Score: {hazard.severity_score:.2f}")
            print(f"  - Urgency Level: {hazard.urgency_level}")
            print(f"  - Status: {hazard.status}")
            print(f"  - SLA Deadline: {hazard.sla_deadline}")
            print(f"  - Linked Department: {hazard.linked_department}")
            
            # Assertions
            assert hazard.hazard_type == "pothole", f"Expected hazard type 'pothole', got '{hazard.hazard_type}'"
            assert hazard.status == "pending", f"Expected status 'pending', got '{hazard.status}'"
            assert "pothole" in hazard.description.lower(), "Description should match user message"
            assert hazard.user_id == user.id, "Hazard user_id should match the auto-created proxy user"

        print("\n=== ALL WHATSAPP INTEGRATION TESTS PASSED SUCCESSFULLY! ===")

if __name__ == "__main__":
    asyncio.run(run_whatsapp_webhook_test())
