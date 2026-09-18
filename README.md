<div align="center">

# Iris Species Classifier

**A K-Nearest Neighbors model with an explainable, interactive web UI.**

[![Live demo](https://img.shields.io/badge/live%20demo-onrender.com-82b440?style=flat-square&logo=render&logoColor=white)](https://iris-classifier-6zdh.onrender.com/)
[![CI](https://img.shields.io/github/actions/workflow/status/ZainDev04/iris-classifier/ci.yml?branch=main&style=flat-square&label=tests)](https://github.com/ZainDev04/iris-classifier/actions)
[![Python](https://img.shields.io/badge/python-3.11%20%7C%203.12-3776ab?style=flat-square&logo=python&logoColor=white)](#getting-started)
[![Lighthouse](https://img.shields.io/badge/lighthouse-100%20%2F%20100%20%2F%20100%20%2F%20100-82b440?style=flat-square&logo=lighthouse&logoColor=white)](#quality)
[![License: MIT](https://img.shields.io/badge/license-MIT-545454?style=flat-square)](LICENSE)

DecodeLabs Industrial Training Kit — Artificial Intelligence · Project 2

[**Try it live**](https://iris-classifier-6zdh.onrender.com/) · [API](#json-api) · [How it works](#how-the-model-is-built) · [Run locally](#getting-started)

</div>

<br>

![Hero screenshot of the Iris classifier web app](assets/screenshot-hero.png)

## What this is

Project 1 taught a machine to answer through hand-written rules. Project 2 flips that around: show the machine labelled examples and let it derive the decision logic itself — **supervised learning**.

The model is a K-Nearest Neighbors classifier trained on the classic Iris dataset (150 flowers, 4 measurements, 3 species). The web app wraps it in a JSON API and a UI that doesn't just print a label — it shows the confidence, the class probabilities, the five training samples that cast the vote, and where your flower sits in feature space.

| Metric | Value |
|---|---|
| Test accuracy (30 held-out samples) | **93.33 %** |
| F1 score (weighted) | **0.9327** |
| 5-fold cross-validated accuracy | **96.00 % ± 2.49** |
| Algorithm | K-Nearest Neighbors, K = 5, Euclidean distance on z-scored features |
| Dataset | Iris — 150 samples, 4 features, 3 balanced classes |

## Features

**Prediction**
- Four sliders paired with exact numeric inputs; predictions run live as you drag (debounced), or manually
- Confidence ring, per-class probability bars and a **nearest-neighbours table** showing exactly which training samples voted and how far away they are
- Out-of-range warnings when a measurement falls outside what the model has seen
- One-click presets for each species plus "random sample" pulled from the real dataset

**Model exploration** — every chart is rendered client-side from the live model, no static images
- Scatter plot of all 150 samples with your input highlighted; switch either axis to any feature
- Confusion matrix heat-map and per-class precision / recall / F1
- Elbow curve of test accuracy for K = 1…20 with hover tooltips
- Per-feature histograms by species

**Engineering**
- Versioned JSON API (`/api/predict`, `/api/model`, `/api/dataset`, `/api/health`) with input validation and JSON error responses
- Strict Content-Security-Policy, no inline scripts/styles, no third-party requests, content-hashed static assets
- 25 pytest cases covering the model service and every route, run in CI on Python 3.11 and 3.12
- Lighthouse **100 / 100 / 100 / 100** (performance, accessibility, best practices, SEO) on mobile and desktop

<details>
<summary><strong>More screenshots</strong></summary>
<br>

![Prediction panel with nearest neighbours](assets/screenshot-predict.png)

![Model performance charts](assets/screenshot-performance.png)

![Mobile layout](assets/screenshot-mobile.png)

</details>

## How the model is built

```
load_iris() ─► StandardScaler ─► train_test_split(80/20, stratified) ─► KNeighborsClassifier(K=5)
                                                                              │
              charts ◄─ elbow method (K=1…20) ◄─ evaluate (accuracy, F1, CM, 5-fold CV) ◄─┘
```

1. **Load** — 150 samples from scikit-learn, 50 per species.
2. **Scale** — z-score every feature. KNN measures Euclidean distance, so without scaling sepal length (4.3–7.9 cm) would dominate petal width (0.1–2.5 cm).
3. **Split** — 80 / 20, stratified so all three species appear in both sets, `random_state=42` for reproducibility.
4. **Train** — KNN stores the scaled training points; the real work happens at prediction time.
5. **Evaluate** — accuracy, weighted F1, confusion matrix and classification report on the held-out 30. Then 5-fold cross-validation on all 150 to check the split wasn't lucky.
6. **Tune K** — sweep K from 1 to 20. K=1 scores marginally higher on this one split but is the definition of over-fitting; K=5 keeps the boundary smooth.
7. **Serve** — the Flask app trains the same pipeline at start-up (~50 ms) and exposes it over JSON.

**Where does it fail?** Setosa is linearly separable and is never mis-classified. The two errors are virginica flowers predicted as versicolor — small virginica specimens overlap the versicolor region in petal space, which the feature-distribution chart makes obvious.

## Getting started

```bash
git clone https://github.com/ZainDev04/iris-classifier.git
cd iris-classifier
python -m venv .venv && source .venv/bin/activate    # Windows: .venv\Scripts\activate
pip install -r requirements-dev.txt
```

**Run the pipeline script** (prints every step, writes charts to `assets/charts/`):

```bash
python classifier.py            # add --k 7 to try another K
```

**Run the web app:**

```bash
cd web
python app.py                   # http://127.0.0.1:5000
```

**Run the tests:**

```bash
python -m pytest
```

## JSON API

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/predict` | Classify a flower. Body: `sepal_length`, `sepal_width`, `petal_length`, `petal_width` (cm). |
| `GET` | `/api/model` | Model card: metrics, confusion matrix, per-class report, K-curve, feature ranges, species metadata. |
| `GET` | `/api/dataset` | All 150 raw samples with labels. |
| `GET` | `/api/health` | Liveness probe. |

```bash
curl -X POST https://iris-classifier-6zdh.onrender.com/api/predict \
  -H "Content-Type: application/json" \
  -d '{"sepal_length":6.0,"sepal_width":2.9,"petal_length":4.5,"petal_width":1.5}'
```

```json
{
  "species": "versicolor",
  "label": "Iris versicolor",
  "confidence": 100.0,
  "probabilities": { "setosa": 0.0, "versicolor": 100.0, "virginica": 0.0 },
  "votes": { "setosa": 0, "versicolor": 5, "virginica": 0 },
  "neighbors": [
    { "species": "versicolor", "distance": 0.0,   "features": [6.0, 2.9, 4.5, 1.5] },
    { "species": "versicolor", "distance": 0.297, "features": [6.1, 3.0, 4.6, 1.4] }
  ],
  "warnings": []
}
```

Invalid input returns `400` with `{"error": "..."}`. The legacy `/predict` and `/stats` routes from v1 still work.

## Project structure

```
iris-classifier/
├── classifier.py            # End-to-end pipeline script (CLI)
├── web/
│   ├── app.py               # Flask routes, security headers, error handling
│   ├── model.py             # IrisModel: training, evaluation, explainable predict()
│   ├── templates/           # index.html (single page), error.html
│   ├── static/
│   │   ├── css/style.css    # Token-driven design system (see DESIGN.md)
│   │   └── js/app.js        # Sliders, live predict, SVG charts — no dependencies
│   ├── requirements.txt     # Runtime deps for the web service
│   └── Procfile
├── tests/                   # pytest: model service + HTTP routes
├── assets/                  # Screenshots and generated charts
├── .github/workflows/ci.yml # Tests on 3.11 / 3.12 + CLI smoke test
├── render.yaml              # One-click deploy blueprint
├── DESIGN.md                # Design tokens, component states, a11y criteria
└── requirements*.txt
```

## Quality

- **Lighthouse** (mobile emulation, throttled): Performance 100 · Accessibility 100 · Best Practices 100 · SEO 100. Desktop: same.
- **Accessibility**: WCAG 2.2 AA contrast throughout, full keyboard operation (tabs, sliders, menu), visible focus rings, ARIA live region for results, `prefers-reduced-motion` honoured, 44 px touch targets.
- **Responsive**: verified at 320, 360, 390, 412, 480, 767, 1024, 1440 px with zero horizontal overflow.
- **Security**: `default-src 'self'` CSP, `X-Frame-Options: DENY`, `nosniff`, referrer policy, no external requests of any kind.
- **Performance**: no web fonts, no images on the page (all charts are inline SVG), ~30 KB CSS + JS uncompressed, zero layout shift.

## Design

The UI follows the "Glitch" design brief: black surface, `#82b440` accent, Helvetica Neue, a 5 px spacing scale, 4 px radii, hard offset shadows and a glitch text treatment on the display heading. Species colours were chosen with a colour-vision-deficiency validator so all three remain distinguishable for protan, deutan and tritan viewers. Full tokens, component state rules and testable acceptance criteria are in [DESIGN.md](DESIGN.md).

## Author

**Shaikh Muhammad Zain**
AI Intern, DecodeLabs (June 2026 batch)
BSc Computer Science (AI specialisation), NED University of Engineering & Technology

[github.com/ZainDev04](https://github.com/ZainDev04)

<sub>Built as part of the DecodeLabs Industrial Training Kit — Artificial Intelligence internship programme. Licensed under MIT.</sub>
