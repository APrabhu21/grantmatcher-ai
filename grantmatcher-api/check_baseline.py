
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

print(f"Memory after core imports: {get_mem():.2f} MB")

import numpy
print(f"Memory after numpy: {get_mem():.2f} MB")

try:
    import torch
    print(f"Memory after torch: {get_mem():.2f} MB")
except ImportError:
    print("Torch not found")

try:
    from fastembed import TextEmbedding
    print(f"Memory after fastembed import: {get_mem():.2f} MB")
    model = TextEmbedding(model_name="BAAI/bge-small-en-v1.5")
    print(f"Memory after fastembed model load: {get_mem():.2f} MB")
except ImportError:
    print("fastembed not found")

if __name__ == "__main__":
    pass
