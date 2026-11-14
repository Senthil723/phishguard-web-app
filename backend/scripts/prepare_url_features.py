
import sys
from pathlib import Path

import pandas as pd
from sklearn.model_selection import GroupShuffleSplit

BASE_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BASE_DIR))

from app.services.url_features import FEATURE_NAMES, extract_url_features

INPUT_FILE = BASE_DIR / "data" / "processed" / "combined_urls.csv"
OUTPUT_DIR = BASE_DIR / "data" / "processed"

print("=" * 60)
print("PHISHGUARD - URL FEATURE EXTRACTION")
print("=" * 60)

# 1. Load combined dataset
df = pd.read_csv(INPUT_FILE)

print("\nLoaded records:", len(df))

# 2. Validate required columns
required_columns = {"url", "target", "hostname"}

missing_columns = required_columns - set(df.columns)

if missing_columns:
    raise ValueError(f"Missing columns: {missing_columns}")

if df[["url", "target", "hostname"]].isna().any().any():
    raise ValueError("Missing values found in required columns.")

# 3. Extract all 29 URL features
feature_rows = []

for index, url in enumerate(df["url"], start=1):
    try:
        features = extract_url_features(str(url))
        feature_rows.append(features)

    except Exception as error:
        raise ValueError(
            f"Feature extraction failed at row {index}: {url}\n{error}"
        )

    if index % 50000 == 0:
        print(f"Processed {index} URLs...")

features_df = pd.DataFrame(
    feature_rows,
    columns=FEATURE_NAMES
)

# 4. Combine features with ORIGINAL URL, target and hostname
prepared = pd.concat(
    [
        features_df,
        df[["url", "target", "hostname"]].reset_index(drop=True),
    ],
    axis=1,
)

# 5. Validate feature extraction
if len(prepared) != len(df):
    raise RuntimeError("Feature extraction record count mismatch.")

if prepared[FEATURE_NAMES].isna().any().any():
    raise RuntimeError("Missing feature values detected.")

# 6. Split by hostname: 80% training, 20% testing
splitter = GroupShuffleSplit(
    n_splits=1,
    test_size=0.20,
    random_state=42,
)

train_indices, test_indices = next(
    splitter.split(
        prepared[FEATURE_NAMES],
        prepared["target"],
        groups=prepared["hostname"],
    )
)

train_df = prepared.iloc[train_indices].copy()
test_df = prepared.iloc[test_indices].copy()

# 7. Validate hostname separation
train_hosts = set(train_df["hostname"])
test_hosts = set(test_df["hostname"])

shared_hosts = train_hosts.intersection(test_hosts)

if shared_hosts:
    raise RuntimeError(
        f"Hostname leakage detected: {len(shared_hosts)} shared hostnames."
    )

# 8. Save datasets
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

train_file = OUTPUT_DIR / "url_train.csv"
test_file = OUTPUT_DIR / "url_test.csv"

train_df.to_csv(train_file, index=False)
test_df.to_csv(test_file, index=False)

# 9. Display results
print("\n1. FEATURE EXTRACTION")
print("Features extracted:", len(FEATURE_NAMES))
print("Total feature records:", len(features_df))

print("\n2. DATASET SPLIT")
print("Training records:", len(train_df))
print("Testing records:", len(test_df))

print("\n3. CLASS DISTRIBUTION")

print("\nTraining:")
print(
    (train_df["target"].value_counts(normalize=True) * 100).round(2)
)

print("\nTesting:")
print(
    (test_df["target"].value_counts(normalize=True) * 100).round(2)
)

print("\n4. HOSTNAME VALIDATION")
print("Training hostnames:", len(train_hosts))
print("Testing hostnames:", len(test_hosts))
print("Shared hostnames:", len(shared_hosts))

# 10. Verify original URL is included
print("\n5. ORIGINAL URL VALIDATION")
print("Training URL column:", "url" in train_df.columns)
print("Testing URL column:", "url" in test_df.columns)

print("\n6. OUTPUT FILES")
print(train_file)
print(test_file)

print("\nFEATURE EXTRACTION AND SPLIT COMPLETED!")
print("=" * 60)
