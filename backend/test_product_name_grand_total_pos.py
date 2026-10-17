import pytest
from fastapi.testclient import TestClient

import models
import schemas
import vision_provider
from database import Base, engine, SessionLocal
from main import app

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_and_teardown_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)


# =========================================================================
# 1. OCR PRODUCT NAME EXTRACTION TESTS (is_genuine_product_name)
# =========================================================================

def test_genuine_product_names_accepted():
    """
    Verifies genuine products with brands, models, sizes, variants, and numbers are ACCEPTED.
    """
    valid_products = [
        "Tata Salt 1kg",
        "Fortune Sunlite Sunflower Oil 1L",
        "Maggi 2-Minute Noodles 70g",
        "Parle-G Gold Biscuits 250g",
        "Parle-G 100g",
        "Surf Excel Easy Wash Detergent Powder 1kg",
        "Haldiram's Nagpur Aloo Bhujia 400g",
        "iPhone 15 Pro Max 256GB Natural Titanium",
        "Samsung Galaxy S24 Ultra 512GB",
        "Redmi Note 13 Pro 5G (8GB RAM, 256GB)",
        "Amul Taaza Homogenised Toned Milk 500ml",
        "Dettol Original Germ Protection Bathing Soap 125g (Pack of 4)",
        "Good Knight Gold Flash Liquid Vaporizer Refill 45ml",
        "Aashirvaad Superior MP Sharbati Atta 5kg",
        "Cadbury Dairy Milk Silk Chocolate 150g",
    ]
    for prod in valid_products:
        assert vision_provider.is_genuine_product_name(prod) is True, f"Expected '{prod}' to be genuine product"


def test_metadata_and_headers_rejected_as_products():
    """
    Verifies that company/customer names, addresses, dates, invoice numbers,
    GSTIN/HSN codes, table headers, subtotals, grand totals, taxes, bank details,
    terms, and signatures NEVER become inventory products.
    """
    non_products = [
        # Supplier / Company metadata
        "Blink Wholesale Distributors Pvt Ltd",
        "M/S Sharma Kirana & General Store",
        "Vendor Name: Reliance Retail Wholesale",
        "Party Name: Shrinathji Enterprises",
        # Customer metadata & addresses
        "Bill To: Rajesh Kumar",
        "Ship To: Shop No. 12, Main Market, Mumbai 400001",
        "Consignee: Mahesh Patel",
        "Buyer: Amit Sharma",
        # Invoice numbers & dates
        "Invoice No: INV-2026-904",
        "Bill Number: BILL-8821",
        "Invoice Date: 14/10/2026",
        "Date: 2026-10-15",
        "Due Date: 25/10/2026",
        # Standalone Tax / Business / HSN identifiers
        "27AAAAA0000A1Z5",
        "GSTIN: 27AABCT3518Q1ZS",
        "HSN Code: 19053100",
        "SAC Code: 998311",
        "PAN: ABCDE1234F",
        "CIN: U74999MH2018PTC123456",
        # Column headers
        "Description",
        "Item Description",
        "Product Name",
        "Particulars",
        "Quantity",
        "QTY",
        "Rate",
        "Unit Price",
        "Tax %",
        "GST %",
        "Amount",
        "Line Total",
        "Total MRP",
        "Sr No",
        # Subtotals, totals, and financial summaries
        "Subtotal",
        "Sub Total",
        "Grand Total",
        "Invoice Total",
        "Net Payable",
        "Amount Payable",
        "Total Payable",
        "Total Due",
        "Final Amount",
        "Tax Total",
        "Total Tax",
        "Discount",
        "Shipping Charge",
        "Amount Paid",
        "Balance Due",
        "Previous Balance",
        # Bank details, contact info
        "Bank Details: State Bank of India",
        "A/C No: 123456789012",
        "IFSC Code: SBIN0001234",
        "UPI ID: store@okhdfcbank",
        "Phone No: +91 9823044129",
        "Email: support@supplier.com",
        "Website: www.supplierdistributor.com",
        # Document footers, legal terms, signatures
        "Terms & Conditions",
        "Terms and Conditions: Goods once sold will not be taken back",
        "Authorized Signatory",
        "Receiver's Signature",
        "Page 1 of 2",
        "Thank you for your business!",
        # Pure numbers, codes, or blanks
        "",
        "   ",
        "12345",
        "---",
        "19053100",
    ]
    for np in non_products:
        assert vision_provider.is_genuine_product_name(np) is False, f"Expected '{np}' to be rejected as non-product"


# =========================================================================
# 2. INVOICE GRAND TOTAL EXTRACTION FROM BOTTOM TESTS
# =========================================================================

def test_extract_invoice_grand_total_from_bottom_lines():
    """
    Verifies that the printed invoice grand total is correctly identified from
    the lower section / footer area of lines.
    """
    lines = [
        "TAX INVOICE",
        "Blink Wholesale Distributors",
        "Invoice No: INV-2026-904",
        "Item Description | Qty | Rate | Tax | Amount",
        "Tata Salt 1kg | 30 | 20.00 | 5% | 630.00",
        "Fortune Sunlite Oil 1L | 20 | 120.00 | 5% | 2520.00",
        "Parle-G Gold 250g | 40 | 25.00 | 18% | 1180.00",
        "Subtotal: 4100.00",
        "Total Tax: 330.00",
        "Discount: 100.00",
        "Grand Total: 4430.00",
        "Amount Paid: 2000.00",
        "Balance Due: 2430.00",
        "Authorized Signatory",
    ]
    total = vision_provider.extract_invoice_grand_total(lines)
    assert total == 4430.0, f"Expected Grand Total 4430.0, got {total}"


def test_grand_total_distinguished_from_subtotal_and_paid():
    """
    Ensures Subtotal, Taxable Amount, Amount Paid, and Balance Due are NOT confused
    with Grand Total.
    """
    lines = [
        "Item Description | Qty | Amount",
        "Product A | 1 | 500.00",
        "Subtotal: 500.00",
        "Taxable Amount: 500.00",
        "Total Tax: 90.00",
        "Net Payable: 590.00",
        "Amount Paid: 590.00",
        "Balance Due: 0.00",
    ]
    total = vision_provider.extract_invoice_grand_total(lines)
    assert total == 590.0


def test_grand_total_various_bottom_labels():
    """
    Verifies recognition of various printed grand total labels in bottom section.
    """
    test_cases = [
        (["Subtotal: 1000", "Total Tax: 180", "Invoice Total: 1180.00"], 1180.0),
        (["Subtotal: 5000", "Amount Payable: 5500.00", "Thank you"], 5500.0),
        (["Subtotal: 2000", "Total Payable: 2100.00"], 2100.0),
        (["Subtotal: 3000", "Net Total: 3200.00"], 3200.0),
        (["Subtotal: 800", "Total Due: 850.00"], 850.0),
        (["Subtotal: 400", "Final Amount: 420.00"], 420.0),
        (["Subtotal: 1500", "Total Including Tax: 1650.00"], 1650.0),
    ]
    for lines, expected in test_cases:
        res = vision_provider.extract_invoice_grand_total(lines)
        assert res == expected, f"Failed for {lines[-1]}: expected {expected}, got {res}"


def test_grand_total_missing_returns_none():
    """
    Ensures that if no grand total is printed, it returns None without synthesizing
    or fabricating an amount.
    """
    lines = [
        "Invoice Header",
        "Product A | 1 | 100",
        "Product B | 2 | 200",
        "Terms and Conditions apply",
    ]
    assert vision_provider.extract_invoice_grand_total(lines) is None


# =========================================================================
# 3. CONFIRM EXTRACTED INVOICE (INVENTORY CREATION & DEDUPLICATION)
# =========================================================================

def test_confirm_invoice_rejects_non_products_and_creates_genuine():
    """
    Ensures confirm_extracted_invoice filters out metadata/headers, creates only genuine products,
    and updates existing products without duplicate creation while preserving distinct variants.
    """
    db = SessionLocal()
    try:
        payload = {
            "supplier": "Blink Wholesale",
            "items": [
                # Genuine products
                {"name": "Tata Salt 1kg", "qty": 20, "cost_price": 20.0, "selling_price": 28.0, "category": "Grocery"},
                {"name": "Tata Salt 500g", "qty": 15, "cost_price": 12.0, "selling_price": 18.0, "category": "Grocery"},
                # Non-products that must be filtered out
                {"name": "Subtotal", "qty": 1, "cost_price": 0.0, "selling_price": 0.0},
                {"name": "Grand Total", "qty": 1, "cost_price": 0.0, "selling_price": 0.0},
                {"name": "GSTIN: 27AABCT3518Q1ZS", "qty": 1, "cost_price": 0.0, "selling_price": 0.0},
                {"name": "Terms & Conditions", "qty": 1, "cost_price": 0.0, "selling_price": 0.0},
            ],
        }
        resp = client.post("/api/confirm-extracted-invoice", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert data["created_count"] == 2
        assert data["skipped_count"] == 4

        # Verify database has both products as separate items (variants not merged)
        prod_1kg = db.query(models.Product).filter(models.Product.name == "Tata Salt 1kg").first()
        prod_500g = db.query(models.Product).filter(models.Product.name == "Tata Salt 500g").first()
        assert prod_1kg is not None
        assert prod_1kg.stock_qty == 20
        assert prod_500g is not None
        assert prod_500g.stock_qty == 15

        # 2. Re-import invoice with more stock for existing product - should UPDATE stock, not duplicate!
        payload_repeat = {
            "supplier": "Blink Wholesale",
            "items": [
                {"name": "Tata Salt 1kg", "qty": 10, "cost_price": 22.0, "selling_price": 30.0},
            ],
        }
        resp2 = client.post("/api/confirm-extracted-invoice", json=payload_repeat)
        assert resp2.status_code == 200
        assert resp2.json()["updated_count"] == 1
        assert resp2.json()["created_count"] == 0

        db.refresh(prod_1kg)
        assert prod_1kg.stock_qty == 30  # 20 + 10 = 30
        assert prod_1kg.cost_price == 22.0
    finally:
        db.close()


def test_confirm_invoice_rejects_payload_with_zero_genuine_products():
    """
    If the invoice only has noise / headers, confirm_extracted_invoice returns HTTP 400.
    """
    payload = {
        "items": [
            {"name": "Subtotal", "qty": 1},
            {"name": "Grand Total: 5000", "qty": 1},
            {"name": "Authorized Signatory", "qty": 1},
        ]
    }
    resp = client.post("/api/confirm-extracted-invoice", json=payload)
    assert resp.status_code == 400
    assert "No valid product rows identified" in resp.json()["detail"]


# =========================================================================
# 4. POS BILLING & STOCK VALIDATION TESTS
# =========================================================================

def test_pos_sale_validates_stock_and_saves_customer_details():
    """
    Verifies that:
    - POS sale validates requested quantity against available stock.
    - Rejects sale when requested quantity > available stock.
    - Rejects sale for out-of-stock products.
    - Deducts stock correctly on valid sale.
    - Saves customer_name and customer_phone with sale record.
    """
    db = SessionLocal()
    try:
        # Create product with 10 units in stock
        prod = models.Product(
            name="Amul Butter 500g",
            category="Dairy",
            cost_price=220.0,
            selling_price=275.0,
            stock_qty=10,
            reorder_level=5,
        )
        db.add(prod)
        db.commit()
        db.refresh(prod)

        # 1. Attempt sale exceeding available stock (15 units when stock is 10)
        over_request = {
            "customer_name": "Rohan Deshmukh",
            "customer_phone": "9876543210",
            "payment_mode": "Cash",
            "total_amount": 4125.0,
            "total_profit": 825.0,
            "items": [{"product_id": prod.id, "qty": 15, "unit_price": 275.0, "unit_cost": 220.0}],
        }
        resp_over = client.post("/sales/", json=over_request)
        assert resp_over.status_code == 400
        assert "Insufficient stock" in resp_over.json()["detail"]

        # Verify stock remained untouched
        db.refresh(prod)
        assert prod.stock_qty == 10

        # 2. Valid sale (4 units) with customer details
        valid_sale = {
            "customer_name": "Rohan Deshmukh",
            "customer_phone": "9876543210",
            "payment_mode": "UPI",
            "total_amount": 1100.0,
            "total_profit": 220.0,
            "items": [{"product_id": prod.id, "qty": 4, "unit_price": 275.0, "unit_cost": 220.0}],
        }
        resp_valid = client.post("/sales/", json=valid_sale)
        assert resp_valid.status_code == 201
        sale_data = resp_valid.json()
        assert sale_data["customer_name"] == "Rohan Deshmukh"
        assert sale_data["customer_phone"] == "9876543210"
        assert sale_data["total_amount"] == 1100.0

        # Verify stock deducted to 6
        db.refresh(prod)
        assert prod.stock_qty == 6

        # 3. Buy remaining 6 units
        client.post(
            "/sales/",
            json={
                "customer_name": "Anita Verma",
                "customer_phone": "9823000000",
                "payment_mode": "Cash",
                "total_amount": 1650.0,
                "total_profit": 330.0,
                "items": [{"product_id": prod.id, "qty": 6, "unit_price": 275.0, "unit_cost": 220.0}],
            },
        )
        db.refresh(prod)
        assert prod.stock_qty == 0

        # 4. Now out of stock -> subsequent sale attempt must be rejected
        resp_zero = client.post(
            "/sales/",
            json={
                "customer_name": "New Customer",
                "customer_phone": "9811122233",
                "payment_mode": "Cash",
                "total_amount": 275.0,
                "total_profit": 55.0,
                "items": [{"product_id": prod.id, "qty": 1, "unit_price": 275.0, "unit_cost": 220.0}],
            },
        )
        assert resp_zero.status_code == 400
        assert "out of stock" in resp_zero.json()["detail"].lower()
    finally:
        db.close()
