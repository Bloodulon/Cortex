import asyncio
import logging
import os

import database as db
import uvicorn
from aiogram import Bot, Dispatcher
from aiogram.fsm.storage.memory import MemoryStorage
from api import app as fastapi_app
from config import BOT_TOKEN
from handlers import router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)


async def main():
    pool = await db.get_pool()
    await db.init_db(pool)

    bot = Bot(token=BOT_TOKEN)
    dp = Dispatcher(storage=MemoryStorage(), db_pool=pool)
    dp.include_router(router)

    fastapi_app.state.db_pool = pool

    # Запускаем бота в фоне
    bot_task = asyncio.create_task(dp.start_polling(bot))

    # Запускаем FastAPI
    config = uvicorn.Config(
        app=fastapi_app,
        host="0.0.0.0",
        port=8000,
        log_level="info",
    )
    server = uvicorn.Server(config)

    try:
        await server.serve()
    except Exception as e:
        logging.error(f"Error: {e}")
    finally:
        bot_task.cancel()
        await pool.close()
        logging.info("Database pool closed.")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except (KeyboardInterrupt, SystemExit):
        logging.info("Bot stopped!")
