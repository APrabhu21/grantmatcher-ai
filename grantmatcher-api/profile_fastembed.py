
import os
import psutil
import torch
import gc
from sentence_transformers import SentenceTransformer
from fastembed import TextEmbedding

def get_mem():
    process = psutil.Process(os.getpid())
    return process.memory_info().rss / 1024 / 1024

def profile_fastembed():
    print(f"Initial Memory: {get_mem():.2f} MB")
    
    print("\n--- Testing sentence-transformers ---")
    torch.set_num_threads(1)
    torch.set_grad_enabled(False)
    model_st = SentenceTransformer("all-MiniLM-L6-v2", device="cpu")
    print(f"Memory after loading sentence-transformers: {get_mem():.2f} MB")
    
    # Run an encoding to see peak memory
    model_st.encode(["test sentence"])
    print(f"Memory after ST encoding: {get_mem():.2f} MB")
    
    del model_st
    gc.collect()
    print(f"Memory after deleting ST: {get_mem():.2f} MB")
    
    print("\n--- Testing fastembed ---")
    # fastembed should load the same model (MiniLM-L6-v2) by default or similar
    model_fe = TextEmbedding(model_name="BAAI/bge-small-en-v1.5")
    print(f"Memory after loading fastembed (bge-small): {get_mem():.2f} MB")
    
    # Run an encoding
    list(model_fe.embed(["test sentence"]))
    print(f"Memory after FE encoding: {get_mem():.2f} MB")
    
    del model_fe
    gc.collect()
    print(f"Memory after deleting FE: {get_mem():.2f} MB")

if __name__ == "__main__":
    profile_fastembed()
