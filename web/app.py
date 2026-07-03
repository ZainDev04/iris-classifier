"""
Iris Classifier Web UI
-----------------------
DecodeLabs | AI Internship Project 2 — Flask Web Interface

Author: Shaikh Muhammad Zain
"""

import numpy as np
from flask import Flask, request, jsonify, render_template
from sklearn.datasets import load_iris
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.neighbors import KNeighborsClassifier
from sklearn.metrics import f1_score, accuracy_score

app = Flask(__name__)

iris     = load_iris()
X, y     = iris.data, iris.target
scaler   = StandardScaler()
X_scaled = scaler.fit_transform(X)

X_train, X_test, y_train, y_test = train_test_split(
    X_scaled, y, test_size=0.2, random_state=42, stratify=y
)

model = KNeighborsClassifier(n_neighbors=5)
model.fit(X_train, y_train)

y_pred   = model.predict(X_test)
ACCURACY = round(accuracy_score(y_test, y_pred) * 100, 2)
F1       = round(f1_score(y_test, y_pred, average='weighted'), 4)

SPECIES_INFO = {
    "setosa":     {"emoji": "🌸", "color": "#4C72B0", "description": "Smallest petals, very easy to identify. Grows in arctic/subarctic regions."},
    "versicolor": {"emoji": "🌺", "color": "#DD8452", "description": "Medium-sized, often found in meadows and wetlands across North America."},
    "virginica":  {"emoji": "🌷", "color": "#55A868", "description": "Largest petals, found in wetter environments. Sometimes confused with Versicolor."},
}

@app.route("/")
def home():
    return render_template("index.html",
        accuracy=ACCURACY, f1=F1,
        species_names=list(iris.target_names),
    )

@app.route("/predict", methods=["POST"])
def predict():
    data = request.get_json(silent=True) or {}
    try:
        features = np.array([[
            float(data["sepal_length"]), float(data["sepal_width"]),
            float(data["petal_length"]), float(data["petal_width"]),
        ]])
    except (KeyError, ValueError):
        return jsonify({"error": "Invalid input"}), 400

    features_scaled = scaler.transform(features)
    prediction      = model.predict(features_scaled)[0]
    probabilities   = model.predict_proba(features_scaled)[0]
    species_name    = iris.target_names[prediction]
    info            = SPECIES_INFO[species_name]

    return jsonify({
        "species":       species_name,
        "emoji":         info["emoji"],
        "color":         info["color"],
        "description":   info["description"],
        "confidence":    round(float(probabilities[prediction]) * 100, 1),
        "probabilities": {
            name: round(float(prob) * 100, 1)
            for name, prob in zip(iris.target_names, probabilities)
        }
    })

@app.route("/stats")
def stats():
    return jsonify({
        "accuracy": ACCURACY, "f1": F1,
        "samples": len(iris.data),
        "classes": int(len(iris.target_names)),
        "features": int(iris.data.shape[1]),
        "k": 5,
    })

if __name__ == "__main__":
    app.run(debug=True, port=5000)
