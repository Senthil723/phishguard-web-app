
from pathlib import Path

import joblib
import pandas as pd


# --------------------------------------------------
# 1. Project paths
# --------------------------------------------------

PROJECT_ROOT = Path(__file__).resolve().parents[2]

MODEL_PATH = (
    PROJECT_ROOT
    / "backend"
    / "models"
    / "random_forest.joblib"
)

DATASET_PATH = (
    PROJECT_ROOT
    / "backend"
    / "data"
    / "phishing_binary_cleaned.csv"
)

OUTPUT_DIR = PROJECT_ROOT / "backend" / "models"

OUTPUT_PATH = OUTPUT_DIR / "feature_importance.csv"


# --------------------------------------------------
# 2. Load trained model and dataset
# --------------------------------------------------

def main():

    print("\n========== RANDOM FOREST FEATURE IMPORTANCE ==========\n")

    if not MODEL_PATH.exists():
        raise FileNotFoundError(
            f"Model not found: {MODEL_PATH}"
        )

    if not DATASET_PATH.exists():
        raise FileNotFoundError(
            f"Dataset not found: {DATASET_PATH}"
        )

    model = joblib.load(MODEL_PATH)

    df = pd.read_csv(DATASET_PATH)

    X = df.drop(columns=["URL_Type_obf_Type"])

    # --------------------------------------------------
    # 3. Get feature names after imputation
    # --------------------------------------------------

    imputer = model.named_steps["imputer"]

    classifier = model.named_steps["classifier"]

    feature_names = imputer.get_feature_names_out(
        X.columns
    )

    importances = classifier.feature_importances_

    if len(feature_names) != len(importances):
        raise ValueError(
            "Feature names and importance values do not match."
        )

    # --------------------------------------------------
    # 4. Create importance table
    # --------------------------------------------------

    importance_df = pd.DataFrame({
        "feature": feature_names,
        "importance": importances,
    })

    importance_df = importance_df.sort_values(
        by="importance",
        ascending=False,
    ).reset_index(drop=True)

    # --------------------------------------------------
    # 5. Display top 20 features
    # --------------------------------------------------

    print("TOP 20 IMPORTANT FEATURES\n")

    print(
        importance_df.head(20).to_string(
            index=False,
            formatters={
                "importance": "{:.6f}".format
            },
        )
    )

    # --------------------------------------------------
    # 6. Save all feature importance values
    # --------------------------------------------------

    OUTPUT_DIR.mkdir(
        parents=True,
        exist_ok=True,
    )

    importance_df.to_csv(
        OUTPUT_PATH,
        index=False,
    )

    print("\nTotal features evaluated:", len(importance_df))

    print("\nFeature importance saved to:")

    print(OUTPUT_PATH)

    print("\nFeature importance analysis completed.")


if __name__ == "__main__":
    main()
