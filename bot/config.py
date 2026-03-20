import os
from dotenv import load_dotenv

load_dotenv()

BOT_TOKEN: str = os.getenv("BOT_TOKEN", "")

if not BOT_TOKEN:
    raise ValueError("BOT_TOKEN не задан в .env файле!")

# Очки за правильный ответ по уровням
POINTS = {
    "easy":   10,
    "medium": 20,
    "hard":   40,
}

# Сколько вопросов в одной игровой сессии
QUESTIONS_PER_ROUND = 5