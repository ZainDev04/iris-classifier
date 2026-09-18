"""
Data Classification Using AI: Iris KNN pipeline
===============================================
DecodeLabs | Industrial Training Kit - Artificial Intelligence | Project 2

A complete supervised-learning workflow on the Iris dataset:

    load -> scale -> split -> train -> predict -> evaluate -> tune K -> visualise

Run it end-to-end:

    python classifier.py                # K=5, charts saved to assets/charts/
    python classifier.py --k 7          # try a different K
    python classifier.py --out charts   # write charts somewhere else

Author: Shaikh Muhammad Zain
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import matplotlib
import numpy as np
import pandas as pd
from sklearn.datasets import load_iris
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
)
from sklearn.model_selection import StratifiedKFold, cross_val_score, train_test_split
from sklearn.neighbors import KNeighborsClassifier
from sklearn.preprocessing import StandardScaler

# Same categorical palette as the web UI (validated for colour-blind safety).
PALETTE = {"setosa": "#74a636", "versicolor": "#d9566f", "virginica": "#2f8fd6"}
ACCENT = "#82b440"

RANDOM_STATE = 42
TEST_SIZE = 0.2
K_RANGE = range(1, 21)


def banner(title: str) -> None:
    rule = "-" * 60
    print(f"\n{rule}\n  {title}\n{rule}")


def run(k: int, out_dir: Path, show: bool) -> None:
    matplotlib.use("Agg" if not show else matplotlib.get_backend())
    import matplotlib.pyplot as plt  # imported after the backend is chosen
    import seaborn as sns

    out_dir.mkdir(parents=True, exist_ok=True)

    # --- 1. Load ---
    iris = load_iris()
    df = pd.DataFrame(iris.data, columns=iris.feature_names)
    df["species"] = pd.Categorical.from_codes(iris.target, iris.target_names)

    print("=" * 60)
    print("  DATA CLASSIFICATION USING AI: PROJECT 2")
    print("  DecodeLabs | Shaikh Muhammad Zain")
    print("=" * 60)

    banner("STEP 1: Dataset overview")
    print(f"  Samples        : {len(df)}")
    print(f"  Features       : {list(iris.feature_names)}")
    print(f"  Classes        : {[str(n) for n in iris.target_names]}")
    print(f"  Samples/class  : {df['species'].value_counts().to_dict()}")
    print()
    print(df.head().to_string())

    # --- 2. Scale ---
    # KNN measures Euclidean distance, so every feature must live on the same
    # scale or the largest-valued one (sepal length) dominates the vote.
    X, y = iris.data, iris.target
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    banner("STEP 2: Feature scaling (StandardScaler)")
    print(f"  sepal length before : {X[:, 0].min():.1f} to {X[:, 0].max():.1f} cm")
    print(f"  sepal length after  : {X_scaled[:, 0].min():.2f} to {X_scaled[:, 0].max():.2f} (z-score)")

    # --- 3. Split ---
    X_train, X_test, y_train, y_test = train_test_split(
        X_scaled, y, test_size=TEST_SIZE, random_state=RANDOM_STATE, stratify=y
    )
    banner("STEP 3: Train / test split")
    print(f"  Training : {len(X_train)} samples ({int((1 - TEST_SIZE) * 100)} %)")
    print(f"  Testing  : {len(X_test)} samples ({int(TEST_SIZE * 100)} %), stratified, seed {RANDOM_STATE}")

    # --- 4. Train ---
    model = KNeighborsClassifier(n_neighbors=k).fit(X_train, y_train)
    banner("STEP 4: Train KNN")
    print(f"  Algorithm : K-Nearest Neighbors, K = {k}")

    # --- 5. Predict ---
    y_pred = model.predict(X_test)
    banner("STEP 5: Predictions on the test set")
    results = pd.DataFrame(
        {
            "Actual": iris.target_names[y_test],
            "Predicted": iris.target_names[y_pred],
            "Correct": np.where(y_test == y_pred, "✓", "✗"),
        }
    )
    print(results.to_string(index=False))

    # --- 6. Evaluate ---
    accuracy = accuracy_score(y_test, y_pred)
    f1 = f1_score(y_test, y_pred, average="weighted")
    cm = confusion_matrix(y_test, y_pred)

    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=RANDOM_STATE)
    cv_scores = cross_val_score(KNeighborsClassifier(n_neighbors=k), X_scaled, y, cv=cv)

    banner("STEP 6: Evaluation")
    print(f"  Accuracy (test)     : {accuracy * 100:.2f} %")
    print(f"  F1 score (weighted) : {f1:.4f}")
    print(f"  5-fold CV accuracy  : {cv_scores.mean() * 100:.2f} % ± {cv_scores.std() * 100:.2f}")
    print("\n  Confusion matrix (rows = actual, columns = predicted)")
    print(
        pd.DataFrame(
            cm,
            index=[f"actual {n}" for n in iris.target_names],
            columns=[f"pred {n}" for n in iris.target_names],
        ).to_string()
    )
    print("\n  Classification report")
    print(classification_report(y_test, y_pred, target_names=iris.target_names))

    # --- 7. Tune K ---
    k_scores = [
        accuracy_score(y_test, KNeighborsClassifier(n_neighbors=kk).fit(X_train, y_train).predict(X_test))
        for kk in K_RANGE
    ]
    best_k = list(K_RANGE)[int(np.argmax(k_scores))]
    banner("STEP 7: Elbow method")
    print(f"  Best K on the test split : {best_k} ({max(k_scores) * 100:.2f} %)")
    print(f"  Using K = {k} keeps the decision boundary smooth instead of chasing one split.")

    # --- 8. Visualise ---
    banner("STEP 8: Charts")
    sns.set_theme(style="whitegrid", font="DejaVu Sans")

    plt.figure(figsize=(6.5, 5))
    sns.heatmap(
        cm,
        annot=True,
        fmt="d",
        cmap=sns.light_palette(ACCENT, as_cmap=True),
        cbar=False,
        xticklabels=iris.target_names,
        yticklabels=iris.target_names,
        linewidths=2,
        linecolor="white",
    )
    plt.title(f"Confusion matrix, KNN (K={k})", pad=12)
    plt.xlabel("Predicted")
    plt.ylabel("Actual")
    plt.tight_layout()
    plt.savefig(out_dir / "confusion_matrix.png", dpi=150)
    plt.close()
    print(f"  saved {out_dir / 'confusion_matrix.png'}")

    plt.figure(figsize=(8, 4))
    plt.plot(list(K_RANGE), [s * 100 for s in k_scores], marker="o", color=ACCENT, linewidth=2)
    plt.axvline(k, color="#545454", linestyle="--", label=f"chosen K = {k}")
    plt.title("Test accuracy vs K (elbow method)")
    plt.xlabel("K (number of neighbours)")
    plt.ylabel("Accuracy (%)")
    plt.xticks(list(K_RANGE))
    plt.legend()
    plt.tight_layout()
    plt.savefig(out_dir / "k_vs_accuracy.png", dpi=150)
    plt.close()
    print(f"  saved {out_dir / 'k_vs_accuracy.png'}")

    fig, axes = plt.subplots(2, 2, figsize=(10, 7))
    for ax, feature in zip(axes.flatten(), iris.feature_names):
        for name in iris.target_names:
            ax.hist(df.loc[df["species"] == name, feature], bins=12, alpha=0.75, label=name, color=PALETTE[name])
        ax.set_title(feature)
        ax.set_xlabel("cm")
        ax.set_ylabel("count")
        ax.legend(fontsize=8)
    fig.suptitle("Feature distribution by species", y=1.01)
    plt.tight_layout()
    plt.savefig(out_dir / "feature_distribution.png", dpi=150, bbox_inches="tight")
    plt.close()
    print(f"  saved {out_dir / 'feature_distribution.png'}")

    # --- 9. Predict a new flower ---
    banner("STEP 9: Predict a new flower")
    new_flower = np.array([[5.1, 3.5, 1.4, 0.2]])
    proba = model.predict_proba(scaler.transform(new_flower))[0]
    print("  Input  : sepal 5.1 × 3.5 cm, petal 1.4 × 0.2 cm")
    print(f"  Result : {iris.target_names[int(np.argmax(proba))].upper()}")
    for name, p in zip(iris.target_names, proba):
        print(f"  {name:12} {'█' * int(p * 20):20} {p * 100:5.1f} %")

    print(f"\n{'=' * 60}")
    print(f"  DONE: accuracy {accuracy * 100:.2f} %, F1 {f1:.4f}, K={k}")
    print(f"{'=' * 60}\n")


def main() -> None:
    # Windows consoles default to a legacy code page; make box-drawing characters safe.
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    parser = argparse.ArgumentParser(description="Train and evaluate a KNN classifier on the Iris dataset.")
    parser.add_argument("--k", type=int, default=5, help="number of neighbours (default: 5)")
    parser.add_argument("--out", type=Path, default=Path("assets/charts"), help="directory for the PNG charts")
    parser.add_argument("--no-show", action="store_true", help="never open a plot window (CI / headless)")
    args = parser.parse_args()
    run(k=args.k, out_dir=args.out, show=not args.no_show)


if __name__ == "__main__":
    main()
