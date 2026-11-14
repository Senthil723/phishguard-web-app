
from pathlib import Path
import pandas as pd

# Dataset location
BASE_DIR = Path(__file__).resolve().parents[1]

DATASET_PATH = BASE_DIR / "data" / "phishing_binary_cleaned.csv"

LABEL_COLUMN = "URL_Type_obf_Type"


def main():

    print("\n========== PHISHGUARD FEATURE INSPECTION ==========")

    # Check whether dataset exists
    if not DATASET_PATH.exists():
        raise FileNotFoundError(
            f"Dataset not found: {DATASET_PATH}"
        )

    # Load dataset
    df = pd.read_csv(DATASET_PATH)

    # Separate features and target
    X = df.drop(columns=[LABEL_COLUMN])

    print(f"\nTotal records: {len(df)}")
    print(f"Total features: {len(X.columns)}")

    print("\n========== FEATURE DETAILS ==========\n")

    feature_details = []

    for feature in X.columns:

        column = X[feature]

        feature_details.append({
            "Feature": feature,
            "Data_Type": str(column.dtype),
            "Missing_Values": column.isna().sum(),
            "Missing_Percentage": round(
                column.isna().mean() * 100, 2
            ),
            "Unique_Values": column.nunique(),
            "Minimum": column.min(),
            "Maximum": column.max()
        })

    result = pd.DataFrame(feature_details)

    # Display all 78 features
    print(
        result.to_string(
            index=False,
            max_rows=None
        )
    )

    # Save inspection report
    output_path = BASE_DIR / "models" / "feature_inspection.csv"

    output_path.parent.mkdir(
        parents=True,
        exist_ok=True
    )

    result.to_csv(output_path, index=False)

    print("\n========== INSPECTION COMPLETED ==========")
    print(f"Features inspected: {len(result)}")
    print(f"Report saved to: {output_path}")


if __name__ == "__main__":
    main()
