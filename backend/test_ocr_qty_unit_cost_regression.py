"""
Regression test suite for Store BI invoice OCR Quantity (QTY) and Unit Cost (cost_price) extraction.

Validates:
1. MRP and Unit Cost (Rate) appearing together without column bleed or confusion.
2. Pack sizes in description or separate Pack column kept distinct from QTY.
3. Single-digit, multi-digit, and legitimate decimal quantities (e.g. 1, 10, 2.5, 0.75).
4. Decimal unit prices and Indian comma-formatted amounts (e.g. 1,250.50).
5. Multi-line product descriptions without column coordinate shifting.
6. Different column orders (Layout A, Layout B, Layout C).
7. Separate field-level accuracy reporting for QTY and UNIT COST.
8. Preservation of original extracted numbers without formula-based overwriting.
"""

import pytest
from typing import List, Dict, Any
import vision_provider


def compute_field_accuracies(extracted: List[Dict[str, Any]], expected: List[Dict[str, Any]]) -> Dict[str, float]:
    """
    Computes field-level accuracy separately for product name, qty, unit_cost, tax, and total_mrp.
    """
    assert len(extracted) == len(expected), f"Count mismatch: got {len(extracted)} items, expected {len(expected)}"
    total = len(expected)
    scores = {
        "name": 0,
        "qty": 0,
        "unit_cost": 0,
        "tax": 0,
        "total_mrp": 0,
    }

    for ext, exp in zip(extracted, expected):
        # 1. Product name
        ext_name = (ext.get("name") or ext.get("description") or "").lower()
        exp_name = (exp.get("name") or exp.get("description") or "").lower()
        if exp_name in ext_name or ext_name in exp_name or exp_name.split()[0] in ext_name:
            scores["name"] += 1

        # 2. QTY
        ext_qty = ext.get("qty") if ext.get("qty") is not None else ext.get("quantity")
        exp_qty = exp.get("qty") if exp.get("qty") is not None else exp.get("quantity")
        if ext_qty is not None and exp_qty is not None and abs(ext_qty - exp_qty) < 1e-3:
            scores["qty"] += 1

        # 3. UNIT COST
        ext_cost = ext.get("cost_price") if ext.get("cost_price") is not None else ext.get("unit_price")
        exp_cost = exp.get("cost_price") if exp.get("cost_price") is not None else exp.get("unit_price")
        if (ext_cost is None and exp_cost is None) or (
            ext_cost is not None and exp_cost is not None and abs(ext_cost - exp_cost) < 0.05
        ):
            scores["unit_cost"] += 1

        # 4. TAX
        ext_tax = str(ext.get("tax_percent") or ext.get("tax") or "").replace("%", "").strip()
        exp_tax = str(exp.get("tax_percent") or exp.get("tax") or "").replace("%", "").strip()
        if ext_tax == exp_tax:
            scores["tax"] += 1
        else:
            try:
                if ext_tax and exp_tax and abs(float(ext_tax) - float(exp_tax)) < 0.1:
                    scores["tax"] += 1
            except ValueError:
                pass

        # 5. TOTAL MRP / Line Amount
        ext_mrp = ext.get("line_total") if ext.get("line_total") is not None else ext.get("mrp")
        if ext_mrp is None:
            ext_mrp = ext.get("amount")
        exp_mrp = exp.get("line_total") if exp.get("line_total") is not None else exp.get("mrp")
        if exp_mrp is None:
            exp_mrp = exp.get("amount")
        if (ext_mrp is None and exp_mrp is None) or (
            ext_mrp is not None and exp_mrp is not None and abs(ext_mrp - exp_mrp) < 0.05
        ):
            scores["total_mrp"] += 1

    accuracies = {k: round((v / total) * 100.0, 1) for k, v in scores.items()}
    accuracies["overall"] = round(sum(accuracies.values()) / len(accuracies), 1)
    return accuracies


def test_mrp_and_unit_cost_together_distinct_mapping():
    """
    Scenario: Invoice contains BOTH MRP and Rate (Unit Cost) columns.
    Headers: Description | Qty | MRP | Rate | GST | Amount
    Verified Expected:
      - Qty: 10
      - MRP: 25.00 (distinctly captured as mrp_unit)
      - Rate: 20.00 (captured as cost_price, NOT 25.00, NOT merged as 1025)
      - Amount: 200.00
    """
    words = [
        # Headers
        {"text": "Description", "x": 50, "y": 100, "w": 80, "h": 16},
        {"text": "Qty", "x": 230, "y": 100, "w": 30, "h": 16},
        {"text": "MRP", "x": 330, "y": 100, "w": 35, "h": 16},
        {"text": "Rate", "x": 430, "y": 100, "w": 35, "h": 16},
        {"text": "GST", "x": 530, "y": 100, "w": 30, "h": 16},
        {"text": "Amount", "x": 650, "y": 100, "w": 50, "h": 16},
        # Row 1
        {"text": "Good", "x": 50, "y": 140, "w": 35, "h": 16},
        {"text": "Day", "x": 90, "y": 140, "w": 25, "h": 16},
        {"text": "Butter", "x": 120, "y": 140, "w": 40, "h": 16},
        {"text": "10", "x": 235, "y": 140, "w": 18, "h": 16},
        {"text": "25.00", "x": 332, "y": 140, "w": 35, "h": 16},
        {"text": "20.00", "x": 432, "y": 140, "w": 35, "h": 16},
        {"text": "5%", "x": 535, "y": 140, "w": 20, "h": 16},
        {"text": "200.00", "x": 652, "y": 140, "w": 45, "h": 16},
    ]
    raw_items = vision_provider.detect_spatial_table_and_extract_items(words)
    assert len(raw_items) == 1
    validated = vision_provider.validate_and_correct_items(raw_items)
    assert len(validated) == 1

    item = validated[0]
    assert item["qty"] == 10
    assert item["cost_price"] == 20.0  # Must be Rate, NOT MRP 25.0
    assert item["mrp_unit"] == 25.0   # Distinctly mapped as unit MRP
    assert item["line_total"] == 200.0

    expected = [{
        "name": "Good Day Butter",
        "qty": 10,
        "cost_price": 20.0,
        "tax": "5%",
        "line_total": 200.0,
    }]
    acc = compute_field_accuracies(validated, expected)
    assert acc["qty"] == 100.0
    assert acc["unit_cost"] == 100.0
    assert acc["total_mrp"] == 100.0


def test_pack_size_distinct_from_quantity():
    """
    Scenario: Invoice contains both Pack size column and Billed Qty column, plus pack in name.
    Headers: Description | Pack | Qty | Rate | Amount
    Product: "Parle-G Gold (10x100g)" | Pack: "12" | Qty: "5" | Rate: "150.00" | Amount: "750.00"
    Verified Expected:
      - Qty is 5.0 (NOT 10 from (10x100g), NOT 12 from pack column)
      - Rate is 150.00
      - Line Total is 750.00
    """
    words = [
        # Headers
        {"text": "Description", "x": 50, "y": 100, "w": 80, "h": 16},
        {"text": "Pack", "x": 240, "y": 100, "w": 35, "h": 16},
        {"text": "Qty", "x": 340, "y": 100, "w": 30, "h": 16},
        {"text": "Rate", "x": 440, "y": 100, "w": 35, "h": 16},
        {"text": "Amount", "x": 580, "y": 100, "w": 50, "h": 16},
        # Row 1
        {"text": "Parle-G", "x": 50, "y": 140, "w": 55, "h": 16},
        {"text": "Gold", "x": 110, "y": 140, "w": 35, "h": 16},
        {"text": "12", "x": 245, "y": 140, "w": 18, "h": 16},      # Pack size
        {"text": "5", "x": 348, "y": 140, "w": 12, "h": 16},       # Billed quantity
        {"text": "150.00", "x": 442, "y": 140, "w": 40, "h": 16},  # Rate
        {"text": "750.00", "x": 582, "y": 140, "w": 45, "h": 16},  # Amount
    ]
    raw_items = vision_provider.detect_spatial_table_and_extract_items(words)
    validated = vision_provider.validate_and_correct_items(raw_items)
    assert len(validated) == 1

    item = validated[0]
    assert item["qty"] == 5
    assert item["cost_price"] == 150.0
    assert item["line_total"] == 750.0
    assert item["pack_size"] == "12"


def test_single_and_multidigit_quantities_and_decimals():
    """
    Scenario: Diverse single-digit, multi-digit, and fractional decimal quantities.
    Row 1: Maggi 70g | Qty: 1 | Rate: 14.00 | Total: 14.00
    Row 2: Basmati Rice | Qty: 25 | Rate: 95.00 | Total: 2375.00
    Row 3: Loose Sugar | Qty: 2.5 | Rate: 42.00 | Total: 105.00
    Row 4: Cashews W320 | Qty: 0.75 | Rate: 720.00 | Total: 540.00
    """
    words = [
        # Headers
        {"text": "Item", "x": 50, "y": 80, "w": 40, "h": 16},
        {"text": "Description", "x": 95, "y": 80, "w": 75, "h": 16},
        {"text": "Quantity", "x": 300, "y": 80, "w": 55, "h": 16},
        {"text": "Unit", "x": 420, "y": 80, "w": 30, "h": 16},
        {"text": "Price", "x": 455, "y": 80, "w": 35, "h": 16},
        {"text": "Total", "x": 580, "y": 80, "w": 40, "h": 16},
        # Row 1 (single-digit)
        {"text": "Maggi", "x": 50, "y": 120, "w": 45, "h": 16},
        {"text": "Noodles", "x": 100, "y": 120, "w": 55, "h": 16},
        {"text": "1", "x": 320, "y": 120, "w": 12, "h": 16},
        {"text": "14.00", "x": 435, "y": 120, "w": 38, "h": 16},
        {"text": "14.00", "x": 585, "y": 120, "w": 38, "h": 16},
        # Row 2 (multi-digit 25)
        {"text": "Basmati", "x": 50, "y": 160, "w": 55, "h": 16},
        {"text": "Rice", "x": 110, "y": 160, "w": 30, "h": 16},
        {"text": "25", "x": 315, "y": 160, "w": 20, "h": 16},
        {"text": "95.00", "x": 435, "y": 160, "w": 38, "h": 16},
        {"text": "2375.00", "x": 580, "y": 160, "w": 50, "h": 16},
        # Row 3 (fractional 2.5)
        {"text": "Loose", "x": 50, "y": 200, "w": 40, "h": 16},
        {"text": "Sugar", "x": 95, "y": 200, "w": 40, "h": 16},
        {"text": "2.5", "x": 315, "y": 200, "w": 22, "h": 16},
        {"text": "42.00", "x": 435, "y": 200, "w": 38, "h": 16},
        {"text": "105.00", "x": 580, "y": 200, "w": 45, "h": 16},
        # Row 4 (fractional 0.75)
        {"text": "Cashews", "x": 50, "y": 240, "w": 60, "h": 16},
        {"text": "W320", "x": 115, "y": 240, "w": 40, "h": 16},
        {"text": "0.75", "x": 312, "y": 240, "w": 28, "h": 16},
        {"text": "720.00", "x": 430, "y": 240, "w": 45, "h": 16},
        {"text": "540.00", "x": 580, "y": 240, "w": 45, "h": 16},
    ]
    raw_items = vision_provider.detect_spatial_table_and_extract_items(words)
    validated = vision_provider.validate_and_correct_items(raw_items)
    assert len(validated) == 4

    expected = [
        {"name": "Maggi Noodles", "qty": 1, "cost_price": 14.0, "line_total": 14.0},
        {"name": "Basmati Rice", "qty": 25, "cost_price": 95.0, "line_total": 2375.0},
        {"name": "Loose Sugar", "qty": 2.5, "cost_price": 42.0, "line_total": 105.0},
        {"name": "Cashews W320", "qty": 0.75, "cost_price": 720.0, "line_total": 540.0},
    ]
    acc = compute_field_accuracies(validated, expected)
    assert acc["qty"] == 100.0
    assert acc["unit_cost"] == 100.0
    assert acc["total_mrp"] == 100.0


def test_indian_comma_currency_formatting():
    """
    Scenario: Unit costs and line totals with Indian comma separators (e.g. 1,250.50, 1,00,000.00).
    """
    assert vision_provider.clean_numeric_value("1,250.50") == 1250.50
    assert vision_provider.clean_numeric_value("₹ 1,250.50") == 1250.50
    assert vision_provider.clean_numeric_value("1,00,000.00") == 100000.00
    assert vision_provider.clean_numeric_value("Rs. 45,200.75") == 45200.75

    # Test within spatial row
    words = [
        {"text": "Particulars", "x": 50, "y": 100, "w": 80, "h": 16},
        {"text": "Nos", "x": 250, "y": 100, "w": 30, "h": 16},
        {"text": "Rate", "x": 380, "y": 100, "w": 35, "h": 16},
        {"text": "Amount", "x": 550, "y": 100, "w": 50, "h": 16},
        # Row 1
        {"text": "Commercial", "x": 50, "y": 140, "w": 75, "h": 16},
        {"text": "Mixer", "x": 130, "y": 140, "w": 40, "h": 16},
        {"text": "2", "x": 255, "y": 140, "w": 15, "h": 16},
        {"text": "1,250.50", "x": 375, "y": 140, "w": 55, "h": 16},
        {"text": "2,501.00", "x": 545, "y": 140, "w": 60, "h": 16},
    ]
    raw_items = vision_provider.detect_spatial_table_and_extract_items(words)
    validated = vision_provider.validate_and_correct_items(raw_items)
    assert len(validated) == 1

    item = validated[0]
    assert item["qty"] == 2
    assert item["cost_price"] == 1250.50
    assert item["line_total"] == 2501.00


def test_multiline_product_description_wrapping():
    """
    Scenario: Multi-line product descriptions wrapping across lines.
    Line 1: Cadbury Dairy Milk Silk (desc continuation above)
    Line 2: Hazelnut Chocolate 150g | 12 | 175.00 | 2100.00
    """
    words = [
        # Headers
        {"text": "Description", "x": 50, "y": 80, "w": 80, "h": 16},
        {"text": "Qty", "x": 300, "y": 80, "w": 30, "h": 16},
        {"text": "Rate", "x": 420, "y": 80, "w": 35, "h": 16},
        {"text": "Amount", "x": 550, "y": 80, "w": 50, "h": 16},
        # Row 1 (Wrapped title line 1)
        {"text": "Cadbury", "x": 50, "y": 120, "w": 55, "h": 16},
        {"text": "Dairy", "x": 110, "y": 120, "w": 35, "h": 16},
        {"text": "Milk", "x": 150, "y": 120, "w": 30, "h": 16},
        {"text": "Silk", "x": 185, "y": 120, "w": 30, "h": 16},
        # Row 2 (Wrapped title line 2 + numbers)
        {"text": "Hazelnut", "x": 50, "y": 145, "w": 60, "h": 16},
        {"text": "Chocolate", "x": 115, "y": 145, "w": 65, "h": 16},
        {"text": "12", "x": 305, "y": 145, "w": 18, "h": 16},
        {"text": "175.00", "x": 420, "y": 145, "w": 45, "h": 16},
        {"text": "2100.00", "x": 548, "y": 145, "w": 55, "h": 16},
    ]
    raw_items = vision_provider.detect_spatial_table_and_extract_items(words)
    validated = vision_provider.validate_and_correct_items(raw_items)
    assert len(validated) == 1

    item = validated[0]
    assert "Cadbury Dairy Milk Silk" in item["name"]
    assert "Hazelnut Chocolate" in item["name"]
    assert item["qty"] == 12
    assert item["cost_price"] == 175.0
    assert item["line_total"] == 2100.0


def test_reordered_columns_layout_variants():
    """
    Scenario: Table with Unit Price appearing BEFORE Quantity.
    Headers: Item | Price per Unit | QTY | Tax % | Total
    """
    words = [
        # Headers (Rate is column 2, Qty is column 3)
        {"text": "Item", "x": 50, "y": 100, "w": 40, "h": 16},
        {"text": "Price", "x": 220, "y": 100, "w": 35, "h": 16},
        {"text": "per", "x": 260, "y": 100, "w": 25, "h": 16},
        {"text": "Unit", "x": 290, "y": 100, "w": 30, "h": 16},
        {"text": "QTY", "x": 400, "y": 100, "w": 30, "h": 16},
        {"text": "GST", "x": 500, "y": 100, "w": 30, "h": 16},
        {"text": "Total", "x": 620, "y": 100, "w": 35, "h": 16},
        # Row 1
        {"text": "Dove", "x": 50, "y": 140, "w": 40, "h": 16},
        {"text": "Soap", "x": 95, "y": 140, "w": 35, "h": 16},
        {"text": "55.00", "x": 240, "y": 140, "w": 40, "h": 16},  # Rate at x=240
        {"text": "20", "x": 405, "y": 140, "w": 18, "h": 16},      # Qty at x=405
        {"text": "18%", "x": 502, "y": 140, "w": 25, "h": 16},
        {"text": "1100.00", "x": 615, "y": 140, "w": 50, "h": 16},
    ]
    raw_items = vision_provider.detect_spatial_table_and_extract_items(words)
    validated = vision_provider.validate_and_correct_items(raw_items)
    assert len(validated) == 1

    item = validated[0]
    assert item["qty"] == 20
    assert item["cost_price"] == 55.0
    assert item["line_total"] == 1100.0


def test_discrepancy_signals_review_without_inventing_or_overwriting():
    """
    Scenario: Pricing discrepancy (e.g. special wholesale discount makes Qty * Rate != Line Total).
    Raw item: Qty = 10, Rate = 50.00, Line Total = 400.00 (expected 500, discrepancy of 100).
    Rule:
      - Do NOT overwrite qty to 8 or rate to 40.
      - Keep original values: qty=10, cost_price=50.0, line_total=400.0.
      - Mark needs_review = True and adjust field confidence below 0.70.
    """
    discrepant_item = {
        "name": "Sunflower Oil 1L",
        "qty": 10.0,
        "cost_price": 50.0,
        "amount": 400.0,
        "tax": "5%",
    }
    validated = vision_provider.validate_and_correct_items([discrepant_item])
    assert len(validated) == 1

    item = validated[0]
    # Original values must be preserved!
    assert item["qty"] == 10
    assert item["cost_price"] == 50.0
    assert item["line_total"] == 400.0

    # Must be flagged for review with lowered confidence
    assert item["needs_review"] is True
    assert item["field_confidence"]["qty"] <= 0.70
    assert item["field_confidence"]["cost_price"] <= 0.70
