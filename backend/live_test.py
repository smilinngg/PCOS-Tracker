import urllib.request, json

def test(label, payload):
    d = json.dumps(payload).encode()
    req = urllib.request.Request(
        "http://127.0.0.1:8000/predict",
        data=d,
        headers={"Content-Type": "application/json"}
    )
    try:
        resp = json.loads(urllib.request.urlopen(req).read().decode())
        risk = resp.get("risk_percentage", "ERROR")
        level = resp.get("risk_level", resp.get("error", "?"))
        print(f"  {label:<38} {risk}%  ->  {level}")
    except Exception as e:
        print(f"  {label:<38} FAILED: {e}")

print("\n=== LIVE API TESTS ===\n")
test("Healthy young, no symptoms",   {"age":20,"weight":52,"bmi":19.0,"cycle_length":26,"weight_gain":0,"hair_growth":0,"skin_darkening":0,"hair_loss":0,"pimples":0,"fast_food":0,"exercise":1})
test("Normal BMI, regular cycle",    {"age":25,"weight":58,"bmi":21.5,"cycle_length":28,"weight_gain":0,"hair_growth":0,"skin_darkening":0,"hair_loss":0,"pimples":0,"fast_food":0,"exercise":0})
test("Moderate symptoms + normal",   {"age":23,"weight":65,"bmi":24.0,"cycle_length":30,"weight_gain":1,"hair_growth":0,"skin_darkening":1,"hair_loss":0,"pimples":1,"fast_food":1,"exercise":0})
test("All symptoms + irregular",     {"age":24,"weight":72,"bmi":27.0,"cycle_length":45,"weight_gain":1,"hair_growth":1,"skin_darkening":1,"hair_loss":1,"pimples":1,"fast_food":1,"exercise":0})
test("Shravani actual data",         {"age":21,"weight":56,"bmi":20.6,"cycle_length":28,"weight_gain":0,"hair_growth":0,"skin_darkening":1,"hair_loss":0,"pimples":0,"fast_food":0,"exercise":0})
print()
