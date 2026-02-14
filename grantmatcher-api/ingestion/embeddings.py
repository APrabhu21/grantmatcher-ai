import logging
from sentence_transformers import SentenceTransformer
from sqlalchemy.orm import Session
from database import get_db
from models import Grant
import numpy as np
import os
import torch
import gc
from typing import Dict

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class GrantEmbedder:
    """Generate embeddings for grant descriptions"""

    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        logger.info(f"Loading embedding model: {model_name} (CPU mode)")
        
        # Optimize Torch for memory
        torch.set_num_threads(1)
        torch.set_grad_enabled(False)
        os.environ["OMP_NUM_THREADS"] = "1"
        os.environ["MKL_NUM_THREADS"] = "1"
        
        self.model = SentenceTransformer(model_name, device="cpu")
        gc.collect()
        self.model_name = model_name

    def generate_grant_embedding(self, grant: Grant) -> np.ndarray:
        """Generate embedding for a single grant"""
        # Combine title and description for richer embedding
        text = f"{grant.title} {grant.description}"

        # Add focus areas if available
        if grant.focus_areas:
            focus_text = " ".join(grant.focus_areas)
            text += f" {focus_text}"

        # Generate embedding
        embedding = self.model.encode(text, convert_to_numpy=True)
        return embedding

    def embed_all_grants(self, db: Session, batch_size: int = 10) -> Dict[str, int]:
        """Generate embeddings for all grants without embeddings"""
        logger.info("Starting grant embedding generation")

        # Get grants that don't have embeddings yet
        grants_to_embed = db.query(Grant).filter(
            Grant.status == 'active'
        ).all()

        logger.info(f"Found {len(grants_to_embed)} grants to embed")

        stats = {
            'processed': 0,
            'embedded': 0,
            'skipped': 0,
            'errors': 0
        }

        for i in range(0, len(grants_to_embed), batch_size):
            batch = grants_to_embed[i:i + batch_size]
            batch_texts = []

            # Prepare batch texts
            for grant in batch:
                text = f"{grant.title} {grant.description}"
                if grant.focus_areas:
                    focus_text = " ".join(grant.focus_areas)
                    text += f" {focus_text}"
                batch_texts.append(text)

            try:
                # Generate embeddings for batch
                embeddings = self.model.encode(batch_texts, convert_to_numpy=True, show_progress_bar=False)

                # Update grants with embeddings
                for j, grant in enumerate(batch):
                    try:
                        # For now, we'll store embeddings as JSON in the database
                        # In production, you'd want to use a proper vector database
                        embedding_list = embeddings[j].tolist()

                        # Store embedding in a way that can be retrieved later
                        # Since SQLite doesn't support vector types, we'll use JSON
                        # In a real implementation, you'd upsert to Qdrant here
                        grant.embedding_data = embedding_list
                        grant.embedding_model = self.model_name

                        stats['embedded'] += 1
                        logger.info(f"Embedded grant: {grant.title[:50]}...")

                    except Exception as e:
                        logger.error(f"Error embedding grant {grant.id}: {e}")
                        stats['errors'] += 1
                        continue

                # Commit batch
                db.commit()
                gc.collect() # Clean up after each batch
                stats['processed'] += len(batch)
                logger.info(f"Processed batch {i//batch_size + 1}, total processed: {stats['processed']}")

            except Exception as e:
                logger.error(f"Error processing batch {i//batch_size + 1}: {e}")
                stats['errors'] += len(batch)
                continue

        logger.info(f"Embedding generation completed: {stats}")
        return stats

def run_embedding_generation():
    """Standalone function to generate embeddings"""
    db = next(get_db())
    try:
        embedder = GrantEmbedder()
        stats = embedder.embed_all_grants(db)
        print(f"Embedding generation completed: {stats}")
    finally:
        db.close()

if __name__ == "__main__":
    run_embedding_generation()