import requests
import os
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

API_KEY = os.getenv('SAM_GOV_API_KEY')
if not API_KEY:
    print("WARNING: SAM_GOV_API_KEY not found in environment. Using DEMO_KEY?")
    API_KEY = "DEMO_KEY"
else:
    print(f"Using provided SAM_GOV_API_KEY: {API_KEY[:4]}...")

def test_url(url, name):
    print(f"\nTesting {name}: {url}")
    params = {
        "api_key": API_KEY,
        "limit": 1,
        "postedFrom": "01/01/2024",
        "active": "true"
    }
    try:
        response = requests.get(url, params=params)
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            print("SUCCESS! Keys:", list(response.json().keys()))
        else:
            print("Error:", response.text[:200])
    except Exception as e:
        print(f"Exception: {e}")

urls = [
    ("https://api.sam.gov/opportunities/v2/search", "V2 Search (No Prod)"),
    ("https://api.sam.gov/prod/opportunities/v2/search", "V2 Search (Prod)"),
    ("https://api.sam.gov/opportunities/v2/search?random=1", "V2 Search (Query Param Check)"),
]

for url, name in urls:
    test_url(url, name)
