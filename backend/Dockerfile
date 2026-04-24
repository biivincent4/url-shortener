# Stage 1: Build frontend
FROM node:20-slim AS frontend
WORKDIR /frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
ARG VITE_API_URL=""
ENV VITE_API_URL=${VITE_API_URL}
RUN npm run build

# Stage 2: Install Python dependencies
FROM python:3.11-slim AS backend-deps
WORKDIR /app
COPY backend/requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# Stage 3: Final image
FROM python:3.11-slim
WORKDIR /app
COPY --from=backend-deps /install /usr/local
COPY backend/ .
COPY --from=frontend /frontend/dist /app/static

# GeoLite2 database (optional - geo analytics degrade gracefully without it)
ARG MAXMIND_LICENSE_KEY=""
RUN if [ -n "$MAXMIND_LICENSE_KEY" ]; then \
      apt-get update && apt-get install -y --no-install-recommends curl && \
      curl -sSL "https://download.maxmind.com/app/geoip_download?edition_id=GeoLite2-City&license_key=${MAXMIND_LICENSE_KEY}&suffix=tar.gz" \
        | tar xz --strip-components=1 -C /app --wildcards '*/GeoLite2-City.mmdb' && \
      apt-get remove -y curl && rm -rf /var/lib/apt/lists/*; \
    fi

EXPOSE 8000

CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
