
import json
import sys
from pathlib import Path

import joblib
import pandas as pd

from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import train_test_split

# --------------------------------------------------
# 1. Configure project paths
# --------------------------------------------------

BASE_DIR = Path(__file__).resolve().parents[1]

# Add backend directory to Python import path
sys.path.insert(0, str(BASE_DIR))

from app.services.url_features import (
    FEATURE_NAMES,
    extract_url_features,
)

DATASET_PATH = BASE_DIR / "data" / "raw" / "phiusiil_phishing_url.csv"

MODEL_DIR = BASE_DIR / "models"
MODEL_PATH = MODEL_DIR / "url_random_forest.joblib"
METRICS_PATH = MODEL_DIR / "url_model_metrics.json"


# --------------------------------------------------
# 2. Load and prepare dataset
# --------------------------------------------------

def main():

    print("=" * 60)
    print("PHISHGUARD - URL PHISHING MODEL TRAINING")
    print("=" * 60)

    print("\nLoading raw URL dataset...")

    if not DATASET_PATH.exists():
        raise FileNotFoundError(
            f"Dataset not found: {DATASET_PATH}"
        )

    df = pd.read_csv(
        DATASET_PATH,
        usecols=["URL", "label"]
    )

    df = df.dropna(subset=["URL", "label"])

    df["URL"] = df["URL"].astype(str).str.strip()

    df["label"] = pd.to_numeric(
        df["label"],
        errors="coerce"
    )

    df = df.dropna(subset=["label"])

    # PhiUSIIL mapping:
    # label 0 = legitimate
    # label 1 = phishing
    # Our target:
    # 0 = legitimate
    # 1 = phishing

    df["target"] = (df["label"] == 0).astype(int)

    # Remove duplicate URLs
    df = df.drop_duplicates(subset=["URL"])

    print(f"\nTotal unique URLs: {len(df)}")

    print("\nDataset distribution:")
    print(
        df["target"]
        .value_counts()
        .rename(index={
            0: "Legitimate",
            1: "Phishing"
        })
    )


    # --------------------------------------------------
    # 3. Extract URL features
    # --------------------------------------------------

    print("\nExtracting 29 URL features...")

    feature_rows = []

    total_urls = len(df)

    for index, url in enumerate(df["URL"], start=1):

        try:
            features = extract_url_features(url)

        except (ValueError, TypeError):
            features = {
                name: 0.0
                for name in FEATURE_NAMES
            }

        feature_rows.append(features)

        if index % 25000 == 0:
            print(
                f"Processed {index:,} / {total_urls:,} URLs"
            )

    X = pd.DataFrame(
        feature_rows,
        columns=FEATURE_NAMES
    )

    y = df["target"].reset_index(drop=True)

    print("\nFeature extraction completed.")

    print("Feature count:", len(FEATURE_NAMES))
    print("Dataset shape:", X.shape)


    # --------------------------------------------------
    # 4. Split dataset
    # --------------------------------------------------

    print("\nSplitting dataset into training and testing...")

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.20,
        random_state=42,
        stratify=y
    )

    print("Training records:", len(X_train))
    print("Testing records:", len(X_test))


    # --------------------------------------------------
    # 5. Train Random Forest model
    # --------------------------------------------------

    print("\nTraining Random Forest model...")

    model = RandomForestClassifier(
        n_estimators=250,
        max_features="sqrt",
        class_weight="balanced_subsample",
        random_state=42,
        n_jobs=-1
    )

    model.fit(X_train, y_train)

    print("\nModel training completed.")


    # --------------------------------------------------
    # 6. Evaluate model
    # --------------------------------------------------

    print("\nEvaluating model...")

    predictions = model.predict(X_test)

    probabilities = model.predict_proba(X_test)[:, 1]

    accuracy = accuracy_score(
        y_test,
        predictions
    )

    precision = precision_score(
        y_test,
        predictions,
        zero_division=0
    )

    recall = recall_score(
        y_test,
        predictions,
        zero_division=0
    )

    f1 = f1_score(
        y_test,
        predictions,
        zero_division=0
    )

    roc_auc = roc_auc_score(
        y_test,
        probabilities
    )

    matrix = confusion_matrix(
        y_test,
        predictions
    )

    report = classification_report(
        y_test,
        predictions,
        target_names=[
            "Legitimate",
            "Phishing"
        ],
        output_dict=True,
        zero_division=0
    )

    print("\n" + "=" * 60)
    print("MODEL EVALUATION RESULTS")
    print("=" * 60)

    print(f"Accuracy  : {accuracy:.4f}")
    print(f"Precision : {precision:.4f}")
    print(f"Recall    : {recall:.4f}")
    print(f"F1 Score  : {f1:.4f}")
    print(f"ROC-AUC   : {roc_auc:.4f}")

    print("\nConfusion Matrix:")
    print(matrix)

    print("\nClassification Report:")
    print(
        classification_report(
            y_test,
            predictions,
            target_names=[
                "Legitimate",
                "Phishing"
            ],
            zero_division=0
        )
    )


    # --------------------------------------------------
    # 7. Save trained model and metrics
    # --------------------------------------------------

    print("\nSaving trained model...")

    MODEL_DIR.mkdir(
        parents=True,
        exist_ok=True
    )

    joblib.dump(
        model,
        MODEL_PATH
    )

    metrics = {
        "model_name": "Random Forest",
        "feature_count": len(FEATURE_NAMES),
        "features": FEATURE_NAMES,
        "dataset": "PhiUSIIL Phishing URL Dataset",
        "total_records": int(len(df)),
        "training_records": int(len(X_train)),
        "testing_records": int(len(X_test)),
        "accuracy": float(accuracy),
        "precision": float(precision),
        "recall": float(recall),
        "f1_score": float(f1),
        "roc_auc": float(roc_auc),
        "confusion_matrix": matrix.tolist(),
        "classification_report": report
    }

    with open(
        METRICS_PATH,
        "w",
        encoding="utf-8"
    ) as file:

        json.dump(
            metrics,
            file,
            indent=4
        )

    print("\n" + "=" * 60)
    print("TRAINING COMPLETED SUCCESSFULLY")
    print("=" * 60)

    print("\nSaved files:")

    print(MODEL_PATH)
    print(METRICS_PATH)


# --------------------------------------------------
# 8. Run training
# --------------------------------------------------

if __name__ == "__main__":
    main()
