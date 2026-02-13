from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import Base
import os

# Default to SQLite for development, PostgreSQL for production
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./grantmatcher.db")

if DATABASE_URL.startswith("postgresql"):
    # For Neon PostgreSQL, ensure SSL connection and use psycopg3
    if "sslmode" not in DATABASE_URL:
        DATABASE_URL += "?sslmode=require"
    # Explicitly use psycopg3 dialect
    if not DATABASE_URL.startswith("postgresql+psycopg"):
        DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg://", 1)

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {},
    pool_pre_ping=True,  # Verify connections before use
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create tables (only in development - in production, use Alembic migrations)
if not DATABASE_URL.startswith("sqlite"):  # Don't auto-create in production
    try:
        Base.metadata.create_all(bind=engine)
        print("Database tables created successfully")
    except Exception as e:
        print(f"Warning: Could not create tables: {e}")
else:
    Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()