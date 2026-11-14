
import sys
from pathlib import Path
from urllib.parse import urlsplit

import joblib
import pandas as pd

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

MODEL_FILE = MODEL_DIR / "url_random_forest_grouped.joblib"
TEST_FILE = DATA_DIR / "url_test.csv"

print("=" * 65)
print("PHISHGUARD - FINAL HTTP / HTTPS PERFORMANCE AUDIT")
print("=" * 65)

# 1. Load model and test dataset
model = joblib.load(MODEL_FILE)
test_df = pd.read_csv(TEST_FILE)

# 2. Validate dataset
required_columns = FEATURE_NAMES + [
    "url",
    "target",
    "hostname",
]

missing = set(required_columns) - set(test_df.columns)

if missing:
    raise ValueError(f"Missing columns: {missing}")

if test_df["url"].isna().any():
    raise ValueError("Missing original URLs detected.")

if len(test_df) != 69204:
    raise ValueError(
        f"Expected 69204 records, found {len(test_df)}"
    )

# 3. Predict using the 29 features only
X_test = test_df[FEATURE_NAMES]
y_test = test_df["target"]

predictions = model.predict(X_test)

test_df["prediction"] = predictions

# 4. Extract protocol
test_df["protocol"] = test_df["url"].apply(
    lambda value: urlsplit(str(value)).scheme.lower()
)

# 5. Validate protocol counts
print("\n1. PROTOCOL DISTRIBUTION")

print(
    test_df["protocol"]
    .value_counts()
    .to_string()
)

print("\nTotal test records:", len(test_df))

if test_df["protocol"].isin(["http", "https"]).sum() != len(test_df):
    raise ValueError("Unexpected or unsupported URL protocol found.")

# 6. Evaluate HTTP and HTTPS separately
for protocol in ["http", "https"]:

    subset = test_df[
        test_df["protocol"] == protocol
    ]

    actual = subset["target"]
    predicted = subset["prediction"]

    print("\n" + "=" * 45)
    print(f"{protocol.upper()} RESULTS")
    print("=" * 45)

    print("Total URLs:", len(subset))
    print("Legitimate:", int((actual == 0).sum()))
    print("Phishing:", int((actual == 1).sum()))

    print(
        f"Accuracy:  {accuracy_score(actual, predicted):.4f}"
    )

    print(
        f"Precision: {precision_score(actual, predicted, zero_division=0):.4f}"
    )

    print(
        f"Recall:    {recall_score(actual, predicted, zero_division=0):.4f}"
    )

    print(
        f"F1 Score:  {f1_score(actual, predicted, zero_division=0):.4f}"
    )

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

print("\n" + "=" * 65)
print("HTTP / HTTPS AUDIT COMPLETED SUCCESSFULLY")
print("=" * 65)
