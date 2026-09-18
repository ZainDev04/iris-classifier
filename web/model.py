"""
Iris KNN model service.

Trains the classifier once at import time and exposes a small, typed API that
the Flask layer can call. Keeping model logic out of the routes makes it
unit-testable and lets the same code power both the CLI script and the web app.

Author: Shaikh Muhammad Zain
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import numpy as np
from sklearn.datasets import load_iris
from sklearn.metrics import (
    accuracy_score,
    confusion_matrix,
    f1_score,
    precision_recall_fscore_support,
)
from sklearn.model_selection import StratifiedKFold, cross_val_score, train_test_split
from sklearn.neighbors import KNeighborsClassifier
from sklearn.preprocessing import StandardScaler

K_NEIGHBORS = 5
TEST_SIZE = 0.2
RANDOM_STATE = 42
K_RANGE = range(1, 21)

FEATURE_KEYS = ("sepal_length", "sepal_width", "petal_length", "petal_width")
FEATURE_LABELS = ("Sepal length", "Sepal width", "Petal length", "Petal width")

SPECIES_INFO: dict[str, dict[str, str]] = {
    "setosa": {
        "label": "Iris setosa",
        "color": "#74a636",
        "summary": "Smallest petals of the three; linearly separable from the rest.",
        "detail": (
            "Setosa has short, narrow petals (roughly 1-2 cm long). It is the "
            "easiest class to identify and is never confused with the others."
        ),
    },
    "versicolor": {
        "label": "Iris versicolor",
        "color": "#d9566f",
        "summary": "Medium-sized petals; overlaps slightly with virginica.",
        "detail": (
            "Versicolor sits between the two other species in every measurement. "
            "Its petal length (3-5 cm) overlaps with the smaller virginica flowers, "
            "which is where the model makes its rare mistakes."
        ),
    },
    "virginica": {
        "label": "Iris virginica",
        "color": "#2f8fd6",
        "summary": "Largest petals; occasionally mistaken for versicolor.",
        "detail": (
            "Virginica has the longest and widest petals (often over 5 cm long). "
            "Large specimens are unmistakable, but smaller ones can fall within "
            "the versicolor region of feature space."
        ),
    },
}


class ValidationError(ValueError):
    """Raised when a prediction payload is malformed or out of bounds."""


@dataclass(frozen=True)
class FeatureSpec:
    key: str
    label: str
    min: float
    max: float
    step: float = 0.1

    def to_dict(self) -> dict[str, Any]:
        return {
            "key": self.key,
            "label": self.label,
            "min": self.min,
            "max": self.max,
            "step": self.step,
        }


class IrisModel:
    """Trained KNN classifier plus everything the UI needs to explain it."""

    def __init__(self, k: int = K_NEIGHBORS) -> None:
        self.k = k
        self.iris = load_iris()
        self.target_names: list[str] = list(self.iris.target_names)

        X, y = self.iris.data, self.iris.target
        self.scaler = StandardScaler().fit(X)
        X_scaled = self.scaler.transform(X)

        self.X_train, self.X_test, self.y_train, self.y_test = train_test_split(
            X_scaled, y, test_size=TEST_SIZE, random_state=RANDOM_STATE, stratify=y
        )

        self.model = KNeighborsClassifier(n_neighbors=k).fit(self.X_train, self.y_train)

        # Feature bounds come from the dataset with a little headroom so the
        # sliders can express slightly unusual flowers without being clamped.
        self.features: list[FeatureSpec] = []
        for i, (key, label) in enumerate(zip(FEATURE_KEYS, FEATURE_LABELS)):
            lo, hi = float(X[:, i].min()), float(X[:, i].max())
            self.features.append(FeatureSpec(key, label, round(lo, 1), round(hi, 1)))

        self.metrics = self._evaluate()
        self.k_curve = self._k_curve()
        self.dataset = self._dataset_payload(X, y)

    # --- evaluation ---

    def _evaluate(self) -> dict[str, Any]:
        y_pred = self.model.predict(self.X_test)
        cm = confusion_matrix(self.y_test, y_pred)
        precision, recall, f1, support = precision_recall_fscore_support(
            self.y_test, y_pred, zero_division=0
        )

        X_all = np.vstack([self.X_train, self.X_test])
        y_all = np.concatenate([self.y_train, self.y_test])
        cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=RANDOM_STATE)
        cv_scores = cross_val_score(
            KNeighborsClassifier(n_neighbors=self.k), X_all, y_all, cv=cv
        )

        return {
            "accuracy": round(float(accuracy_score(self.y_test, y_pred)) * 100, 2),
            "f1_weighted": round(float(f1_score(self.y_test, y_pred, average="weighted")), 4),
            "cv_accuracy_mean": round(float(cv_scores.mean()) * 100, 2),
            "cv_accuracy_std": round(float(cv_scores.std()) * 100, 2),
            "cv_folds": 5,
            "train_samples": int(len(self.X_train)),
            "test_samples": int(len(self.X_test)),
            "total_samples": int(len(self.iris.data)),
            "n_features": int(self.iris.data.shape[1]),
            "n_classes": len(self.target_names),
            "k": self.k,
            "confusion_matrix": cm.tolist(),
            "per_class": [
                {
                    "species": name,
                    "precision": round(float(p), 3),
                    "recall": round(float(r), 3),
                    "f1": round(float(f), 3),
                    "support": int(s),
                }
                for name, p, r, f, s in zip(self.target_names, precision, recall, f1, support)
            ],
        }

    def _k_curve(self) -> dict[str, Any]:
        scores = []
        for k in K_RANGE:
            knn = KNeighborsClassifier(n_neighbors=k).fit(self.X_train, self.y_train)
            scores.append(round(float(accuracy_score(self.y_test, knn.predict(self.X_test))) * 100, 2))
        best_idx = int(np.argmax(scores))
        return {
            "k": list(K_RANGE),
            "accuracy": scores,
            "best_k": list(K_RANGE)[best_idx],
            "best_accuracy": scores[best_idx],
            "chosen_k": self.k,
        }

    def _dataset_payload(self, X: np.ndarray, y: np.ndarray) -> dict[str, Any]:
        """Raw (unscaled) samples for the scatter plot and histograms."""
        return {
            "features": [f.to_dict() for f in self.features],
            "species": self.target_names,
            "points": [
                {"x": [round(float(v), 1) for v in row], "y": int(label)}
                for row, label in zip(X, y)
            ],
        }

    # --- prediction ---

    def parse_payload(self, data: Any) -> tuple[np.ndarray, list[str]]:
        """Validate a JSON body. Returns (features[1x4], warnings)."""
        if not isinstance(data, dict):
            raise ValidationError("Request body must be a JSON object.")

        values: list[float] = []
        warnings: list[str] = []
        for spec in self.features:
            raw = data.get(spec.key)
            if raw is None or raw == "":
                raise ValidationError(f"Missing field: {spec.key}")
            try:
                val = float(raw)
            except (TypeError, ValueError):
                raise ValidationError(f"{spec.key} must be a number.") from None
            if not np.isfinite(val):
                raise ValidationError(f"{spec.key} must be a finite number.")
            if val <= 0:
                raise ValidationError(f"{spec.key} must be greater than 0 cm.")
            if val > 30:
                raise ValidationError(f"{spec.key} is unrealistically large (max 30 cm).")
            if val < spec.min or val > spec.max:
                warnings.append(
                    f"{spec.label} {val:g} cm is outside the training range "
                    f"({spec.min:g}-{spec.max:g} cm); confidence may be unreliable."
                )
            values.append(val)

        return np.array([values]), warnings

    def predict(self, data: Any) -> dict[str, Any]:
        features, warnings = self.parse_payload(data)
        scaled = self.scaler.transform(features)

        pred_idx = int(self.model.predict(scaled)[0])
        proba = self.model.predict_proba(scaled)[0]
        distances, indices = self.model.kneighbors(scaled, n_neighbors=self.k)

        species = self.target_names[pred_idx]
        info = SPECIES_INFO[species]

        neighbors = []
        for dist, idx in zip(distances[0], indices[0]):
            raw = self.scaler.inverse_transform(self.X_train[idx : idx + 1])[0]
            neighbors.append(
                {
                    "species": self.target_names[int(self.y_train[idx])],
                    "distance": round(float(dist), 3),
                    "features": [round(float(v), 1) for v in raw],
                }
            )

        votes = {name: 0 for name in self.target_names}
        for n in neighbors:
            votes[n["species"]] += 1

        return {
            "species": species,
            "label": info["label"],
            "color": info["color"],
            "summary": info["summary"],
            "detail": info["detail"],
            "confidence": round(float(proba[pred_idx]) * 100, 1),
            "probabilities": {
                name: round(float(p) * 100, 1) for name, p in zip(self.target_names, proba)
            },
            "votes": votes,
            "neighbors": neighbors,
            "input": {key: float(v) for key, v in zip(FEATURE_KEYS, features[0])},
            "warnings": warnings,
        }

    # --- summary ---

    def describe(self) -> dict[str, Any]:
        return {
            "algorithm": "K-Nearest Neighbors",
            "library": "scikit-learn",
            "preprocessing": "StandardScaler (z-score)",
            "split": f"{int((1 - TEST_SIZE) * 100)}/{int(TEST_SIZE * 100)} stratified, random_state={RANDOM_STATE}",
            "metrics": self.metrics,
            "k_curve": self.k_curve,
            "species": {name: SPECIES_INFO[name] for name in self.target_names},
            "features": [f.to_dict() for f in self.features],
        }


# A single shared instance; training the whole thing takes ~50 ms.
MODEL = IrisModel()
