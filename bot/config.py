import os
from dotenv import load_dotenv

load_dotenv()

BOT_TOKEN: str = os.getenv("BOT_TOKEN", "")

if not BOT_TOKEN:
    raise ValueError("BOT_TOKEN не задан в .env файле!")

POINTS = {
    "easy":   10,
    "medium": 20,
    "hard":   40,
}

QUESTIONS_PER_ROUND = 5