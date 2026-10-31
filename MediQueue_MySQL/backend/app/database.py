import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

DATABASE_URL = os.getenv('DATABASE_URL')
if DATABASE_URL:
    engine = create_engine(DATABASE_URL, pool_pre_ping=True)
else:
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    sqlite_path = os.path.join(base_dir, 'mediqueue.db')
    DATABASE_URL = f'sqlite:///{sqlite_path}'
    engine = create_engine(DATABASE_URL, connect_args={'check_same_thread': False}, pool_pre_ping=True)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
