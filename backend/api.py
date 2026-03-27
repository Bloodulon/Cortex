import json
from pathlib import Path

import database as db
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

# ────────── Загрузка JSON-файлов ──────────
BASE_DIR = Path(__file__).parent


def _load_json(filename: str):
    path = BASE_DIR / filename
    if not path.exists():
        raise FileNotFoundError(f"Файл не найден: {path}")
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


_questions_cache = _load_json("questions.json")

try:
    _config_cache = _load_json("config.json")
except FileNotFoundError:
    _config_cache = {
        "ranks": [{"label": "🐣 Новичок", "min_xp": 0}],
        "levels": {"xp_per_level": 250},
        "quiz": {"points": {"easy": 10, "medium": 20, "hard": 40}}
    }
    print("[WARN] config.json не найден, используется дефолтный конфиг")

try:
    _cards_cache = _load_json("cards.json")
except FileNotFoundError:
    _cards_cache = {}
    print("[WARN] cards.json не найден, флеш-карточки будут пустыми")


class UserRegister(BaseModel):
    user_id: int
    username: str


class AnswerSubmit(BaseModel):
    user_id: int
    question_id: str = ""
    answer: str = ""
    is_correct: bool
    difficulty: str = "medium"


class GameResult(BaseModel):
    user_id: int
    score: int
    correct_count: int
    total_count: int

@app.get("/api/questions")
async def get_questions():
    """Все вопросы викторины."""
    return _questions_cache


@app.get("/api/config")
async def get_config():
    """Конфиг: ранги, уровни, монеты, настройки квиза."""
    return _config_cache


@app.get("/api/cards")
async def get_cards():
    """Колоды флеш-карточек."""
    return _cards_cache

@app.post("/register")
async def register_user(data: UserRegister):
    pool = app.state.db_pool
    async with pool.acquire() as conn:
        await conn.execute(
            """
            INSERT INTO users (user_id, username)
            VALUES ($1, $2)
            ON CONFLICT (user_id) DO UPDATE SET username = $2
            """,
            data.user_id,
            data.username,
        )
    return {"status": "ok"}


@app.get("/stats/{user_id}")
async def get_stats(user_id: int):
    pool = app.state.db_pool
    stats = await db.get_user(pool, user_id)
    accuracy = await db.get_accuracy(pool, user_id)
    return {
        "user_id": user_id,
        "total_score": stats["total_score"],
        "games_played": stats["games_played"],
        "correct_answers": stats["correct_answers"],
        "total_answers": stats["total_answers"],
        "accuracy": round(accuracy, 1),
        "streak_days": stats.get("streak_days", 0),
    }


@app.get("/leaderboard")
async def get_leaderboard():
    pool = app.state.db_pool
    async with pool.acquire() as conn:
        rows = await conn.fetch("""
            SELECT user_id, username, total_score, games_played
            FROM users ORDER BY total_score DESC LIMIT 10
        """)
    return [
        {
            "position": i + 1,
            "user_id": r["user_id"],
            "username": r["username"],
            "score": r["total_score"],
            "games": r["games_played"],
        }
        for i, r in enumerate(rows)
    ]


@app.post("/answer")
async def submit_answer(data: AnswerSubmit):
    pool = app.state.db_pool
    quiz_cfg = _config_cache.get("quiz", {})
    points_map = quiz_cfg.get("points", {"easy": 10, "medium": 20, "hard": 40})

    points = points_map.get(data.difficulty, 20)
    earned = points if data.is_correct else 0

    await db.update_score(pool, data.user_id, earned, data.is_correct)
    return {"status": "ok", "points": earned}

@app.post("/game/finish")
async def finish_game(data: GameResult):
    pool = app.state.db_pool
    await db.finish_game(pool, data.user_id)
    return {"status": "ok", "score": data.score}


@app.get("/health")
def health():
    return {"status": "ok"}
