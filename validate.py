import pandas as pd
from sentence_transformers import SentenceTransformer
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity

# Load model
model = SentenceTransformer("all-MiniLM-L6-v2")

# Load grants
df = pd.read_csv('grants.csv')
grant_descriptions = df['description'].tolist()
grant_titles = df['title'].tolist()

# Encode grants
grant_embeddings = model.encode(grant_descriptions)

# User profiles
users = [
    {
        "name": "Clean Water Alliance (Nonprofit)",
        "text": "Clean Water Alliance protects and restores freshwater ecosystems in the southeastern United States through community-based monitoring, advocacy, and education. We work with rural communities to address contamination from agricultural runoff and aging infrastructure, with a focus on environmental justice in underserved communities.\n\nFocus areas: water quality, environmental justice, community education, rural communities"
    },
    {
        "name": "Dr. Jessica Chen (Researcher)",
        "text": "My lab studies the molecular mechanisms of antimicrobial resistance in Gram-negative bacteria, with a focus on computational approaches to predict resistance phenotypes from genomic data. We combine machine learning with experimental microbiology to develop rapid diagnostic tools for hospital infection control. Current projects include protein language model-based AMR prediction and real-time outbreak genomic surveillance.\n\nFocus areas: antimicrobial resistance, computational biology, genomics, infection control, machine learning"
    },
    {
        "name": "AgriTech AI (Startup)",
        "text": "AgriTech AI develops computer vision and satellite imagery analysis tools for early crop disease detection in smallholder farming communities. Our mobile-first platform combines Sentinel-2 satellite data with weather forecasting to provide 7-day disease risk predictions via SMS alerts.\n\nFocus areas: precision agriculture, computer vision, satellite imagery, crop disease, food security"
    }
]

# Encode users
user_embeddings = [model.encode(user['text']) for user in users]

# For each user, compute similarities, get top 10
for i, user in enumerate(users):
    sims = cosine_similarity([user_embeddings[i]], grant_embeddings)[0]
    top_indices = np.argsort(sims)[::-1][:10]
    
    print(f"\nTop 10 matches for {user['name']}:")
    for rank, idx in enumerate(top_indices, 1):
        score = sims[idx]
        title = grant_titles[idx]
        desc = grant_descriptions[idx][:100] + "..." if len(grant_descriptions[idx]) > 100 else grant_descriptions[idx]
        print(f"{rank}. {title} (Score: {score:.3f})")
        print(f"   {desc}")
        print()