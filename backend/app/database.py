import os

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql+asyncpg://user:pass@localhost:5432/urlshortener",
)

# asyncpg does not recognise the "sslmode" query-string parameter that
# libpq / psycopg2 use.  Translate it to the equivalent "ssl" parameter.
DATABASE_URL = DATABASE_URL.replace("sslmode=", "ssl=")

engine = create_async_engine(DATABASE_URL, echo=False)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def get_db():
    async with async_session() as session:
        yield session
