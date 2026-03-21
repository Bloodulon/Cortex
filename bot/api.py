import database as db
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Разрешаем запросы с Vercel
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://tgbot-cortex.vercel.app/"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# ── Получить статистику пользователя ──────────
@app.get("/stats/{user_id}")
async def get_stats(user_id: int):
    pool = app.state.db_pool
    stats = await db.get_user(pool, user_id)
    if not stats:
        raise HTTPException(status_code=404, detail="User not found")
    accuracy = db.get_accuracy(user_id)
    return {
        "user_id":        user_id,
        "total_score":    stats["total_score"],
        "games_played":   stats["games_played"],
        "correct":        stats["correct_answers"],
        "total_answers":  stats["total_answers"],
        "accuracy":       round(accuracy, 1),
    }

# ── Лидерборд ─────────────────────────────────
@app.get("/leaderboard")
def get_leaderboard():
    rows = db.get_leaderboard(10)
    return [
        {
            "position":  i + 1,
            "user_id":   r[0],
            "score":     r[1],
            "games":     r[2],
        }
        for i, r in enumerate(rows)
    ]

# ── Healthcheck ─────────
@app.get("/health")
def health():
    return {"status": "ok"}
