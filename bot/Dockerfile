FROM python:3.12-slim

WORKDIR /app

RUN pip install --no-cache-dir \
    "aiogram==3.13.1" \
    "python-dotenv==1.0.1" \
    "fastapi==0.115.0" \
    "uvicorn==0.32.0" \
    "psycopg2-binary==2.9.9"

COPY . .

EXPOSE 8000