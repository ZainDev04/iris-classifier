"""Unit tests for the model service (no HTTP involved)."""

import pytest

from model import MODEL, ValidationError

SETOSA = {"sepal_length": 5.1, "sepal_width": 3.5, "petal_length": 1.4, "petal_width": 0.2}
VIRGINICA = {"sepal_length": 6.7, "sepal_width": 3.1, "petal_length": 5.6, "petal_width": 2.4}


def test_metrics_are_reproducible():
    m = MODEL.metrics
    assert m["accuracy"] == 93.33
    assert m["f1_weighted"] == 0.9327
    assert m["train_samples"] == 120 and m["test_samples"] == 30
    assert sum(sum(row) for row in m["confusion_matrix"]) == 30


def test_cross_validation_is_reported():
    m = MODEL.metrics
    assert m["cv_folds"] == 5
    assert 90 <= m["cv_accuracy_mean"] <= 100


def test_k_curve_covers_1_to_20():
    kc = MODEL.k_curve
    assert kc["k"] == list(range(1, 21))
    assert len(kc["accuracy"]) == 20
    assert kc["chosen_k"] == 5


@pytest.mark.parametrize("payload,expected", [(SETOSA, "setosa"), (VIRGINICA, "virginica")])
def test_predict_known_examples(payload, expected):
    result = MODEL.predict(payload)
    assert result["species"] == expected
    assert result["confidence"] == 100.0
    assert len(result["neighbors"]) == 5
    assert sum(result["votes"].values()) == 5
    assert abs(sum(result["probabilities"].values()) - 100) < 0.2


def test_neighbors_are_sorted_by_distance():
    result = MODEL.predict(SETOSA)
    distances = [n["distance"] for n in result["neighbors"]]
    assert distances == sorted(distances)


def test_out_of_range_input_produces_warning_not_error():
    result = MODEL.predict({**SETOSA, "sepal_length": 9.5})
    assert result["warnings"] and "outside the training range" in result["warnings"][0]


@pytest.mark.parametrize(
    "payload",
    [
        {},
        {**SETOSA, "petal_width": "abc"},
        {**SETOSA, "petal_width": -1},
        {**SETOSA, "petal_width": 99},
        {**SETOSA, "petal_width": float("nan")},
        "not a dict",
    ],
)
def test_invalid_payloads_raise(payload):
    with pytest.raises(ValidationError):
        MODEL.predict(payload)
