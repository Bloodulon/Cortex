# config.py
import os
import json
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

BOT_TOKEN = os.getenv("BOT_TOKEN")
if not BOT_TOKEN:
    print("--- DEBUG INFO ---")
    print(f"Current Environment Variables: {list(os.environ.keys())}")
    print("------------------")
    raise ValueError("BOT_TOKEN не найден! Проверь вкладку Variables в Railway.")

CONFIG_PATH = Path(__file__).parent / "config.json"
with open(CONFIG_PATH, "r", encoding="utf-8") as f:
    game_config = json.load(f)

POINTS = game_config["quiz"]["points"]
QUESTIONS_PER_ROUND = game_config["quiz"]["questions_per_round"]
RANKS = game_config["ranks"]
