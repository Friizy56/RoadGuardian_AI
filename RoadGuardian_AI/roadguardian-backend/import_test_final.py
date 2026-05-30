import traceback
try:
    from app.auth import auth_router
    print('auth_router imported')
except Exception:
    traceback.print_exc()
try:
    from app.routes.hazards import router as hazards_router
    print('hazards_router imported')
except Exception:
    traceback.print_exc()
