"""Integration tests for the Flask routes."""

SETOSA = {"sepal_length": 5.1, "sepal_width": 3.5, "petal_length": 1.4, "petal_width": 0.2}


def test_home_renders(client):
    r = client.get("/")
    assert r.status_code == 200
    html = r.get_data(as_text=True)
    assert "Iris Species Classifier" in html
    assert "93.33" in html


def test_security_headers(client):
    r = client.get("/")
    assert r.headers["Content-Security-Policy"].startswith("default-src 'self'")
    assert r.headers["X-Content-Type-Options"] == "nosniff"
    assert r.headers["X-Frame-Options"] == "DENY"


def test_health(client):
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.json["status"] == "ok"


def test_model_card(client):
    r = client.get("/api/model")
    assert r.status_code == 200
    body = r.json
    assert body["algorithm"] == "K-Nearest Neighbors"
    assert body["metrics"]["k"] == 5
    assert len(body["k_curve"]["k"]) == 20
    assert set(body["species"]) == {"setosa", "versicolor", "virginica"}


def test_dataset(client):
    r = client.get("/api/dataset")
    assert r.status_code == 200
    assert len(r.json["points"]) == 150
    assert len(r.json["features"]) == 4


def test_predict_json(client):
    r = client.post("/api/predict", json=SETOSA)
    assert r.status_code == 200
    assert r.json["species"] == "setosa"
    assert r.headers["Cache-Control"] == "no-store"


def test_predict_form_encoded(client):
    r = client.post("/api/predict", data=SETOSA)
    assert r.status_code == 200
    assert r.json["species"] == "setosa"


def test_predict_validation_error(client):
    r = client.post("/api/predict", json={"sepal_length": "x"})
    assert r.status_code == 400
    assert "error" in r.json


def test_predict_missing_body(client):
    r = client.post("/api/predict")
    assert r.status_code == 400


def test_legacy_routes_still_work(client):
    assert client.get("/stats").json["accuracy"] == 93.33
    assert client.post("/predict", json=SETOSA).json["species"] == "setosa"


def test_404_is_json_for_api(client):
    r = client.get("/api/nope")
    assert r.status_code == 404
    assert r.json["status"] == 404


def test_404_is_html_for_pages(client):
    r = client.get("/nope")
    assert r.status_code == 404
    assert "text/html" in r.content_type
