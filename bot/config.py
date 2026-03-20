import os
import os
from dotenv import load_dotenv

load_dotenv() 

BOT_TOKEN = os.getenv("BOT_TOKEN")

if not BOT_TOKEN:
    raise ValueError("BOT_TOKEN не найден! Проверь переменные в панели Railway.")

POINTS = {
    "easy":   10,
    "medium": 20,
    "hard":   40,
}

QUESTIONS_PER_ROUND = 5