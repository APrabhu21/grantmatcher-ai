
import os
import psutil
import torch
import gc
from sentence_transformers import SentenceTransformer

def get_mem():
    process = psutil.Process(os.getpid())
    return process.memory_info().rss / 1024 / 1024

def profile_model():
    print(f"Memory before loading: {get_mem():.2f} MB")
    
    torch.set_num_threads(1)
    torch.set_grad_enabled(False)
    
    model = SentenceTransformer("all-MiniLM-L6-v2", device="cpu")
    print(f"Memory after loading all-MiniLM-L6-v2: {get_mem():.2f} MB")
    
    del model
    gc.collect()
    print(f"Memory after deleting L6: {get_mem():.2f} MB")
    
    model3 = SentenceTransformer("paraphrase-MiniLM-L3-v2", device="cpu")
    print(f"Memory after loading paraphrase-MiniLM-L3-v2: {get_mem():.2f} MB")
    
    del model3
    gc.collect()
    print(f"Memory after deleting L3: {get_mem():.2f} MB")

if __name__ == "__main__":
    profile_model()
