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
                total_answers   INTEGER DEFAULT 0
            )
        """)

        await conn.execute("""
            ALTER TABLE users ADD COLUMN IF NOT EXISTS username TEXT DEFAULT 'Игрок'
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
        await conn.execute(
            "UPDATE users SET games_played = games_played + 1 WHERE user_id = $1",
            user_id,
        )


async def get_accuracy(pool, user_id: int) -> float:
    stats = await get_user(pool, user_id)
    if stats["total_answers"] == 0:
        return 0.0
    return stats["correct_answers"] / stats["total_answers"] * 100


async def get_leaderboard(pool, limit: int = 10) -> list:
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT user_id, total_score, games_played, correct_answers, total_answers
            FROM users ORDER BY total_score DESC LIMIT $1
        """,
            limit,
        )
        return [dict(r) for r in rows]
