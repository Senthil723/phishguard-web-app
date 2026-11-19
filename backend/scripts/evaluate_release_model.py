"""Evaluate the shipped URL model on the held-out hostname test split."""

import json
from pathlib import Path

import pandas as pd
from sklearn.metrics import (
    average_precision_score,
    confusion_matrix,
    precision_score,
    recall_score,
    roc_auc_score,
)

from app.services.url_features import FEATURE_NAMES
from app.services.url_predictor import MODEL_VERSION, load_model


BACKEND_DIR = Path(__file__).resolve().parents[1]
TEST_FILE = BACKEND_DIR / "data" / "processed" / "url_test.csv"
REPORT_FILE = BACKEND_DIR / "models" / "url_model_release_evaluation.json"


def evaluate() -> dict:
    test_data = pd.read_csv(TEST_FILE, usecols=FEATURE_NAMES + ["url", "target"])
    if test_data[FEATURE_NAMES + ["target"]].isna().any().any():
        raise ValueError("The test split contains missing features or targets.")
    if not set(test_data["target"].unique()) <= {0, 1}:
        raise ValueError("The test split must use binary targets 0 and 1.")

    model, threshold = load_model()
    phishing_index = list(model.classes_).index(1)
    scores = model.predict_proba(test_data[FEATURE_NAMES])[:, phishing_index]
    actual = test_data["target"].to_numpy()
    high_risk = scores >= threshold
    low_risk = scores < 0.5
    review = ~high_risk & ~low_risk
    tn, fp, fn, tp = confusion_matrix(actual, high_risk, labels=[0, 1]).ravel()

    return {
        "model_version": MODEL_VERSION,
        "dataset": str(TEST_FILE.relative_to(BACKEND_DIR)).replace("\\", "/"),
        "test_records": int(len(test_data)),
        "phishing_records": int(actual.sum()),
        "decision_threshold": threshold,
        "high_risk_precision": float(precision_score(actual, high_risk, zero_division=0)),
        "high_risk_recall": float(recall_score(actual, high_risk, zero_division=0)),
        "roc_auc": float(roc_auc_score(actual, scores)),
        "average_precision": float(average_precision_score(actual, scores)),
        "confusion_matrix_high_risk": {"true_negative": int(tn), "false_positive": int(fp), "false_negative": int(fn), "true_positive": int(tp)},
        "needs_review_records": int(review.sum()),
        "low_risk_records": int(low_risk.sum()),
        "phishing_in_low_risk": int((low_risk & (actual == 1)).sum()),
        "note": "URL feature model only; it does not visit websites or guarantee safety.",
    }


if __name__ == "__main__":
    report = evaluate()
    REPORT_FILE.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))
