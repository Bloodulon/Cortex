import os

import asyncpg

DATABASE_URL = os.getenv("DATABASE_URL")

async def init_db(pool):
    async with pool.acquire() as conn:
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS users (
                user_id         BIGINT PRIMARY KEY,
                username        TEXT DEFAULT 'Игрок',
                total_score     INTEGER DEFAULT 0,
                games_played    INTEGER DEFAULT 0,
                correct_answers INTEGER DEFAULT 0,
                total_answers   INTEGER DEFAULT 0,
                streak_days     INTEGER DEFAULT 0,
                last_game_date  DATE DEFAULT NULL
            )
        """)

        await conn.execute("""
            CREATE TABLE IF NOT EXISTS user_cards (
                user_id          BIGINT REFERENCES users(user_id),
                deck_id          TEXT,
                card_id          INTEGER,
                repetition_count INTEGER DEFAULT 0,
                is_learned       BOOLEAN DEFAULT FALSE,
                last_repeat      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (user_id, deck_id, card_id)
            )
        """)

async def get_user(pool, user_id: int) -> dict:
    async with pool.acquire() as conn:
        row = await conn.fetchrow("SELECT * FROM users WHERE user_id = $1", user_id)
        if not row:
            await conn.execute("INSERT INTO users (user_id) VALUES ($1)", user_id)
            return {
                "total_score": 0,
                "games_played": 0,
                "correct_answers": 0,
                "total_answers": 0,
            }
        return dict(row)


async def update_score(pool, user_id: int, points: int, correct: bool):
    await get_user(pool, user_id)
    async with pool.acquire() as conn:
        await conn.execute(
            """
            UPDATE users SET
                total_score     = total_score + $1,
                total_answers   = total_answers + 1,
                correct_answers = correct_answers + $2
            WHERE user_id = $3
        """,
            points,
            1 if correct else 0,
            user_id,
        )


async def finish_game(pool, user_id: int):
    await get_user(pool, user_id)
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT last_game_date, streak_days FROM users WHERE user_id = $1",
            user_id
        )
        from datetime import date
        today = date.today()
        last = row["last_game_date"]
        streak = row["streak_days"] or 0

        if last is None:
            new_streak = 1
        elif last == today:
            new_streak = streak
        elif (today - last).days == 1:
            new_streak = streak + 1
        else:
            new_streak = 1

        await conn.execute("""
            UPDATE users SET
                games_played   = games_played + 1,
                streak_days    = $1,
                last_game_date = $2
            WHERE user_id = $3
        """, new_streak, today, user_id)


async def get_accuracy(pool, user_id: int) -> float:
    stats = await get_user(pool, user_id)
    if stats["total_answers"] == 0:
        return 0.0
    return stats["correct_answers"] / stats["total_answers"] * 100


async def get_leaderboard(pool, limit: int = 10) -> list:
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT user_id, username, total_score, games_played, correct_answers, total_answers
            FROM users ORDER BY total_score DESC LIMIT $1
            """,
            limit,
        )
        return [dict(r) for r in rows]

async def record_card_attempt(pool, user_id: int, deck_id: str, card_id: int, success: bool):
    async with pool.acquire() as conn:
        await conn.execute("""
            INSERT INTO user_cards (user_id, deck_id, card_id, repetition_count, is_learned)
            VALUES ($1, $2, $3, 1, $4)
            ON CONFLICT (user_id, deck_id, card_id) DO UPDATE SET
                repetition_count = user_cards.repetition_count + 1,
                is_learned = (CASE WHEN $4 = TRUE THEN TRUE ELSE user_cards.is_learned END),
                last_repeat = CURRENT_TIMESTAMP
        """, user_id, deck_id, card_id, success)

    xp = 5 if success else 1
    await update_score(pool, user_id, xp, success)
