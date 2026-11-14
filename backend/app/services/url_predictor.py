
from functools import lru_cache
from pathlib import Path
import json

import joblib
import pandas as pd

from app.services.url_features import FEATURE_NAMES, extract_url_features


# backend/ directory
BACKEND_DIR = Path(__file__).resolve().parents[2]

MODEL_PATH = BACKEND_DIR / "models" / "url_random_forest_tuned.joblib"
METRICS_PATH = BACKEND_DIR / "models" / "url_model_tuned_metrics.json"

MODEL_VERSION = "url_random_forest_tuned_v1"


@lru_cache(maxsize=1)
def load_model():
    """Load the trusted local model once and reuse it."""

    if not MODEL_PATH.exists():
        raise FileNotFoundError(
            f"ML model not found: {MODEL_PATH}"
        )

    if not METRICS_PATH.exists():
        raise FileNotFoundError(
            f"Model metrics file not found: {METRICS_PATH}"
        )

    model = joblib.load(MODEL_PATH)

    with METRICS_PATH.open("r", encoding="utf-8") as file:
        metadata = json.load(file)

    expected_features = metadata.get("features", [])
    threshold = float(metadata.get("prediction_threshold", 0.89))

    if expected_features != FEATURE_NAMES:
        raise ValueError(
            "Model feature names do not match the URL feature extractor."
        )

    if getattr(model, "n_features_in_", None) != len(FEATURE_NAMES):
        raise ValueError(
            "Model feature count does not match the feature extractor."
        )

    if 1 not in model.classes_:
        raise ValueError(
            "The model does not contain phishing class 1."
        )

    return model, threshold


def predict_url(url: str) -> dict:
    """
    Analyze URL features using the experimental Random Forest model.

    This function never visits or downloads the submitted URL.
    """

    # Extract the 29 URL features.
    features = extract_url_features(url)

    # Preserve the exact training feature order.
    input_data = pd.DataFrame(
        [[features[name] for name in FEATURE_NAMES]],
        columns=FEATURE_NAMES,
    )

    # Load the model once.
    model, threshold = load_model()

    # Get the score associated with class 1 (phishing).
    probabilities = model.predict_proba(input_data)[0]
    phishing_index = list(model.classes_).index(1)
    model_score = float(probabilities[phishing_index])

    # Apply the experimental risk categories.
    if model_score >= threshold:
        prediction = "phishing"
        risk_level = "high"

    elif model_score >= 0.50:
        prediction = "needs_review"
        risk_level = "medium"

    else:
        prediction = "lower_model_risk"
        risk_level = "low"

    return {
        "prediction": prediction,
        "risk_level": risk_level,
        "model_score": round(model_score, 4),
        "model_version": MODEL_VERSION,
    }
