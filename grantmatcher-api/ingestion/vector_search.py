import logging
import numpy as np
from typing import List, Tuple, Dict, Any, Optional
from sqlalchemy.orm import Session
from database import get_db
from models import Grant
from sentence_transformers import SentenceTransformer

logger = logging.getLogger(__name__)

class VectorSearch:
    """Simple vector search implementation using cosine similarity"""

    def __init__(self, model: Optional[SentenceTransformer] = None, model_name: str = "all-MiniLM-L6-v2"):
        if model:
            self.model = model
        else:
            logger.info(f"Loading embedding model: {model_name}")
            self.model = SentenceTransformer(model_name)
        self.model_name = model_name

    def encode_query(self, query: str) -> np.ndarray:
        """Encode a search query into an embedding"""
        return self.model.encode(query, convert_to_numpy=True)

    def cosine_similarity(self, a: np.ndarray, b: np.ndarray) -> float:
        """Calculate cosine similarity between two vectors with safety check"""
        norm_a = np.linalg.norm(a)
        norm_b = np.linalg.norm(b)
        if norm_a == 0 or norm_b == 0:
            return 0.0
        return float(np.dot(a, b) / (norm_a * norm_b))

    def search_grants(self, db: Session, query_embedding: np.ndarray, top_k: int = 10) -> List[Tuple[Grant, float]]:
        """Search for grants using vector similarity"""
        # Get all grants with embeddings
        grants = db.query(Grant).filter(
            Grant.embedding_data.isnot(None),
            Grant.status == 'active'
        ).all()

        logger.info(f"Searching through {len(grants)} grants")

        results = []
        for grant in grants:
            try:
                # Convert stored embedding back to numpy array
                grant_embedding = np.array(grant.embedding_data)

                # Calculate similarity
                similarity = self.cosine_similarity(query_embedding, grant_embedding)

                results.append((grant, similarity))

            except Exception as e:
                logger.warning(f"Error processing grant {grant.id}: {e}")
                continue

        # Sort by similarity (highest first)
        results.sort(key=lambda x: x[1], reverse=True)

        return results[:top_k]

    def search_by_text(self, db: Session, query: str, top_k: int = 10) -> List[Tuple[Grant, float]]:
        """Search grants by text query"""
        query_embedding = self.encode_query(query)
        return self.search_grants(db, query_embedding, top_k)

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