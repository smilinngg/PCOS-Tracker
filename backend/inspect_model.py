import joblib

artifact = joblib.load("pcos_model.pkl")
MODEL_FEATURES = artifact["features"]

with open("features.txt", "w", encoding="utf-8") as f:
    for i, feature in enumerate(MODEL_FEATURES):
        f.write(f"[{i}] {repr(feature)}\n")
