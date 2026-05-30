import asyncio
import httpx
import time

API_URL = "http://127.0.0.1:8000"

async def make_request(client, user_id):
    start = time.time()
    try:
        res = await client.get(f"{API_URL}/hazards/heatmap")
        duration = (time.time() - start) * 1000
        assert res.status_code == 200
        print(f"User {user_id}: Heatmap loaded in {duration:.1f}ms")
        return duration
    except Exception as e:
        print(f"User {user_id}: Heatmap failed - {e}")
        return None

async def run_load_test():
    print("====================================================")
    print("ROADGUARDIAN AI - CONCURRENT LOAD TESTER (10+ USERS)")
    print("====================================================")
    
    async with httpx.AsyncClient(timeout=10.0) as client:
        # Check server first
        try:
            res = await client.get(f"{API_URL}/hazards/heatmap")
            assert res.status_code == 200
        except Exception:
            print("[ERROR] Backend not running.")
            return

        tasks = [make_request(client, i) for i in range(1, 13)]
        durations = await asyncio.gather(*tasks)
        
        valid_durations = [d for d in durations if d is not None]
        print(f"\nLoad Test Summary:")
        print(f"  - Completed: {len(valid_durations)} / {len(tasks)} requests")
        if valid_durations:
            avg_time = sum(valid_durations) / len(valid_durations)
            max_time = max(valid_durations)
            print(f"  - Avg Response Time: {avg_time:.1f}ms")
            print(f"  - Max Response Time: {max_time:.1f}ms")
            assert avg_time < 500.0, "Average response time exceeded 500ms limit under load!"
            print("✓ Concurrent load test passed successfully under 500ms threshold!")

if __name__ == "__main__":
    asyncio.run(run_load_test())
