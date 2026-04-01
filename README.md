# URL Shortener

Full-stack URL shortener with analytics, deployed to Azure.

## Stack

- **Backend:** Python FastAPI on Azure Container Apps
- **Database:** Azure PostgreSQL Flexible Server
- **Frontend:** React (Vite) + TypeScript on Azure Static Web Apps
- **Infrastructure:** Bicep (IaC)
- **CI/CD:** GitHub Actions (OIDC auth, path-filtered)

## Local Development

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

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

## Deployment

Infrastructure is managed with Bicep. Deploy all Azure resources:

```bash
az login
az group create --name rg-url-shortener --location eastus
az deployment group create \
  --resource-group rg-url-shortener \
  --template-file infra/main.bicep \
  --parameters infra/parameters/dev.bicepparam
```

Push to `main` to trigger auto-deployments via GitHub Actions.

## Project Structure

```
├── infra/          Bicep IaC templates
├── backend/        FastAPI application
├── frontend/       React (Vite) application
└── .github/        CI/CD workflows
```
