import joblib

artifact = joblib.load("pcos_model.pkl")
MODEL_FEATURES = artifact["features"]

with open("features_bytes.txt", "w") as f:
    for i, feature in enumerate(MODEL_FEATURES):
        f.write(f"[{i}] {feature.encode('utf-8')}\n")
