FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first (layer caching)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy app code
COPY . .

# Koyeb injects PORT env var
EXPOSE 8000

# Start FastAPI
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
