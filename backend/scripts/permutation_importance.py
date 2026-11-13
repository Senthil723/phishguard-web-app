
from pathlib import Path

import joblib
import pandas as pd

from sklearn.inspection import permutation_importance
from sklearn.metrics import accuracy_score, f1_score, make_scorer
from sklearn.model_selection import train_test_split


# ============================================================
# 1. CONFIGURATION
# ============================================================

BASE_DIR = Path(__file__).resolve().parents[1]

DATASET_PATH = BASE_DIR / "data" / "phishing_binary_cleaned.csv"

MODEL_PATH = BASE_DIR / "models" / "random_forest.joblib"

OUTPUT_PATH = BASE_DIR / "models" / "permutation_importance.csv"

LABEL_COLUMN = "URL_Type_obf_Type"

RANDOM_STATE = 42
TEST_SIZE = 0.20
N_REPEATS = 10

# Explicitly identify phishing as the positive class.
PHISHING_F1_SCORER = make_scorer(
    f1_score,
    pos_label="phishing"
)


# ============================================================
# 2. LOAD DATASET AND MODEL
# ============================================================

def load_data_and_model():

    print("\n========== LOADING MODEL AND DATA ==========")

    if not DATASET_PATH.exists():
        raise FileNotFoundError(
            f"Dataset not found: {DATASET_PATH}"
        )

    if not MODEL_PATH.exists():
        raise FileNotFoundError(
            f"Model not found: {MODEL_PATH}"
        )

    df = pd.read_csv(DATASET_PATH)

    if LABEL_COLUMN not in df.columns:
        raise ValueError(
            f"Label column '{LABEL_COLUMN}' is missing."
        )

    X = df.drop(columns=[LABEL_COLUMN])
    y = df[LABEL_COLUMN]

    # Reproduce the same train/test split used during training.
    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=TEST_SIZE,
        random_state=RANDOM_STATE,
        stratify=y
    )

    model = joblib.load(MODEL_PATH)

    print(f"Dataset records: {len(df)}")
    print(f"Test records: {len(X_test)}")
    print("Model loaded successfully.")

    return model, X_test, y_test


# ============================================================
# 3. CALCULATE BASELINE PERFORMANCE
# ============================================================

def calculate_baseline_performance(model, X_test, y_test):

    print("\n========== BASELINE PERFORMANCE ==========")

    predictions = model.predict(X_test)

    accuracy = accuracy_score(y_test, predictions)

    phishing_f1 = f1_score(
        y_test,
        predictions,
        pos_label="phishing"
    )

    print(f"Accuracy: {accuracy:.4f}")
    print(f"F1-score: {phishing_f1:.4f}")

    return accuracy, phishing_f1


# ============================================================
# 4. CALCULATE PERMUTATION IMPORTANCE
# ============================================================

def calculate_permutation_importance(model, X_test, y_test):

    print("\n========== PERMUTATION IMPORTANCE ==========")

    print("Calculating feature importance...")
    print("Please wait. This may take some time.")

    result = permutation_importance(
        estimator=model,
        X=X_test,
        y=y_test,
        scoring=PHISHING_F1_SCORER,
        n_repeats=N_REPEATS,
        random_state=RANDOM_STATE,
        n_jobs=-1
    )

    importance_df = pd.DataFrame({
        "Feature": X_test.columns,
        "Importance_Mean": result.importances_mean,
        "Importance_Std": result.importances_std
    })

    importance_df = importance_df.sort_values(
        by="Importance_Mean",
        ascending=False
    ).reset_index(drop=True)

    return importance_df


# ============================================================
# 5. DISPLAY TOP 20 FEATURES
# ============================================================

def display_top_features(importance_df):

    print("\n========== TOP 20 PERMUTATION FEATURES ==========")

    top_20 = importance_df.head(20)

    print(
        top_20.to_string(
            index=False,
            formatters={
                "Importance_Mean": "{:.6f}".format,
                "Importance_Std": "{:.6f}".format
            }
        )
    )


# ============================================================
# 6. SAVE RESULTS
# ============================================================

def save_results(importance_df):

    OUTPUT_PATH.parent.mkdir(
        parents=True,
        exist_ok=True
    )

    importance_df.to_csv(
        OUTPUT_PATH,
        index=False
    )

    print("\n========== RESULTS SAVED ==========")
    print(f"File: {OUTPUT_PATH}")
    print(f"Total features evaluated: {len(importance_df)}")


# ============================================================
# 7. MAIN FUNCTION
# ============================================================

def main():

    try:

        model, X_test, y_test = load_data_and_model()

        calculate_baseline_performance(
            model,
            X_test,
            y_test
        )

        importance_df = calculate_permutation_importance(
            model,
            X_test,
            y_test
        )

        display_top_features(importance_df)

        save_results(importance_df)

        print("\nPermutation importance completed successfully!")

    except Exception as error:

        print("\nERROR OCCURRED:")
        print(error)

        raise


if __name__ == "__main__":
    main()
