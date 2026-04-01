import os

from authlib.integrations.starlette_client import OAuth

oauth = OAuth()

BACKEND_URL = os.environ.get("BACKEND_URL", "http://localhost:8000")

# Google OpenID Connect
oauth.register(
    name="google",
    client_id=os.environ.get("GOOGLE_CLIENT_ID", ""),
    client_secret=os.environ.get("GOOGLE_CLIENT_SECRET", ""),
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    client_kwargs={"scope": "openid email profile"},
)

# X (Twitter) OAuth 2.0
oauth.register(
    name="x",
    client_id=os.environ.get("X_CLIENT_ID", ""),
    client_secret=os.environ.get("X_CLIENT_SECRET", ""),
    authorize_url="https://twitter.com/i/oauth2/authorize",
    access_token_url="https://api.twitter.com/2/oauth2/token",
    client_kwargs={
        "scope": "users.read tweet.read offline.access",
        "code_challenge_method": "S256",
    },
)
