import pandas as pd
import numpy as np
import joblib
from sklearn.model_selection import train_test_split, cross_val_score, StratifiedKFold
from sklearn.metrics import (
    accuracy_score, classification_report, confusion_matrix,
    roc_auc_score, f1_score, precision_score, recall_score
)

def evaluate():
    print("=" * 60)
    print("    PCOS PREDICTION MODEL — ACCURACY EVALUATION")
    print("=" * 60)

    # ── Load & Prepare Data (same as train_model.py) ──────────────────
    df = pd.read_excel("../PCOS_data_without_infertility.xlsx", sheet_name="Full_new")
    df.columns = df.columns.str.strip()

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
    data["cycle_irregular"] = (data["Cycle length(days)"] > 35).astype(int)
    all_features = features + ["cycle_irregular"]

    X = data[all_features]
    y = data["PCOS (Y/N)"]

    print(f"\nDataset:  {len(y)} total samples")
    print(f"  PCOS+:  {int(y.sum())} ({y.mean()*100:.1f}%)")
    print(f"  PCOS-:  {int((y==0).sum())} ({(1-y.mean())*100:.1f}%)")

    # ── Load saved model ───────────────────────────────────────────────
    artifact = joblib.load("pcos_model.pkl")
    model = artifact["model"]
    print(f"\nLoaded: pcos_model.pkl  (features: {artifact['features']})")

    # ── Hold-out test split (same seed as training) ────────────────────
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    y_pred = model.predict(X_test)
    y_prob = model.predict_proba(X_test)[:, 1]

    # ── Core Metrics ───────────────────────────────────────────────────
    acc      = accuracy_score(y_test, y_pred)
    f1       = f1_score(y_test, y_pred)
    precision= precision_score(y_test, y_pred)
    recall   = recall_score(y_test, y_pred)
    roc_auc  = roc_auc_score(y_test, y_prob)

    print("\n" + "─" * 60)
    print("  HOLD-OUT TEST SET RESULTS  (80/20 split, stratified)")
    print("─" * 60)
    print(f"  Accuracy :  {acc*100:.2f}%")
    print(f"  Precision:  {precision*100:.2f}%")
    print(f"  Recall   :  {recall*100:.2f}%")
    print(f"  F1 Score :  {f1*100:.2f}%")
    print(f"  ROC-AUC  :  {roc_auc:.4f}")

    # ── Classification Report ──────────────────────────────────────────
    print("\n" + "─" * 60)
    print("  CLASSIFICATION REPORT")
    print("─" * 60)
    print(classification_report(y_test, y_pred, target_names=["No PCOS", "PCOS"]))

    # ── Confusion Matrix ───────────────────────────────────────────────
    cm = confusion_matrix(y_test, y_pred)
    tn, fp, fn, tp = cm.ravel()
    print("─" * 60)
    print("  CONFUSION MATRIX")
    print("─" * 60)
    print(f"                  Predicted NO   Predicted YES")
    print(f"  Actual NO    :     {tn:>5}           {fp:>5}")
    print(f"  Actual YES   :     {fn:>5}           {tp:>5}")
    print(f"\n  True Positives (PCOS correctly caught):  {tp}")
    print(f"  False Negatives (PCOS missed):           {fn}")
    print(f"  False Positives (healthy mis-flagged):   {fp}")
    print(f"  True Negatives (healthy correctly clear):{tn}")

    # ── Cross-Validation (5-fold) ──────────────────────────────────────
    print("\n" + "─" * 60)
    print("  5-FOLD CROSS-VALIDATION  (on full dataset)")
    print("─" * 60)
    skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    cv_acc = cross_val_score(model, X, y, cv=skf, scoring='accuracy')
    cv_f1  = cross_val_score(model, X, y, cv=skf, scoring='f1')
    cv_auc = cross_val_score(model, X, y, cv=skf, scoring='roc_auc')
    print(f"  CV Accuracy :  {cv_acc.mean()*100:.2f}% ± {cv_acc.std()*100:.2f}%  {[f'{v*100:.1f}%' for v in cv_acc]}")
    print(f"  CV F1 Score :  {cv_f1.mean()*100:.2f}% ± {cv_f1.std()*100:.2f}%")
    print(f"  CV ROC-AUC  :  {cv_auc.mean():.4f} ± {cv_auc.std():.4f}")

    # ── Feature Importance ─────────────────────────────────────────────
    print("\n" + "─" * 60)
    print("  FEATURE IMPORTANCES (sorted by impact)")
    print("─" * 60)
    for feat, imp in sorted(zip(artifact['features'], model.feature_importances_), key=lambda x: -x[1]):
        bar = "█" * int(imp * 40)
        print(f"  {feat:<35} {imp*100:5.1f}%  {bar}")

    print("\n" + "=" * 60)
    print("  SUMMARY")
    print("=" * 60)
    print(f"  ✅ Test Accuracy  : {acc*100:.2f}%")
    print(f"  ✅ CV Accuracy    : {cv_acc.mean()*100:.2f}% (5-fold)")
    print(f"  ✅ ROC-AUC Score  : {roc_auc:.4f}")
    print(f"  ✅ F1 Score       : {f1*100:.2f}%")
    print("=" * 60)

if __name__ == "__main__":
    evaluate()
