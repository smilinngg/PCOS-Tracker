import requests

url = "http://127.0.0.1:8000/predict"
payload = {
    "age": 25,
    "weight": 60,
    "bmi": 24,
    "cycle_length": 28,
    "weight_gain": 0,
    "hair_growth": 0,
    "skin_darkening": 0,
    "hair_loss": 0,
    "pimples": 0,
    "fast_food": 0,
    "email": "test@test.com"
}
response = requests.post(url, json=payload)
print(response.status_code)
print(response.json())
