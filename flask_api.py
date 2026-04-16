from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
from flask import Flask, jsonify, request

from train_burnout_model import (
    ARTIFACT_DIR,
    DATASET_PATH,
    METADATA_PATH,
    MODEL_PATH,
    build_inference_features,
    clamp,
    predict_with_model,
    train_and_save_model,
)


APP_ROOT = Path(__file__).resolve().parent
app = Flask(__name__)
_loaded_bundle: dict | None = None


def load_model_bundle() -> dict:
    global _loaded_bundle
    if _loaded_bundle is not None:
        return _loaded_bundle

    if not MODEL_PATH.exists() or not METADATA_PATH.exists():
        train_and_save_model(DATASET_PATH)

    model = json.loads(MODEL_PATH.read_text(encoding="utf-8"))
    metadata = json.loads(METADATA_PATH.read_text(encoding="utf-8"))
    _loaded_bundle = {"model": model, "metadata": metadata}
    return _loaded_bundle


def infer_burn_rate(payload: dict) -> dict:
    bundle = load_model_bundle()
    model = bundle["model"]
    metadata = bundle["metadata"]

    features = build_inference_features(payload)
    feature_vector = np.array(
        [
            [
                features["mental_fatigue_score"],
                features["hours_worked"],
                features["wfh_setup_available"],
                features["designation"],
                features["resource_allocation"],
            ]
        ],
        dtype=float,
    )

    predicted = float(predict_with_model(model, feature_vector)[0])

    fatigue_signal = clamp(float(payload.get("mental_fatigue_score", 0)) / 10.0, 0.0, 1.0)
    time_signal = clamp(float(payload.get("hours_worked", 0)) / 12.0, 0.0, 1.0)
    burn_rate = clamp(predicted * 0.8 + fatigue_signal * 0.15 + time_signal * 0.05, 0.0, 1.0)

    return {
        "burn_rate": round(burn_rate, 2),
        "model_source": metadata["model_name"],
        "trained_on_records": metadata["row_count"],
        "training_mae": metadata["mae"],
        "training_r2": metadata["r2"],
        "ethics": metadata["ethics"],
        "feature_mapping": features,
    }


@app.get("/health")
def health() -> tuple:
    bundle = load_model_bundle()
    metadata = bundle["metadata"]
    return jsonify(
        {
            "status": "ok",
            "model_ready": True,
            "dataset_path": str(DATASET_PATH),
            "trained_on_records": metadata["row_count"],
        }
    )


@app.get("/metadata")
def metadata() -> tuple:
    bundle = load_model_bundle()
    return jsonify(bundle["metadata"])


@app.post("/train")
def train_route() -> tuple:
    metadata = train_and_save_model(DATASET_PATH)
    global _loaded_bundle
    _loaded_bundle = None
    return jsonify({"status": "trained", "metadata": metadata})


@app.post("/predict")
def predict() -> tuple:
    payload = request.get_json(silent=True) or {}
    result = infer_burn_rate(payload)
    return jsonify(result)


def main() -> None:
    parser = argparse.ArgumentParser(description="Run the local Wellby burnout service.")
    parser.add_argument("--port", type=int, default=5001)
    args = parser.parse_args()

    ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
    load_model_bundle()
    app.run(host="0.0.0.0", port=args.port)


if __name__ == "__main__":
    main()
