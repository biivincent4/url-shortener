import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from starlette.middleware.sessions import SessionMiddleware

from app.dependencies import limiter
from app.routers import auth, analytics, urls

app = FastAPI(title="URL Shortener API", version="1.0.0")

# Rate limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Session middleware (required by authlib OAuth for state/nonce storage)
app.add_middleware(
    SessionMiddleware,
    secret_key=os.environ.get("SECRET_KEY", "dev-secret-key-change-in-production"),
)

# CORS
allowed_origins = os.environ.get("ALLOWED_ORIGINS", "http://localhost:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Health check — must be before urls router which has /{short_code} catch-all
@app.get("/health")
async def health():
    return {"status": "ok"}


# Routers — order matters: analytics must be before urls because urls has /{short_code} catch-all
app.include_router(auth.router)
app.include_router(analytics.router)
app.include_router(urls.router)
