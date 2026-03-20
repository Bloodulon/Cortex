FROM python:3.12-slim

RUN apt-get update && apt-get install -y gcc libpq-dev && rm -rf /var/lib/apt/lists/*

WORKDIR /app

RUN pip install --no-cache-dir \
    "aiogram==3.13.1" \
    "python-dotenv==1.0.1" \
    "fastapi==0.115.0" \
    "uvicorn==0.32.0" \
    "asyncpg==0.29.0"

COPY . .

CMD ["python", "main.py"]