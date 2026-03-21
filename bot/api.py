import database as db
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://tgbot-cortex.vercel.app"],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


class AnswerSubmit(BaseModel):
    user_id: int
    question_id: str
    answer: str
    is_correct: bool
    difficulty: str = "medium"


class GameResult(BaseModel):
    user_id: int
    score: int
    correct_count: int
    total_count: int


@app.get("/stats/{user_id}")
async def get_stats(user_id: int):
    pool = app.state.db_pool
    stats = await db.get_user(pool, user_id)
    accuracy = await db.get_accuracy(pool, user_id)
    return {
        "user_id": user_id,
        "total_score": stats["total_score"],
        "games_played": stats["games_played"],
        "correct": stats["correct_answers"],
        "total_answers": stats["total_answers"],
        "accuracy": round(accuracy, 1),
    }


@app.get("/leaderboard")
async def get_leaderboard():
    pool = app.state.db_pool
    rows = await db.get_leaderboard(pool, 10)
    return [
        {
            "position": i + 1,
            "user_id": r["user_id"],
            "score": r["total_score"],
            "games": r["games_played"],
        }
        for i, r in enumerate(rows)
    ]


@app.post("/answer")
async def submit_answer(data: AnswerSubmit):
    pool = app.state.db_pool
    points = {"easy": 10, "medium": 20, "hard": 40}.get(data.difficulty, 20)
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
