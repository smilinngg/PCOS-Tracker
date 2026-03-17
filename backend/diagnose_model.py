import joblib
import numpy as np

artifact = joblib.load("pcos_model.pkl")
model = artifact["model"]
features = artifact["features"]

print("Features used:", features)
print()

# Test cases: should obviously be LOW risk
test_cases = [
    {"label": "Young healthy (no symptoms)", "values": [20, 50, 18.5, 28, 0, 0, 0, 0, 0, 0, 1, 0]},  # normal cycle, no symptoms, exercises
    {"label": "Normal BMI short cycle",       "values": [25, 55, 20.0, 25, 0, 0, 0, 0, 0, 0, 1, 0]},
    {"label": "Shravani data (no symptoms)",  "values": [21, 56, 20.6, 28, 0, 0, 0, 0, 0, 0, 0, 0]},
    {"label": "All symptoms present",         "values": [21, 56, 20.6, 45, 1, 1, 1, 1, 1, 1, 0, 1]},
]

print(f"{'Label':<40} {'Raw Prob':>10} {'Risk %':>10} {'Level':<15}")
print("-" * 80)
for t in test_cases:
    vals = t["values"]
    feature_arr = np.array([vals])
    prob = model.predict_proba(feature_arr)[0][1]
    cycle = float(vals[3])
    if cycle > 35:
        prob = min(1.0, float(prob) + 0.10)
    risk_pct = float(f"{float(prob) * 100:.2f}")
    level = "Low Risk" if risk_pct < 30 else ("Moderate" if risk_pct < 60 else "High Risk")
    print(f"{t['label']:<40} {prob:>10.4f} {risk_pct:>10.2f}% {level:<15}")

print("\n--- Feature Importances ---")
for feat, imp in sorted(zip(features, model.feature_importances_), key=lambda x: -x[1]):
    bar = "█" * int(imp * 40)
    print(f"{feat:<35} {imp:.4f} {bar}")

print("\n--- Training data distribution ---")
import pandas as pd
df = pd.read_excel("../PCOS_data_without_infertility.xlsx", sheet_name="Full_new")
pcos_col = df["PCOS (Y/N)"].replace({'Y': 1, 'N': 0})
pcos_col = pd.to_numeric(pcos_col, errors='coerce')
print("PCOS=1 (positive):", int(pcos_col.sum()))
print("PCOS=0 (negative):", int(pcos_col.value_counts().get(0, 0)))
print(f"Ratio positive: {float(pcos_col.mean()):.3f}")
