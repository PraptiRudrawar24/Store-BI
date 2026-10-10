import io
import pytest
from fastapi.testclient import TestClient
from PIL import Image
from main import app
from database import Base, engine
import models

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_and_teardown():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

def create_test_image_bytes(format="JPEG"):
    """Creates in-memory image bytes for test uploads."""
    img = Image.new("RGB", (200, 100), color=(255, 255, 255))
    buf = io.BytesIO()
    img.save(buf, format=format)
    return buf.getvalue()

def test_extract_invoice_mock_mode_when_no_api_key():
    """When GEMINI_API_KEY is not set, returns clearly labeled mock extraction result."""
    img_bytes = create_test_image_bytes("PNG")
    files = {"file": ("test_invoice.png", img_bytes, "image/png")}

    res = client.post("/api/extract-invoice", files=files)
    assert res.status_code == 200
    data = res.json()

    assert data["is_mock"] is True
    assert "MOCK MODE" in data["message"]
    assert data["supplier"] is not None
    assert len(data["items"]) >= 3

    # Check item structure
    item = data["items"][0]
    assert "name" in item
    assert "qty" in item
    assert "cost_price" in item
    assert "expiry_date" in item
    assert "confidence" in item

    # Verify that EXTRACTION ALONE does NOT save anything to DB!
    products = client.get("/products/").json()
    assert len(products) == 0

def test_extract_invoice_corrupted_image_handling():
    """Unreadable or corrupted image files must return friendly HTTP 400 error."""
    corrupt_bytes = b"not a real image content, just random text"
    files = {"file": ("corrupt.jpg", corrupt_bytes, "image/jpeg")}

    res = client.post("/api/extract-invoice", files=files)
    assert res.status_code == 400
    assert "Unreadable image" in res.json()["detail"]

def test_confirm_extracted_invoice_updates_existing_and_creates_new():
    """Confirming extracted invoice updates existing matched products (+qty) and creates new ones."""
    # 1. Pre-populate an existing product: Tata Salt with stock = 20
    existing = client.post("/products/", json={
        "name": "Tata Salt 1kg",
        "category": "Grocery",
        "cost_price": 20.0,
        "selling_price": 28.0,
        "stock_qty": 20,
        "reorder_level": 10
    }).json()

    # 2. Confirm invoice payload:
    # - Tata Salt: action="update", matched_product_id=existing['id'], qty=30 -> new stock should be 50
    # - New Product: action="create", name="Fortune Sunflower Oil 1L", qty=15 -> new product created
    confirm_payload = {
        "supplier": "Metro Cash & Carry",
        "invoice_date": "2026-10-08",
        "items": [
            {
                "name": "Tata Salt 1kg",
                "qty": 30,
                "cost_price": 22.0,
                "selling_price": 28.0,
                "category": "Grocery",
                "expiry_date": "2027-12-31",
                "action": "update",
                "matched_product_id": existing["id"]
            },
            {
                "name": "Fortune Sunflower Oil 1L",
                "qty": 15,
                "cost_price": 130.0,
                "selling_price": 155.0,
                "category": "Grocery",
                "expiry_date": None,
                "action": "create",
                "matched_product_id": None
            }
        ]
    }

    confirm_res = client.post("/api/confirm-extracted-invoice", json=confirm_payload)
    assert confirm_res.status_code == 200
    result = confirm_res.json()
    assert result["success"] is True
    assert result["updated_count"] == 1
    assert result["created_count"] == 1
    assert result["total_items"] == 2

    # 3. Verify in DB
    updated_tata = client.get(f"/products/{existing['id']}").json()
    assert updated_tata["stock_qty"] == 50  # 20 + 30
    assert updated_tata["cost_price"] == 22.0

    all_prods = client.get("/products/").json()
    assert len(all_prods) == 2
    oil = next(p for p in all_prods if "Fortune" in p["name"])
    assert oil["stock_qty"] == 15
    assert oil["cost_price"] == 130.0
    assert oil["selling_price"] == 155.0

def test_extract_invoice_api_failure_handling(monkeypatch):
    """API failures from LLM/network must return friendly HTTP 502 with detail."""
    import vision_provider

    async def mock_extract_failure(*args, **kwargs):
        raise vision_provider.VisionApiError("Gemini API connection timed out. Please retry.")

    monkeypatch.setattr(vision_provider, "extract_invoice_from_image", mock_extract_failure)

    img_bytes = create_test_image_bytes("JPEG")
    files = {"file": ("test_invoice.jpg", img_bytes, "image/jpeg")}

    res = client.post("/api/extract-invoice", files=files)
    assert res.status_code == 502
    assert "Vision extraction failed" in res.json()["detail"]
    assert "timed out" in res.json()["detail"]

def test_extract_invoice_bad_json_handling(monkeypatch):
    """Invalid JSON returned by LLM must return friendly HTTP 422 with detail."""
    import vision_provider

    async def mock_bad_json(*args, **kwargs):
        raise vision_provider.VisionBadJsonError("Unparseable response text from model.")

    monkeypatch.setattr(vision_provider, "extract_invoice_from_image", mock_bad_json)

    img_bytes = create_test_image_bytes("JPEG")
    files = {"file": ("test_invoice.jpg", img_bytes, "image/jpeg")}

    res = client.post("/api/extract-invoice", files=files)
    assert res.status_code == 422
    assert "Failed to parse items" in res.json()["detail"]

