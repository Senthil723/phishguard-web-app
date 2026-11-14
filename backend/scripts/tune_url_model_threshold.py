
import sys
import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import GroupShuffleSplit
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    confusion_matrix,
)

BASE_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BASE_DIR))

from app.services.url_features import FEATURE_NAMES

DATA_DIR = BASE_DIR / "data" / "processed"
MODEL_DIR = BASE_DIR / "models"

TRAIN_FILE = DATA_DIR / "url_train.csv"
TEST_FILE = DATA_DIR / "url_test.csv"
COMBINED_FILE = DATA_DIR / "combined_urls.csv"

NEW_MODEL_FILE = MODEL_DIR / "url_random_forest_tuned.joblib"
METRICS_FILE = MODEL_DIR / "url_model_tuned_metrics.json"

MIN_URL_PHISH_PRECISION = 0.80
MIN_OVERALL_PRECISION = 0.80

print("=" * 70)
print("PHISHGUARD - URL MODEL THRESHOLD TUNING")
print("=" * 70)

# --------------------------------------------------
# 1. Load datasets
# --------------------------------------------------

train_df = pd.read_csv(TRAIN_FILE)
test_df = pd.read_csv(TEST_FILE)

combined_df = pd.read_csv(
    COMBINED_FILE,
    usecols=["url", "target", "source"],
)

if combined_df["url"].duplicated().any():
    raise ValueError("Duplicate URLs found in combined dataset.")

required_columns = FEATURE_NAMES + [
    "url",
    "target",
    "hostname",
]

for name, df in [
    ("Training", train_df),
    ("Testing", test_df),
]:
    missing = set(required_columns) - set(df.columns)

    if missing:
        raise ValueError(
            f"{name} dataset is missing columns: {missing}"
        )

# --------------------------------------------------
# 2. Attach source labels using exact URL matching
# --------------------------------------------------

source_lookup = combined_df[
    ["url", "target", "source"]
]

def attach_source(df, dataset_name):

    result = df.merge(
        source_lookup,
        on="url",
        how="left",
        suffixes=("_original", "_source"),
        validate="many_to_one",
        indicator=True,
    )

    if len(result) != len(df):
        raise ValueError(
            f"{dataset_name}: record count changed during matching."
        )

    if (result["_merge"] != "both").any():
        raise ValueError(
            f"{dataset_name}: some URLs could not be matched."
        )

    if not (
        result["target_original"] == result["target_source"]
    ).all():
        raise ValueError(
            f"{dataset_name}: target labels do not match."
        )

    result["target"] = result["target_original"]

    return result.drop(
        columns=[
            "target_original",
            "target_source",
            "_merge",
        ]
    )

train_df = attach_source(train_df, "Training")
test_df = attach_source(test_df, "Testing")

print("\nTraining records:", len(train_df))
print("Testing records:", len(test_df))

print("\nTraining source distribution:")
print(train_df["source"].value_counts().to_string())

# --------------------------------------------------
# 3. Create a hostname-grouped validation split
# --------------------------------------------------

splitter = GroupShuffleSplit(
    n_splits=1,
    test_size=0.20,
    random_state=42,
)

fit_indices, validation_indices = next(
    splitter.split(
        train_df,
        groups=train_df["hostname"],
    )
)

fit_df = train_df.iloc[fit_indices].copy()
validation_df = train_df.iloc[validation_indices].copy()

shared_hosts = set(fit_df["hostname"]) & set(
    validation_df["hostname"]
)

if shared_hosts:
    raise ValueError(
        "Hostname leakage detected in validation split."
    )

print("\nValidation split:")
print("Model fitting records:", len(fit_df))
print("Validation records:", len(validation_df))
print("Shared hostnames:", len(shared_hosts))

# --------------------------------------------------
# 4. Train a temporary model for threshold selection
# --------------------------------------------------

X_fit = fit_df[FEATURE_NAMES]
y_fit = fit_df["target"]

X_validation = validation_df[FEATURE_NAMES]
y_validation = validation_df["target"]

print("\nTraining validation model...")

validation_model = RandomForestClassifier(
    n_estimators=300,
    max_features="sqrt",
    class_weight="balanced_subsample",
    random_state=42,
    n_jobs=-1,
)

validation_model.fit(X_fit, y_fit)

phishing_index = list(
    validation_model.classes_
).index(1)

validation_probabilities = validation_model.predict_proba(
    X_validation
)[:, phishing_index]

validation_df["phishing_probability"] = (
    validation_probabilities
)

# --------------------------------------------------
# 5. Find a suitable threshold
# --------------------------------------------------

url_phish_validation = validation_df[
    validation_df["source"] == "URL-Phish"
]

if url_phish_validation.empty:
    raise ValueError(
        "No URL-Phish records found in validation data."
    )

candidates = []

for threshold in np.arange(0.05, 0.951, 0.01):

    predictions = (
        validation_df["phishing_probability"] >= threshold
    ).astype(int)

    overall_precision = precision_score(
        y_validation,
        predictions,
        zero_division=0,
    )

    overall_recall = recall_score(
        y_validation,
        predictions,
        zero_division=0,
    )

    overall_f1 = f1_score(
        y_validation,
        predictions,
        zero_division=0,
    )

    source_predictions = (
        url_phish_validation["phishing_probability"]
        >= threshold
    ).astype(int)

    source_precision = precision_score(
        url_phish_validation["target"],
        source_predictions,
        zero_division=0,
    )

    source_recall = recall_score(
        url_phish_validation["target"],
        source_predictions,
        zero_division=0,
    )

    source_f1 = f1_score(
        url_phish_validation["target"],
        source_predictions,
        zero_division=0,
    )

    candidates.append({
        "threshold": round(float(threshold), 2),
        "overall_precision": float(overall_precision),
        "overall_recall": float(overall_recall),
        "overall_f1": float(overall_f1),
        "url_phish_precision": float(source_precision),
        "url_phish_recall": float(source_recall),
        "url_phish_f1": float(source_f1),
    })

eligible = [
    item for item in candidates
    if (
        item["url_phish_precision"] >= MIN_URL_PHISH_PRECISION
        and item["overall_precision"] >= MIN_OVERALL_PRECISION
    )
]

if eligible:

    # Maximize URL-Phish phishing recall while meeting
    # both validation precision requirements.
    selected = max(
        eligible,
        key=lambda item: (
            item["url_phish_recall"],
            item["overall_f1"],
        ),
    )

    print("\nA threshold meeting both precision targets was found.")

else:

    # If no candidate meets the targets, choose the best
    # URL-Phish F1 candidate and clearly report the limitation.
    selected = max(
        candidates,
        key=lambda item: (
            item["url_phish_f1"],
            item["url_phish_precision"],
        ),
    )

    print(
        "\nWARNING: No threshold met both precision targets."
    )

threshold = selected["threshold"]

print("\n" + "=" * 55)
print("SELECTED VALIDATION THRESHOLD")
print("=" * 55)

for key, value in selected.items():
    print(f"{key}: {value:.4f}" if isinstance(value, float)
          else f"{key}: {value}")

# --------------------------------------------------
# 6. Train final candidate on all training records
# --------------------------------------------------

print("\nTraining final candidate on all training records...")

final_model = RandomForestClassifier(
    n_estimators=300,
    max_features="sqrt",
    class_weight="balanced_subsample",
    random_state=42,
    n_jobs=-1,
)

final_model.fit(
    train_df[FEATURE_NAMES],
    train_df["target"],
)

# --------------------------------------------------
# 7. Evaluate once on the untouched test dataset
# --------------------------------------------------

test_probabilities = final_model.predict_proba(
    test_df[FEATURE_NAMES]
)[:, list(final_model.classes_).index(1)]

test_predictions = (
    test_probabilities >= threshold
).astype(int)

test_df["prediction"] = test_predictions

def report_metrics(actual, predicted, title):

    print("\n" + "=" * 55)
    print(title)
    print("=" * 55)

    print("Total URLs:", len(actual))
    print("Accuracy:", round(
        accuracy_score(actual, predicted), 4
    ))
    print("Phishing precision:", round(
        precision_score(actual, predicted, zero_division=0), 4
    ))
    print("Phishing recall:", round(
        recall_score(actual, predicted, zero_division=0), 4
    ))
    print("Phishing F1:", round(
        f1_score(actual, predicted, zero_division=0), 4
    ))

    print("\nConfusion Matrix:")
    print("Rows = Actual, Columns = Predicted")
    print("Class 0 = Legitimate, Class 1 = Phishing")

    print(
        confusion_matrix(
            actual,
            predicted,
            labels=[0, 1],
        )
    )

report_metrics(
    test_df["target"],
    test_df["prediction"],
    "OVERALL TEST PERFORMANCE",
)

for source in sorted(test_df["source"].unique()):

    subset = test_df[
        test_df["source"] == source
    ]

    report_metrics(
        subset["target"],
        subset["prediction"],
        f"TEST PERFORMANCE - {source}",
    )

# --------------------------------------------------
# 8. Save the new candidate separately
# --------------------------------------------------

MODEL_DIR.mkdir(parents=True, exist_ok=True)

joblib.dump(final_model, NEW_MODEL_FILE)

metadata = {
    "model_file": NEW_MODEL_FILE.name,
    "feature_count": len(FEATURE_NAMES),
    "features": FEATURE_NAMES,
    "positive_class": 1,
    "prediction_threshold": threshold,
    "threshold_selection": selected,
    "minimum_url_phish_precision": MIN_URL_PHISH_PRECISION,
    "minimum_overall_precision": MIN_OVERALL_PRECISION,
    "validation_records": len(validation_df),
    "training_records": len(train_df),
}

with open(METRICS_FILE, "w", encoding="utf-8") as file:
    json.dump(metadata, file, indent=4)

print("\n" + "=" * 70)
print("THRESHOLD TUNING COMPLETED")
print("=" * 70)

print("New model:", NEW_MODEL_FILE)
print("Threshold metadata:", METRICS_FILE)
print("Selected threshold:", threshold)

print("\nOriginal model was not modified.")
print("Original test set was not used for threshold selection.")
