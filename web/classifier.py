"""
Data Classification Using AI
------------------------------
DecodeLabs | Industrial Training Kit - Artificial Intelligence | Project 2

This project implements a supervised learning pipeline using the Iris dataset.
It demonstrates the full journey from raw data to validated predictions:
load → scale → split → train → predict → evaluate.

Algorithm: K-Nearest Neighbors (KNN)
Dataset:   Iris (150 samples, 4 features, 3 classes)

Author: Shaikh Muhammad Zain
"""

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns

from sklearn.datasets import load_iris
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.neighbors import KNeighborsClassifier
from sklearn.metrics import (
    classification_report,
    confusion_matrix,
    f1_score,
    accuracy_score
)


# ─────────────────────────────────────────────
# STEP 1: LOAD THE DATASET
# ─────────────────────────────────────────────

iris = load_iris()

# Convert to a DataFrame so it's readable (also looks good in GitHub)
df = pd.DataFrame(iris.data, columns=iris.feature_names)
df['species'] = pd.Categorical.from_codes(iris.target, iris.target_names)

print("=" * 55)
print("  DATA CLASSIFICATION USING AI — PROJECT 2")
print("  DecodeLabs | Shaikh Muhammad Zain")
print("=" * 55)

print("\n📊 STEP 1: Dataset Overview")
print(f"   Total samples  : {len(df)}")
print(f"   Features       : {list(iris.feature_names)}")
print(f"   Classes        : {list(iris.target_names)}")
print(f"   Samples/class  : {dict(df['species'].value_counts())}")
print()
print(df.head(5).to_string(index=True))


# ─────────────────────────────────────────────
# STEP 2: FEATURE SCALING
# Standardize so all 4 features are on the
# same scale — critical for KNN since it
# measures distances. Without scaling, a
# feature with large numbers dominates.
# ─────────────────────────────────────────────

X = iris.data   # features (4 measurements)
y = iris.target # labels (0=Setosa, 1=Versicolor, 2=Virginica)

scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)

print("\n📐 STEP 2: Feature Scaling (StandardScaler)")
print(f"   Before scaling — sepal length range: "
      f"{X[:, 0].min():.1f} to {X[:, 0].max():.1f} cm")
print(f"   After scaling  — sepal length range: "
      f"{X_scaled[:, 0].min():.2f} to {X_scaled[:, 0].max():.2f} (standardized)")


# ─────────────────────────────────────────────
# STEP 3: TRAIN / TEST SPLIT
# 80% for training, 20% for testing.
# random_state=42 ensures reproducibility —
# same split every time you run it.
# ─────────────────────────────────────────────

X_train, X_test, y_train, y_test = train_test_split(
    X_scaled, y,
    test_size=0.2,      # 20% goes to testing
    random_state=42,    # reproducible results
    stratify=y          # ensures all 3 classes are represented in both splits
)

print(f"\n✂️  STEP 3: Train/Test Split")
print(f"   Training samples : {len(X_train)} (80%)")
print(f"   Testing samples  : {len(X_test)} (20%)")


# ─────────────────────────────────────────────
# STEP 4: TRAIN THE KNN MODEL
# K=5 means: look at the 5 nearest neighbors
# and take a majority vote.
# ─────────────────────────────────────────────

model = KNeighborsClassifier(n_neighbors=5)
model.fit(X_train, y_train)

print(f"\n🤖 STEP 4: Model Training")
print(f"   Algorithm  : K-Nearest Neighbors")
print(f"   K value    : 5 neighbors")
print(f"   Training   : Complete ✓")


# ─────────────────────────────────────────────
# STEP 5: PREDICTIONS
# ─────────────────────────────────────────────

y_pred = model.predict(X_test)

print(f"\n🔮 STEP 5: Predictions on Test Set")
actual_names    = [iris.target_names[i] for i in y_test]
predicted_names = [iris.target_names[i] for i in y_pred]
results_df = pd.DataFrame({
    'Actual'    : actual_names,
    'Predicted' : predicted_names,
    'Correct'   : ['✓' if a == p else '✗'
                   for a, p in zip(actual_names, predicted_names)]
})
print(results_df.to_string(index=False))


# ─────────────────────────────────────────────
# STEP 6: EVALUATION
# Accuracy alone can be misleading on
# imbalanced datasets. F1 Score (harmonic mean
# of precision and recall) gives a truer picture.
# ─────────────────────────────────────────────

accuracy = accuracy_score(y_test, y_pred)
f1       = f1_score(y_test, y_pred, average='weighted')
cm       = confusion_matrix(y_test, y_pred)

print(f"\n📈 STEP 6: Model Evaluation")
print(f"   Accuracy  : {accuracy * 100:.2f}%")
print(f"   F1 Score  : {f1:.4f}")
print(f"\n   Confusion Matrix:")
print(f"   (rows = actual, columns = predicted)")
cm_df = pd.DataFrame(
    cm,
    index   = [f'Actual: {n}'    for n in iris.target_names],
    columns = [f'Pred: {n}' for n in iris.target_names]
)
print(cm_df.to_string())
print(f"\n   Classification Report:")
print(classification_report(y_test, y_pred, target_names=iris.target_names))


# ─────────────────────────────────────────────
# STEP 7: FIND OPTIMAL K (ELBOW METHOD)
# Test K values from 1 to 20, plot the
# accuracy curve to find the "elbow" — the
# point where adding more neighbors stops
# improving accuracy.
# ─────────────────────────────────────────────

k_range  = range(1, 21)
k_scores = []
for k in k_range:
    knn = KNeighborsClassifier(n_neighbors=k)
    knn.fit(X_train, y_train)
    k_scores.append(accuracy_score(y_test, knn.predict(X_test)))

best_k = k_range[k_scores.index(max(k_scores))]
print(f"\n🎯 STEP 7: Optimal K (Elbow Method)")
print(f"   Best K found : {best_k} (accuracy: {max(k_scores)*100:.2f}%)")


# ─────────────────────────────────────────────
# STEP 8: VISUALIZATIONS
# Save 3 charts as PNG files:
# 1. Confusion matrix heatmap
# 2. K vs Accuracy (elbow curve)
# 3. Feature distribution by species
# ─────────────────────────────────────────────

# --- Chart 1: Confusion Matrix Heatmap ---
plt.figure(figsize=(7, 5))
sns.heatmap(
    cm,
    annot=True, fmt='d',
    cmap='Blues',
    xticklabels=iris.target_names,
    yticklabels=iris.target_names
)
plt.title('Confusion Matrix — KNN Iris Classifier', fontsize=13, pad=12)
plt.xlabel('Predicted Label')
plt.ylabel('Actual Label')
plt.tight_layout()
plt.savefig('confusion_matrix.png', dpi=150)
plt.close()
print("\n📊 Charts saved:")
print("   → confusion_matrix.png")

# --- Chart 2: K vs Accuracy ---
plt.figure(figsize=(8, 4))
plt.plot(k_range, [s * 100 for s in k_scores],
         marker='o', color='steelblue', linewidth=2)
plt.axvline(x=best_k, color='orange', linestyle='--',
            label=f'Best K = {best_k}')
plt.title('K Value vs Accuracy (Elbow Method)', fontsize=13)
plt.xlabel('K (Number of Neighbors)')
plt.ylabel('Accuracy (%)')
plt.legend()
plt.grid(True, alpha=0.3)
plt.tight_layout()
plt.savefig('k_vs_accuracy.png', dpi=150)
plt.close()
print("   → k_vs_accuracy.png")

# --- Chart 3: Feature Distribution ---
fig, axes = plt.subplots(2, 2, figsize=(10, 7))
features = iris.feature_names
colors   = ['#4C72B0', '#DD8452', '#55A868']
for idx, (ax, feature) in enumerate(zip(axes.flatten(), features)):
    for cls_idx, cls_name in enumerate(iris.target_names):
        vals = df[df['species'] == cls_name][feature]
        ax.hist(vals, alpha=0.6, label=cls_name,
                color=colors[cls_idx], bins=12)
    ax.set_title(feature, fontsize=10)
    ax.set_xlabel('cm')
    ax.set_ylabel('Count')
    ax.legend(fontsize=8)
fig.suptitle('Feature Distribution by Species', fontsize=13, y=1.01)
plt.tight_layout()
plt.savefig('feature_distribution.png', dpi=150)
plt.close()
print("   → feature_distribution.png")


# ─────────────────────────────────────────────
# STEP 9: PREDICT A NEW FLOWER
# Show the model being used for a real
# prediction on unseen data — good demo.
# ─────────────────────────────────────────────

print(f"\n🌸 STEP 9: Predict a New Flower")
new_flower = np.array([[5.1, 3.5, 1.4, 0.2]])  # typical Setosa measurements
new_flower_scaled = scaler.transform(new_flower)
prediction = model.predict(new_flower_scaled)
probability = model.predict_proba(new_flower_scaled)

print(f"   Input  : sepal=5.1×3.5cm, petal=1.4×0.2cm")
print(f"   Result : {iris.target_names[prediction[0]].upper()}")
print(f"   Confidence breakdown:")
for name, prob in zip(iris.target_names, probability[0]):
    bar = '█' * int(prob * 20)
    print(f"   {name:12} {bar} {prob*100:.1f}%")

print(f"\n{'=' * 55}")
print(f"  PROJECT 2 COMPLETE ✓")
print(f"  Accuracy: {accuracy*100:.2f}% | F1: {f1:.4f} | K={5}")
print(f"{'=' * 55}\n")
