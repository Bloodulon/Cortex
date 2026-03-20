import asyncio
import logging
import uvicorn
from aiogram import Bot, Dispatcher
from aiogram.fsm.storage.memory import MemoryStorage

from config import BOT_TOKEN
from handlers import router
from api import app as fastapi_app
import database as db

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)

async def run_bot(dp: Dispatcher, bot: Bot):
    """Запуск Telegram бота"""
    logging.info("Starting Telegram Bot...")
    await dp.start_polling(bot)

async def run_api(app):
    """Запуск FastAPI сервера"""
    logging.info("Starting FastAPI Server...")
    config = uvicorn.Config(
        app=app,
        host="0.0.0.0",
        port=8000,
        log_level="info",
    )
    server = uvicorn.Server(config)
    await server.serve()

async def main():
    pool = await db.get_pool()

    await db.init_db(pool)

    bot = Bot(token=BOT_TOKEN)
    dp = Dispatcher(storage=MemoryStorage(), db_pool=pool)
    dp.include_router(router)

    fastapi_app.state.db_pool = pool

    try:
        await asyncio.gather(
            run_bot(dp, bot),
            run_api(fastapi_app)
        )
    except Exception as e:
        logging.error(f"Error in main loop: {e}")
    finally:
        await pool.close()
        logging.info("Database pool closed.")

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except (KeyboardInterrupt, SystemExit):
        logging.info("Bot stopped!")