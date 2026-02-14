
import os
import sys
# Set DB URL
os.environ["DATABASE_URL"] = "postgresql://neondb_owner:npg_cjh9nGlNYxf1@ep-mute-wildflower-aihk8cmq-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

from database import get_db
from ingestion.vector_search import VectorSearch
import numpy as np

def test():
    db = next(get_db())
    try:
        print("Initializing VectorSearch...")
        search = VectorSearch()
        
        query = "health education programs for children"
        print(f"Encoding query: {query}")
        emb = search.encode_query(query)
        print(f"Query shape: {emb.shape}")
        
        print("Performing search...")
        results = search.search_by_text(db, query, top_k=5)
        
        print(f"Found {len(results)} results")
        for grant, score in results:
            print(f"Grant: {grant.title[:40]}, Score: {score}")
            if np.isnan(score):
                print("!!! WARNING: Score is NaN")
                
    except Exception as e:
        print(f"CRASH: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    test()
