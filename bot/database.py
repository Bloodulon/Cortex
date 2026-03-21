import os

import psycopg2
from psycopg2.extras import RealDictCursor

DATABASE_URL = os.getenv("DATABASE_URL")


def get_conn():
    return psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)


def init_db():
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    user_id         BIGINT PRIMARY KEY,
                    total_score     INTEGER DEFAULT 0,
                    games_played    INTEGER DEFAULT 0,
                    correct_answers INTEGER DEFAULT 0,
                    total_answers   INTEGER DEFAULT 0
                )
            """)
        conn.commit()


def get_user(user_id: int) -> dict:
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM users WHERE user_id = %s", (user_id,))
            row = cur.fetchone()
            if not row:
                cur.execute("INSERT INTO users (user_id) VALUES (%s)", (user_id,))
                conn.commit()
                return {
                    "total_score": 0,
                    "games_played": 0,
                    "correct_answers": 0,
                    "total_answers": 0,
                }
            return dict(row)


def update_score(user_id: int, points: int, correct: bool):
    get_user(user_id)
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE users SET
                    total_score     = total_score + %s,
                    total_answers   = total_answers + 1,
                    correct_answers = correct_answers + %s
                WHERE user_id = %s
            """,
                (points, 1 if correct else 0, user_id),
            )
        conn.commit()


def finish_game(user_id: int):
    get_user(user_id)
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE users SET games_played = games_played + 1 WHERE user_id = %s",
                (user_id,),
            )
        conn.commit()


def get_accuracy(user_id: int) -> float:
    stats = get_user(user_id)
    if stats["total_answers"] == 0:
        return 0.0
    return stats["correct_answers"] / stats["total_answers"] * 100


def get_leaderboard(limit: int = 10) -> list:
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT user_id, total_score, games_played, correct_answers, total_answers
                FROM users ORDER BY total_score DESC LIMIT %s
            """,
                (limit,),
            )
            return cur.fetchall()
