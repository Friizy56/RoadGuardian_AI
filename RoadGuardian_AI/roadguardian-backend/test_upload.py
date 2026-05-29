import httpx
import asyncio

async def test():
    async with httpx.AsyncClient() as client:
        # Register a user
        res = await client.post("http://localhost:8000/auth/register", json={
            "email": "test@test.com",
            "password": "password123",
            "full_name": "Test User",
            "role": "citizen"
        })
        print("Register:", res.status_code, res.text)
        
        # Login
        res = await client.post("http://localhost:8000/auth/token", data={
            "username": "test@test.com",
            "password": "password123"
        })
        print("Login:", res.status_code, res.text)
        if res.status_code != 200:
            return
        token = res.json().get("access_token")
        
        # Upload
        headers = {"Authorization": f"Bearer {token}"}
        files = {"image": ("test.jpg", b"dummy image data", "image/jpeg")}
        data = {
            "hazard_type": "pothole",
            "latitude": 22.0,
            "longitude": 79.0,
            "description": ""
        }
        res = await client.post("http://localhost:8000/hazards/upload", headers=headers, data=data, files=files)
        print("Upload:", res.status_code, res.text)

asyncio.run(test())
