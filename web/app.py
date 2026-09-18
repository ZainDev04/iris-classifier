"""
Iris Classifier — Flask web application.

DecodeLabs | AI Internship Project 2

Routes
------
GET  /                 Single-page UI
POST /api/predict      Classify a flower from four measurements
GET  /api/model        Metrics, confusion matrix, K-curve, species metadata
GET  /api/dataset      The 150 raw samples (for the scatter/histogram charts)
GET  /api/health       Liveness probe

Legacy aliases (/predict, /stats) are kept so older links keep working.

Author: Shaikh Muhammad Zain
"""

from __future__ import annotations

import hashlib
import os
from datetime import timedelta

from flask import Flask, Response, jsonify, render_template, request, url_for
from werkzeug.exceptions import HTTPException

from model import MODEL, ValidationError

APP_VERSION = "2.0.0"
GITHUB_URL = "https://github.com/ZainDev04/iris-classifier"

app = Flask(__name__)
app.config["SEND_FILE_MAX_AGE_DEFAULT"] = timedelta(days=365)
app.json.sort_keys = False


def _asset_version(filename: str) -> str:
    """Short hash of a static file so browsers refetch it whenever it changes."""
    path = os.path.join(app.static_folder, filename)
    try:
        with open(path, "rb") as fh:
            return hashlib.sha1(fh.read()).hexdigest()[:8]
    except OSError:
        return APP_VERSION


@app.context_processor
def inject_helpers() -> dict:
    def static_url(filename: str) -> str:
        return url_for("static", filename=filename, v=_asset_version(filename))

    return {"static_url": static_url}


# ── security / caching headers ────────────────────────────────────────────────

CSP = (
    "default-src 'self'; "
    "script-src 'self'; "
    "style-src 'self'; "
    "img-src 'self' data:; "
    "font-src 'self'; "
    "connect-src 'self'; "
    "object-src 'none'; "
    "base-uri 'self'; "
    "form-action 'self'; "
    "frame-ancestors 'none'"
)


@app.after_request
def set_headers(response: Response) -> Response:
    response.headers.setdefault("Content-Security-Policy", CSP)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    response.headers.setdefault(
        "Permissions-Policy", "camera=(), microphone=(), geolocation=()"
    )
    if request.path.startswith("/api/"):
        response.headers["Cache-Control"] = "no-store"
    elif request.path == "/":
        response.headers["Cache-Control"] = "public, max-age=300"
    return response


# ── pages ─────────────────────────────────────────────────────────────────────

@app.route("/")
def home() -> str:
    m = MODEL.metrics
    return render_template(
        "index.html",
        metrics=m,
        features=MODEL.features,
        species=MODEL.target_names,
        version=APP_VERSION,
        github_url=GITHUB_URL,
    )


@app.route("/robots.txt")
def robots() -> Response:
    return Response("User-agent: *\nAllow: /\n", mimetype="text/plain")


# ── API ───────────────────────────────────────────────────────────────────────

@app.route("/api/predict", methods=["POST"])
def api_predict() -> Response:
    payload = request.get_json(silent=True)
    if payload is None:
        payload = request.form.to_dict() if request.form else None
    try:
        result = MODEL.predict(payload)
    except ValidationError as exc:
        return jsonify({"error": str(exc)}), 400
    return jsonify(result)


@app.route("/api/model")
def api_model() -> Response:
    return jsonify(MODEL.describe())


@app.route("/api/dataset")
def api_dataset() -> Response:
    return jsonify(MODEL.dataset)


@app.route("/api/health")
def api_health() -> Response:
    return jsonify({"status": "ok", "version": APP_VERSION, "k": MODEL.k})


# ── legacy aliases ────────────────────────────────────────────────────────────

@app.route("/predict", methods=["POST"])
def legacy_predict() -> Response:
    return api_predict()


@app.route("/stats")
def legacy_stats() -> Response:
    m = MODEL.metrics
    return jsonify(
        {
            "accuracy": m["accuracy"],
            "f1": m["f1_weighted"],
            "samples": m["total_samples"],
            "classes": m["n_classes"],
            "features": m["n_features"],
            "k": m["k"],
        }
    )


# ── errors ────────────────────────────────────────────────────────────────────

@app.errorhandler(HTTPException)
def handle_http_error(exc: HTTPException):
    if request.path.startswith("/api/") or request.accept_mimetypes.best == "application/json":
        return jsonify({"error": exc.description, "status": exc.code}), exc.code
    return render_template("error.html", code=exc.code, message=exc.description), exc.code


if __name__ == "__main__":
    app.run(
        host=os.environ.get("HOST", "127.0.0.1"),
        port=int(os.environ.get("PORT", 5000)),
        debug=os.environ.get("FLASK_DEBUG", "0") == "1",
    )
