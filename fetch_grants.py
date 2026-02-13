import requests
import json

# Use the new API
url = "https://api.grants.gov/v1/api/search2"
payload = {
    "keyword": "",
    "rows": 200  # Get 200
}
headers = {"Content-Type": "application/json"}
response = requests.post(url, data=json.dumps(payload), headers=headers)
if response.status_code == 200:
    data = response.json()
    if 'data' in data and 'oppHits' in data['data']:
        grants = data['data']['oppHits']
    else:
        print("No oppHits")
        grants = []
else:
    print(f"Error: {response.status_code}")
    grants = []

# Process
grant_list = []
for g in grants[:200]:
    title = g.get('title', '')
    description = title  # Use title as description for now
    agency = g.get('agency', '')
    eligibility = ""  # Not available
    amount = ""  # Not available
    deadline = g.get('closeDate', '')
    number = g.get('number', '')
    url = f"https://www.grants.gov/search-results-detail/{number}" if number else ''
    
    grant_list.append({
        'title': title,
        'description': description,
        'agency': agency,
        'eligibility': eligibility,
        'amount': amount,
        'deadline': deadline,
        'url': url
    })

# Save to CSV
import pandas as pd
df = pd.DataFrame(grant_list)
df.to_csv('grants.csv', index=False)
print(f"Saved {len(grant_list)} grants to grants.csv")