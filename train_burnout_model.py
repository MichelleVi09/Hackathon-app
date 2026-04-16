from __future__ import annotations

import csv
import json
from pathlib import Path

import numpy as np


APP_ROOT = Path(__file__).resolve().parent
ARTIFACT_DIR = APP_ROOT / "artifacts"
MODEL_PATH = ARTIFACT_DIR / "burnout_model.json"
METADATA_PATH = ARTIFACT_DIR / "burnout_model_metadata.json"
DATASET_PATH = APP_ROOT / "external" / "Synthetic-AI-Developer-Productivity-Dataset" / "Developer_Productivity_Synthetic_Syncora.csv"


def clamp(value: float, minimum: float, maximum: float) -> float:
    return max(minimum, min(maximum, float(value)))


def normalize(values: np.ndarray) -> np.ndarray:
    minimum = float(np.min(values))
    maximum = float(np.max(values))
    if maximum == minimum:
        return np.zeros_like(values, dtype=float)
    return (values - minimum) / (maximum - minimum)


def mean_absolute_error(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    return float(np.mean(np.abs(y_true - y_pred)))


def r2_score(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    total = float(np.sum((y_true - np.mean(y_true)) ** 2))
    residual = float(np.sum((y_true - y_pred) ** 2))
    if total == 0:
        return 0.0
    return 1.0 - residual / total


def load_dataset(dataset_path: Path) -> dict[str, np.ndarray]:
    with dataset_path.open("r", encoding="utf-8", newline="") as csv_file:
        reader = csv.DictReader(csv_file)
        rows = list(reader)

    if not rows:
        raise ValueError(f"No rows were found in {dataset_path}.")

    columns = {
        field: np.array([float(row[field]) for row in rows], dtype=float)
        for field in reader.fieldnames or []
    }
    return columns


def build_training_frame(columns: dict[str, np.ndarray]) -> tuple[np.ndarray, np.ndarray, list[str]]:
    hours_coding = columns["hours_coding"]
    coffee_intake = columns["coffee_intake_mg"]
    distractions = columns["distractions"]
    sleep_hours = columns["sleep_hours"]
    commits = columns["commits"]
    bugs_reported = columns["bugs_reported"]
    ai_usage_hours = columns["ai_usage_hours"]
    cognitive_load = columns["cognitive_load"]
    task_success = columns["task_success"]

    sleep_debt = np.clip((8.0 - sleep_hours) / 4.0, 0.0, 1.0)
    distraction_norm = normalize(distractions)
    bugs_norm = normalize(bugs_reported)
    commits_norm = normalize(commits)
    coffee_norm = normalize(coffee_intake)
    cognitive_norm = np.clip(cognitive_load / 5.0, 0.0, 1.0)
    coding_norm = np.clip(hours_coding / 10.0, 0.0, 1.0)
    ai_norm = np.clip(ai_usage_hours / 8.0, 0.0, 1.0)
    success_gap = 1.0 - np.clip(task_success, 0.0, 1.0)

    mental_fatigue_score = np.clip(
        10.0
        * (
            0.34 * cognitive_norm
            + 0.18 * distraction_norm
            + 0.12 * bugs_norm
            + 0.16 * sleep_debt
            + 0.12 * coffee_norm
            + 0.08 * success_gap
        ),
        0.0,
        10.0,
    )

    hours_worked = np.clip(hours_coding + ai_usage_hours * 0.7 + commits * 0.08, 0.0, 14.0)
    wfh_setup_available = (
        (distractions <= np.median(distractions)) | (sleep_hours >= np.median(sleep_hours))
    ).astype(float)
    designation = np.clip(
        5.0 * (0.45 * commits_norm + 0.35 * coding_norm + 0.2 * (1.0 - bugs_norm)),
        0.0,
        5.0,
    )
    resource_allocation = np.clip(
        1.0
        + 9.0
        * (
            0.38 * cognitive_norm
            + 0.24 * distraction_norm
            + 0.18 * bugs_norm
            + 0.12 * success_gap
            + 0.08 * ai_norm
        ),
        1.0,
        10.0,
    )

    burnout_target = np.clip(
        0.32 * cognitive_norm
        + 0.19 * sleep_debt
        + 0.16 * distraction_norm
        + 0.12 * bugs_norm
        + 0.08 * coffee_norm
        + 0.07 * success_gap
        + 0.06 * ai_norm
        - 0.05 * commits_norm,
        0.0,
        1.0,
    )

    feature_names = [
        "mental_fatigue_score",
        "hours_worked",
        "wfh_setup_available",
        "designation",
        "resource_allocation",
    ]
    features = np.column_stack(
        [
            mental_fatigue_score,
            hours_worked,
            wfh_setup_available,
            designation,
            resource_allocation,
        ]
    )

    return features, burnout_target, feature_names


def build_inference_features(payload: dict) -> dict[str, float]:
    mental_fatigue = clamp(payload.get("mental_fatigue_score", 0), 0, 10)
    hours_worked = clamp(payload.get("hours_worked", 0), 0, 14)
    wfh_setup = int(clamp(payload.get("wfh_setup_available", 1), 0, 1))
    designation = clamp(payload.get("designation", 0), 0, 5)
    resource_allocation = clamp(payload.get("resource_allocation", 5), 1, 10)

    return {
        "mental_fatigue_score": mental_fatigue,
        "hours_worked": hours_worked,
        "wfh_setup_available": wfh_setup,
        "designation": designation,
        "resource_allocation": resource_allocation,
    }


def split_train_test(features: np.ndarray, target: np.ndarray, test_fraction: float = 0.2) -> tuple:
    rng = np.random.default_rng(42)
    indices = np.arange(len(features))
    rng.shuffle(indices)
    split_index = int(len(indices) * (1 - test_fraction))
    train_indices = indices[:split_index]
    test_indices = indices[split_index:]

    return (
        features[train_indices],
        features[test_indices],
        target[train_indices],
        target[test_indices],
    )


def fit_ridge_regression(X_train: np.ndarray, y_train: np.ndarray, alpha: float = 0.8) -> dict:
    ones = np.ones((X_train.shape[0], 1))
    X_augmented = np.hstack([ones, X_train])
    identity = np.eye(X_augmented.shape[1])
    identity[0, 0] = 0.0
    weights = np.linalg.solve(X_augmented.T @ X_augmented + alpha * identity, X_augmented.T @ y_train)
    return {
        "intercept": float(weights[0]),
        "weights": weights[1:].astype(float).tolist(),
    }


def predict_with_model(model: dict, X: np.ndarray) -> np.ndarray:
    weights = np.array(model["weights"], dtype=float)
    intercept = float(model["intercept"])
    return np.clip(intercept + X @ weights, 0.0, 1.0)


def train_and_save_model(dataset_path: Path = DATASET_PATH) -> dict:
    if not dataset_path.exists():
        raise FileNotFoundError(
            f"Syncora dataset not found at {dataset_path}. Clone it into external/Synthetic-AI-Developer-Productivity-Dataset first."
        )

    columns = load_dataset(dataset_path)
    features, target, feature_names = build_training_frame(columns)
    X_train, X_test, y_train, y_test = split_train_test(features, target)

    model = fit_ridge_regression(X_train, y_train)
    predictions = predict_with_model(model, X_test)

    metadata = {
        "model_name": "wellby-syncora-burnout-proxy",
        "model_type": "ridge-linear-regression",
        "dataset_name": "Synthetic AI Developer Productivity Dataset",
        "dataset_repo": "https://github.com/syncora-ai/Synthetic-AI-Developer-Productivity-Dataset",
        "row_count": int(len(features)),
        "feature_columns": feature_names,
        "target_name": "burnout_proxy_score",
        "mae": round(mean_absolute_error(y_test, predictions), 4),
        "r2": round(r2_score(y_test, predictions), 4),
        "ethics": {
            "privacy": "The Syncora repo states the dataset is synthetic, carries zero risk of personal data exposure, and avoids privacy liability from real employee data.",
            "usage": "The repo describes the dataset as intended for research, educational, and experimental use rather than real-world surveillance.",
            "limits": "Wellby treats this trained model as a wellbeing estimate, not a diagnostic, performance management, or HR enforcement tool."
        }
    }

    ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
    MODEL_PATH.write_text(json.dumps(model, indent=2), encoding="utf-8")
    METADATA_PATH.write_text(json.dumps(metadata, indent=2), encoding="utf-8")
    return metadata


if __name__ == "__main__":
    result = train_and_save_model()
    print(json.dumps(result, indent=2))
