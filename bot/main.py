import asyncio
import logging

import asyncpg
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


async def run_bot(pool):
    bot = Bot(token=BOT_TOKEN)
    dp = Dispatcher(storage=MemoryStorage())
    dp["db_pool"] = pool
    dp.include_router(router)
    await dp.start_polling(bot)


async def run_api():
    config = uvicorn.Config(
        app=fastapi_app,
        host="0.0.0.0",
        port=8000,
        log_level="info",
    )
    server = uvicorn.Server(config)
    await server.serve()


async def main():
    pool = await asyncpg.create_pool(dsn=db.DATABASE_URL)
    await db.init_db(pool)
    fastapi_app.state.db_pool = pool

    await asyncio.gather(
        run_bot(pool),
        run_api(),
    )


if __name__ == "__main__":
    asyncio.run(main())