
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
    make_scorer,
)
from sklearn.model_selection import (
    train_test_split,
    StratifiedKFold,
    cross_validate,
)
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler


# --------------------------------------------------
# 1. PROJECT PATHS AND SETTINGS
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

CV_METRICS_PATH = MODEL_DIR / "cross_validation_metrics.json"

LABEL_COLUMN = "URL_Type_obf_Type"

RANDOM_STATE = 42

TEST_SIZE = 0.20

N_SPLITS = 5


# --------------------------------------------------
# 2. LOAD CLEANED DATASET
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
# 3. SPLIT TRAINING AND TESTING DATA
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
# 4. DEFINE MACHINE LEARNING MODELS
# --------------------------------------------------

def create_models():

    models = {

        "Logistic Regression": Pipeline([
            (
                "imputer",
                SimpleImputer(
                    strategy="median",
                    add_indicator=True,
                ),
            ),
            (
                "scaler",
                StandardScaler(),
            ),
            (
                "classifier",
                LogisticRegression(
                    max_iter=2000,
                    random_state=RANDOM_STATE,
                ),
            ),
        ]),

        "Random Forest": Pipeline([
            (
                "imputer",
                SimpleImputer(
                    strategy="median",
                    add_indicator=True,
                ),
            ),
            (
                "classifier",
                RandomForestClassifier(
                    n_estimators=300,
                    random_state=RANDOM_STATE,
                    class_weight="balanced",
                    n_jobs=-1,
                ),
            ),
        ]),
    }

    return models


# --------------------------------------------------
# 5. RUN 5-FOLD STRATIFIED CROSS-VALIDATION
# --------------------------------------------------

def run_cross_validation(models, X_train, y_train):

    print("\n========== 5-FOLD CROSS-VALIDATION ==========\n")

    cv = StratifiedKFold(
        n_splits=N_SPLITS,
        shuffle=True,
        random_state=RANDOM_STATE,
    )

    scoring = {
        "accuracy": "accuracy",

        "precision": make_scorer(
            precision_score,
            pos_label="phishing",
            zero_division=0,
        ),

        "recall": make_scorer(
            recall_score,
            pos_label="phishing",
            zero_division=0,
        ),

        "f1": make_scorer(
            f1_score,
            pos_label="phishing",
            zero_division=0,
        ),

        "roc_auc": "roc_auc",
    }

    results = {}

    for name, model in models.items():

        print(f"\nRunning cross-validation: {name}")

        scores = cross_validate(
            model,
            X_train,
            y_train,
            cv=cv,
            scoring=scoring,
            n_jobs=1,
            return_train_score=False,
        )

        results[name] = {}

        for metric in scoring:

            values = scores[f"test_{metric}"]

            mean_score = values.mean()

            std_score = values.std()

            results[name][metric] = {
                "mean": float(mean_score),

                "std": float(std_score),

                "fold_scores": [
                    float(value) for value in values
                ],
            }

            print(
                f"{metric}: "
                f"{mean_score:.4f} "
                f"(+/- {std_score:.4f})"
            )

    return results


# --------------------------------------------------
# 6. TRAIN AND EVALUATE INDIVIDUAL MODELS
# --------------------------------------------------

def evaluate_model(
    name,
    model,
    X_train,
    X_test,
    y_train,
    y_test,
):

    print(f"\n========== {name.upper()} ==========\n")

    model.fit(X_train, y_train)

    predictions = model.predict(X_test)

    phishing_index = list(model.classes_).index("phishing")

    probabilities = model.predict_proba(X_test)[
        :, phishing_index
    ]

    accuracy = accuracy_score(
        y_test,
        predictions,
    )

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
# 7. MAIN EXECUTION
# --------------------------------------------------

def main():

    # Load data
    X, y = load_dataset()

    # Split into training and testing data
    X_train, X_test, y_train, y_test = split_dataset(
        X,
        y,
    )

    # Create model pipelines
    models = create_models()

    # Create model output directory
    MODEL_DIR.mkdir(
        parents=True,
        exist_ok=True,
    )

    # --------------------------------------------------
    # Run cross-validation on training data only
    # --------------------------------------------------

    cv_results = run_cross_validation(
        models,
        X_train,
        y_train,
    )

    with open(
        CV_METRICS_PATH,
        "w",
        encoding="utf-8",
    ) as file:

        json.dump(
            cv_results,
            file,
            indent=4,
        )

    print("\nCross-validation metrics saved to:")

    print(CV_METRICS_PATH)

    # --------------------------------------------------
    # Train and evaluate using the untouched test set
    # --------------------------------------------------

    all_metrics = {}

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

        safe_name = name.lower().replace(" ", "_")

        model_path = MODEL_DIR / f"{safe_name}.joblib"

        joblib.dump(
            trained_model,
            model_path,
        )

        print(f"\nSaved model: {model_path}")

    # --------------------------------------------------
    # Save final test-set metrics
    # --------------------------------------------------

    with open(
        METRICS_PATH,
        "w",
        encoding="utf-8",
    ) as file:

        json.dump(
            all_metrics,
            file,
            indent=4,
        )

    print("\n========== MODEL COMPARISON ==========\n")

    results = pd.DataFrame(all_metrics).T

    print(results.round(4))

    print("\nTest metrics saved to:")

    print(METRICS_PATH)

    print("\n========== TRAINING COMPLETED ==========")


if __name__ == "__main__":

    main()
