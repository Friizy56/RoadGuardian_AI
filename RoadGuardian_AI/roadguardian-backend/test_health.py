from fastapi.testclient import TestClient

from main import app


def test_health_endpoints():
    with TestClient(app) as client:
        r = client.get("/health")
        assert r.status_code == 200
        payload = r.json()
        assert payload.get("status") == "ok"
        assert payload.get("database") == "connected"

        r2 = client.get("/health/db")
        assert r2.status_code == 200
        payload2 = r2.json()
        assert payload2.get("status") == "ok"
        assert payload2.get("database") == "connected"
