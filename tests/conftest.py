import sys
from pathlib import Path

import pytest

# Make the Flask app importable without installing the project as a package.
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "web"))

from app import app as flask_app  # noqa: E402


@pytest.fixture(scope="session")
def client():
    flask_app.config.update(TESTING=True)
    with flask_app.test_client() as c:
        yield c
