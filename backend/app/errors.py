from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException


class AppError(Exception):
    def __init__(self, status_code: int, code: str, message: str,
                 details: dict | None = None, headers: dict | None = None):
        self.status_code = status_code
        self.code = code
        self.message = message
        self.details = details or {}
        self.headers = headers


def _response(status_code, code, message, details=None, headers=None):
    return JSONResponse(
        status_code=status_code,
        content={"code": code, "message": message, "details": details or {}},
        headers=headers,
    )


_DEFAULT_CODES = {
    401: "UNAUTHORIZED",
    403: "FORBIDDEN",
    404: "NOT_FOUND",
    405: "METHOD_NOT_ALLOWED",
}


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def handle_app_error(request: Request, exc: AppError):
        return _response(exc.status_code, exc.code, exc.message,
                         exc.details, exc.headers)

    @app.exception_handler(StarletteHTTPException)
    async def handle_http_error(request: Request, exc: StarletteHTTPException):
        code = _DEFAULT_CODES.get(exc.status_code, "HTTP_ERROR")
        return _response(exc.status_code, code, str(exc.detail),
                         headers=getattr(exc, "headers", None))

    @app.exception_handler(RequestValidationError)
    async def handle_validation_error(request: Request, exc: RequestValidationError):
        fields = [
            {"field": ".".join(str(x) for x in e["loc"][1:]), "message": e["msg"]}
            for e in exc.errors()
        ]
        return _response(422, "VALIDATION_ERROR", "Dữ liệu không hợp lệ.",
                         {"errors": fields})