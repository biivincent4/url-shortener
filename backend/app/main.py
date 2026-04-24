import os
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from starlette.middleware.sessions import SessionMiddleware

from app.dependencies import limiter
from app.routers import auth, analytics, tags, urls

STATIC_DIR = Path(__file__).resolve().parent.parent / "static"

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


# Root — serve frontend index.html
@app.get("/")
async def root():
    index = STATIC_DIR / "index.html"
    if index.exists():
        return FileResponse(index)
    return {"message": "URL Shortener API"}


# Routers — order matters: analytics must be before urls because urls has /{short_code} catch-all
app.include_router(auth.router)
app.include_router(analytics.router)
app.include_router(tags.router)
app.include_router(urls.router)

# Serve frontend static assets and SPA fallback
if STATIC_DIR.exists():
    app.mount(
        "/assets", StaticFiles(directory=STATIC_DIR / "assets"), name="static-assets"
    )

    @app.get("/{path:path}")
    async def spa_fallback(path: str):
        """Serve index.html for any unmatched route (SPA client-side routing)."""
        return FileResponse(STATIC_DIR / "index.html")
