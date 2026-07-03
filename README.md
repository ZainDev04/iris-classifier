# 🌸 Data Classification Using AI — Iris KNN Classifier

> **DecodeLabs Industrial Training Kit — Artificial Intelligence | Project 2**

A supervised machine learning pipeline that classifies Iris flowers into 3 species using the K-Nearest Neighbors (KNN) algorithm. This project demonstrates the full ML workflow: data loading, feature scaling, train/test splitting, model training, prediction, and evaluation.

---

## 📌 Overview

Project 1 taught machines to respond through explicit rules. Project 2 takes the next step — **supervised learning**: instead of writing rules by hand, we show the machine labeled examples and let it derive its own decision logic.

The Iris dataset is the classic ML benchmark: 150 flower samples, 4 measurements each (sepal length/width, petal length/width), 3 species to classify (Setosa, Versicolor, Virginica).

## ✨ Results

| Metric | Score |
|---|---|
| **Accuracy** | 93.33% |
| **F1 Score (weighted)** | 0.9327 |
| **Algorithm** | K-Nearest Neighbors (K=5) |
| **Dataset** | Iris (150 samples, 4 features, 3 classes) |

## 🧠 Full Pipeline

```
Raw Data → Feature Scaling → Train/Test Split (80/20) → KNN Training → Predictions → Evaluation
```

**Step 1 — Load Dataset:** 150 Iris samples from scikit-learn, with 4 features and 3 class labels.

**Step 2 — Feature Scaling:** StandardScaler normalizes all features to mean=0, variance=1. Critical for KNN since it measures distances — without scaling, larger-valued features would dominate unfairly.

**Step 3 — Train/Test Split:** 80% (120 samples) for training, 20% (30 samples) for testing. Stratified to ensure all 3 classes appear in both sets.

**Step 4 — KNN Training:** `KNeighborsClassifier(n_neighbors=5)`. The model memorizes the training data and classifies new points by majority vote among the 5 nearest neighbors.

**Step 5 — Predictions:** Model predicts the species of each test sample.

**Step 6 — Evaluation:** Accuracy, F1 Score, Confusion Matrix, and Classification Report.

**Step 7 — Elbow Method:** Tests K values 1–20 to find the optimal K.

**Step 8 — Visualizations:** Confusion matrix heatmap, K vs Accuracy curve, feature distribution charts.

**Step 9 — New Prediction:** Demonstrates classifying an unseen flower with confidence scores.

## 📊 Visualizations

Three charts are generated automatically when the script runs:

- `confusion_matrix.png` — heatmap showing correct vs incorrect predictions per class
- `k_vs_accuracy.png` — elbow curve for finding the best K value
- `feature_distribution.png` — histogram of all 4 features separated by species

## 🛠 Tech Stack

- **Language:** Python 3
- **Libraries:** scikit-learn, pandas, numpy, matplotlib, seaborn

## 🚀 Getting Started

```bash
git clone https://github.com/ZainDev04/Iris-Classifier.git
cd Iris-Classifier
pip install -r requirements.txt
python classifier.py
```

## 🔑 Key Concepts Demonstrated

**Why KNN?** Simple, interpretable, no training phase — it just remembers the data and compares distances at prediction time. A perfect first supervised learning algorithm.

**Why Feature Scaling?** KNN uses Euclidean distance. If sepal length ranges 4–8cm but petal width ranges 0.1–2.5cm, the sepal length will dominate every distance calculation. StandardScaler puts all features on equal footing.

**Why F1 Score over Accuracy?** On balanced datasets like Iris, accuracy is fine. But F1 (harmonic mean of precision and recall) is more robust for real-world imbalanced data — a habit worth building from the start.

**Confusion Matrix insight:** The model perfectly classifies Setosa (very distinct measurements), but occasionally confuses Versicolor and Virginica (they overlap in feature space) — exactly what the petal distribution chart shows visually.

## 📂 Project Structure

```
iris-classifier/
├── classifier.py           # Full ML pipeline
├── requirements.txt        # Dependencies
├── confusion_matrix.png    # Generated on run
├── k_vs_accuracy.png       # Generated on run
├── feature_distribution.png # Generated on run
└── README.md
```

## 👤 Author

**Shaikh Muhammad Zain**
AI Intern, DecodeLabs (June 2026 Batch)
Third-year Computer Science (AI Specialization), NED University of Engineering & Technology

---

*This project was completed as part of the DecodeLabs Industrial Training Kit — Artificial Intelligence Internship Program.*
