
from pathlib import Path

import numpy as np
import pandas as pd


# --------------------------------------------------
# 1. Define project paths
# --------------------------------------------------

PROJECT_ROOT = Path(__file__).resolve().parents[2]

DATASET_PATH = (
    PROJECT_ROOT
    / "dataset"
    / "CIC-URL2016"
    / "All.csv"
)

OUTPUT_DIR = PROJECT_ROOT / "backend" / "data"

OUTPUT_PATH = OUTPUT_DIR / "phishing_binary_cleaned.csv"


# --------------------------------------------------
# 2. Define dataset settings
# --------------------------------------------------

LABEL_COLUMN = "URL_Type_obf_Type"

SELECTED_LABELS = ["benign", "phishing"]

CONSTANT_FEATURES = [
    "ISIpAddressInDomainName"
]


# --------------------------------------------------
# 3. Load the original dataset
# --------------------------------------------------

def prepare_dataset():

    print("\n========== PHISHGUARD DATA PREPARATION ==========\n")

    if not DATASET_PATH.exists():
        raise FileNotFoundError(
            f"Dataset not found: {DATASET_PATH}"
        )

    print("Loading original dataset...")

    df = pd.read_csv(DATASET_PATH)

    print("Original records:", len(df))


    # --------------------------------------------------
    # 4. Select benign and phishing records
    # --------------------------------------------------

    if LABEL_COLUMN not in df.columns:
        raise ValueError(
            f"Label column '{LABEL_COLUMN}' not found."
        )

    df = df[
        df[LABEL_COLUMN].isin(SELECTED_LABELS)
    ].copy()

    print("\nSelected binary records:", len(df))

    print("\nClass distribution:")
    print(df[LABEL_COLUMN].value_counts())


    # --------------------------------------------------
    # 5. Remove exact duplicate records
    # --------------------------------------------------

    duplicate_count = df.duplicated().sum()

    print("\nDuplicate records found:", duplicate_count)

    df = df.drop_duplicates().copy()

    print("Records after removing duplicates:", len(df))


    # --------------------------------------------------
    # 6. Separate features and target
    # --------------------------------------------------

    X = df.drop(columns=[LABEL_COLUMN]).copy()

    y = df[LABEL_COLUMN].copy()


    # --------------------------------------------------
    # 7. Replace infinite values with missing values
    # --------------------------------------------------

    X = X.replace([np.inf, -np.inf], np.nan)

    print(
        "\nInfinite values remaining:",
        np.isinf(X.select_dtypes(include=np.number)).sum().sum()
    )


    # --------------------------------------------------
    # 8. Remove known constant feature
    # --------------------------------------------------

    existing_constant_features = [
        column
        for column in CONSTANT_FEATURES
        if column in X.columns
    ]

    X = X.drop(
        columns=existing_constant_features
    )

    print(
        "\nRemoved constant features:",
        existing_constant_features
    )


    # --------------------------------------------------
    # 9. Rebuild cleaned dataset
    # --------------------------------------------------

    cleaned_df = X.copy()

    cleaned_df[LABEL_COLUMN] = y


    # --------------------------------------------------
    # 10. Save cleaned dataset separately
    # --------------------------------------------------

    OUTPUT_DIR.mkdir(
        parents=True,
        exist_ok=True
    )

    cleaned_df.to_csv(
        OUTPUT_PATH,
        index=False
    )


    # --------------------------------------------------
    # 11. Print final summary
    # --------------------------------------------------

    print("\n========== PREPARATION SUMMARY ==========")

    print("Final records:", len(cleaned_df))

    print("Final features:", len(X.columns))

    print("\nFinal class distribution:")
    print(cleaned_df[LABEL_COLUMN].value_counts())

    print("\nMissing values:")
    print(
        cleaned_df.isnull().sum()
        .loc[lambda values: values > 0]
    )

    print("\nCleaned dataset saved to:")
    print(OUTPUT_PATH)

    print("\nDataset preparation completed successfully.")


if __name__ == "__main__":
    prepare_dataset()
