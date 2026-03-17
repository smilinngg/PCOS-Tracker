import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import accuracy_score, classification_report
import joblib

def train_model():
    print("Loading data...")
    df = pd.read_excel("../PCOS_data_without_infertility.xlsx", sheet_name="Full_new")
    
    # Clean up column names by stripping whitespace
    df.columns = df.columns.str.strip()

    # Core features — use exact column names from dataset
    features = [
        "Age (yrs)",
        "Weight (Kg)",
        "BMI",
        "Cycle length(days)",
        "Weight gain(Y/N)",
        "hair growth(Y/N)",
        "Skin darkening (Y/N)",
        "Hair loss(Y/N)",
        "Pimples(Y/N)",
        "Fast food (Y/N)",
    ]

    data = df[features + ["PCOS (Y/N)"]].copy()

    # Convert Y/N → 1/0
    yn_cols = [
        "PCOS (Y/N)", "Weight gain(Y/N)", "hair growth(Y/N)",
        "Skin darkening (Y/N)", "Hair loss(Y/N)", "Pimples(Y/N)",
        "Fast food (Y/N)"
    ]
    for col in yn_cols:
        if col in data.columns:
            data[col] = data[col].replace({'Y': 1, 'N': 0, 'Yes': 1, 'No': 0})

    data = data.apply(pd.to_numeric, errors='coerce')
    data.fillna(data.mean(), inplace=True)

    # Derived feature
    data["cycle_irregular"] = (data["Cycle length(days)"] > 35).astype(int)
    all_features = features + ["cycle_irregular"]

    X = data[all_features]
    y = data["PCOS (Y/N)"]

    print(f"\nDataset: {len(y)} rows | PCOS+: {int(y.sum())} ({y.mean()*100:.1f}%) | PCOS-: {int(y.value_counts().get(0, 0))} ({(1-y.mean())*100:.1f}%)")

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    # Train WITHOUT class_weight='balanced' — let the model learn natural distribution
    # Use min_samples_leaf to prevent overfitting to PCOS-positive minority
    model = RandomForestClassifier(
        n_estimators=200,
        max_depth=8,
        min_samples_leaf=5,
        random_state=42
    )
    model.fit(X_train, y_train)

    pred = model.predict(X_test)
    acc = accuracy_score(y_test, pred)
    print(f"\nTest accuracy: {acc:.4f}")
    print(f"\n{classification_report(y_test, pred, target_names=['No PCOS', 'PCOS'])}")

    # Cross-validation
    cv_scores = cross_val_score(model, X, y, cv=5, scoring='accuracy')
    print(f"5-fold CV accuracy: {cv_scores.mean():.4f} ± {cv_scores.std():.4f}")

    # Feature importances
    print("\n=== FEATURE IMPORTANCES ===")
    for feat, imp in sorted(zip(all_features, model.feature_importances_), key=lambda x: -x[1]):
        bar = "#" * int(imp * 50)
        print(f"{feat:<35} {imp:.4f}  {bar}")

    # Sanity check low-risk predictions
    print("\n=== SANITY CHECK ===")
    test_cases = [
        ("Healthy young (all clear)", [20, 52, 19.0, 26, 0, 0, 0, 0, 0, 0, 0]),
        ("Normal BMI, regular cycle",  [25, 58, 21.5, 28, 0, 0, 0, 0, 0, 0, 0]),
        ("All PCOS symptoms + irreg",  [24, 72, 27.0, 45, 1, 1, 1, 1, 1, 1, 1]),
        ("High BMI only",              [28, 80, 30.0, 28, 0, 0, 0, 0, 0, 0, 0]),
    ]
    for label, vals in test_cases:
        # Create a DataFrame row with all features including cycle_irregular
        test_data = pd.DataFrame([vals], columns=all_features)
        prob = model.predict_proba(test_data)[0][1]
        cycle = vals[3]
        if cycle > 35:
            prob = min(1.0, prob + 0.10)
        prob = max(0.0, min(1.0, prob))
        pct = float(f"{float(prob) * 100:.1f}")
        level = "Low Risk" if pct < 30 else ("Moderate" if pct < 60 else "High Risk")
        print(f"  {label:<38} {pct:>6.1f}%  {level}")

    # Save artifact
    artifact = {
        "model": model,
        "features": all_features
    }
    joblib.dump(artifact, "pcos_model.pkl")
    print(f"\n✅ Saved model with {len(all_features)} features to pcos_model.pkl")

if __name__ == "__main__":
    train_model()