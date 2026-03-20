import json
import random
from pathlib import Path

from aiogram import Router, F
from aiogram.filters import CommandStart, Command
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.types import Message, CallbackQuery, InlineKeyboardMarkup, InlineKeyboardButton

import database as db
from config import POINTS, QUESTIONS_PER_ROUND

router = Router()

# ─── Загрузка вопросов ────────────────────────────────────────────────────────

QUESTIONS_PATH = Path(__file__).parent / "questions.json"
ALL_QUESTIONS: list[dict] = json.loads(QUESTIONS_PATH.read_text(encoding="utf-8"))

LEVEL_LABELS = {"easy": "🟢 Новичок", "medium": "🟡 Средний", "hard": "🔴 Эксперт"}


# ─── FSM состояния ────────────────────────────────────────────────────────────

class QuizState(StatesGroup):
    choosing_level = State()
    answering      = State()


# ─── Вспомогательные клавиатуры ──────────────────────────────────────────────

def main_menu_kb() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="🎮 Начать викторину", callback_data="start_quiz")],
        [InlineKeyboardButton(text="📊 Моя статистика",  callback_data="stats")],
        [InlineKeyboardButton(text="📖 Как играть",      callback_data="howto")],
    ])


def level_kb() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="🟢 Новичок (+10 очков)",  callback_data="level_easy")],
        [InlineKeyboardButton(text="🟡 Средний (+20 очков)",  callback_data="level_medium")],
        [InlineKeyboardButton(text="🔴 Эксперт (+40 очков)",  callback_data="level_hard")],
        [InlineKeyboardButton(text="🌈 Случайный микс",       callback_data="level_mix")],
        [InlineKeyboardButton(text="◀️ Назад",                callback_data="back_menu")],
    ])


def answer_kb(question: dict, hint_used: bool) -> InlineKeyboardMarkup:
    rows = []
    for i, opt in enumerate(question["options"]):
        rows.append([InlineKeyboardButton(text=opt, callback_data=f"answer_{i}")])
    extra = []
    if not hint_used:
        extra.append(InlineKeyboardButton(text="💡 Подсказка (-5 очков)", callback_data="hint"))
    extra.append(InlineKeyboardButton(text="🏳 Сдаться", callback_data="give_up"))
    rows.append(extra)
    return InlineKeyboardMarkup(inline_keyboard=rows)


def after_answer_kb() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="▶️ Следующий вопрос", callback_data="next_question")],
        [InlineKeyboardButton(text="🏳 Завершить игру",   callback_data="end_game")],
    ])


def back_to_menu_kb() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="🏠 Главное меню", callback_data="back_menu")],
    ])


# ─── Утилиты ──────────────────────────────────────────────────────────────────

def pick_questions(level: str) -> list[dict]:
    """Выбирает QUESTIONS_PER_ROUND вопросов для раунда."""
    if level == "mix":
        pool = ALL_QUESTIONS
    else:
        pool = [q for q in ALL_QUESTIONS if q["level"] == level]
    return random.sample(pool, min(QUESTIONS_PER_ROUND, len(pool)))


def format_question(q: dict, index: int, total: int, score: int) -> str:
    lvl = LEVEL_LABELS.get(q["level"], q["level"])
    return (
        f"<b>Вопрос {index}/{total}</b>  |  {lvl}  |  💰 Счёт: {score}\n\n"
        f"❓ {q['question']}"
    )


async def send_question(message_or_cb, state: FSMContext, edit: bool = False):
    """Отправляет (или редактирует) текущий вопрос."""
    data = await state.get_data()
    questions: list[dict] = data["questions"]
    idx: int = data["current_index"]
    score: int = data["score"]
    hint_used: bool = data.get("hint_used", False)

    q = questions[idx]
    text = format_question(q, idx + 1, len(questions), score)
    kb = answer_kb(q, hint_used)

    if edit and isinstance(message_or_cb, CallbackQuery):
        await message_or_cb.message.edit_text(text, reply_markup=kb, parse_mode="HTML")
    elif isinstance(message_or_cb, CallbackQuery):
        await message_or_cb.message.answer(text, reply_markup=kb, parse_mode="HTML")
    else:
        await message_or_cb.answer(text, reply_markup=kb, parse_mode="HTML")


# ─── /start ───────────────────────────────────────────────────────────────────

@router.message(CommandStart())
async def cmd_start(message: Message, state: FSMContext):
    await state.clear()
    name = message.from_user.first_name or "друг"
    text = (
        f"👋 Привет, <b>{name}</b>!\n\n"
        "Добро пожаловать в <b>AI Quiz Bot</b> 🤖\n"
        "Проверь свои знания об искусственном интеллекте!\n\n"
        "Выбери действие:"
    )
    await message.answer(text, reply_markup=main_menu_kb(), parse_mode="HTML")


# ─── Главное меню (кнопка «Назад») ───────────────────────────────────────────

@router.callback_query(F.data == "back_menu")
async def cb_back_menu(cb: CallbackQuery, state: FSMContext):
    await state.clear()
    await cb.message.edit_text(
        "🏠 <b>Главное меню</b>\n\nВыбери действие:",
        reply_markup=main_menu_kb(),
        parse_mode="HTML",
    )
    await cb.answer()


# ─── Как играть ───────────────────────────────────────────────────────────────

@router.callback_query(F.data == "howto")
async def cb_howto(cb: CallbackQuery):
    text = (
        "📖 <b>Как играть</b>\n\n"
        "1️⃣ Выбери уровень сложности\n"
        f"2️⃣ Ответь на {QUESTIONS_PER_ROUND} вопросов об AI/ML\n"
        "3️⃣ За каждый правильный ответ — очки:\n"
        "   🟢 Новичок: +10 очков\n"
        "   🟡 Средний: +20 очков\n"
        "   🔴 Эксперт: +40 очков\n\n"
        "💡 Можешь взять подсказку — но это стоит 5 очков\n"
        "📖 После каждого ответа — объяснение темы\n\n"
        "<i>Учись, набирай очки, становись AI-экспертом!</i>"
    )
    await cb.message.edit_text(text, reply_markup=back_to_menu_kb(), parse_mode="HTML")
    await cb.answer()


# ─── Статистика ───────────────────────────────────────────────────────────────

@router.callback_query(F.data == "stats")
async def cb_stats(cb: CallbackQuery, db_pool):
    user_id = cb.from_user.id
    # Используем await и передаем db_pool
    stats = await db.get_user(db_pool, user_id)
    accuracy = await db.get_accuracy(db_pool, user_id)

    score = stats["total_score"]
    if score < 50:
        rank = "🐣 Новичок"
    elif score < 200:
        rank = "🧑‍💻 Джуниор"
    elif score < 500:
        rank = "🚀 Мидл"
    elif score < 1000:
        rank = "🧠 Сеньор"
    else:
        rank = "🏆 AI Мастер"

    text = (
        f"📊 <b>Твоя статистика</b>\n\n"
        f"🏅 Ранг: {rank}\n"
        f"💰 Всего очков: <b>{score}</b>\n"
        f"🎮 Игр сыграно: <b>{stats['games_played']}</b>\n"
        f"✅ Правильных ответов: <b>{stats['correct_answers']}</b>\n"
        f"📝 Всего ответов: <b>{stats['total_answers']}</b>\n"
        f"🎯 Точность: <b>{accuracy:.1f}%</b>"
    )
    await cb.message.edit_text(text, reply_markup=back_to_menu_kb(), parse_mode="HTML")
    await cb.answer()


# ─── Выбор уровня ─────────────────────────────────────────────────────────────

@router.callback_query(F.data == "start_quiz")
async def cb_start_quiz(cb: CallbackQuery, state: FSMContext):
    await state.set_state(QuizState.choosing_level)
    await cb.message.edit_text(
        "🎯 <b>Выбери уровень сложности:</b>",
        reply_markup=level_kb(),
        parse_mode="HTML",
    )
    await cb.answer()


@router.callback_query(F.data.startswith("level_"))
async def cb_choose_level(cb: CallbackQuery, state: FSMContext):
    level = cb.data.replace("level_", "")  # easy / medium / hard / mix
    questions = pick_questions(level)

    await state.set_state(QuizState.answering)
    await state.update_data(
        questions=questions,
        current_index=0,
        score=0,
        level=level,
        hint_used=False,
        correct_in_round=0,
    )

    label = LEVEL_LABELS.get(level, "🌈 Микс")
    await cb.message.edit_text(
        f"✅ Уровень: <b>{label}</b>\n"
        f"📝 Вопросов в раунде: <b>{len(questions)}</b>\n\n"
        "Поехали! 🚀",
        parse_mode="HTML",
    )
    await cb.answer()
    await send_question(cb, state)


# ─── Подсказка ────────────────────────────────────────────────────────────────

@router.callback_query(QuizState.answering, F.data == "hint")
async def cb_hint(cb: CallbackQuery, state: FSMContext):
    data = await state.get_data()
    q = data["questions"][data["current_index"]]
    score = max(0, data["score"] - 5)
    await state.update_data(hint_used=True, score=score)

    await cb.answer(f"💡 {q['hint']}", show_alert=True)
    await send_question(cb, state, edit=True)


# ─── Сдаться ──────────────────────────────────────────────────────────────────

@router.callback_query(QuizState.answering, F.data == "give_up")
async def cb_give_up(cb: CallbackQuery, state: FSMContext, db_pool):
    data = await state.get_data()
    q = data["questions"][data["current_index"]]
    correct_option = q["options"][q["answer"]]

    # Используем await и передаем db_pool
    await db.update_score(db_pool, cb.from_user.id, 0, False)
    await db.finish_game(db_pool, cb.from_user.id)

    text = (
        f"🏳 <b>Игра завершена досрочно</b>\n\n"
        f"Правильный ответ был:\n✅ <b>{correct_option}</b>\n\n"
        f"📖 {q['explanation']}\n\n"
        f"💰 Итоговый счёт: <b>{data['score']}</b>"
    )
    await state.clear()
    await cb.message.edit_text(text, reply_markup=back_to_menu_kb(), parse_mode="HTML")
    await cb.answer()


# ─── Ответ на вопрос ──────────────────────────────────────────────────────────

@router.callback_query(QuizState.answering, F.data.startswith("answer_"))
async def cb_answer(cb: CallbackQuery, state: FSMContext, db_pool): 
    data = await state.get_data()
    questions: list[dict] = data["questions"]
    idx: int = data["current_index"]
    score: int = data["score"]
    level: str = data["level"]
    correct_in_round: int = data.get("correct_in_round", 0)

    q = questions[idx]
    chosen = int(cb.data.replace("answer_", ""))
    is_correct = (chosen == q["answer"])

    if is_correct:
        actual_level = q["level"] if level == "mix" else level
        earned = POINTS[actual_level]
        score += earned
        correct_in_round += 1
        header = f"✅ <b>Правильно!</b> +{earned} очков"
    else:
        earned = 0
        correct_option = q["options"][q["answer"]]
        header = f"❌ <b>Неверно.</b>\nПравильный ответ: <b>{correct_option}</b>"

    # Вызов к базе работает правильно
    await db.update_score(db_pool, cb.from_user.id, earned, is_correct)

    text = (
        f"{header}\n\n"
        f"📖 <b>Объяснение:</b>\n{q['explanation']}\n\n"
        f"💰 Счёт: <b>{score}</b>"
    )

    await state.update_data(
        score=score,
        hint_used=False,
        correct_in_round=correct_in_round,
    )

    is_last = (idx == len(questions) - 1)
    if is_last:
        kb = InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(text="📊 Результаты", callback_data="show_results")],
        ])
    else:
        kb = after_answer_kb()

    await cb.message.edit_text(text, reply_markup=kb, parse_mode="HTML")
    await cb.answer("✅ Верно!" if is_correct else "❌ Неверно")


# ─── Следующий вопрос ─────────────────────────────────────────────────────────

@router.callback_query(QuizState.answering, F.data == "next_question")
async def cb_next_question(cb: CallbackQuery, state: FSMContext):
    data = await state.get_data()
    await state.update_data(current_index=data["current_index"] + 1)
    await send_question(cb, state)
    await cb.answer()


# ─── Досрочное завершение из after_answer ─────────────────────────────────────

@router.callback_query(QuizState.answering, F.data == "end_game")
async def cb_end_game(cb: CallbackQuery, state: FSMContext, db_pool):
    data = await state.get_data()
    # Используем await и передаем db_pool
    await db.finish_game(db_pool, cb.from_user.id)
    score = data["score"]
    done = data["current_index"] + 1
    correct = data.get("correct_in_round", 0)

    text = (
        f"🏁 <b>Игра завершена досрочно</b>\n\n"
        f"✅ Правильных ответов: <b>{correct}/{done}</b>\n"
        f"💰 Итоговый счёт: <b>{score}</b>"
    )
    await state.clear()
    await cb.message.edit_text(text, reply_markup=back_to_menu_kb(), parse_mode="HTML")
    await cb.answer()


# ─── Итоги раунда ─────────────────────────────────────────────────────────────

@router.callback_query(F.data == "show_results")
async def cb_show_results(cb: CallbackQuery, state: FSMContext, db_pool):
    data = await state.get_data()
    score = data.get("score", 0)
    total = len(data.get("questions", []))
    correct = data.get("correct_in_round", 0)

    # Используем await и передаем db_pool
    await db.finish_game(db_pool, cb.from_user.id)
    accuracy = correct / total * 100 if total else 0

    if accuracy == 100:
        verdict = "🏆 Идеально! Ты настоящий AI-эксперт!"
    elif accuracy >= 80:
        verdict = "🎉 Отличный результат! Продолжай в том же духе!"
    elif accuracy >= 60:
        verdict = "👍 Неплохо! Есть куда расти."
    elif accuracy >= 40:
        verdict = "📚 Стоит повторить материал."
    else:
        verdict = "💪 Не сдавайся, практика — путь к мастерству!"

    text = (
        f"🎮 <b>Результаты раунда</b>\n\n"
        f"✅ Правильных ответов: <b>{correct}/{total}</b>\n"
        f"🎯 Точность: <b>{accuracy:.0f}%</b>\n"
        f"💰 Очков за раунд: <b>{score}</b>\n\n"
        f"{verdict}"
    )

    kb = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="🔄 Играть ещё",    callback_data="start_quiz")],
        [InlineKeyboardButton(text="📊 Статистика",    callback_data="stats")],
        [InlineKeyboardButton(text="🏠 Главное меню",  callback_data="back_menu")],
    ])

    await state.clear()
    await cb.message.edit_text(text, reply_markup=kb, parse_mode="HTML")
    await cb.answer()


# ─── /stats shortcut ──────────────────────────────────────────────────────────

@router.message(Command("stats"))
async def cmd_stats(message: Message, db_pool):
    user_id = message.from_user.id
    # Используем await и передаем db_pool
    stats = await db.get_user(db_pool, user_id)
    accuracy = await db.get_accuracy(db_pool, user_id)
    await message.answer(
        f"📊 Очки: <b>{stats['total_score']}</b> | "
        f"Игр: <b>{stats['games_played']}</b> | "
        f"Точность: <b>{accuracy:.1f}%</b>",
        parse_mode="HTML",
    )