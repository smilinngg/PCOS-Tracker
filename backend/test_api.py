import requests
import json

emails = ["test3@t", "shravanibhalerao219@gmail.com"]

for email in emails:
    print(f"Testing for {email}")
    try:
        res = requests.get(f"http://127.0.0.1:8000/cycle-info/{email}")
        print(json.dumps(res.json(), indent=2))
    except Exception as e:
        print(e)
