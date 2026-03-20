FROM python:3.12-slim
WORKDIR /app
RUN pip install --no-cache-dir \
    "aiogram==3.13.1" \
    "python-dotenv==1.0.1" \
    "aiohttp-socks==0.10.1"
COPY . .
CMD ["python", "main.py"]