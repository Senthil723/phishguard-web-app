
from pathlib import Path
import json

import joblib
import pandas as pd

from sklearn.ensemble import RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
)
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler


# --------------------------------------------------
# 1. Project paths and settings
# --------------------------------------------------

PROJECT_ROOT = Path(__file__).resolve().parents[2]

DATASET_PATH = (
    PROJECT_ROOT
    / "backend"
    / "data"
    / "phishing_binary_cleaned.csv"
)

MODEL_DIR = PROJECT_ROOT / "backend" / "models"
METRICS_PATH = MODEL_DIR / "baseline_metrics.json"

LABEL_COLUMN = "URL_Type_obf_Type"

RANDOM_STATE = 42
TEST_SIZE = 0.20


# --------------------------------------------------
# 2. Load cleaned dataset
# --------------------------------------------------

def load_dataset():

    print("\n========== LOADING DATASET ==========\n")

    if not DATASET_PATH.exists():
        raise FileNotFoundError(
            f"Cleaned dataset not found: {DATASET_PATH}\n"
            "Run prepare_dataset.py first."
        )

    df = pd.read_csv(DATASET_PATH)

    if LABEL_COLUMN not in df.columns:
        raise ValueError("Target label column is missing.")

    X = df.drop(columns=[LABEL_COLUMN])
    y = df[LABEL_COLUMN]

    print("Dataset records:", len(df))
    print("Number of features:", X.shape[1])

    print("\nClass distribution:")
    print(y.value_counts())

    return X, y


# --------------------------------------------------
# 3. Split training and testing data
# --------------------------------------------------

def split_dataset(X, y):

    print("\n========== SPLITTING DATA ==========\n")

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=TEST_SIZE,
        random_state=RANDOM_STATE,
        stratify=y,
    )

    print("Training records:", len(X_train))
    print("Testing records:", len(X_test))

    print("\nTraining class distribution:")
    print(y_train.value_counts())

    print("\nTesting class distribution:")
    print(y_test.value_counts())

    return X_train, X_test, y_train, y_test


# --------------------------------------------------
# 4. Define machine learning models
# --------------------------------------------------

def create_models():

    models = {

        "Logistic Regression": Pipeline([
            ("imputer", SimpleImputer(
                strategy="median",
                add_indicator=True,
            )),
            ("scaler", StandardScaler()),
            ("classifier", LogisticRegression(
                max_iter=2000,
                random_state=RANDOM_STATE,
            )),
        ]),

        "Random Forest": Pipeline([
            ("imputer", SimpleImputer(
                strategy="median",
                add_indicator=True,
            )),
            ("classifier", RandomForestClassifier(
                n_estimators=300,
                random_state=RANDOM_STATE,
                class_weight="balanced",
                n_jobs=-1,
            )),
        ]),
    }

    return models


# --------------------------------------------------
# 5. Train and evaluate each model
# --------------------------------------------------

def evaluate_model(name, model, X_train, X_test, y_train, y_test):

    print(f"\n========== {name.upper()} ==========\n")

    # Train using training data only
    model.fit(X_train, y_train)

    # Predict test records
    predictions = model.predict(X_test)

    # Identify phishing probability
    phishing_index = list(model.classes_).index("phishing")

    probabilities = model.predict_proba(X_test)[
        :, phishing_index
    ]

    # Calculate evaluation metrics
    accuracy = accuracy_score(y_test, predictions)

    precision = precision_score(
        y_test,
        predictions,
        pos_label="phishing",
        zero_division=0,
    )

    recall = recall_score(
        y_test,
        predictions,
        pos_label="phishing",
        zero_division=0,
    )

    f1 = f1_score(
        y_test,
        predictions,
        pos_label="phishing",
        zero_division=0,
    )

    roc_auc = roc_auc_score(
        (y_test == "phishing").astype(int),
        probabilities,
    )

    matrix = confusion_matrix(
        y_test,
        predictions,
        labels=["benign", "phishing"],
    )

    print(f"Accuracy:  {accuracy:.4f}")
    print(f"Precision: {precision:.4f}")
    print(f"Recall:    {recall:.4f}")
    print(f"F1-score:  {f1:.4f}")
    print(f"ROC-AUC:   {roc_auc:.4f}")

    print("\nConfusion Matrix")
    print("Label order: benign, phishing")
    print(matrix)

    print("\nClassification Report")
    print(
        classification_report(
            y_test,
            predictions,
            labels=["benign", "phishing"],
            zero_division=0,
        )
    )

    metrics = {
        "accuracy": float(accuracy),
        "precision": float(precision),
        "recall": float(recall),
        "f1_score": float(f1),
        "roc_auc": float(roc_auc),
    }

    return model, metrics


# --------------------------------------------------
# 6. Train all models and save results
# --------------------------------------------------

def main():

    X, y = load_dataset()

    X_train, X_test, y_train, y_test = split_dataset(X, y)

    models = create_models()

    MODEL_DIR.mkdir(
        parents=True,
        exist_ok=True,
    )

    all_metrics = {}

    trained_models = {}

    for name, model in models.items():

        trained_model, metrics = evaluate_model(
            name,
            model,
            X_train,
            X_test,
            y_train,
            y_test,
        )

        all_metrics[name] = metrics
        trained_models[name] = trained_model

        safe_name = name.lower().replace(" ", "_")

        model_path = MODEL_DIR / f"{safe_name}.joblib"

        joblib.dump(
            trained_model,
            model_path,
        )

        print(f"\nSaved model: {model_path}")

    # Save evaluation metrics
    with open(METRICS_PATH, "w", encoding="utf-8") as file:

        json.dump(
            all_metrics,
            file,
            indent=4,
        )

    print("\n========== MODEL COMPARISON ==========\n")

    results = pd.DataFrame(all_metrics).T

    print(results.round(4))

    print("\nMetrics saved to:")
    print(METRICS_PATH)

    print("\nTraining and evaluation completed.")


if __name__ == "__main__":
    main()
