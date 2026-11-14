
import sys
from pathlib import Path

import joblib
import pandas as pd

from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    confusion_matrix,
    classification_report,
)

BASE_DIR = Path(__file__).resolve().parents[1]

sys.path.insert(0, str(BASE_DIR))

from app.services.url_features import FEATURE_NAMES

DATA_DIR = BASE_DIR / "data" / "processed"
MODEL_DIR = BASE_DIR / "models"

MODEL_FILE = MODEL_DIR / "url_random_forest_grouped.joblib"
TEST_FILE = DATA_DIR / "url_test.csv"
COMBINED_FILE = DATA_DIR / "combined_urls.csv"

EXPECTED_TEST_ROWS = 69204

print("=" * 70)
print("PHISHGUARD - SOURCE-WISE MODEL PERFORMANCE AUDIT")
print("=" * 70)

# 1. Load model and datasets
model = joblib.load(MODEL_FILE)

test_df = pd.read_csv(TEST_FILE)
combined_df = pd.read_csv(
    COMBINED_FILE,
    usecols=["url", "target", "source"],
)

# 2. Validate required columns
required_test_columns = FEATURE_NAMES + [
    "url",
    "target",
    "hostname",
]

missing_test = set(required_test_columns) - set(test_df.columns)

if missing_test:
    raise ValueError(
        f"Missing test columns: {missing_test}"
    )

if not {"url", "target", "source"}.issubset(combined_df.columns):
    raise ValueError("Combined dataset is missing required columns.")

if len(test_df) != EXPECTED_TEST_ROWS:
    raise ValueError(
        f"Expected {EXPECTED_TEST_ROWS} test rows, "
        f"found {len(test_df)}"
    )

if combined_df["url"].duplicated().any():
    raise ValueError(
        "Duplicate URLs found in combined dataset."
    )

# 3. Match each test URL to its original source
source_lookup = combined_df[
    ["url", "target", "source"]
].copy()

audit_df = test_df.merge(
    source_lookup,
    on="url",
    how="left",
    suffixes=("_test", "_source"),
    validate="many_to_one",
    indicator=True,
)

if len(audit_df) != EXPECTED_TEST_ROWS:
    raise ValueError(
        "Record count changed during source matching."
    )

if (audit_df["_merge"] != "both").any():
    missing_count = int(
        (audit_df["_merge"] != "both").sum()
    )
    raise ValueError(
        f"{missing_count} test URLs could not be matched."
    )

# 4. Verify labels
if not (
    audit_df["target_test"] == audit_df["target_source"]
).all():
    raise ValueError(
        "Target labels do not match between datasets."
    )

audit_df["target"] = audit_df["target_test"]

# 5. Generate predictions using only model features
X_test = audit_df[FEATURE_NAMES]
y_test = audit_df["target"]

audit_df["prediction"] = model.predict(X_test)

# 6. Display source distribution
print("\n1. SOURCE DISTRIBUTION")

print(
    audit_df["source"]
    .value_counts()
    .to_string()
)

print("\nTotal test records:", len(audit_df))

# 7. Evaluate each dataset separately
for source in sorted(audit_df["source"].dropna().unique()):

    subset = audit_df[
        audit_df["source"] == source
    ]

    actual = subset["target"]
    predicted = subset["prediction"]

    print("\n" + "=" * 55)
    print(f"SOURCE: {source}")
    print("=" * 55)

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

    print("\nClassification Report:")
    print(
        classification_report(
            actual,
            predicted,
            labels=[0, 1],
            target_names=["Legitimate", "Phishing"],
            zero_division=0,
        )
    )

# 8. Final validation
print("\n" + "=" * 70)
print("SOURCE-WISE AUDIT COMPLETED SUCCESSFULLY")
print("Original test records:", EXPECTED_TEST_ROWS)
print("Audited test records:", len(audit_df))
print("Unmatched URLs:", int((audit_df["_merge"] != "both").sum()))
print("=" * 70)
