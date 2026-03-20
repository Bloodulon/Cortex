import os
from dotenv import load_dotenv

load_dotenv()

BOT_TOKEN = os.getenv("BOT_TOKEN")

if not BOT_TOKEN:
    print("--- DEBUG INFO ---")
    print(f"Current Environment Variables: {list(os.environ.keys())}")
    print("------------------")
    raise ValueError("BOT_TOKEN не найден! Проверь вкладку Variables в Railway.")

POINTS = {
    "easy":   10,
    "medium": 20,
    "hard":   40,
}

QUESTIONS_PER_ROUND = 5