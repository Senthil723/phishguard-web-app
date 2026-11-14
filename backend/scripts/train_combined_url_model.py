
import json
import sys
import time
from pathlib import Path

import joblib
import pandas as pd

from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    average_precision_score,
    confusion_matrix,
    classification_report,
)

BASE_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BASE_DIR))

from app.services.url_features import FEATURE_NAMES

DATA_DIR = BASE_DIR / "data" / "processed"
MODEL_DIR = BASE_DIR / "models"

TRAIN_FILE = DATA_DIR / "url_train.csv"
TEST_FILE = DATA_DIR / "url_test.csv"

MODEL_FILE = MODEL_DIR / "url_random_forest_grouped.joblib"
METRICS_FILE = MODEL_DIR / "url_model_grouped_metrics.json"
IMPORTANCE_FILE = MODEL_DIR / "url_feature_importance.csv"

print("=" * 65)
print("PHISHGUARD - COMBINED URL MODEL TRAINING")
print("=" * 65)

start_time = time.time()

# 1. Load datasets
print("\n1. LOADING DATASETS")

train_df = pd.read_csv(TRAIN_FILE)
test_df = pd.read_csv(TEST_FILE)

print("Training records:", len(train_df))
print("Testing records:", len(test_df))

# 2. Validate feature columns
missing_train = set(FEATURE_NAMES) - set(train_df.columns)
missing_test = set(FEATURE_NAMES) - set(test_df.columns)

if missing_train or missing_test:
    raise ValueError(
        f"Missing training features: {missing_train}\n"
        f"Missing testing features: {missing_test}"
    )

if train_df["target"].isna().any() or test_df["target"].isna().any():
    raise ValueError("Missing target labels detected.")

if set(train_df["target"].unique()) != {0, 1}:
    raise ValueError("Training dataset must contain both classes: 0 and 1.")

if set(test_df["target"].unique()) != {0, 1}:
    raise ValueError("Testing dataset must contain both classes: 0 and 1.")

# Verify hostname separation again
shared_hosts = set(train_df["hostname"]).intersection(
    set(test_df["hostname"])
)

if shared_hosts:
    raise ValueError(
        f"Hostname leakage detected: {len(shared_hosts)} shared hostnames."
    )

X_train = train_df[FEATURE_NAMES]
y_train = train_df["target"]

X_test = test_df[FEATURE_NAMES]
y_test = test_df["target"]

print("Feature count:", len(FEATURE_NAMES))
print("Hostname leakage: None")

# 3. Configure Random Forest
print("\n2. CONFIGURING RANDOM FOREST")

model = RandomForestClassifier(
    n_estimators=300,
    max_features="sqrt",
    class_weight="balanced_subsample",
    random_state=42,
    n_jobs=-1,
)

print("Algorithm: Random Forest")
print("Trees: 300")
print("Max features: sqrt")
print("Class weight: balanced_subsample")

# 4. Train
print("\n3. TRAINING MODEL")
print("Training started...")

model.fit(X_train, y_train)

print("Training completed!")

# 5. Predict on unseen test hostnames
print("\n4. EVALUATING MODEL")

y_pred = model.predict(X_test)
y_probability = model.predict_proba(X_test)[:, 1]

accuracy = accuracy_score(y_test, y_pred)
precision = precision_score(y_test, y_pred, zero_division=0)
recall = recall_score(y_test, y_pred, zero_division=0)
f1 = f1_score(y_test, y_pred, zero_division=0)
roc_auc = roc_auc_score(y_test, y_probability)
average_precision = average_precision_score(y_test, y_probability)

matrix = confusion_matrix(y_test, y_pred, labels=[0, 1])

print("\n5. MODEL PERFORMANCE")
print(f"Accuracy:          {accuracy:.4f}")
print(f"Precision:         {precision:.4f}")
print(f"Recall:            {recall:.4f}")
print(f"F1 Score:          {f1:.4f}")
print(f"ROC-AUC:           {roc_auc:.4f}")
print(f"Average Precision: {average_precision:.4f}")

print("\nConfusion Matrix")
print("Rows = Actual, Columns = Predicted")
print("Class 0 = Legitimate, Class 1 = Phishing")
print(matrix)

print("\nClassification Report")
print(
    classification_report(
        y_test,
        y_pred,
        target_names=["Legitimate", "Phishing"],
        zero_division=0,
    )
)

# 6. Save model and evaluation results
MODEL_DIR.mkdir(parents=True, exist_ok=True)

joblib.dump(model, MODEL_FILE)

metrics = {
    "model": "RandomForestClassifier",
    "dataset": "Combined PhiUSIIL + URL-Phish",
    "features": FEATURE_NAMES,
    "feature_count": len(FEATURE_NAMES),
    "training_records": int(len(train_df)),
    "testing_records": int(len(test_df)),
    "hostname_leakage": False,
    "accuracy": float(accuracy),
    "precision": float(precision),
    "recall": float(recall),
    "f1_score": float(f1),
    "roc_auc": float(roc_auc),
    "average_precision": float(average_precision),
    "confusion_matrix": matrix.tolist(),
    "class_mapping": {
        "0": "legitimate",
        "1": "phishing",
    },
}

with open(METRICS_FILE, "w", encoding="utf-8") as file:
    json.dump(metrics, file, indent=4)

# 7. Save feature importance
importance_df = pd.DataFrame({
    "feature": FEATURE_NAMES,
    "importance": model.feature_importances_,
}).sort_values(by="importance", ascending=False)

importance_df.to_csv(IMPORTANCE_FILE, index=False)

# 8. Display top features
print("\n6. TOP 10 IMPORTANT FEATURES")
print(importance_df.head(10).to_string(index=False))

elapsed = time.time() - start_time

print("\n7. SAVED FILES")
print("Model:", MODEL_FILE)
print("Metrics:", METRICS_FILE)
print("Feature importance:", IMPORTANCE_FILE)

print(f"\nTotal time: {elapsed / 60:.2f} minutes")

print("\nMODEL TRAINING AND EVALUATION COMPLETED!")
print("=" * 65)
