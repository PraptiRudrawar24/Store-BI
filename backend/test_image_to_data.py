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

def test_extract_invoice_mock_mode_when_no_api_key(monkeypatch):
    """When GEMINI_API_KEY is not set, returns clearly labeled mock extraction result."""
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
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


def test_confirmed_invoice_keeps_extracted_line_fields_and_printed_totals():
    response = client.post("/api/confirm-extracted-invoice", json={
        "supplier": "Invoice Supplier",
        "invoice_number": "INV-206",
        "invoice_date": "2026-10-12",
        "currency": "INR",
        "subtotal": 200.0,
        "tax": 10.0,
        "total": 210.0,
        "items": [{
            "name": "Toor Dal 1kg",
            "qty": 10,
            "cost_price": 20.0,
            "selling_price": 25.0,
            "mrp_unit": 25.0,
            "line_total": 210.0,
            "tax_rate": 5.0,
            "tax_amount": 10.0,
            "taxable_amount": 200.0,
            "hsn_code": "0713",
            "batch_number": "B-104",
            "discount": "5%",
            "other_fields": {"Supplier Ref": "PO-71"},
        }],
    })

    assert response.status_code == 200
    invoice = client.get(f"/invoices/{response.json()['invoice_id']}").json()
    assert invoice["total_amount"] == 210.0
    assert invoice["subtotal"] == 200.0
    assert invoice["tax_amount"] == 10.0
    item = invoice["items"][0]
    assert item["cost_price"] == 20.0
    assert item["mrp_unit"] == 25.0
    assert item["line_total"] == 210.0
    assert item["hsn_code"] == "0713"
    assert item["batch_number"] == "B-104"
    assert item["other_fields"] == {"Supplier Ref": "PO-71"}


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


def test_gemini_model_fallback_skips_unavailable_model(monkeypatch):
    """Uses current supported Gemini models and falls through when one is unavailable."""
    import vision_provider

    calls = []

    class MockResponse:
        def __init__(self, status_code, payload):
            self.status_code = status_code
            self._payload = payload
            self.text = str(payload)

        def json(self):
            return self._payload

    class MockAsyncClient:
        def __init__(self, timeout):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, traceback):
            return None

        async def post(self, url, headers, json):
            calls.append(url)
            if len(calls) == 1:
                return MockResponse(404, {"error": {"message": "model not found"}})
            return MockResponse(200, {
                "candidates": [{
                    "content": {"parts": [{"text": '{"items": []}'}]},
                }],
            })

    async def no_local_ocr(*args, **kwargs):
        return None

    monkeypatch.setenv("GEMINI_API_KEY", "test-gemini-key")
    monkeypatch.setattr(vision_provider.httpx, "AsyncClient", MockAsyncClient)
    monkeypatch.setattr(vision_provider, "is_pdf", lambda *args, **kwargs: False)
    monkeypatch.setattr(
        vision_provider,
        "preprocess_image_for_ocr",
        lambda image_bytes: (b"processed-image", "image/jpeg", (1, 1)),
    )
    monkeypatch.setattr(vision_provider, "extract_with_local_ocr", no_local_ocr)

    result = vision_provider.extract_invoice_from_image_sync(b"source-image", "image/jpeg")

    assert "gemini-1.5-" not in " ".join(vision_provider.GEMINI_MODELS)
    assert len(calls) == 2
    assert f"/{vision_provider.GEMINI_MODELS[0]}:generateContent" in calls[0]
    assert f"/{vision_provider.GEMINI_MODELS[1]}:generateContent" in calls[1]
    assert result["ocr_engine"] == f"Gemini Vision AI ({vision_provider.GEMINI_MODELS[1]})"


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


def test_extract_invoice_reference_schema_mapping(monkeypatch):
    """Verifies that reference dataset schema format (vendor, date, description, quantity, unit_price, amount) is cleanly ingested."""
    import vision_provider

    async def mock_reference_extraction(*args, **kwargs):
        raw_items = [
            {
                "description": "Premium Basmati Rice 5kg",
                "quantity": 10,
                "unit_price": 450.0,
                "amount": 4500.0,
            },
            {
                "description": "Sunflower Oil 1L",
                "quantity": 20,
                "unit_price": 120.0,
                "amount": 2400.0,
            }
        ]
        validated = vision_provider.validate_and_correct_items(raw_items)
        return {
            "supplier": "Acme Global Wholesalers",
            "vendor": "Acme Global Wholesalers",
            "invoice_number": "INV-104",
            "invoice_date": "2026-08-09",
            "date": "2026-08-09",
            "currency": "USD",
            "subtotal": 6900.0,
            "tax": 345.0,
            "total": 7245.0,
            "items": validated,
            "is_mock": False,
            "ocr_engine": "Claude Vision AI (claude-sonnet-4-6)",
            "message": "Extracted 2 items",
        }

    monkeypatch.setattr(vision_provider, "extract_invoice_from_image", mock_reference_extraction)

    img_bytes = create_test_image_bytes("JPEG")
    files = {"file": ("invoice_sample.jpg", img_bytes, "image/jpeg")}

    res = client.post("/api/extract-invoice", files=files)
    assert res.status_code == 200
    data = res.json()

    # Verify header metadata
    assert data["supplier"] == "Acme Global Wholesalers"
    assert data["vendor"] == "Acme Global Wholesalers"
    assert data["invoice_number"] == "INV-104"
    assert data["invoice_date"] == "2026-08-09"
    assert data["date"] == "2026-08-09"
    assert data["currency"] == "USD"
    assert data["subtotal"] == 6900.0
    assert data["tax"] == 345.0
    assert data["total"] == 7245.0

    # Verify line items have both standard and reference keys
    assert len(data["items"]) == 2
    item1 = data["items"][0]
    assert item1["name"] == "Premium Basmati Rice 5kg"
    assert item1["description"] == "Premium Basmati Rice 5kg"
    assert item1["qty"] == 10
    assert item1["quantity"] == 10
    assert item1["cost_price"] == 450.0
    assert item1["unit_price"] == 450.0
    assert item1["line_total"] == 4500.0
    assert item1["amount"] == 4500.0


def test_extract_invoice_response_keeps_distinct_rate_mrp_and_invoice_fields(monkeypatch):
    import vision_provider

    async def mock_extraction(*args, **kwargs):
        return {
            "supplier": "Invoice Supplier",
            "invoice_number": "INV-205",
            "invoice_date": "2026-10-12",
            "currency": "INR",
            "items": vision_provider.validate_and_correct_items([{
                "description": "Toor Dal 1kg",
                "quantity": 10,
                "rate": 20.0,
                "mrp": 25.0,
                "amount": 200.0,
                "taxable_amount": 190.0,
                "tax_amount": 9.5,
                "discount": "5%",
                "hsn_code": "0713",
                "batch_number": "B-104",
                "expiry_date": "2027-12-31",
                "custom_invoice_column": "PO-71",
            }]),
            "is_mock": False,
        }

    monkeypatch.setattr(vision_provider, "extract_invoice_from_image", mock_extraction)
    response = client.post(
        "/api/extract-invoice",
        files={"file": ("invoice.jpg", create_test_image_bytes(), "image/jpeg")},
    )

    assert response.status_code == 200
    item = response.json()["items"][0]
    assert item["cost_price"] == item["unit_price"] == 20.0
    assert item["mrp_unit"] == 25.0
    assert item["line_total"] == item["amount"] == 200.0
    assert item["taxable_amount"] == 190.0
    assert item["tax_amount"] == 9.5
    assert item["discount_percent"] == 5.0
    assert item["hsn_code"] == "0713"
    assert item["batch_number"] == "B-104"
    assert item["expiry_date"] == "2027-12-31"
    assert item["other_fields"] == {"custom_invoice_column": "PO-71"}


def test_validate_and_correct_items_swapped_rate_and_total():
    """When OCR inverts Unit Rate and Row Total (cost_price > line_total when qty > 1), it must self-correct."""
    import vision_provider

    inverted_items = [
        {
            "description": "Sugar 1kg",
            "quantity": 10,
            "unit_price": 400.0,  # Actually row total (10 * 40)
            "amount": 40.0,       # Actually unit rate
        }
    ]
    corrected = vision_provider.validate_and_correct_items(inverted_items)
    assert len(corrected) == 1
    assert corrected[0]["qty"] == 10
    assert corrected[0]["cost_price"] == 40.0   # Corrected unit price
    assert corrected[0]["unit_price"] == 40.0
    assert corrected[0]["line_total"] == 400.0  # Corrected line total
    assert corrected[0]["amount"] == 400.0


@pytest.mark.anyio
async def test_extract_with_local_ocr_synthetic_invoice():
    """Verifies that Windows Media OCR reads line items and metadata from an invoice image."""
    import vision_provider
    from PIL import ImageDraw

    img = Image.new("RGB", (900, 600), color="white")
    draw = ImageDraw.Draw(img)
    draw.text((300, 20), "BALAJI WHOLESALE MART", fill="black")
    draw.text((50, 60), "Invoice No: BAL-2024-99", fill="black")
    draw.text((600, 60), "Date: 12/10/2024", fill="black")

    draw.text((50, 150), "Tata Salt 1kg", fill="black")
    draw.text((450, 150), "10", fill="black")
    draw.text((550, 150), "24.00", fill="black")
    draw.text((700, 150), "240.00", fill="black")

    draw.text((50, 200), "Fortune Oil 1L", fill="black")
    draw.text((450, 200), "5", fill="black")
    draw.text((550, 200), "135.00", fill="black")
    draw.text((700, 200), "675.00", fill="black")

    buf = io.BytesIO()
    img.save(buf, format="JPEG")

    res = await vision_provider.extract_with_local_ocr(buf.getvalue())
    if res is not None:
        assert res["is_mock"] is False
        assert "BALAJI" in res["supplier"].upper()
        assert len(res["items"]) >= 1
        assert res["ocr_engine"] == "Windows Native OCR"
