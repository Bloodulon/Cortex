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

async def run_bot():
    bot = Bot(token=BOT_TOKEN)
    dp = Dispatcher(storage=MemoryStorage())
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
    db.init_db()
    await asyncio.gather(run_bot(), run_api())

if __name__ == "__main__":
    asyncio.run(main())