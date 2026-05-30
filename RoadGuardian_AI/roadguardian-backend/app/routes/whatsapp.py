import logging
import json
from fastapi import APIRouter, Depends, Form, Request, status
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.hazard import User
from app.services.hazard_service import HazardService
from app.utils.websocket import manager
from app.schemas.hazard import HazardResponse

router = APIRouter(prefix="/whatsapp", tags=["WhatsApp"])
logger = logging.getLogger(__name__)

@router.get("/webhook")
async def whatsapp_webhook_health():
    """Health check endpoint for WhatsApp webhook."""
    logger.info("✅ WhatsApp webhook health check")
    return {
        "status": "ok",
        "message": "WhatsApp webhook is ready to receive messages"
    }

@router.post("/webhook")
async def twilio_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Receives incoming WhatsApp messages via Twilio Webhook.
    Automatically parses the message, identifies the hazard, registers a proxy user,
    and returns a TwiML XML response.
    """
    try:
        # Parse the form data from Twilio
        form_data = await request.form()
        logger.info(f"📱 Raw form data received: {dict(form_data)}")
        
        # Extract parameters - Twilio sends these fields
        From = form_data.get("From")
        Body = form_data.get("Body")
        Latitude = form_data.get("Latitude")
        Longitude = form_data.get("Longitude")
        MediaUrl0 = form_data.get("MediaUrl0")
        
        logger.info(f"📱 Parsed WhatsApp message - From: {From}, Body: {Body}")
        
        # Handle missing required fields
        if not From or not Body:
            logger.error(f"❌ Missing required fields: From={From}, Body={Body}")
            twiml = """<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Message>❌ Error: Missing required fields (From or Body)</Message>
</Response>"""
            return Response(content=twiml, media_type="application/xml")
        
        # Convert Latitude and Longitude to float if provided
        try:
            lat = float(Latitude) if Latitude else 13.0827
            lng = float(Longitude) if Longitude else 80.2707
        except (ValueError, TypeError):
            lat = 13.0827
            lng = 80.2707
        
        # 1. Lookup or create proxy user
        clean_from = From.replace("whatsapp:", "").replace("+", "")
        proxy_email = f"{clean_from}@whatsapp.roadguardian.gov"
        user_res = await db.execute(select(User).where(User.email == proxy_email))
        user = user_res.scalar_one_or_none()
        
        if not user:
            import uuid
            clean_phone = From.replace("whatsapp:", "")
            if not clean_phone.startswith("+"):
                clean_phone = "+" + clean_phone
            user = User(
                id=str(uuid.uuid4()),
                email=proxy_email,
                full_name=f"WhatsApp Citizen ({clean_phone})",
                role="citizen"
            )
            db.add(user)
            await db.commit()
            await db.refresh(user)
        
        logger.info(f"✅ User created/found: {proxy_email}")
        
        # 2. Extract hazard context
        body_lower = Body.lower()
        hazard_type = "other"
        if "pothole" in body_lower:
            hazard_type = "pothole"
        elif "water" in body_lower or "flood" in body_lower:
            hazard_type = "waterlogging"
        elif "crack" in body_lower:
            hazard_type = "crack"
        elif "sign" in body_lower:
            hazard_type = "missing_signs"
        elif "divider" in body_lower or "barrier" in body_lower:
            hazard_type = "broken_dividers"
        elif "light" in body_lower:
            hazard_type = "street_light_fault"
        elif "manhole" in body_lower:
            hazard_type = "manhole_defect"
        elif "debris" in body_lower:
            hazard_type = "road_debris"
        elif "pavement" in body_lower:
            hazard_type = "pavement_defect"

        logger.info(f"🔍 Detected hazard type: {hazard_type}")

        # 3. Create hazard
        hazard_data = {
            "hazard_type": hazard_type,
            "latitude": lat,
            "longitude": lng,
            "description": f"[WhatsApp Report] {Body}",
            "confidence_score": 0.85
        }

        new_hazard = await HazardService.create_hazard(
            db=db,
            user_id=user.id,
            data=hazard_data,
            image_url=MediaUrl0  # Twilio CDN URL
        )
        logger.info(f"✅ Hazard created: {new_hazard.id}")

        # 4. Broadcast via WebSockets
        hazard_resp = HazardResponse.model_validate(new_hazard)
        await manager.broadcast({
            "type": "new_hazard",
            "data": json.loads(hazard_resp.model_dump_json())
        })
        
        department_str = new_hazard.linked_department or "Municipal Corporation"
        message_text = f"✅ Thank you! Your {hazard_type} report has been received. Ticket ID: #{new_hazard.id}. Our AI has routed this to the {department_str}."
        logger.info(f"✅ WhatsApp response sent successfully")
        
    except Exception as e:
        logger.error(f"❌ Error processing WhatsApp message: {e}", exc_info=True)
        message_text = f"❌ Error: {str(e)[:80]}"

    import html
    escaped_message_text = html.escape(message_text)

    # 5. Return TwiML format response
    twiml = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Message>{escaped_message_text}</Message>
</Response>"""
    return Response(content=twiml, media_type="application/xml")
