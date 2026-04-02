# 🔗 urls.trie.africa

**Free URL shortener with analytics — built in Africa.**

Shorten, track, and share your links. Custom short codes, click analytics, expiring links, QR codes, and more.

🌐 **Live:** [https://urls.trie.africa](https://urls.trie.africa)
📖 **API Docs:** [https://urls.trie.africa/docs](https://urls.trie.africa/docs)

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| **Instant Shortening** | Paste a URL, get a short link in milliseconds |
| **Click Analytics** | Track clicks, unique visitors, referrers, and daily trends |
| **Custom Short Codes** | Choose memorable codes like `urls.trie.africa/my-brand` |
| **Expiring Links** | Auto-expire links in 1 hour, 7 days, or 30 days |
| **QR Codes** | Every shortened link gets a scannable QR code |
| **OAuth Login** | Sign in with Google or X (Twitter) |
| **Rate Limiting** | Built-in abuse protection |
| **REST API** | Full API with interactive Swagger docs |

## 🛠 Tech Stack

- **Backend:** Python 3.11, FastAPI, SQLAlchemy (async), Alembic
- **Frontend:** React 18, TypeScript, Vite
- **Database:** PostgreSQL 16
- **Auth:** JWT + Google/X OAuth (Authlib)
- **Infra:** Azure Container Apps, Azure Container Registry, Bicep IaC
- **CI/CD:** GitHub Actions with OIDC (no stored credentials)
- **Domain:** Custom `.africa` domain with managed SSL

## 📁 Project Structure

```
├── backend/
│   ├── app/
│   │   ├── main.py            # FastAPI application
│   │   ├── models.py          # SQLAlchemy models
│   │   ├── schemas.py         # Pydantic schemas
│   │   ├── database.py        # Async DB engine
│   │   ├── dependencies.py    # Rate limiter, auth deps
│   │   └── routers/
│   │       ├── auth.py        # OAuth + email/password auth
│   │       ├── urls.py        # Shorten, redirect, delete
│   │       └── analytics.py   # Click stats & charts
│   ├── alembic/               # Database migrations
│   └── Dockerfile             # Multi-stage (frontend + backend)
├── frontend/
│   ├── src/
│   │   ├── pages/             # Home, Login, Register, Dashboard, Stats
│   │   ├── components/        # Navbar, UrlForm, UrlList
│   │   └── context/           # AuthContext (JWT + user state)
│   └── index.html
├── infra/
│   └── main.bicep             # Azure infrastructure as code
└── .github/workflows/
    ├── deploy-infra.yml       # Bicep deployment
    └── deploy-backend.yml     # Docker build & Container App deploy
```

## 🚀 Quick Start (Local Development)

### Prerequisites

- Python 3.11+, Node.js 20+, PostgreSQL

### Backend

```bash
cd backend
python -m venv .venv && .venv/Scripts/activate  # Windows
pip install -r requirements.txt
# Set DATABASE_URL, JWT_SECRET, etc. in .env
alembic upgrade head
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

### Environment Variables

Copy `.env.example` to `.env` in `backend/` and fill in values:

```
DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/urlshortener
SECRET_KEY=your-64-char-random-string
ALLOWED_ORIGINS=http://localhost:5173
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
X_CLIENT_ID=
X_CLIENT_SECRET=
BACKEND_URL=http://localhost:8000
FRONTEND_URL=http://localhost:5173
```

## 📡 API

Interactive docs available at [`/docs`](https://urls.trie.africa/docs).

### Key endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/shorten` | Shorten a URL |
| `GET` | `/{short_code}` | Redirect to original URL |
| `GET` | `/api/urls` | List your URLs (auth required) |
| `DELETE` | `/api/urls/{short_code}` | Deactivate a URL |
| `GET` | `/api/analytics/{short_code}` | Get click analytics |
| `POST` | `/api/auth/register` | Register with email/password |
| `POST` | `/api/auth/login` | Login and get JWT |
| `GET` | `/api/auth/google/login` | Start Google OAuth flow |

## 🏗 Deployment

Infrastructure is defined in Bicep and deployed via GitHub Actions:

1. Fork this repo
2. Create Azure AD app registration with OIDC federation
3. Set GitHub secrets (see `deploy-infra.yml` for required secrets)
4. Push to `master` — workflows deploy automatically

## 📄 License

MIT

---

Built with ❤️ in Africa.
