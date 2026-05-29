from fastapi import HTTPException
from starlette.status import HTTP_404_NOT_FOUND, HTTP_401_UNAUTHORIZED, HTTP_422_UNPROCESSABLE_ENTITY, HTTP_503_SERVICE_UNAVAILABLE

class HazardNotFoundError(HTTPException):
    def __init__(self, detail: str = "Hazard not found"):
        super().__init__(status_code=HTTP_404_NOT_FOUND, detail=detail)

class UnauthorizedError(HTTPException):
    def __init__(self, detail: str = "Unauthorized"):
        super().__init__(status_code=HTTP_401_UNAUTHORIZED, detail=detail)

class ValidationError(HTTPException):
    def __init__(self, detail: str = "Validation Error"):
        super().__init__(status_code=HTTP_422_UNPROCESSABLE_ENTITY, detail=detail)

class AIServiceError(HTTPException):
    def __init__(self, detail: str = "AI Service Unavailable"):
        super().__init__(status_code=HTTP_503_SERVICE_UNAVAILABLE, detail=detail)
