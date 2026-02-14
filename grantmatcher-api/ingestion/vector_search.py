import logging
import numpy as np
from typing import List, Tuple, Dict, Any, Optional
from sqlalchemy.orm import Session
from database import get_db
from models import Grant
import os
import gc
from fastembed import TextEmbedding

logger = logging.getLogger(__name__)

class VectorSearch:
    """Simple vector search implementation using cosine similarity"""

    def __init__(self, model: Optional[TextEmbedding] = None, model_name: str = "BAAI/bge-small-en-v1.5"):
        if model:
            self.model = model
        else:
            logger.info(f"Loading embedding model: {model_name} (FastEmbed mode)")
            self.model = TextEmbedding(model_name=model_name)
            gc.collect()
        self.model_name = model_name

    def encode_query(self, query: str) -> np.ndarray:
        """Encode a search query into an embedding"""
        # fastembed.embed returns a generator, we take the first result
        embeddings = list(self.model.embed([query]))
        return np.array(embeddings[0])

    def cosine_similarity(self, a: np.ndarray, b: np.ndarray) -> float:
        """Calculate cosine similarity between two vectors with safety check"""
        norm_a = np.linalg.norm(a)
        norm_b = np.linalg.norm(b)
        if norm_a == 0 or norm_b == 0:
            return 0.0
        return float(np.dot(a, b) / (norm_a * norm_b))

    def search_grants(self, db: Session, query_embedding: np.ndarray, user_profile: Optional[Dict[str, Any]] = None, top_k: int = 10) -> List[Tuple[Grant, float]]:
        """
        Search for grants using vector similarity + hybrid categorical scoring.
        Memory-efficient: Only fetches necessary columns for scoring, then fetches full objects for top results.
        """
        from sqlalchemy import text
        
        # Get necessary columns for scoring to save memory
        # We fetch ID, embedding, and metadata for boosts
        grants_data = db.execute(text(
            "SELECT id, embedding_data, eligible_applicant_types, focus_areas, agency "
            "FROM grants WHERE embedding_data IS NOT NULL AND status = 'active'"
        )).fetchall()

        logger.info(f"Hybrid searching through {len(grants_data)} grants")

        scored_results = []
        user_type = user_profile.get('organization_type') if user_profile else None
        user_focus = set(user_profile.get('focus_areas', [])) if user_profile else set()

        for row in grants_data:
            try:
                grant_id, embedding_json, eligibility, grant_focus, agency = row
                
                if not embedding_json:
                    continue
                    
                grant_embedding = np.array(embedding_json)
                
                # 1. Semantic Score (Base)
                base_score = self.cosine_similarity(query_embedding, grant_embedding)
                
                # 2. Hybrid Boosts
                boost = 0.0
                
                # Eligibility Boost (e.g., +0.1)
                if user_type and eligibility:
                    # Handle both list and string formats from DB
                    import json
                    try:
                        elig_list = eligibility if isinstance(eligibility, list) else json.loads(eligibility)
                        if user_type in elig_list:
                            boost += 0.1
                    except:
                        if user_type in str(eligibility):
                            boost += 0.05
                
                # Focus Area Match (+0.05 per match, max 0.15)
                if user_focus and grant_focus:
                    try:
                        focus_list = set(grant_focus if isinstance(grant_focus, list) else json.loads(grant_focus))
                        overlap = user_focus.intersection(focus_list)
                        boost += min(len(overlap) * 0.05, 0.15)
                    except:
                        pass
                
                final_score = base_score + boost
                scored_results.append((grant_id, final_score))

            except Exception as e:
                logger.warning(f"Error scoring grant {row[0]}: {e}")
                continue

        # Sort by final score (highest first)
        scored_results.sort(key=lambda x: x[1], reverse=True)
        top_scored = scored_results[:top_k]

        # Fetch full Grant objects only for the top results to save memory
        final_results = []
        for grant_id, score in top_scored:
            grant = db.query(Grant).get(grant_id)
            if grant:
                final_results.append((grant, score))

        return final_results

    def search_by_text(self, db: Session, query: str, user_profile: Optional[Dict[str, Any]] = None, top_k: int = 10) -> List[Tuple[Grant, float]]:
        """Search grants by text query with hybrid boosting"""
        query_embedding = self.encode_query(query)
        return self.search_grants(db, query_embedding, user_profile, top_k)

def test_vector_search():
    """Test the vector search functionality"""
    db = next(get_db())
    try:
        search = VectorSearch()

        # Test queries
        test_queries = [
            "health education programs",
            "environmental justice",
            "STEM education for kids",
            "rural economic development",
            "arts and culture funding"
        ]

        for query in test_queries:
            print(f"\n=== Search: '{query}' ===")
            results = search.search_by_text(db, query, top_k=3)

            for grant, score in results:
                print(".3f")

    finally:
        db.close()

if __name__ == "__main__":
    test_vector_search()