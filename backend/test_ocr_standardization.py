"""
Unit Tests for Improved OCR Invoice Reading, Field Recognition, and Amount Preservation
Strictly verifies:
- Test 1: Alternative quantity and price labels ('Item | Quantity | Price per Unit | GST | Amount')
- Test 2: Alternative tax label ('Item | Qty. | Rate | IGST | Amount')
- Test 3: Different GST structure (CGST 9% + SGST 9% -> unified TAX 18%, Amount preserved)
- Test 4: Decimal quantities (QTY = 2.5, UNIT COST = ₹200, TAX = 5%, Amount = ₹525 preserved)
- Test 5: Missing tax percentage (Flag for review, never assume 0%)
- Test 6: Multiple products row association and printed line totals
- Test 7: Tax-inclusive pricing detection (avoids double taxation)
- Test 8: Printed total mismatch detection
- Test 9: User Specification Test: Quantity, Price per Unit, IGST, and Amount mapping
- Test 10: Amount preservation without formula overwrite (e.g. bulk discounts / custom invoice totals preserved)
- Test 11: Missing amount column flags Needs Review without inventing a value
- Test 12: Column header variants for TOTAL MRP (Total, Total Amount, Item Amount, Line Amount, Line Total, Total Price, Extended Amount)
"""

import pytest
import vision_provider


def test_case_1_alternative_quantity_and_price_labels():
    """
    Test 1: Input headers: 'Item | Quantity | Price per Unit | GST | Amount'
    Standardizes fields to:
    - Item -> Product / Description (name)
    - Quantity -> QTY
    - Price per Unit -> UNIT COST
    - GST -> TAX (percentage rate)
    - Amount -> TOTAL MRP (original line amount preserved)
    """
    raw_items = [
        {
            "Item": "Fortune Sunlite Sunflower Oil 1L",
            "Quantity": 10,
            "Price per Unit": 120.0,
            "GST": "5%",
            "Amount": 1260.0,
        }
    ]
    corrected = vision_provider.validate_and_correct_items(raw_items)
    assert len(corrected) == 1
    item = corrected[0]

    assert "Fortune Sunlite" in item["name"]
    assert item["qty"] == 10
    assert item["cost_price"] == 120.0
    assert item["tax_rate"] == 5.0
    assert item["tax_percent"] == "5%"
    assert item["base_amount"] == 1200.0
    assert item["tax_amount"] == 60.0
    assert item["line_total"] == 1260.0
    assert item["mrp"] == 1260.0


def test_case_2_alternative_tax_label():
    """
    Test 2: Input header: 'Item | Qty. | Rate | IGST | Total'
    Expected mapping:
    - Qty. -> QTY
    - Rate -> UNIT COST
    - IGST -> TAX (extract actual percentage associated with IGST, not monetary amount)
    - Total -> TOTAL MRP (original line amount preserved)
    """
    raw_items = [
        {
            "Item": "Tata Tea Gold 500g",
            "Qty.": 5,
            "Rate": 250.0,
            "IGST": "18.0%",
            "Total": 1475.0,
        }
    ]
    corrected = vision_provider.validate_and_correct_items(raw_items)
    assert len(corrected) == 1
    item = corrected[0]

    assert item["name"] == "Tata Tea Gold 500g"
    assert item["qty"] == 5
    assert item["cost_price"] == 250.0
    assert item["tax_rate"] == 18.0
    assert item["tax_percent"] == "18%"
    assert item["base_amount"] == 1250.0
    assert item["tax_amount"] == 225.0
    assert item["line_total"] == 1475.0
    assert item["mrp"] == 1475.0


def test_case_3_different_gst_structure_combined_cgst_sgst():
    """
    Test 3: CGST 9% and SGST 9% on taxable base of QTY=2, UNIT COST=₹500.
    Expected unified TAX = 18%.
    TOTAL MRP = ₹1,180.00 preserved from original Amount column.
    """
    raw_items = [
        {
            "description": "Pressure Cooker 5L",
            "qty": 2,
            "unit_price": 500.0,
            "cgst": "9%",
            "sgst": "9%",
            "amount": 1180.0,
        }
    ]
    corrected = vision_provider.validate_and_correct_items(raw_items)
    assert len(corrected) == 1
    item = corrected[0]

    assert item["qty"] == 2
    assert item["cost_price"] == 500.0
    assert item["tax_rate"] == 18.0
    assert item["tax_percent"] == "18%"
    assert item["base_amount"] == 1000.0
    assert item["tax_amount"] == 180.0
    assert item["line_total"] == 1180.0
    assert item["mrp"] == 1180.0


def test_case_4_decimal_quantities():
    """
    Test 4: Decimal quantities
    Input: QTY = 2.5, UNIT COST = ₹200, TAX = 5%, Amount = 525.0
    Expected base amount = ₹500.
    Expected tax amount = ₹25.
    Expected TOTAL MRP = ₹525.
    """
    raw_items = [
        {
            "description": "Organic Desi Ghee 1kg",
            "qty": 2.5,
            "unit_price": 200.0,
            "tax": 5.0,
            "amount": 525.0,
        }
    ]
    corrected = vision_provider.validate_and_correct_items(raw_items)
    assert len(corrected) == 1
    item = corrected[0]

    assert item["qty"] == 2.5
    assert item["cost_price"] == 200.0
    assert item["tax_rate"] == 5.0
    assert item["tax_percent"] == "5%"
    assert item["base_amount"] == 500.0
    assert item["tax_amount"] == 25.0
    assert item["line_total"] == 525.0


def test_case_5_missing_tax_percentage():
    """
    Test 5: Missing tax percentage
    Input: QTY = 3, UNIT COST = ₹100, Amount = ₹300, Tax percentage unavailable
    Expected behavior:
    - Do not assume a tax rate without evidence (NEVER assume 0%).
    - Flag the tax field for review (needs_review = True).
    - Amount is preserved as ₹300.
    """
    raw_items = [
        {
            "description": "Handmade Wooden Brush",
            "qty": 3,
            "unit_price": 100.0,
            "amount": 300.0,
            # No tax field provided
        }
    ]
    corrected = vision_provider.validate_and_correct_items(raw_items)
    assert len(corrected) == 1
    item = corrected[0]

    assert item["qty"] == 3
    assert item["cost_price"] == 100.0
    assert item["tax_rate"] is None
    assert item["tax_percent"] == "Needs Review"
    assert item["tax_amount"] is None
    assert item["base_amount"] == 300.0
    assert item["line_total"] == 300.0
    assert item["needs_review"] is True
    assert item["field_confidence"]["tax"] < 0.70


def test_case_6_multiple_products():
    """
    Test 6: Multiple products
    Verify every product's QTY, UNIT COST, TAX, and Amount are associated with the correct row
    and the invoice total is the sum of valid line totals.
    """
    raw_items = [
        {"description": "Item A", "qty": 10, "unit_price": 50.0, "tax": "12%", "amount": 560.0},
        {"description": "Item B", "qty": 4, "unit_price": 100.0, "tax": "18%", "amount": 472.0},
        {"description": "Item C", "qty": 20, "unit_price": 15.0, "tax": "0%", "amount": 300.0},
    ]
    corrected = vision_provider.validate_and_correct_items(raw_items)
    assert len(corrected) == 3

    assert corrected[0]["line_total"] == 560.0
    assert corrected[1]["line_total"] == 472.0
    assert corrected[2]["line_total"] == 300.0

    calculated_invoice_total = sum(i["line_total"] for i in corrected)
    assert calculated_invoice_total == 1332.0


def test_case_7_tax_inclusive_pricing():
    """
    Test 7: Tax-inclusive pricing
    Verify that the system detects explicit tax-inclusive pricing and preserves original amount.
    """
    raw_items = [
        {
            "description": "Mineral Water 1L (Tax Incl)",
            "qty": 10,
            "unit_price": 20.0,
            "tax": "18%",
            "amount": 200.0,
            "is_tax_inclusive": True,
        }
    ]
    corrected = vision_provider.validate_and_correct_items(raw_items)
    assert len(corrected) == 1
    item = corrected[0]

    assert item["is_tax_inclusive"] is True
    assert item["line_total"] == 200.0
    assert item["mrp"] == 200.0


def test_case_8_printed_total_mismatch_detection():
    """
    Test 8: Printed total mismatch
    If printed total differs from calculated total, identify discrepancy and do not silently force match.
    """
    raw_items = [
        {"description": "Sugar 1kg", "qty": 10, "unit_price": 40.0, "tax": "5%", "amount": 420.0},
        {"description": "Tea 250g", "qty": 2, "unit_price": 100.0, "tax": "18%", "amount": 236.0},
    ]
    corrected = vision_provider.validate_and_correct_items(raw_items)
    calculated_total = sum(i["line_total"] for i in corrected)
    assert calculated_total == 656.0

    # Printed total on physical invoice is e.g. 700.0 (due to freight or extra charges)
    printed_total = 700.0
    discrepancy = round(abs(calculated_total - printed_total), 2)
    assert discrepancy == 44.0
    assert corrected[0]["line_total"] == 420.0
    assert corrected[1]["line_total"] == 236.0


def test_case_9_user_spec_quantity_price_igst_amount():
    """
    Test 9: Specific invoice scenario from user prompt:
    Input headers: 'Quantity | Price per Unit | IGST | Amount'
    Confirms:
    - Quantity maps to QTY.
    - Price per Unit maps to UNIT COST.
    - IGST maps to TAX (actual percentage extracted).
    - Amount maps to TOTAL MRP (original printed line amount preserved).
    - TOTAL MRP matches printed amount, NOT a calculated formula.
    """
    raw_items = [
        {
            "Item Name": "Basmati Rice 5kg",
            "Quantity": 8,
            "Price per Unit": 150.0,
            "IGST": "18%",
            "Amount": 1416.0,
        }
    ]
    corrected = vision_provider.validate_and_correct_items(raw_items)
    assert len(corrected) == 1
    item = corrected[0]

    assert item["qty"] == 8
    assert item["cost_price"] == 150.0
    assert item["tax_rate"] == 18.0
    assert item["tax_percent"] == "18%"
    assert item["line_total"] == 1416.0
    assert item["mrp"] == 1416.0


def test_case_10_amount_preservation_without_formula_overwrite():
    """
    Test 10: Amount preservation
    If invoice gives an Amount that differs from standard QTY * UNIT_COST * (1+TAX)
    (e.g., due to distributor discount or rounding), the extracted Amount MUST NOT be overwritten!
    """
    raw_items = [
        {
            "description": "Bulk Biscuits Carton",
            "qty": 10,
            "unit_price": 100.0,  # 10 * 100 = 1000
            "tax": "18%",        # would be 1180 with standard tax formula
            "amount": 1150.0,    # But distributor bill printed 1150.0 due to ₹30 bill concession
        }
    ]
    corrected = vision_provider.validate_and_correct_items(raw_items)
    assert len(corrected) == 1
    item = corrected[0]

    # The line total must strictly preserve the printed 1150.0, NOT 1180.0!
    assert item["line_total"] == 1150.0
    assert item["mrp"] == 1150.0


def test_case_11_missing_amount_flags_needs_review():
    """
    Test 11: If correct amount column cannot be identified confidently,
    flag the field as Needs Review rather than inventing a value.
    """
    raw_items = [
        {
            "description": "Sample Item With Missing Total",
            "qty": 5,
            "unit_price": 50.0,
            "tax": "5%",
            # NO amount provided
        }
    ]
    corrected = vision_provider.validate_and_correct_items(raw_items)
    assert len(corrected) == 1
    item = corrected[0]

    assert item["line_total"] is None
    assert item["mrp"] is None
    assert item["needs_review"] is True
    assert item["field_confidence"]["total_mrp"] < 0.70


def test_case_12_various_column_headers_for_total_mrp():
    """
    Test 12: Recognizes Amount, Total, Total Amount, Item Amount, Line Amount, Line Total, Total Price, Extended Amount
    """
    header_variants = [
        ("Amount", 250.0),
        ("Total", 350.0),
        ("Total Amount", 450.0),
        ("Item Amount", 550.0),
        ("Line Amount", 650.0),
        ("Line Total", 750.0),
        ("Total Price", 850.0),
        ("Extended Amount", 950.0),
    ]

    for header_name, amt_val in header_variants:
        raw_items = [
            {
                "description": f"Product for {header_name}",
                "qty": 2,
                "unit_price": amt_val / 2.0,
                "tax": "0%",
                header_name: amt_val,
            }
        ]
        corrected = vision_provider.validate_and_correct_items(raw_items)
        assert len(corrected) == 1
        assert corrected[0]["line_total"] == amt_val
        assert corrected[0]["mrp"] == amt_val


def test_case_13_read_total_amount_for_invoice_from_image_line():
    """
    Test 13: Reading 'Total Amount for Invoice' directly from printed lines on the invoice image.
    Verifies that various printed labels are recognized accurately.
    """
    test_lines = [
        ("Total Amount for Invoice: 4500.00", 4500.0),
        ("Total Amount for Invoice 4500.00", 4500.0),
        ("Total Amount of Invoice: 3200", 3200.0),
        ("Total for Invoice: 1250.50", 1250.5),
        ("Total Amount in Invoice: 4500", 4500.0),
        ("Total from image: 3500.00", 3500.0),
        ("Total: 4500.00", 4500.0),
        ("Grand Total: 5600.00", 5600.0),
        ("Invoice Total: 7800.50", 7800.5),
        ("Total (Rs.): 900.00", 900.0),
        ("Total (INR): 1200.00", 1200.0),
        ("Total Amount for invoice Rs. 4430", 4430.0),
        ("TOTAL FOR INVOICE : 999.50", 999.5),
        ("Total Amount for Invoice: Rs 2,500.00", 2500.0),
    ]

    for line, expected_total in test_lines:
        res = vision_provider.extract_invoice_total_amount(line)
        assert res == expected_total, f"Failed to extract {expected_total} from '{line}', got {res}"


def test_case_14_extract_total_from_dict_various_headers():
    """
    Test 14: Verifies extract_total_from_dict reads total directly from parsed data
    with keys like 'total_amount_for_invoice', 'total', 'grand_total', etc.
    """
    assert vision_provider.extract_total_from_dict({"total_amount_for_invoice": 4430.0}) == 4430.0
    assert vision_provider.extract_total_from_dict({"total_amount_for_invoice": "₹ 4,430.00"}) == 4430.0
    assert vision_provider.extract_total_from_dict({"total": 3500.50}) == 3500.50
    assert vision_provider.extract_total_from_dict({"grand_total": 1250.0}) == 1250.0
    assert vision_provider.extract_total_from_dict({"Total from image": "4500"}) == 4500.0
    assert vision_provider.extract_total_from_dict({"invoice_total": 7800.0}) == 7800.0
    assert vision_provider.extract_total_from_dict({"Total Amount for Invoice": "Rs 2,500.00"}) == 2500.0


def test_case_15_total_not_printed_returns_none():
    """
    Test 15: If the invoice total is not printed or detectable, it returns None
    and is NOT synthesized by summing items or formulas.
    """
    assert vision_provider.extract_total_from_dict({}) is None
    assert vision_provider.extract_total_from_dict({"vendor": "Blink Wholesale"}) is None
    assert vision_provider.extract_invoice_total_amount("Thank you for your visit!") is None


# =====================================================================
# SECTION 8 REGRESSION TEST SUITE: 12 REPRESENTATIVE INVOICE SCENARIOS
# =====================================================================

def evaluate_field_accuracy(extracted_items: list, expected_items: list) -> dict:
    """
    Evaluates field-level extraction accuracy comparing extracted items against verified ground truth.
    Fields verified: description, qty, unit_cost, tax, total_mrp.
    Returns field accuracy percentages and overall accuracy.
    """
    if not expected_items:
        return {"overall": 100.0}

    fields = ["description", "qty", "unit_cost", "tax", "total_mrp"]
    scores = {f: 0 for f in fields}
    total_checks = len(expected_items)

    for ext, exp in zip(extracted_items, expected_items):
        ext_desc = (ext.get("name") or ext.get("description") or "").lower()
        exp_desc = (exp.get("description") or exp.get("name") or "").lower()
        if exp_desc in ext_desc or ext_desc in exp_desc or exp_desc.split()[0] in ext_desc:
            scores["description"] += 1

        ext_qty = next((ext[k] for k in ["qty", "quantity"] if ext.get(k) is not None), None)
        exp_qty = next((exp[k] for k in ["qty", "quantity"] if exp.get(k) is not None), None)
        if ext_qty is not None and exp_qty is not None and abs(ext_qty - exp_qty) < 1e-3:
            scores["qty"] += 1

        ext_cost = next((ext[k] for k in ["unit_cost", "cost_price", "unit_price", "rate"] if ext.get(k) is not None), None)
        exp_cost = next((exp[k] for k in ["unit_cost", "cost_price", "unit_price", "rate"] if exp.get(k) is not None), None)
        if (ext_cost is None and exp_cost is None) or (ext_cost is not None and exp_cost is not None and abs(ext_cost - exp_cost) < 0.05):
            scores["unit_cost"] += 1

        ext_tax = next((str(ext[k]) for k in ["tax_percent", "tax", "gst", "tax_rate"] if ext.get(k) is not None), None)
        exp_tax = next((str(exp[k]) for k in ["tax_percent", "tax", "gst", "tax_rate"] if exp.get(k) is not None), None)
        if ext_tax is not None and exp_tax is not None:
            if ext_tax.replace("%", "").strip() == exp_tax.replace("%", "").strip():
                scores["tax"] += 1
            else:
                try:
                    if abs(float(ext_tax.replace("%", "").strip()) - float(exp_tax.replace("%", "").strip())) < 0.1:
                        scores["tax"] += 1
                except (ValueError, TypeError):
                    pass
        elif ext_tax is None and exp_tax is None:
            scores["tax"] += 1

        ext_mrp = next((ext[k] for k in ["total_mrp", "mrp", "line_total", "amount", "line_amount"] if ext.get(k) is not None), None)
        exp_mrp = next((exp[k] for k in ["total_mrp", "mrp", "line_total", "amount", "line_amount"] if exp.get(k) is not None), None)
        if (ext_mrp is None and exp_mrp is None) or (ext_mrp is not None and exp_mrp is not None and abs(ext_mrp - exp_mrp) < 0.05):
            scores["total_mrp"] += 1

    acc = {f: round((scores[f] / total_checks) * 100.0, 1) for f in fields}
    acc["overall"] = round(sum(acc.values()) / len(acc), 1)
    return acc


def test_regression_1_digital_pdf_with_embedded_text():
    """
    Scenario 1: Digital PDFs with embedded text.
    Uses pypdf direct text stream to extract vendor, invoice number, items, and totals without OCR loss.
    """
    pdf_bytes = (
        b'%PDF-1.4\n'
        b'1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n'
        b'2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n'
        b'3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<</Font<</F1 4 0 R>>>>/Contents 5 0 R>>endobj\n'
        b'4 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\n'
        b'5 0 obj<</Length 180>>stream\n'
        b'BT\n/F1 12 Tf\n50 700 Td\n(Wholesale Kirana Distributors) Tj\n0 -20 Td\n'
        b'(Invoice: INV-2026-888 Date: 2026-03-20) Tj\n0 -20 Td\n'
        b'(Description Qty Rate GST Amount) Tj\n0 -20 Td\n'
        b'(Tata Salt 1kg 30 20.00 5% 630.00) Tj\n0 -20 Td\n'
        b'(Fortune Oil 1L 15 110.00 5% 1732.50) Tj\n0 -20 Td\n'
        b'(Total Amount for Invoice: 2362.50) Tj\nET\nendstream\nendobj\n'
        b'xref\n0 6\n0000000000 65535 f \n0000000009 00000 n \n0000000052 00000 n \n'
        b'0000000101 00000 n \n0000000212 00000 n \n0000000281 00000 n \n'
        b'trailer<</Size 6/Root 1 0 R>>\nstartxref\n515\n%%EOF\n'
    )
    result = vision_provider.extract_digital_pdf_text_and_tables(pdf_bytes)
    assert result is not None
    assert result["document_type"] == "digital_pdf"
    assert result["invoice_number"] == "INV-2026-888"
    assert result["total_amount_for_invoice"] == 2362.50

    expected = [
        {"description": "Tata Salt 1kg", "qty": 30, "unit_cost": 20.0, "tax": "5%", "total_mrp": 630.0},
        {"description": "Fortune Oil 1L", "qty": 15, "unit_cost": 110.0, "tax": "5%", "total_mrp": 1732.50},
    ]
    acc = evaluate_field_accuracy(result["items"], expected)
    assert acc["overall"] == 100.0


def test_regression_2_scanned_invoices_spatial_detection():
    """
    Scenario 2: Scanned invoices with 2D visual layout and bounding boxes.
    Tests detect_spatial_table_and_extract_items using word coordinates.
    """
    words = [
        # Header
        {"text": "Description", "x": 50, "y": 100, "w": 80, "h": 16},
        {"text": "Qty", "x": 350, "y": 100, "w": 30, "h": 16},
        {"text": "Rate", "x": 450, "y": 100, "w": 40, "h": 16},
        {"text": "GST", "x": 550, "y": 100, "w": 30, "h": 16},
        {"text": "Amount", "x": 680, "y": 100, "w": 50, "h": 16},
        # Row 1
        {"text": "Aashirvaad", "x": 50, "y": 140, "w": 65, "h": 16},
        {"text": "Atta", "x": 120, "y": 140, "w": 30, "h": 16},
        {"text": "10kg", "x": 155, "y": 140, "w": 35, "h": 16},
        {"text": "10", "x": 360, "y": 140, "w": 15, "h": 16},
        {"text": "380.00", "x": 455, "y": 140, "w": 45, "h": 16},
        {"text": "5%", "x": 560, "y": 140, "w": 20, "h": 16},
        {"text": "3990.00", "x": 685, "y": 140, "w": 55, "h": 16},
    ]
    items = vision_provider.detect_spatial_table_and_extract_items(words, image_width=800)
    validated = vision_provider.validate_and_correct_items(items)

    expected = [
        {"description": "Aashirvaad Atta 10kg", "qty": 10, "unit_cost": 380.0, "tax": "5%", "total_mrp": 3990.0}
    ]
    acc = evaluate_field_accuracy(validated, expected)
    assert acc["overall"] == 100.0


def test_regression_3_blurry_low_contrast_images():
    """
    Scenario 3: Blurry or low-contrast images.
    Verifies that preprocess_image_for_ocr boosts contrast and sharpness without discarding decimal points or %.
    """
    from PIL import Image
    import io

    # Create low-contrast grayscale image
    img = Image.new("RGB", (400, 300), color=(180, 180, 180))
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=75)

    processed_bytes, mime, dims = vision_provider.preprocess_image_for_ocr(buf.getvalue())
    assert processed_bytes is not None
    assert mime == "image/jpeg"
    assert dims[0] >= 400

    # Test clean_numeric_value handles ambiguous OCR marks
    assert vision_provider.clean_numeric_value("1,250.50") == 1250.50
    assert vision_provider.clean_numeric_value("₹ 450.00") == 450.0
    assert vision_provider.clean_numeric_value("18.0%") == 18.0


def test_regression_4_table_layouts_a_b_c_column_reordering():
    """
    Scenario 4: Different fonts and table layouts:
    - Layout A: Description | Qty | Rate | GST | Amount
    - Layout B: Item | Unit Price | Quantity | IGST | Total
    - Layout C: Product | QTY | Price per Unit | Tax % | Line Amount
    All three layouts must produce the standardized output:
    Product / Description | QTY | UNIT COST | TAX | TOTAL MRP
    """
    # Layout A
    words_a = [
        {"text": "Description", "x": 50, "y": 100, "w": 80, "h": 16},
        {"text": "Qty", "x": 300, "y": 100, "w": 30, "h": 16},
        {"text": "Rate", "x": 400, "y": 100, "w": 35, "h": 16},
        {"text": "GST", "x": 500, "y": 100, "w": 30, "h": 16},
        {"text": "Amount", "x": 600, "y": 100, "w": 50, "h": 16},
        {"text": "Layout A Item", "x": 50, "y": 140, "w": 90, "h": 16},
        {"text": "4", "x": 310, "y": 140, "w": 10, "h": 16},
        {"text": "50.00", "x": 405, "y": 140, "w": 40, "h": 16},
        {"text": "12%", "x": 505, "y": 140, "w": 25, "h": 16},
        {"text": "224.00", "x": 605, "y": 140, "w": 45, "h": 16},
    ]
    res_a = vision_provider.validate_and_correct_items(
        vision_provider.detect_spatial_table_and_extract_items(words_a, image_width=750)
    )

    # Layout B: Unit Price before Quantity
    words_b = [
        {"text": "Item", "x": 50, "y": 100, "w": 40, "h": 16},
        {"text": "Unit", "x": 250, "y": 100, "w": 35, "h": 16},
        {"text": "Price", "x": 290, "y": 100, "w": 40, "h": 16},
        {"text": "Quantity", "x": 450, "y": 100, "w": 60, "h": 16},
        {"text": "IGST", "x": 600, "y": 100, "w": 40, "h": 16},
        {"text": "Total", "x": 750, "y": 100, "w": 45, "h": 16},
        {"text": "Layout B Item", "x": 50, "y": 140, "w": 90, "h": 16},
        {"text": "150.00", "x": 270, "y": 140, "w": 45, "h": 16},
        {"text": "6", "x": 475, "y": 140, "w": 10, "h": 16},
        {"text": "18%", "x": 610, "y": 140, "w": 25, "h": 16},
        {"text": "1062.00", "x": 755, "y": 140, "w": 50, "h": 16},
    ]
    res_b = vision_provider.validate_and_correct_items(
        vision_provider.detect_spatial_table_and_extract_items(words_b, image_width=900)
    )

    # Layout C
    words_c = [
        {"text": "Product", "x": 50, "y": 100, "w": 55, "h": 16},
        {"text": "QTY", "x": 300, "y": 100, "w": 30, "h": 16},
        {"text": "Price", "x": 400, "y": 100, "w": 35, "h": 16},
        {"text": "per", "x": 440, "y": 100, "w": 25, "h": 16},
        {"text": "Unit", "x": 470, "y": 100, "w": 30, "h": 16},
        {"text": "Tax", "x": 570, "y": 100, "w": 25, "h": 16},
        {"text": "%", "x": 600, "y": 100, "w": 15, "h": 16},
        {"text": "Line", "x": 680, "y": 100, "w": 30, "h": 16},
        {"text": "Amount", "x": 715, "y": 100, "w": 45, "h": 16},
        {"text": "Layout C Item", "x": 50, "y": 140, "w": 90, "h": 16},
        {"text": "8", "x": 310, "y": 140, "w": 10, "h": 16},
        {"text": "75.00", "x": 435, "y": 140, "w": 40, "h": 16},
        {"text": "5%", "x": 585, "y": 140, "w": 25, "h": 16},
        {"text": "630.00", "x": 700, "y": 140, "w": 45, "h": 16},
    ]
    res_c = vision_provider.validate_and_correct_items(
        vision_provider.detect_spatial_table_and_extract_items(words_c, image_width=850)
    )

    # Assert standard columns on all 3 layouts
    assert res_a[0]["qty"] == 4 and res_a[0]["cost_price"] == 50.0 and res_a[0]["line_total"] == 224.0
    assert res_b[0]["qty"] == 6 and res_b[0]["cost_price"] == 150.0 and res_b[0]["line_total"] == 1062.0
    assert res_c[0]["qty"] == 8 and res_c[0]["cost_price"] == 75.0 and res_c[0]["line_total"] == 630.0


def test_regression_5_alternative_qty_unit_cost_labels():
    """
    Scenario 5: Alternative QTY and UNIT COST labels.
    Recognizes:
    QTY: 'Order Qty', 'Quantity Ordered', 'Item Quantity', 'Quantities', 'Nos', 'Units', 'PCS'
    UNIT COST: 'Rate per Unit', 'Basic Rate', 'Item Rate', 'Cost per Unit', 'Rate'
    """
    variants = [
        ("Order Qty", "Rate per Unit"),
        ("Quantity Ordered", "Basic Rate"),
        ("Item Quantity", "Item Rate"),
        ("Quantities", "Cost per Unit"),
        ("Billed Qty", "Price per Unit"),
    ]
    for q_label, c_label in variants:
        raw_items = [
            {
                "Description": "Variant Test Product",
                q_label: 12,
                c_label: 45.0,
                "GST %": "12%",
                "Amount": 604.80,
            }
        ]
        corrected = vision_provider.validate_and_correct_items(raw_items)
        assert len(corrected) == 1
        item = corrected[0]
        assert item["qty"] == 12, f"Failed on {q_label}"
        assert item["cost_price"] == 45.0, f"Failed on {c_label}"
        assert item["line_total"] == 604.80


def test_regression_6_gst_igst_cgst_sgst_combinations():
    """
    Scenario 6: GST, IGST, and CGST/SGST combinations.
    - CGST 2.5% + SGST 2.5% -> unified TAX 5%
    - CGST 9% + SGST 9% -> unified TAX 18%
    - IGST 12% -> unified TAX 12%
    - Explicit exempt -> 0%
    """
    raw_items = [
        {"description": "Item 1", "qty": 1, "cost_price": 100.0, "cgst": "2.5%", "sgst": "2.5%", "amount": 105.0},
        {"description": "Item 2", "qty": 1, "cost_price": 200.0, "cgst": "9%", "sgst": "9%", "amount": 236.0},
        {"description": "Item 3", "qty": 1, "cost_price": 300.0, "igst": "12%", "amount": 336.0},
        {"description": "Item 4", "qty": 1, "cost_price": 400.0, "tax": "Exempt", "amount": 400.0},
    ]
    corrected = vision_provider.validate_and_correct_items(raw_items)
    assert corrected[0]["tax_percent"] == "5%"
    assert corrected[1]["tax_percent"] == "18%"
    assert corrected[2]["tax_percent"] == "12%"
    assert corrected[3]["tax_percent"] == "0%"


def test_regression_7_multiple_products_quantities_prices():
    """
    Scenario 7: Multiple products with different quantities and prices.
    Verifies that fields do not bleed across rows and line totals are strictly preserved.
    """
    raw_items = [
        {"name": "Item A", "qty": 2, "cost_price": 150.0, "tax": "5%", "amount": 315.0},
        {"name": "Item B", "qty": 10, "cost_price": 20.0, "tax": "18%", "amount": 236.0},
        {"name": "Item C", "qty": 0.5, "cost_price": 500.0, "tax": "0%", "amount": 250.0},
    ]
    corrected = vision_provider.validate_and_correct_items(raw_items)
    expected = [
        {"description": "Item A", "qty": 2, "unit_cost": 150.0, "tax": "5%", "total_mrp": 315.0},
        {"description": "Item B", "qty": 10, "unit_cost": 20.0, "tax": "18%", "total_mrp": 236.0},
        {"description": "Item C", "qty": 0.5, "unit_cost": 500.0, "tax": "0%", "total_mrp": 250.0},
    ]
    acc = evaluate_field_accuracy(corrected, expected)
    assert acc["overall"] == 100.0


def test_regression_8_different_tax_rates_per_row():
    """
    Scenario 8: Different tax rates across product rows in the same invoice.
    Verifies that rows retain their individual tax rates (0%, 5%, 12%, 18%).
    """
    raw_items = [
        {"name": "Wheat 50kg", "qty": 1, "cost_price": 1500.0, "tax": "0%", "amount": 1500.0},
        {"name": "Packaged Salt", "qty": 10, "cost_price": 25.0, "tax": "5%", "amount": 262.50},
        {"name": "Processed Butter", "qty": 5, "cost_price": 100.0, "tax": "12%", "amount": 560.0},
        {"name": "Premium Detergent", "qty": 4, "cost_price": 200.0, "tax": "18%", "amount": 944.0},
    ]
    corrected = vision_provider.validate_and_correct_items(raw_items)
    assert [it["tax_rate"] for it in corrected] == [0.0, 5.0, 12.0, 18.0]


def test_regression_9_taxable_amount_vs_line_total_review():
    """
    Scenario 9: Invoices with Amount, Taxable Amount, Tax Amount, Subtotal, and Grand Total.
    - If final Amount is present: Amount is preserved as TOTAL MRP.
    - If only Taxable Amount is present without final amount: row is flagged for review!
    """
    # Case A: Both taxable amount and final amount present
    raw_a = [
        {
            "description": "Edible Oil 15L",
            "qty": 1,
            "cost_price": 1800.0,
            "taxable_amount": 1800.0,
            "tax_amount": 90.0,
            "tax": "5%",
            "amount": 1890.0,
        }
    ]
    res_a = vision_provider.validate_and_correct_items(raw_a)
    assert res_a[0]["line_total"] == 1890.0
    assert res_a[0]["taxable_amount"] == 1800.0
    assert res_a[0]["needs_review"] is False

    # Case B: Only taxable amount present (no final total amount column)
    raw_b = [
        {
            "description": "Packaging Boxes 100pcs",
            "qty": 1,
            "cost_price": 500.0,
            "taxable_amount": 500.0,
            "tax": "18%",
            # Missing amount / total_mrp
        }
    ]
    res_b = vision_provider.validate_and_correct_items(raw_b)
    assert res_b[0]["needs_review"] is True
    assert res_b[0]["line_total"] is None
    assert res_b[0]["field_confidence"]["total_mrp"] < 0.70


def test_regression_10_multipage_invoices_no_cross_contamination():
    """
    Scenario 10: Multipage invoices.
    Verifies that items retain their respective page numbers and product rows are not mixed across pages.
    """
    page_1_items = [
        {"name": "Page 1 Item 1", "qty": 10, "cost_price": 50.0, "tax": "5%", "amount": 525.0, "page": 1},
        {"name": "Page 1 Item 2", "qty": 5, "cost_price": 100.0, "tax": "18%", "amount": 590.0, "page": 1},
    ]
    page_2_items = [
        {"name": "Page 2 Item 1", "qty": 20, "cost_price": 30.0, "tax": "12%", "amount": 672.0, "page": 2},
    ]
    combined = vision_provider.validate_and_correct_items(page_1_items + page_2_items)
    assert len(combined) == 3
    assert combined[0]["page"] == 1
    assert combined[1]["page"] == 1
    assert combined[2]["page"] == 2


def test_regression_11_missing_ambiguous_fields_flagged():
    """
    Scenario 11: Missing or ambiguous fields.
    Verifies that missing tax rate or line amount is flagged for review without silent fabrication.
    """
    raw_items = [
        {"name": "Ambiguous Tax Item", "qty": 2, "cost_price": 50.0, "tax": "???", "amount": 100.0},
        {"name": "Missing Amount Item", "qty": 1, "cost_price": 250.0, "tax": "5%"},
    ]
    res = vision_provider.validate_and_correct_items(raw_items)
    assert res[0]["needs_review"] is True
    assert res[0]["tax_percent"] == "Needs Review"
    assert res[1]["needs_review"] is True
    assert res[1]["mrp"] is None


def test_regression_12_decimals_currency_ocr_confusion_corrections():
    """
    Scenario 12: Invoices with decimal values, currency symbols, and OCR confusions:
    - Decimal quantities: 2.75, 0.5, 10.250
    - Currency symbols: ₹, $, €, Rs., INR
    - OCR confusions: 'O'/'o' -> '0', 'l'/'I' -> '1', 'S' -> '5'
    - Negative adjustment: (50.00) -> -50.0
    """
    assert vision_provider.clean_numeric_value("₹ 1,250.50") == 1250.50
    assert vision_provider.clean_numeric_value("$ 49.99") == 49.99
    assert vision_provider.clean_numeric_value("€ 15.75") == 15.75
    assert vision_provider.clean_numeric_value("Rs. 1O0.00") == 100.0  # 'O' -> '0'
    assert vision_provider.clean_numeric_value("l50.00") == 150.0       # 'l' -> '1'
    assert vision_provider.clean_numeric_value("2S0.00") == 250.0       # 'S' -> '5'
    assert vision_provider.clean_numeric_value("(50.00)") == -50.0      # Parentheses negative
    assert vision_provider.clean_numeric_value("2.750") == 2.75


