import os
import sys

# Use the exact URL from populate_neon_db.py
NEON_DATABASE_URL = "postgresql://neondb_owner:npg_cjh9nGlNYxf1@ep-mute-wildflower-aihk8cmq-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
os.environ["DATABASE_URL"] = NEON_DATABASE_URL

from database import get_db, engine
from models import Grant

def verify():
    print(f"Connecting to: {engine.url.render_as_string(hide_password=True)}")
    db = next(get_db())
    try:
        total = db.query(Grant).count()
        active = db.query(Grant).filter(Grant.status == 'active').count()
        no_emb = db.query(Grant).filter(Grant.embedding_data == None).count()
        
        # Breakdown by source
        from sqlalchemy import func
        sources = db.query(Grant.source, func.count(Grant.id)).group_by(Grant.source).all()
        
        print(f"Total Grants: {total}")
        print(f"Active Grants: {active}")
        print(f"Grants w/o Embeddings: {no_emb}")
        print("Breakdown by Source:")
        for source, count in sources:
            print(f"  - {source}: {count}")
    finally:
        db.close()

if __name__ == "__main__":
    verify()
