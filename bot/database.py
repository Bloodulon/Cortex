from typing import TypedDict

class UserStats(TypedDict):
    total_score: int
    games_played: int
    correct_answers: int
    total_answers: int


# { user_id: UserStats }
_storage: dict[int, UserStats] = {}


def get_user(user_id: int) -> UserStats:
    """Возвращает статистику пользователя, создаёт запись если нет."""
    if user_id not in _storage:
        _storage[user_id] = {
            "total_score": 0,
            "games_played": 0,
            "correct_answers": 0,
            "total_answers": 0,
        }
    return _storage[user_id]


def update_score(user_id: int, points: int, correct: bool) -> None:
    """Обновляет счёт и статистику после ответа."""
    stats = get_user(user_id)
    stats["total_score"] += points
    stats["total_answers"] += 1
    if correct:
        stats["correct_answers"] += 1


def finish_game(user_id: int) -> None:
    """Фиксирует завершение игры."""
    stats = get_user(user_id)
    stats["games_played"] += 1


def get_accuracy(user_id: int) -> float:
    """Возвращает процент правильных ответов."""
    stats = get_user(user_id)
    if stats["total_answers"] == 0:
        return 0.0
    return stats["correct_answers"] / stats["total_answers"] * 100