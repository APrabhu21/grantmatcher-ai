
import os
import psutil
import gc

def get_mem():
    process = psutil.Process(os.getpid())
    return process.memory_info().rss / 1024 / 1024

print(f"Initial Memory: {get_mem():.2f} MB")

import fastapi
import sqlalchemy
import pydantic
import psycopg2
import uvicorn
import numpy

print(f"Memory after core imports: {get_mem():.2f} MB")

try:
    from fastembed import TextEmbedding
    print(f"Memory after fastembed import: {get_mem():.2f} MB")
    
    model = TextEmbedding(model_name="BAAI/bge-small-en-v1.5")
    print(f"Memory after fastembed model load: {get_mem():.2f} MB")
    
    # Run one test embed to see peak
    list(model.embed(["test search query"]))
    print(f"Memory after first inference: {get_mem():.2f} MB")
    
except ImportError:
    print("fastembed not found")

if __name__ == "__main__":
    pass
