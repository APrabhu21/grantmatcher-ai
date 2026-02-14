from sqlalchemy import text
import os
from database import engine

def migrate():
    print("Running manual migration to add opportunity_number column...")
    with engine.connect() as conn:
        try:
            # Check if column exists
            result = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='grants' AND column_name='opportunity_number'"))
            row = result.fetchone()
            if not row:
                print("Adding opportunity_number column to grants table...")
                conn.execute(text("ALTER TABLE grants ADD COLUMN opportunity_number VARCHAR(100)"))
                conn.execute(text("CREATE INDEX ix_grants_opportunity_number ON grants (opportunity_number)"))
                conn.commit()
                print("Column added successfully.")
            else:
                print("Column opportunity_number already exists.")
        except Exception as e:
            print(f"Migration failed: {e}")

if __name__ == "__main__":
    migrate()
