"""
Vision LLM & OCR Provider Module
Isolates vision model extraction logic into a single swappable, resilient file.
Features:
- Camera EXIF rotation correction & image contrast enhancement pipeline
- Reference-grade extraction prompt: plain numbers, strict JSON, no markdown fences, no preamble
- Multi-provider AI Vision: supports Anthropic Claude (Claude 3.5 Sonnet / Haiku) & Google Gemini (1.5/2.0 Flash)
- Flexible schema ingestion: accepts description/name, quantity/qty, unit_price/cost_price, amount/line_total
- Mathematical cross-validation and self-correction (Unit Cost vs Line Total vs MRP)
- Offline Windows Native OCR fallback when no API key is configured or offline
"""

import os
import io
import json
import base64
import re
import asyncio
import statistics
from datetime import datetime
from typing import Dict, Any, Optional, List, Tuple, Union
import httpx
from PIL import Image, ImageOps, ImageEnhance

# Optional PDF parsing & rendering modules
try:
    import pypdf
except ImportError:
    pypdf = None

try:
    import pypdfium2
except ImportError:
    pypdfium2 = None

# Auto-load .env file if present
try:
    from dotenv import load_dotenv
    load_dotenv()
    load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))
except ImportError:
    pass

# Supported Claude and Gemini models
ANTHROPIC_MODELS = [
    "claude-3-5-sonnet-20241022",
    "claude-3-7-sonnet-20250219",
    "claude-3-5-sonnet-latest",
    "claude-sonnet-4-6",
    "claude-3-5-haiku-20241022",
    "claude-3-haiku-20240307",
]

GEMINI_MODELS = [
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-1.5-flash",
    "gemini-1.5-pro",
]

class VisionError(Exception):
    """Base exception for vision provider errors."""
    pass

class UnreadableImageError(VisionError):
    """Raised when uploaded file is corrupted or not a valid image/PDF."""
    pass

class VisionApiError(VisionError):
    """Raised when LLM API call fails or times out."""
    pass

class VisionBadJsonError(VisionError):
    """Raised when LLM returns invalid or unparseable JSON."""
    pass


def clean_numeric_value(val: Any, field_type: str = "number") -> Optional[float]:
    """
    Robust numeric value parser with OCR character confusion correction:
    - Strips currency symbols (₹, $, €, £), prefixes (Rs., Rs, INR, USD, EUR) and suffixes (/-)
    - Corrects common OCR confusions in numeric context:
      - 'O' / 'o' adjacent to digits -> '0'
      - 'l' / 'I' / '|' adjacent to digits -> '1'
      - 'S' / 's' adjacent to digits -> '5'
    - Accurately handles thousands separators (1,250.50 -> 1250.50, 1.250,50 -> 1250.50)
    - Preserves negative signs or parenthesized adjustments: (50.00) -> -50.00
    - Preserves decimal precision (e.g. 2.5, 0.75, 120.50).
    """
    if val is None or val == "" or val == "—" or val == "-":
        return None
    if isinstance(val, (int, float)):
        return float(val)

    s = str(val).strip()
    is_neg = False
    if s.startswith("(") and s.endswith(")"):
        is_neg = True
        s = s[1:-1].strip()
    elif s.startswith("-"):
        is_neg = True
        s = s[1:].strip()

    # Strip currency symbols and common words
    s = re.sub(r"[₹\$€£]", "", s)
    s = re.sub(r"\brs\.?(?!\w)|\binr\b|\busd\b|\beur\b", "", s, flags=re.IGNORECASE).strip()
    s = re.sub(r"[\/=\-:]+$", "", s).strip()

    # OCR character confusion correction in numeric context
    s = re.sub(r"(?<=\d)[Oo]|[Oo](?=\d)", "0", s)
    s = re.sub(r"(?<=\d)[lI\|]|[lI\|](?=\d)", "1", s)
    s = re.sub(r"(?<=\d)[Ss]|[Ss](?=\d)", "5", s)

    # Thousands separators vs decimal commas
    if "," in s and "." in s:
        if s.rfind(".") > s.rfind(","):
            s = s.replace(",", "")
        else:
            s = s.replace(".", "").replace(",", ".")
    elif "," in s:
        parts = s.split(",")
        if len(parts) == 2 and len(parts[1]) in (1, 2):
            s = s.replace(",", ".")
        else:
            s = s.replace(",", "")

    # Clean any remaining non-digit non-dot
    s = re.sub(r"[^\d\.]", "", s)
    if not s or s == ".":
        return None
    try:
        num = float(s)
        return -num if is_neg else num
    except (ValueError, TypeError):
        return None


def parse_num(val: Any) -> Optional[float]:
    """Backward-compatible wrapper for clean_numeric_value."""
    return clean_numeric_value(val)


def extract_invoice_total_amount(line: str) -> Optional[float]:
    """
    Extracts the overall printed invoice grand total amount from a text line.
    Matches variations:
      - 'Grand Total: 5600.00'
      - 'Invoice Total: 7800.50'
      - 'Total Amount for Invoice: 4500.00'
      - 'Total Amount of Invoice: 3200'
      - 'Total for Invoice: 1250.50'
      - 'Total Amount in Invoice: 4500'
      - 'Total from image: 3500.00'
      - 'Total Amount: 4500.00'
      - 'Net Total: 3200.00'
      - 'Net Payable: 2500.00'
      - 'Amount Payable: 4500.00'
      - 'Total Payable: 3500.00'
      - 'Total Due: 2800.00'
      - 'Final Amount: 5000.00'
      - 'Total Including Tax: 6200.00'
      - 'Total: 4500.00'
    Strictly distinguishes from and rejects:
      - Subtotal, Taxable Amount, Total Tax, Discount, Amount Paid, Balance Due.
    """
    if not line:
        return None
    cleaned = line.lower().strip()

    # Reject lines explicitly representing Subtotal, Tax, Paid amount, or Balance due
    excluded_markers = [
        "amount paid", "paid amount", "cash paid", "advance paid", "paid:", "received:",
        "balance due", "balance payable", "previous balance", "current balance", "balance amt",
        "subtotal", "sub total", "sub-total", "taxable amount", "taxable value", "taxable amt",
        "total tax", "tax amount", "cgst amt", "sgst amt", "igst amt"
    ]
    has_explicit_grand = any(k in cleaned for k in [
        "grand total", "net payable", "amount payable", "total payable",
        "total due", "final amount", "invoice total", "total including tax"
    ])
    if not has_explicit_grand and any(em in cleaned for em in excluded_markers):
        return None

    cleaned_norm = re.sub(r"\brs\.?(?!\w)|\binr\b|\busd\b|[₹\$#:\=\(\)\-_\|]", " ", cleaned)
    cleaned_norm = re.sub(r"\s+", " ", cleaned_norm).strip()

    # Grand Total and Net Payable patterns
    m = re.search(
        r"(?:grand\s*total|invoice\s*total(?:\s*amount)?|total\s*(?:amount\s*)?(?:for|of|in)?\s*invoice|total\s*(?:from\s*image)?|net\s*(?:payable|amount|total)|amount\s*payable|total\s*payable|total\s*due|final\s*(?:amount|total)|total\s*incl(?:uding)?\s*tax|total\s*(?:amount|payable|amt|value|mrp)?|bill\s*amount)\s*([0-9,]+(?:\.[0-9]+)?)",
        cleaned_norm,
        re.IGNORECASE,
    )
    if m:
        raw_num = m.group(1).replace(",", "")
        try:
            val = float(raw_num)
            return val / 100.0 if (val > 500000 and "." not in m.group(1)) else val
        except ValueError:
            return None
    return None


def extract_invoice_grand_total(
    lines: List[str],
    words: Optional[List[Dict[str, Any]]] = None,
    image_height: Optional[float] = None,
) -> Optional[float]:
    """
    Extracts the final printed invoice grand total by inspecting the lower section
    (summary/footer area) of the invoice lines from the bottom upwards.
    Recognizes:
      - Grand Total
      - Invoice Total / Invoice Total Amount
      - Total Amount / Total Amount for Invoice
      - Net Total / Net Payable / Net Amount
      - Amount Payable / Total Payable / Total Due
      - Final Amount / Final Total
      - Total Including Tax
    Explicitly distinguishes and rejects Subtotal, Taxable Amount, Total Tax,
    Discount, Amount Paid, and Balance Due.
    """
    if not lines:
        return None

    excluded_markers = [
        "amount paid", "paid amount", "cash paid", "advance paid", "paid:", "received:",
        "balance due", "balance payable", "previous balance", "current balance", "balance amt",
        "subtotal", "sub total", "sub-total", "taxable amount", "taxable value", "taxable amt",
        "total tax", "tax amount", "cgst amt", "sgst amt", "igst amt"
    ]

    grand_patterns = [
        r"(?:grand\s*total|invoice\s*total(?:\s*amount)?|total\s*(?:amount\s*)?(?:for|of|in)\s*invoice|net\s*payable|amount\s*payable|total\s*payable|total\s*due|final\s*amount|final\s*total|total\s*incl(?:uding)?\s*tax)[\s.:#₹$Rs\-=]*([0-9,]+(?:\.[0-9]+)?)",
        r"(?:net\s*(?:total|amount))[\s.:#₹$Rs\-=]*([0-9,]+(?:\.[0-9]+)?)",
        r"(?:total\s*amount)[\s.:#₹$Rs\-=]*([0-9,]+(?:\.[0-9]+)?)",
    ]

    candidate_lines = list(lines)
    # Reverse scan from the bottom of the invoice lines up (summary section)
    for idx in range(len(candidate_lines) - 1, -1, -1):
        line = candidate_lines[idx].strip()
        if not line:
            continue
        low = line.lower()

        has_grand_label = any(k in low for k in [
            "grand total", "net payable", "amount payable", "total payable",
            "total due", "final amount", "invoice total", "total including tax"
        ])
        if not has_grand_label and any(em in low for em in excluded_markers):
            continue

        for pat in grand_patterns:
            m = re.search(pat, low)
            if m:
                raw_num = m.group(1).replace(",", "")
                try:
                    val = float(raw_num)
                    val_corrected = val / 100.0 if (val > 500000 and "." not in m.group(1)) else val
                    if val_corrected > 0:
                        return round(val_corrected, 2)
                except ValueError:
                    pass

        # Handle split line cases where label is on one line and value is on the immediate next line
        if idx + 1 < len(candidate_lines) and any(gl in low for gl in ["grand total", "net payable", "invoice total", "amount payable", "total amount"]):
            next_line = candidate_lines[idx + 1].strip()
            m_next = re.search(r"^[₹\$Rs\.:\s]*([0-9,]+(?:\.[0-9]+)?)$", next_line)
            if m_next:
                raw_num = m_next.group(1).replace(",", "")
                try:
                    val = float(raw_num)
                    if val > 0:
                        return round(val, 2)
                except ValueError:
                    pass

    # Secondary scan: check for generic "Total: <amount>" in the bottom 35% of lines
    bottom_slice = candidate_lines[int(len(candidate_lines) * 0.65):] if len(candidate_lines) >= 3 else candidate_lines
    for line in reversed(bottom_slice):
        low = line.strip().lower()
        if any(em in low for em in excluded_markers):
            continue
        m_tot = re.search(r"^(?:total|total\s*(?:mrp|bill|value))[\s.:#₹$Rs\-=]*([0-9,]+(?:\.[0-9]+)?)$", low)
        if m_tot:
            raw_num = m_tot.group(1).replace(",", "")
            try:
                val = float(raw_num)
                if val > 0:
                    return round(val, 2)
            except ValueError:
                pass

    return None


def extract_total_from_dict(d: Dict[str, Any]) -> Optional[float]:
    """
    Extracts the overall invoice total directly from the parsed invoice response.
    Prioritizes explicit 'invoice_grand_total', 'grand_total', and 'total_amount_for_invoice'.
    Never calculates from items or formulas.
    """
    if not isinstance(d, dict):
        return None
    total_keys = [
        "invoice_grand_total",
        "grand_total",
        "total_amount_for_invoice",
        "total_amount_in_invoice",
        "total_for_invoice",
        "total_from_image",
        "total_invoice_amount",
        "total_invoice_value",
        "net_payable",
        "amount_payable",
        "total_payable",
        "total_due",
        "final_amount",
        "final_total",
        "total_including_tax",
        "invoice_total",
        "net_total",
        "net_amount",
        "total",
        "total_amount",
        "bill_amount",
        "bill_total",
        "round_off_total",
    ]
    for k in total_keys:
        if k in d and d[k] is not None:
            v = parse_num(d[k])
            if v is not None and v > 0:
                return round(v, 2)
    norm = normalize_dict_keys(d)
    for k in total_keys:
        if k in norm and norm[k] is not None:
            v = parse_num(norm[k])
            if v is not None and v > 0:
                return round(v, 2)
    return None


def get_mock_result() -> Dict[str, Any]:
    """
    Returns clearly labeled mock invoice extraction when no API key is configured.
    Includes realistic items with high and low confidence, wholesale pricing, tax percentages, and totals.
    Compatible with both standard Store-BI and reference dataset schemas.
    """
    today_str = datetime.now().strftime("%Y-%m-%d")
    return {
        "supplier": "Blink Wholesale Distributors",
        "vendor": "Blink Wholesale Distributors",
        "invoice_number": "INV-2026-904",
        "invoice_date": today_str,
        "date": today_str,
        "currency": "INR",
        "subtotal": 4100.0,
        "tax": 330.0,
        "total": 4430.0,
        "total_amount_for_invoice": 4430.0,
        "invoice_grand_total": 4430.0,
        "is_mock": True,
        "ocr_engine": "Sample Demo Mock",
        "message": "MOCK MODE: No Gemini or Claude API key provided. Sample kirana invoice loaded for preview. To scan real invoices with AI, enter your API key in settings.",
        "items": [
            {
                "name": "Tata Salt 1kg",
                "description": "Tata Salt 1kg",
                "qty": 30,
                "quantity": 30,
                "cost_price": 20.0,
                "unit_price": 20.0,
                "tax_rate": 5.0,
                "tax_percent": "5%",
                "tax_amount": 30.0,
                "base_amount": 600.0,
                "is_tax_inclusive": False,
                "mrp": 630.0,
                "line_total": 630.0,
                "amount": 630.0,
                "expiry_date": "2027-12-31",
                "confidence": 0.96,
                "field_confidence": {
                    "name": 0.96,
                    "qty": 0.98,
                    "cost_price": 0.96,
                    "tax": 0.95,
                    "total_mrp": 0.98,
                },
                "needs_review": False,
            },
            {
                "name": "Fortune Sunlite Oil 1L",
                "description": "Fortune Sunlite Oil 1L",
                "qty": 20,
                "quantity": 20,
                "cost_price": 120.0,
                "unit_price": 120.0,
                "tax_rate": 5.0,
                "tax_percent": "5%",
                "tax_amount": 120.0,
                "base_amount": 2400.0,
                "is_tax_inclusive": False,
                "mrp": 2520.0,
                "line_total": 2520.0,
                "amount": 2520.0,
                "expiry_date": None,
                "confidence": 0.92,
                "field_confidence": {
                    "name": 0.95,
                    "qty": 0.95,
                    "cost_price": 0.92,
                    "tax": 0.92,
                    "total_mrp": 0.95,
                },
                "needs_review": False,
            },
            {
                "name": "Parle-G Gold 250g",
                "description": "Parle-G Gold 250g",
                "qty": 40,
                "quantity": 40,
                "cost_price": 25.0,
                "unit_price": 25.0,
                "tax_rate": 18.0,
                "tax_percent": "18%",
                "tax_amount": 180.0,
                "base_amount": 1000.0,
                "is_tax_inclusive": False,
                "mrp": 1180.0,
                "line_total": 1180.0,
                "amount": 1180.0,
                "expiry_date": "2027-08-15",
                "confidence": 0.95,
                "field_confidence": {
                    "name": 0.96,
                    "qty": 0.96,
                    "cost_price": 0.95,
                    "tax": 0.95,
                    "total_mrp": 0.96,
                },
                "needs_review": False,
            },
            {
                "name": "Handwritten Country Jaggery 1kg",
                "description": "Handwritten Country Jaggery 1kg",
                "qty": 2.5,
                "quantity": 2.5,
                "cost_price": 40.0,
                "unit_price": 40.0,
                "tax_rate": 0.0,
                "tax_percent": "0%",
                "tax_amount": 0.0,
                "base_amount": 100.0,
                "is_tax_inclusive": False,
                "mrp": 100.0,
                "line_total": 100.0,
                "amount": 100.0,
                "expiry_date": None,
                "confidence": 0.88,
                "field_confidence": {
                    "name": 0.88,
                    "qty": 0.90,
                    "cost_price": 0.88,
                    "tax": 0.95,
                    "total_mrp": 0.90,
                },
                "needs_review": False,
            },
        ],
    }

SAMPLE_MOCK_RESULT = get_mock_result()


def is_pdf(content: bytes, mime_type: Optional[str] = None) -> bool:
    """Returns True if the content or mime_type represents a PDF file."""
    if mime_type and "pdf" in str(mime_type).lower():
        return True
    return bool(content and content.startswith(b"%PDF"))


def render_pdf_to_images(pdf_bytes: bytes, max_pages: int = 10, scale: float = 2.0) -> List[Tuple[Image.Image, int]]:
    """
    Renders PDF pages to RGB PIL Images using pypdfium2 at high resolution (approx 200-300 DPI).
    Returns list of (PIL.Image, page_number_1_indexed).
    """
    if pypdfium2 is None:
        return []
    try:
        pdf = pypdfium2.PdfDocument(pdf_bytes)
        num_pages = min(len(pdf), max_pages)
        rendered = []
        for p_idx in range(num_pages):
            page = pdf[p_idx]
            pil_img = page.render(scale=scale).to_pil().convert("RGB")
            rendered.append((pil_img, p_idx + 1))
        return rendered
    except Exception:
        return []


def parse_digital_table_line(line: str, column_order: Optional[List[str]] = None) -> Optional[Dict[str, Any]]:
    """
    Parses a single text row from a digital PDF invoice into standardized fields.
    Accurately maps QTY, Unit Cost, Tax %, and Amount based on column ordering if detected.
    """
    tokens = line.strip().split()
    if len(tokens) < 2:
        return None
    # Strip leading serial number (e.g. 1, 1., 01)
    start_idx = 0
    clean_first = re.sub(r"[\.\-\)]", "", tokens[0])
    if clean_first.isdigit() and int(clean_first) < 300:
        start_idx = 1
    tokens = tokens[start_idx:]
    if not tokens:
        return None

    # Separate description tokens and numeric/tax tokens
    name_parts = []
    num_tokens = []
    unit_suffix_pattern = re.compile(r"^\d+(\.\d+)?(kg|g|gm|gms|l|ltr|ltrs|ml|pcs|pkt|pkts|box)$", re.IGNORECASE)

    for idx, t in enumerate(tokens):
        if re.match(r"^\d+(\.\d+)?%$", t):
            num_tokens.append(t)
        elif unit_suffix_pattern.match(t):
            name_parts.append(t)
        else:
            clean_t = re.sub(r"^[₹\$€Rs\.]+|[₹\$€Rs,\.\(\)]+$", "", t, flags=re.IGNORECASE).replace(",", "")
            try:
                val = float(clean_t)
                # Ignore isolated HSN code if not at end
                if clean_t.isdigit() and len(clean_t) in (4, 6, 8) and val > 1000 and idx < len(tokens) - 2 and not num_tokens:
                    continue
                num_tokens.append(t)
            except ValueError:
                if not num_tokens:
                    name_parts.append(t)

    desc = " ".join(name_parts).strip()
    if not desc or len(desc) < 2:
        return None

    numeric_cols = [c for c in column_order if c != "DESCRIPTION"] if column_order else []
    if numeric_cols and len(num_tokens) == len(numeric_cols):
        res: Dict[str, Any] = {
            "name": desc,
            "qty": 1.0,
            "cost_price": None,
            "tax": None,
            "amount": None,
            "taxable_amount": None,
            "tax_amount": None,
            "raw_text": line,
        }
        for col_name, tok in zip(numeric_cols, num_tokens):
            if col_name == "QTY":
                res["qty"] = clean_numeric_value(tok) or 1.0
            elif col_name == "UNIT_COST":
                res["cost_price"] = clean_numeric_value(tok)
            elif col_name == "TAX":
                res["tax"] = tok
            elif col_name == "AMOUNT":
                res["amount"] = clean_numeric_value(tok)
            elif col_name == "TAXABLE_BASE":
                res["taxable_amount"] = clean_numeric_value(tok)
            elif col_name == "TAX_AMOUNT":
                res["tax_amount"] = clean_numeric_value(tok)
        return res

    qty_val = 1.0
    cost_val = None
    tax_val = None
    amt_val = None

    if len(num_tokens) >= 4:
        if column_order and "UNIT_COST" in column_order and "QTY" in column_order:
            if column_order.index("UNIT_COST") < column_order.index("QTY"):
                cost_val = clean_numeric_value(num_tokens[0])
                qty_val = clean_numeric_value(num_tokens[1]) or 1.0
                tax_val = num_tokens[2]
                amt_val = clean_numeric_value(num_tokens[3])
            else:
                qty_val = clean_numeric_value(num_tokens[0]) or 1.0
                cost_val = clean_numeric_value(num_tokens[1])
                tax_val = num_tokens[2]
                amt_val = clean_numeric_value(num_tokens[3])
        else:
            qty_val = clean_numeric_value(num_tokens[0]) or 1.0
            cost_val = clean_numeric_value(num_tokens[1])
            tax_val = num_tokens[2]
            amt_val = clean_numeric_value(num_tokens[3])
    elif len(num_tokens) == 3:
        if "%" in str(num_tokens[1]):
            qty_val = clean_numeric_value(num_tokens[0]) or 1.0
            tax_val = num_tokens[1]
            amt_val = clean_numeric_value(num_tokens[2])
        else:
            qty_val = clean_numeric_value(num_tokens[0]) or 1.0
            cost_val = clean_numeric_value(num_tokens[1])
            amt_val = clean_numeric_value(num_tokens[2])
    elif len(num_tokens) == 2:
        qty_val = clean_numeric_value(num_tokens[0]) or 1.0
        amt_val = clean_numeric_value(num_tokens[1])
    elif len(num_tokens) == 1:
        amt_val = clean_numeric_value(num_tokens[0])

    return {
        "name": desc,
        "qty": qty_val,
        "cost_price": cost_val,
        "tax": tax_val,
        "amount": amt_val,
        "raw_text": line,
    }


def extract_digital_pdf_text_and_tables(pdf_bytes: bytes) -> Optional[Dict[str, Any]]:
    """
    Direct text and table extraction for digital PDFs using pypdf.
    If the PDF has selectable text with tabular structure, parses line items,
    vendor, invoice number, date, tax, and totals with 100% digital fidelity.
    Returns None if the PDF is scanned or has no extractable table.
    """
    if pypdf is None:
        return None
    try:
        reader = pypdf.PdfReader(io.BytesIO(pdf_bytes))
        if not reader.pages:
            return None

        all_pages_text = []
        for p in reader.pages:
            txt = p.extract_text() or ""
            all_pages_text.append(txt)

        full_text = "\n".join(all_pages_text).strip()
        if len(full_text) < 40:
            return None

        low_full = full_text.lower()
        if not any(k in low_full for k in ["qty", "quantity", "rate", "price", "amount", "total", "invoice", "bill"]):
            return None

        lines = [l.strip() for l in full_text.splitlines() if l.strip()]
        vendor = None
        inv_num = None
        inv_date = None
        total = None

        for line in lines:
            if not inv_date:
                m_date = re.search(r"\b(\d{1,2})[/\-\.](\d{1,2})[/\-\.](\d{2,4})\b", line)
                if m_date:
                    d, m_val, y = m_date.groups()
                    if len(y) == 2:
                        y = f"20{y}"
                    try:
                        inv_date = f"{y}-{int(m_val):02d}-{int(d):02d}"
                    except ValueError:
                        pass
            if not inv_num:
                m_inv = re.search(
                    r"(?:invoice\s*(?:no|number|#)?|bill\s*(?:no|#)?|inv\s*(?:no|#)?)[\s.:#\-]*([A-Za-z0-9\/\-_]{3,25})",
                    line,
                    re.IGNORECASE,
                )
                if m_inv:
                    inv_num = m_inv.group(1).strip(" -:#")
            if not vendor and any(
                k in line.lower()
                for k in ["traders", "wholesale", "distributor", "enterprises", "agency", "store", "mart", "ltd", "limited", "pvt"]
            ):
                if not any(k in line.lower() for k in ["tax invoice", "bill to", "ship to", "gstin"]):
                    vendor = line.strip(" :-#|")

        # Extract grand total from the bottom summary area of the document
        total = extract_invoice_grand_total(lines)

        all_raw_items = []
        for p_idx, p_text in enumerate(all_pages_text):
            p_lines = [l.strip() for l in p_text.splitlines() if l.strip()]
            header_idx = None
            header_col_types = []
            for idx, pline in enumerate(p_lines):
                plow = pline.lower()
                matches = sum(
                    1
                    for k in ["description", "item", "product", "particulars", "qty", "quantity", "rate", "price", "amount", "total", "gst", "tax"]
                    if k in plow
                )
                if matches >= 3 and ("qty" in plow or "quantity" in plow or "rate" in plow or "price" in plow):
                    header_idx = idx
                    kw_positions = []
                    for c_type, pats in [
                        ("DESCRIPTION", [r"\bitem\b", r"\bdescription\b", r"\bproduct\b", r"\bparticulars\b"]),
                        ("QTY", [r"\bqty\b", r"\bquantity\b", r"\border\s*qty\b", r"\bitem\s*quantity\b", r"\bquantities\b", r"\bunits\b", r"\bnos\b", r"\bpcs\b"]),
                        ("UNIT_COST", [r"\bprice\s*per\s*unit\b", r"\brate\s*per\s*unit\b", r"\bunit\s*price\b", r"\bunit\s*cost\b", r"\bbasic\s*rate\b", r"\bitem\s*rate\b", r"\bcost\s*per\s*unit\b", r"\brate\b", r"\bprice\b"]),
                        ("TAX", [r"\bgst\s*%\b", r"\btax\s*%\b", r"\bigst\b", r"\bcgst\b", r"\bsgst\b", r"\bgst\b", r"\btax\b", r"\bvat\b"]),
                        ("TAXABLE_BASE", [r"\btaxable\s*amount\b", r"\btaxable\s*value\b", r"\btaxable\b"]),
                        ("TAX_AMOUNT", [r"\btax\s*amount\b", r"\bgst\s*amount\b"]),
                        ("AMOUNT", [r"\bline\s*amount\b", r"\btotal\s*amount\b", r"\bitem\s*amount\b", r"\bline\s*total\b", r"\btotal\s*price\b", r"\bextended\s*amount\b", r"\btotal\s*mrp\b", r"\bamount\b", r"\btotal\b"]),
                    ]:
                        for pat in pats:
                            m = re.search(pat, plow)
                            if m:
                                kw_positions.append((m.start(), c_type))
                                break
                    kw_positions.sort()
                    header_col_types = [c for _, c in kw_positions]
                    break

            if header_idx is not None:
                for row_line in p_lines[header_idx + 1:]:
                    rlow = row_line.lower()
                    if any(stop in rlow for stop in ["subtotal", "sub total", "grand total", "total amount for invoice", "authorized", "bank name", "terms"]):
                        break
                    parsed_item = parse_digital_table_line(row_line, header_col_types)
                    if parsed_item:
                        parsed_item["page"] = p_idx + 1
                        all_raw_items.append(parsed_item)

        if not all_raw_items:
            return None

        validated = validate_and_correct_items(all_raw_items)
        if not validated:
            return None

        return {
            "supplier": vendor or "Wholesale Supplier",
            "vendor": vendor or "Wholesale Supplier",
            "invoice_number": inv_num,
            "invoice_date": inv_date or datetime.now().strftime("%Y-%m-%d"),
            "date": inv_date or datetime.now().strftime("%Y-%m-%d"),
            "currency": "INR",
            "subtotal": round(sum(it["base_amount"] or 0 for it in validated), 2) if validated else None,
            "tax": round(sum(it["tax_amount"] or 0 for it in validated), 2) if validated else None,
            "total": round(total, 2) if total is not None else None,
            "total_amount_for_invoice": round(total, 2) if total is not None else None,
            "invoice_grand_total": round(total, 2) if total is not None else None,
            "page_count": len(all_pages_text),
            "document_type": "digital_pdf",
            "items": validated,
            "is_mock": False,
            "ocr_engine": "Digital PDF Engine",
            "message": f"Successfully extracted {len(validated)} line items directly from digital PDF ({len(all_pages_text)} pages).",
        }
    except Exception:
        return None


def preprocess_image_for_ocr(image_input: Union[bytes, Image.Image]) -> Tuple[bytes, str, Tuple[int, int]]:
    """
    Image and PDF Preprocessing Pipeline:
    1. EXIF Transposition: Corrects camera photos taken in landscape/portrait/upside-down.
    2. Format & Alpha Normalization: Converts RGBA, CMYK, Palette to clean 3-channel RGB.
    3. Dimension Optimization: Keeps resolution sharp (min 900px, max 2048px) to preserve small fonts.
    4. Contrast & Sharpness Boost: Enhances faded ink, thermal prints, carbon copies, and shadows
       without aggressive binarization that would remove decimal points, percentage signs, or thin lines.
    5. Automatic PDF Page 1 rendering if PDF bytes are supplied.
    """
    if isinstance(image_input, Image.Image):
        raw_img = image_input
    elif isinstance(image_input, (bytes, bytearray)):
        if not image_input or len(image_input) < 16:
            raise UnreadableImageError("The uploaded file is empty or corrupted. Please upload a clear photo or PDF.")

        # Check if PDF
        if is_pdf(image_input):
            rendered_pages = render_pdf_to_images(image_input, max_pages=1, scale=2.0)
            if not rendered_pages:
                raise UnreadableImageError("Unable to render PDF page for OCR. The PDF may be password-protected or damaged.")
            raw_img = rendered_pages[0][0]
        else:
            try:
                raw_img = Image.open(io.BytesIO(image_input))
            except Exception as e:
                raise UnreadableImageError(f"Unreadable image format. Please upload a valid JPG, PNG, WEBP, or PDF. Details: {str(e)}")
    else:
        raise UnreadableImageError("Invalid input format for image preprocessing.")

    try:
        # 1. Automatically orient according to EXIF rotation tags
        img = ImageOps.exif_transpose(raw_img)
        if img is None:
            img = raw_img

        # 2. Convert to standard RGB (handle RGBA / Palette / Grayscale)
        if img.mode in ("RGBA", "LA") or (img.mode == "P" and "transparency" in img.info):
            bg = Image.new("RGB", img.size, (255, 255, 255))
            if img.mode != "RGBA":
                img = img.convert("RGBA")
            bg.paste(img, mask=img.split()[3])
            img = bg
        elif img.mode != "RGB":
            img = img.convert("RGB")

        # 3. Scale dimensions for optimal OCR
        width, height = img.size
        max_dim = max(width, height)
        min_dim = min(width, height)

        if max_dim > 2048:
            scale = 2048.0 / max_dim
            new_size = (int(width * scale), int(height * scale))
            img = img.resize(new_size, Image.Resampling.LANCZOS)
        elif min_dim < 750 and max_dim < 1200:
            scale = 1.4
            new_size = (int(width * scale), int(height * scale))
            img = img.resize(new_size, Image.Resampling.LANCZOS)

        # 4. Enhance contrast & sharpness carefully to preserve decimal points & percentages
        try:
            contrast_enhancer = ImageEnhance.Contrast(img)
            img = contrast_enhancer.enhance(1.18)
            sharpness_enhancer = ImageEnhance.Sharpness(img)
            img = sharpness_enhancer.enhance(1.20)
        except Exception:
            pass

        # 5. Export clean JPEG
        out_buf = io.BytesIO()
        img.save(out_buf, format="JPEG", quality=92, optimize=True)
        processed_bytes = out_buf.getvalue()
        return processed_bytes, "image/jpeg", img.size

    except UnreadableImageError:
        raise
    except Exception as e:
        raise UnreadableImageError(f"Unreadable file format. Please upload a valid JPG, PNG, WEBP, or PDF. Details: {str(e)}")


def is_genuine_product_name(raw_name: Any) -> bool:
    """
    Validates whether extracted text represents a genuine product item row
    rather than invoice metadata, company/customer names, headers, taxes,
    subtotals/grand totals, bank details, terms, or footer text.
    Preserves genuine product descriptions, brand names, model numbers, variants, and sizes.
    """
    if raw_name is None:
        return False
    name_str = str(raw_name).strip()
    if len(name_str) < 2:
        return False

    # Ignore strings that are purely numbers, punctuation, or symbols
    if re.fullmatch(r"[\d\s\.,\-\/:#\|\\_\*\+\(\)\[\]\{\}\=@!%]+", name_str):
        return False

    low = name_str.lower()
    # Strip common leading punctuation/bullets
    clean_low = re.sub(r"^[\d\s\.\-\)\(\*#]+", "", low).strip()
    if len(clean_low) < 2:
        return False

    # 1. Standalone Tax / Business / Document Identifiers (GSTIN, PAN, HSN/SAC)
    if re.search(r"\b[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}\b", name_str):
        return False
    if re.fullmatch(r"\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b", name_str):
        return False
    if re.fullmatch(r"(?:gstin|gst\s*no|pan|cin|fssai|hsn(?:\s*code)?|sac(?:\s*code)?|sku(?:\s*(?:no|code))?)[\s.:#\-]*[A-Z0-9\/\-]+", clean_low, re.IGNORECASE):
        return False
    if re.fullmatch(r"(?:hsn|sac)(?:\s*code)?\s*[:\-]?\s*\d{4,10}\b", clean_low):
        return False

    # 2. Invoice Document Titles and Column Headers
    headers_exact = {
        "description", "item description", "product description", "item name", "product name",
        "particulars", "items", "products", "item", "product", "desc", "details",
        "quantity", "qty", "qnty", "rate", "unit rate", "unit price", "price", "unit cost", "cost",
        "tax", "tax rate", "tax %", "gst", "gst %", "cgst", "sgst", "igst", "vat",
        "amount", "total amount", "line total", "line amount", "total", "total mrp", "mrp",
        "sr no", "sr.no", "sl no", "sl.no", "s.no", "s.n.", "s no", "serial no",
        "hsn/sac", "hsn code", "sac code", "uom", "unit", "pack", "batch", "batch no",
        "taxable value", "taxable amount", "disc", "discount", "net rate", "net amount",
        "tax invoice", "retail invoice", "cash memo", "bill of supply", "estimate",
        "original for recipient", "duplicate for transporter", "triplicate for supplier"
    }
    if clean_low in headers_exact:
        return False

    # 3. Financial Totals / Summary Row labels
    totals_prefixes = [
        "subtotal", "sub total", "sub-total", "grand total", "grand-total", "invoice total",
        "total amount", "net total", "net payable", "net amount", "amount payable",
        "total payable", "total due", "final amount", "final total", "round off",
        "rounded off", "round-off", "tax total", "total tax", "total gst",
        "taxable amount", "taxable value", "previous balance", "balance due",
        "amount paid", "paid amount", "cash paid", "advance paid", "balance payable",
        "total mrp", "cgst total", "sgst total", "igst total", "less: discount",
        "less discount", "total discount", "shipping charge", "freight charge",
        "delivery charge", "total line amount", "total line items"
    ]
    for tp in totals_prefixes:
        if clean_low.startswith(tp) or clean_low == tp:
            return False

    # 4. Supplier, Customer, Company entities, Dates, and Address metadata
    meta_prefixes = [
        "bill to", "ship to", "billed to", "shipped to", "consignee", "buyer", "seller",
        "customer name", "supplier name", "vendor name", "party name", "m/s ", "messrs",
        "invoice no", "invoice number", "bill no", "bill number", "inv no", "memo no",
        "invoice date", "bill date", "date of invoice", "due date", "po no", "challan no",
        "order no", "place of supply", "state code", "vehicle no", "transport mode",
        "e-way bill", "eway bill", "reverse charge", "date:", "date ", "dated:", "dated "
    ]
    for mp in meta_prefixes:
        if clean_low.startswith(mp):
            return False

    # Standalone date check (e.g. 14/10/2026 or 2026-10-15)
    if re.fullmatch(r"(?:date\s*[:\-]?)?\s*(?:\d{1,2}[/\-\.]\d{1,2}[/\-\.]\d{2,4}|\d{4}[/\-\.]\d{1,2}[/\-\.]\d{1,2})", clean_low):
        return False

    # Company / Supplier entity designations
    company_indicators = [
        "pvt ltd", "pvt. ltd", "private limited", "ltd.", "llp", "distributors",
        "wholesale distributor", "enterprises", "traders", "supermarket",
        "kirana & general store", "wholesalers"
    ]
    for ci in company_indicators:
        if ci in clean_low:
            return False

    # 5. Bank Details, Payment Terms, Contact info
    bank_and_contact = [
        "bank details", "bank name", "bank a/c", "bank account", "a/c no", "account no",
        "account number", "ifsc code", "ifsc", "branch name", "branch", "upi id",
        "google pay", "phone pe", "paytm", "mode of payment", "payment terms",
        "phone no", "mobile no", "contact no", "telephone", "tel no", "email id",
        "email:", "website:"
    ]
    for bp in bank_and_contact:
        if clean_low.startswith(bp) or (bp in clean_low and any(k in clean_low for k in ["a/c", "ifsc", "branch"])):
            return False

    # 6. Legal / Footer / Signatures
    footer_prefixes = [
        "terms & conditions", "terms and conditions", "terms of sale", "declaration",
        "we declare that", "subject to jurisdiction", "goods once sold",
        "authorized signatory", "authorised signatory", "receiver's signature",
        "customer's signature", "signature", "for ", "e. & o.e.", "e.&o.e.",
        "page 1 of", "page 2 of", "page 3 of", "page no", "thank you",
        "visit again", "computer generated invoice"
    ]
    for fp in footer_prefixes:
        if clean_low.startswith(fp):
            return False

    # 7. Discard raw email addresses, websites, or phone numbers
    if re.search(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$", name_str):
        return False
    if re.search(r"^(?:https?:\/\/)?(?:www\.)?[a-zA-Z0-9-]+\.[a-zA-Z]{2,}", name_str):
        return False
    if re.search(r"^(?:\+?\d{1,3}[\s-]?)?\(?\d{3,5}\)?[\s-]?\d{6,10}$", name_str):
        return False

    return True


def clean_product_name(raw_name: str) -> str:
    """
    Sanitizes extracted product names:
    - Removes invoice noise (HSN codes, barcodes, batch numbers, tax annotations)
    - Fixes ALL-CAPS to Title Case
    - Normalizes packaging units (kg, g, L, ml, pcs, pkt)
    - Preserves meaningful brand names, model numbers, variants, and sizes
    """
    if not raw_name:
        return ""

    name = str(raw_name).strip()

    # Strip markdown or list numbering like "1. ", "01- "
    name = re.sub(r"^\d+[\.\-\)]\s*", "", name)

    # Strip HSN / SAC codes like "HSN 19053100" or "HSN: 2106"
    name = re.sub(r"\bHSN\s*[:\-]?\s*\d+\b", "", name, flags=re.IGNORECASE)
    name = re.sub(r"\bSAC\s*[:\-]?\s*\d+\b", "", name, flags=re.IGNORECASE)

    # Strip isolated 8-14 digit barcodes/EANs
    name = re.sub(r"\b\d{8,14}\b", "", name)

    # Strip common invoice noise words
    noise_patterns = [
        r"\bTAX\s+INVOICE\b",
        r"\bTAX\s+INCL\b",
        r"\bTAX\s+EXTRA\b",
        r"\bGST\s*\d+%\b",
        r"\bCGST\b",
        r"\bSGST\b",
        r"\bIGST\b",
        r"\bB\.?NO\s*[:\-]?\s*\w+\b",
        r"\bBATCH\s*[:\-]?\s*\w+\b",
    ]
    for pattern in noise_patterns:
        name = re.sub(pattern, "", name, flags=re.IGNORECASE)

    # Remove extra symbols and multiple whitespace
    name = re.sub(r"[\*\_\|]+", " ", name)
    name = re.sub(r"\s+", " ", name).strip()

    # Convert ALL CAPS to clean Title Case if longer than 3 chars (unless model acronym)
    if name.isupper() and len(name) > 3 and not re.search(r"\d", name):
        name = name.title()

    # Standardize common units
    unit_replacements = [
        (r"\b(\d+)\s*Kg\b", r"\1kg"),
        (r"\b(\d+)\s*Gm\b", r"\1g"),
        (r"\b(\d+)\s*Gms\b", r"\1g"),
        (r"\b(\d+)\s*Ltr\b", r"\1L"),
        (r"\b(\d+)\s*L\b", r"\1L"),
        (r"\b(\d+)\s*Ml\b", r"\1ml"),
        (r"\b(\d+)\s*Pkt\b", r"\1pkt"),
        (r"\b(\d+)\s*Pcs\b", r"\1pcs"),
    ]
    for pat, rep in unit_replacements:
        name = re.sub(pat, rep, name, flags=re.IGNORECASE)

    return name.strip()


def normalize_dict_keys(raw: Dict[str, Any]) -> Dict[str, Any]:
    """
    Standardizes dictionary keys by lowercasing, replacing punctuation/spaces with underscores,
    and preserving the original keys for seamless keyword matching.
    """
    norm: Dict[str, Any] = {}
    for k, v in raw.items():
        norm[k] = v
        clean_k = re.sub(r"[^a-z0-9]+", "_", str(k).lower()).strip("_")
        if clean_k and clean_k not in norm:
            norm[clean_k] = v
    return norm


def parse_tax_percentage(
    val: Any = None,
    cgst_val: Any = None,
    sgst_val: Any = None,
    igst_val: Any = None,
    vat_val: Any = None,
    base_amount: Optional[float] = None,
    tax_amount: Optional[float] = None,
) -> Tuple[Optional[float], str, float]:
    """
    Standardizes and unifies tax percentage rates:
    - Recognizes IGST, single GST/TAX, and combined CGST + SGST (e.g. CGST 9% + SGST 9% = 18%).
    - Normalizes percentages (e.g. '18%', '18 %', 18, 18.0) to float 18.0 and display '18%'.
    - Handles explicit exempt/zero tax: returns (0.0, '0%', 0.95).
    - Derives rate from tax amount only when base and tax amount are unambiguous and match standard GST brackets.
    - If tax cannot be determined reliably, returns (None, 'Needs Review', 0.40). NEVER assumes 0%.
    """
    def _extract_pct(v: Any) -> Optional[float]:
        if v is None:
            return None
        if isinstance(v, (int, float)):
            num = float(v)
            if 0.0 <= num <= 50.0:
                return num
            return None
        s = str(v).strip().lower()
        if not s or s in ("-", "—", "none", "null", "undefined", "n/a", "unknown", "needs review"):
            return None
        if s in ("0", "0%", "0.0%", "exempt", "nil", "zero", "non-gst", "nill"):
            return 0.0
        m = re.search(r"(\d+(?:\.\d+)?)\s*%", s)
        if m:
            try:
                num = float(m.group(1))
                if 0.0 <= num <= 50.0:
                    return num
            except ValueError:
                pass
        num_clean = parse_num(s)
        if num_clean is not None and 0.0 <= num_clean <= 50.0:
            return num_clean
        return None

    # 1. Combined CGST + SGST rates (e.g. CGST 9% and SGST 9% -> unified 18%)
    cgst_rate = _extract_pct(cgst_val)
    sgst_rate = _extract_pct(sgst_val)
    if cgst_rate is not None and sgst_rate is not None:
        combined = round(cgst_rate + sgst_rate, 2)
        pct_str = f"{int(combined)}%" if combined.is_integer() else f"{combined}%"
        return combined, pct_str, 0.98

    # 2. IGST rate
    igst_rate = _extract_pct(igst_val)
    if igst_rate is not None:
        pct_str = f"{int(igst_rate)}%" if igst_rate.is_integer() else f"{igst_rate}%"
        return igst_rate, pct_str, 0.96

    # 3. VAT rate
    vat_rate = _extract_pct(vat_val)
    if vat_rate is not None:
        pct_str = f"{int(vat_rate)}%" if vat_rate.is_integer() else f"{vat_rate}%"
        return vat_rate, pct_str, 0.95

    # 4. Explicit generic TAX / GST rate
    tax_rate = _extract_pct(val)
    if tax_rate is not None:
        pct_str = f"{int(tax_rate)}%" if tax_rate.is_integer() else f"{tax_rate}%"
        return tax_rate, pct_str, 0.95

    # 5. Check if val was explicit zero / exempt text
    if val is not None:
        s_val = str(val).strip().lower()
        if any(w in s_val for w in ["exempt", "nil", "zero tax", "0%", "non-gst"]):
            return 0.0, "0%", 0.95

    # 6. Derive percentage from currency tax amount if base is known and matches standard GST rate
    tax_currency = parse_num(tax_amount)
    if tax_currency is None and parse_num(val) is not None and (parse_num(val) or 0) > 50.0:
        tax_currency = parse_num(val)

    if tax_currency is not None and tax_currency >= 0 and base_amount and base_amount > 0:
        derived_pct = (tax_currency / base_amount) * 100.0
        # Check standard Indian GST brackets: 0, 5, 12, 18, 28
        standard_rates = [0.0, 5.0, 12.0, 18.0, 28.0]
        for std in standard_rates:
            if abs(derived_pct - std) <= max(0.5, std * 0.05):
                pct_str = f"{int(std)}%" if std.is_integer() else f"{std}%"
                return std, pct_str, 0.88

    # 7. Tax rate cannot be determined reliably -> Mark as Unknown / Needs Review (NEVER assume 0%)
    return None, "Needs Review", 0.40


def calculate_row_totals(
    qty: float,
    unit_cost: Optional[float],
    tax_rate: Optional[float],
    is_tax_inclusive: bool = False,
    discount: float = 0.0,
) -> Tuple[Optional[float], Optional[float], Optional[float]]:
    """
    Calculates line totals per specification:
      Base Amount = QTY * UNIT COST
      Tax Amount = Base Amount * TAX_PERCENTAGE / 100
      TOTAL MRP = Base Amount + Tax Amount = QTY * UNIT COST * (1 + TAX_PERCENTAGE / 100)
    If unit_cost is tax-inclusive: avoids double taxation.
    If tax_rate is None (Needs Review): preserves base amount without unverified additions.
    """
    if unit_cost is None or unit_cost <= 0 or qty <= 0:
        return None, None, None

    if is_tax_inclusive:
        # Unit cost already includes tax
        total_mrp = round(qty * unit_cost - discount, 2)
        if tax_rate is not None and tax_rate > 0:
            pre_tax_base = round(total_mrp / (1.0 + (tax_rate / 100.0)), 2)
            tax_amount = round(total_mrp - pre_tax_base, 2)
            base_amount = pre_tax_base
        else:
            base_amount = total_mrp
            tax_amount = 0.0 if tax_rate == 0.0 else None
        return base_amount, tax_amount, total_mrp

    # Standard pre-tax unit cost
    base_amount = round(qty * unit_cost - discount, 2)
    if tax_rate is not None:
        tax_amount = round(base_amount * (tax_rate / 100.0), 2)
        total_mrp = round(base_amount + tax_amount, 2)
    else:
        tax_amount = None
        total_mrp = base_amount

    return base_amount, tax_amount, total_mrp


def validate_and_correct_items(items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Standardized Invoice Field Recognition & Original Amount Preservation Pipeline:
    - Normalizes alternative labels to standardized fields:
      - Quantity (QTY): qty, quantity, quantities, quantity ordered, order qty, item quantity, nos, units, pcs, billed qty.
      - Unit Cost (UNIT COST): unit cost, price per unit, price, rate, rate per unit, unit price, cost per unit, basic rate, item rate, per unit price.
      - Tax (TAX): tax, tax %, gst, gst %, igst, igst %, cgst, cgst %, sgst, sgst %, vat, vat %, tax rate, gst rate, tax percentage.
      - Total MRP (TOTAL MRP): Amount, Total, Total Amount, Item Amount, Line Amount, Line Total, Total Price, Extended Amount, Total MRP.
    - Preserves the original extracted invoice line amount as TOTAL MRP.
      NO formula-based calculation (no QTY * UNIT COST + TAX overwrite).
      If the amount column cannot be confidently identified, flags as 'Needs Review'.
    - Supports whole numbers and decimal quantities (e.g. 1, 5, 12, 2.5, 0.75).
    - Unifies CGST + SGST (e.g. CGST 9% + SGST 9% = 18%) or IGST into TAX percentage.
    - Provides field-level confidence scores and needs_review flags.
    """
    corrected: List[Dict[str, Any]] = []

    for raw_item in items:
        item = normalize_dict_keys(raw_item)

        # 1. Product / Description Extraction
        raw_name = (
            item.get("description")
            or item.get("name")
            or item.get("item_name")
            or item.get("particulars")
            or item.get("product_name")
            or item.get("item")
            or item.get("product")
            or item.get("product_description")
            or ""
        )
        clean_name = clean_product_name(raw_name)
        if not clean_name or len(clean_name) < 2 or not is_genuine_product_name(clean_name):
            continue

        # 2. Quantity (QTY) Extraction - Standardized keyword mapping & decimals support
        raw_qty = (
            item.get("qty")
            if item.get("qty") is not None
            else item.get("quantity")
        )
        if raw_qty is None:
            raw_qty = (
                item.get("quantities")
                or item.get("quantity_ordered")
                or item.get("order_qty")
                or item.get("item_quantity")
                or item.get("billed_qty")
                or item.get("pcs")
                or item.get("units")
                or item.get("nos")
                or item.get("count")
                or item.get("item_qty")
                or item.get("pack")
                or item.get("pkts")
                or item.get("cases")
                or item.get("qnty")
                or item.get("qty_")
            )
        qty_num = parse_num(raw_qty)
        qty: Optional[float] = None
        if qty_num is not None and qty_num > 0:
            qty = float(qty_num)

        # 3. Unit Cost (UNIT COST) Extraction - Standardized keyword mapping
        raw_cost = (
            item.get("cost_price")
            if item.get("cost_price") is not None
            else item.get("unit_price")
        )
        if raw_cost is None:
            raw_cost = (
                item.get("unit_cost")
                or item.get("price_per_unit")
                or item.get("rate")
                or item.get("price")
                or item.get("rate_per_unit")
                or item.get("cost_per_unit")
                or item.get("basic_rate")
                or item.get("item_rate")
                or item.get("per_unit_price")
                or item.get("wp")
            )
        cost_price = parse_num(raw_cost)

        # 4. Tax (TAX) Extraction - Standardized percentage extraction
        raw_tax = (
            item.get("tax_rate")
            if item.get("tax_rate") is not None
            else item.get("tax_percent")
        )
        if raw_tax is None:
            raw_tax = (
                item.get("tax")
                or item.get("gst")
                or item.get("tax_percentage")
                or item.get("gst_rate")
                or item.get("tax_rate_percent")
                or item.get("applicable_tax")
                or item.get("applicable_gst")
                or item.get("tax_")
                or item.get("gst_")
            )

        cgst_val = item.get("cgst_rate") or item.get("cgst") or item.get("cgst_") or item.get("cgst_percentage")
        sgst_val = item.get("sgst_rate") or item.get("sgst") or item.get("sgst_") or item.get("sgst_percentage")
        igst_val = item.get("igst_rate") or item.get("igst") or item.get("igst_") or item.get("igst_percentage")
        vat_val = item.get("vat_rate") or item.get("vat") or item.get("vat_") or item.get("vat_percentage")
        raw_tax_amt = item.get("tax_amount") or item.get("gst_amount")

        # Check tax-inclusive status
        is_tax_inclusive = bool(
            item.get("is_tax_inclusive")
            or item.get("tax_inclusive")
            or "tax incl" in str(raw_name).lower()
            or "incl. tax" in str(raw_name).lower()
            or "inclusive of tax" in str(raw_name).lower()
        )

        # 5. TOTAL MRP: Extract original product-line amount directly from invoice
        # Candidate headers: Amount, Total, Total Amount, Item Amount, Line Amount, Line Total, Total Price, Extended Amount, Total MRP
        raw_total = None
        for key_candidate in [
            "amount",
            "total_amount",
            "item_amount",
            "line_amount",
            "line_total",
            "total_price",
            "extended_amount",
            "total",
            "total_mrp",
            "mrp",
            "net_amount",
            "value",
            "item_total",
        ]:
            if item.get(key_candidate) is not None:
                raw_total = item.get(key_candidate)
                break

        line_total = clean_numeric_value(raw_total)

        raw_taxable = item.get("taxable_amount") or item.get("taxable_value") or item.get("taxable_amt")
        taxable_amt = clean_numeric_value(raw_taxable)

        # Base tentative calculation for deriving tax percentage if currency amount was provided
        tentative_base = (qty * cost_price) if (qty and cost_price) else None
        tax_rate, tax_percent_str, tax_confidence = parse_tax_percentage(
            val=raw_tax,
            cgst_val=cgst_val,
            sgst_val=sgst_val,
            igst_val=igst_val,
            vat_val=vat_val,
            base_amount=tentative_base,
            tax_amount=raw_tax_amt,
        )

        # --- MATHEMATICAL SELF-CORRECTION & INVERSION CHECK ---

        # RULE A: Inversion detection (Rate and Total were swapped by OCR when qty > 1)
        if cost_price and line_total and qty and qty > 1 and cost_price > line_total:
            if abs(cost_price - (line_total * qty)) <= max(2.0, cost_price * 0.05):
                cost_price, line_total = line_total, cost_price

        # RULE B: Recover missing Qty if line_total and cost_price are present but qty is missing/1
        if cost_price and line_total and cost_price > 0 and (qty is None or qty <= 1) and line_total > cost_price:
            ratio = line_total / cost_price
            if ratio >= 1.4 and abs(ratio - round(ratio)) < 0.15:
                qty = float(round(ratio))

        # RULE C: Check if quantity was written into product name (e.g. "Tata Salt (10)")
        if qty is None or qty <= 1:
            name_qty_match = re.search(
                r"[\(\[\{x\*\-]\s*(\d+(?:\.\d+)?)\s*(?:pcs|pkts|packs|units|nos|qty|bottles|boxes|cans)?\s*[\)\]\}]?$",
                clean_name,
                re.IGNORECASE,
            )
            if name_qty_match:
                extracted_name_qty = float(name_qty_match.group(1))
                if 1.0 < extracted_name_qty <= 500:
                    qty = extracted_name_qty

        # RULE D: Ensure qty fallback
        if qty is None or qty <= 0:
            qty = 1.0

        # RULE E: PRESERVE ORIGINAL EXTRACTED LINE AMOUNT AS TOTAL MRP
        # User specification:
        # "Remove the formula-based calculation of TOTAL MRP completely.
        # Do not calculate TOTAL MRP using QTY, UNIT COST, or TAX.
        # Do not multiply quantities by prices, add tax, or overwrite the amount extracted from the invoice.
        # If the correct amount column cannot be identified confidently, flag the field as Needs Review rather than inventing a value."
        # If the invoice amount represents only taxable base rather than final total, do not mislabel as total.
        is_taxable_only = False
        if taxable_amt is not None and (line_total is None or raw_total is None):
            is_taxable_only = True
        elif taxable_amt is not None and line_total is not None and abs(taxable_amt - line_total) < 0.01:
            # Check if this column was explicitly the taxable amount column and no separate line total exists
            explicit_keys = ["total_mrp", "line_total", "total", "line_amount", "amount", "total_price"]
            if not any(k in item and item[k] is not None for k in explicit_keys):
                is_taxable_only = True

        final_total_mrp: Optional[float] = None
        if not is_taxable_only and line_total is not None and line_total > 0:
            final_total_mrp = round(line_total, 2)

        # Calculate pre-tax base and line tax for auditing/informational display
        final_cost = round(cost_price, 2) if (cost_price is not None and cost_price > 0) else None
        formatted_qty = int(round(qty)) if abs(qty - round(qty)) < 1e-4 else round(qty, 3)

        base_amt = round(formatted_qty * final_cost, 2) if final_cost is not None else None
        tax_amt: Optional[float] = None
        if tax_rate is not None and base_amt is not None:
            tax_amt = round(base_amt * (tax_rate / 100.0), 2)
        elif raw_tax_amt is not None:
            tax_amt = round(parse_num(raw_tax_amt) or 0.0, 2)

        # --- FIELD-LEVEL CONFIDENCE SCORES ---
        field_conf = {
            "name": 0.95 if len(clean_name) >= 3 else 0.40,
            "qty": 0.95 if (qty_num is not None and qty_num > 0) else 0.50,
            "cost_price": 0.95 if (cost_price is not None and cost_price > 0) else 0.40,
            "tax": tax_confidence,
            "total_mrp": 0.95 if (final_total_mrp is not None and not is_taxable_only) else 0.30,
        }

        # Determine if row needs manual review:
        # Flag if tax cannot be determined reliably OR if amount/TOTAL MRP could not be extracted from invoice
        needs_review = (
            final_total_mrp is None
            or is_taxable_only
            or tax_rate is None
            or tax_percent_str == "Needs Review"
            or any(score < 0.70 for score in field_conf.values())
            or final_cost is None
        )

        overall_conf = statistics.mean(field_conf.values())

        # Format expiry date
        expiry = item.get("expiry_date")
        if expiry and not re.match(r"^\d{4}-\d{2}-\d{2}$", str(expiry).strip()):
            expiry = None

        corrected.append({
            # Standard project schema
            "name": clean_name,
            "qty": formatted_qty,
            "cost_price": final_cost,
            "tax_rate": tax_rate,
            "tax_percent": tax_percent_str,
            "tax_amount": tax_amt,
            "base_amount": base_amt,
            "taxable_amount": taxable_amt,
            "is_tax_inclusive": is_tax_inclusive,
            "mrp": final_total_mrp,
            "line_total": final_total_mrp,
            "expiry_date": expiry,
            "confidence": round(overall_conf, 2),
            "field_confidence": field_conf,
            "needs_review": needs_review,
            "page": item.get("page", 1),
            "raw_text": item.get("raw_text"),
            # Reference schema compatibility
            "description": clean_name,
            "quantity": formatted_qty,
            "unit_price": final_cost,
            "amount": final_total_mrp,
        })

    return corrected


def clean_json_response(raw_text: str) -> Dict[str, Any]:
    """
    Extracts and parses JSON from model responses:
    - Strips markdown ```json fences
    - Discards preamble or trailing remarks
    - Locates outermost JSON object {...}
    - Cleans invalid trailing commas
    """
    text = (raw_text or "").strip()

    # 1. Strip markdown fences
    fence_match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", text)
    if fence_match:
        text = fence_match.group(1).strip()
    else:
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text).strip()

    # 2. Extract outermost JSON object {...}
    if not text.startswith("{"):
        match = re.search(r"(\{[\s\S]*\})", text)
        if match:
            text = match.group(1).strip()

    # 3. Strip trailing commas before closing braces/brackets
    text = re.sub(r",\s*([\]}])", r"\1", text)

    try:
        return json.loads(text)
    except json.JSONDecodeError as e:
        raise VisionBadJsonError(f"Invalid JSON returned by Vision model: {str(e)}")


HEADER_COLUMN_PATTERNS: Dict[str, List[str]] = {
    "DESCRIPTION": [
        r"\bitem\s*desc(?:ription)?\b",
        r"\bproduct\s*desc(?:ription)?\b",
        r"\bdescription\b",
        r"\bparticulars\b",
        r"\bitem\s*name\b",
        r"\bproduct\s*name\b",
        r"\bproduct\b",
        r"\bitem\b",
        r"\bitems\b",
        r"\bproducts\b",
    ],
    "QTY": [
        r"\border\s*qty\b",
        r"\bquantity\s*ordered\b",
        r"\bitem\s*quantity\b",
        r"\bbilled\s*qty\b",
        r"\bquantities\b",
        r"\bquantity\b",
        r"\bqty\.?\b",
        r"\bnos\.?\b",
        r"\bunits\b",
        r"\bpcs\.?\b",
        r"\bcount\b",
    ],
    "UNIT_COST": [
        r"\bprice\s*per\s*unit\b",
        r"\brate\s*per\s*unit\b",
        r"\bcost\s*per\s*unit\b",
        r"\bper\s*unit\s*price\b",
        r"\bunit\s*price\b",
        r"\bunit\s*cost\b",
        r"\bbasic\s*rate\b",
        r"\bitem\s*rate\b",
        r"\brate\b",
        r"\bprice\b",
        r"\bcost\b",
    ],
    "TAX": [
        r"\btax\s*percentage\b",
        r"\bgst\s*rate\b",
        r"\btax\s*rate\b",
        r"\bgst\s*%\b",
        r"\btax\s*%\b",
        r"\bigst\s*%\b",
        r"\bcgst\s*%\b",
        r"\bsgst\s*%\b",
        r"\bvat\s*%\b",
        r"\bigst\b",
        r"\bcgst\b",
        r"\bsgst\b",
        r"\bgst\b",
        r"\btax\b",
        r"\bvat\b",
    ],
    "TOTAL_MRP": [
        r"\bline\s*amount\b",
        r"\bline\s*total\b",
        r"\btotal\s*amount\b",
        r"\bitem\s*amount\b",
        r"\bitem\s*total\b",
        r"\btotal\s*price\b",
        r"\bextended\s*amount\b",
        r"\btotal\s*mrp\b",
        r"\bamount\b",
        r"\btotal\b",
        r"\bnet\s*amount\b",
        r"\bnet\s*amt\b",
    ],
    "TAXABLE_BASE": [
        r"\btaxable\s*value\b",
        r"\btaxable\s*amount\b",
        r"\btaxable\s*amt\b",
        r"\btaxable\b",
    ],
    "TAX_AMOUNT": [
        r"\btax\s*amount\b",
        r"\bgst\s*amount\b",
        r"\btax\s*amt\b",
        r"\btotal\s*tax\b",
    ],
    "HSN": [
        r"\bhsn/sac\b",
        r"\bhsn\s*code\b",
        r"\bhsn\b",
        r"\bsac\b",
        r"\bcode\b",
    ],
    "S_NO": [
        r"\bsr\.?\s*no\.?\b",
        r"\bs\.?\s*no\.?\b",
        r"\bsl\.?\s*no\.?\b",
        r"\bno\.?\b",
    ],
}


def _match_header_words_in_line(
    words: List[Dict[str, Any]],
    patterns: Dict[str, List[str]],
) -> List[Tuple[str, float, float]]:
    """
    Identifies which header column categories are present in a line of OCR words,
    and returns list of (col_name, x_min, x_max).
    """
    line_text = " ".join(w["text"] for w in words).lower()
    matched_cols: List[Tuple[str, float, float]] = []

    for col_name, pat_list in patterns.items():
        found = False
        for pat in pat_list:
            m = re.search(pat, line_text)
            if m:
                start_char, end_char = m.start(), m.end()
                curr_char = 0
                matching_words = []
                for w in words:
                    w_len = len(w["text"])
                    w_start = curr_char
                    w_end = curr_char + w_len
                    if not (w_end <= start_char or w_start >= end_char):
                        matching_words.append(w)
                    curr_char += w_len + 1

                if matching_words:
                    # Ensure multi-word column header phrases are physically contiguous
                    # and not spanning across separate table column gaps
                    words_in_phrase = sorted(matching_words, key=lambda item: item["x"])
                    is_contiguous = True
                    for i in range(len(words_in_phrase) - 1):
                        gap = words_in_phrase[i + 1]["x"] - (words_in_phrase[i]["x"] + words_in_phrase[i]["w"])
                        max_allowed_gap = max(25.0, words_in_phrase[i].get("h", 15.0) * 1.8)
                        if gap > max_allowed_gap:
                            is_contiguous = False
                            break
                    if not is_contiguous:
                        continue

                    x_min = min(w["x"] for w in matching_words)
                    x_max = max(w["x"] + w["w"] for w in matching_words)
                    matched_cols.append((col_name, x_min, x_max))
                    found = True
                    break

        if not found and col_name in ("QTY", "UNIT_COST", "TAX", "TOTAL_MRP"):
            for w in words:
                wt = w["text"].lower().strip(".:-")
                for pat in pat_list:
                    clean_pat = pat.replace(r"\b", "").replace(r"\.?\b", "").strip()
                    if wt == clean_pat or re.fullmatch(clean_pat, wt):
                        matched_cols.append((col_name, w["x"], w["x"] + w["w"]))
                        found = True
                        break
                if found:
                    break

    return matched_cols


def detect_spatial_table_and_extract_items(
    words: List[Dict[str, Any]],
    image_width: float = 1200.0,
    page_num: int = 1,
) -> List[Dict[str, Any]]:
    """
    2D Spatial Table & Column Detector using OCR word coordinates and bounding boxes:
    - Clusters words into horizontal visual lines using vertical centers (cy).
    - Detects the table header row (supports single and multi-line headers).
    - Computes horizontal column boundary intervals [x_left, x_right] for each field.
    - Handles reordered columns (e.g. Layout A: Description|Qty|Rate|GST|Amount,
      Layout B: Item|Unit Price|Quantity|IGST|Total, Layout C: Product|QTY|Price per Unit|Tax %|Line Amount).
    - Associates words with table rows and handles multiline description wrapping without row splitting.
    - Accurately distinguishes line totals from taxable base, tax amount, and HSN codes.
    - Preserves original OCR text and page number.
    """
    if not words or len(words) < 4:
        return []

    # 1. Compute cy and group words into lines
    for w in words:
        if "cy" not in w:
            w["cy"] = w["y"] + (w["h"] / 2.0)
        if "cx" not in w:
            w["cx"] = w["x"] + (w["w"] / 2.0)

    heights = [w["h"] for w in words if w.get("h", 0) > 0]
    med_h = statistics.median(heights) if heights else 15.0
    y_threshold = max(8.0, med_h * 0.85)

    words_sorted = sorted(words, key=lambda w: w["cy"])
    lines_of_words: List[List[Dict[str, Any]]] = []
    curr_line: List[Dict[str, Any]] = []
    curr_cy: Optional[float] = None

    for w in words_sorted:
        if curr_cy is None:
            curr_line = [w]
            curr_cy = w["cy"]
        elif abs(w["cy"] - curr_cy) <= y_threshold:
            curr_line.append(w)
            curr_cy = sum(item["cy"] for item in curr_line) / len(curr_line)
        else:
            curr_line.sort(key=lambda item: item["x"])
            lines_of_words.append(curr_line)
            curr_line = [w]
            curr_cy = w["cy"]
    if curr_line:
        curr_line.sort(key=lambda item: item["x"])
        lines_of_words.append(curr_line)

    if len(lines_of_words) < 2:
        return []

    # 2. Identify Table Header Row(s)
    best_header_idx: Optional[int] = None
    best_header_cols: List[Tuple[str, float, float]] = []
    max_matched_cols = 0
    header_is_multiline = False

    for l_idx, l_words in enumerate(lines_of_words):
        detected = _match_header_words_in_line(l_words, HEADER_COLUMN_PATTERNS)
        detected_2line = detected
        is_2line = False

        if l_idx + 1 < len(lines_of_words):
            next_l_words = lines_of_words[l_idx + 1]
            next_text = " ".join(w["text"] for w in next_l_words).lower()
            if not any(c.isdigit() for c in next_text) and len(next_text) < 120:
                combined_words = sorted(l_words + next_l_words, key=lambda w: w["x"])
                comb_detected = _match_header_words_in_line(combined_words, HEADER_COLUMN_PATTERNS)
                if len(comb_detected) > len(detected):
                    detected_2line = comb_detected
                    is_2line = True

        effective_cols = detected_2line if is_2line else detected
        core_categories = {"QTY", "UNIT_COST", "TAX", "TOTAL_MRP", "TAXABLE_BASE"}
        matched_core = sum(1 for col_name, _, _ in effective_cols if col_name in core_categories)

        if matched_core >= 2 and len(effective_cols) > max_matched_cols:
            max_matched_cols = len(effective_cols)
            best_header_idx = l_idx
            best_header_cols = effective_cols
            header_is_multiline = is_2line

    if best_header_idx is None or max_matched_cols < 2:
        return []

    # 3. Establish Column Boundaries
    cols_sorted = sorted(best_header_cols, key=lambda c: (c[1] + c[2]) / 2.0)
    col_intervals: List[Tuple[str, float, float]] = []
    num_cols = len(cols_sorted)

    for idx, (col_name, x_min, x_max) in enumerate(cols_sorted):
        if idx == 0:
            left_bound = 0.0
        elif cols_sorted[idx - 1][0] == "DESCRIPTION":
            left_bound = x_min - max(15.0, (x_max - x_min) * 0.25)
        else:
            prev_max = cols_sorted[idx - 1][2]
            left_bound = (prev_max + x_min) / 2.0

        if idx == num_cols - 1:
            right_bound = max(image_width, x_max + 150.0)
        elif col_name == "DESCRIPTION":
            next_min = cols_sorted[idx + 1][1]
            next_w = cols_sorted[idx + 1][2] - next_min
            right_bound = next_min - max(15.0, next_w * 0.25)
        else:
            next_min = cols_sorted[idx + 1][1]
            right_bound = (x_max + next_min) / 2.0

        col_intervals.append((col_name, left_bound, right_bound))

    # 4. Extract Line Items Below Header
    start_row = best_header_idx + (2 if header_is_multiline else 1)
    extracted_items: List[Dict[str, Any]] = []

    totals_stops = [
        "subtotal", "sub total", "sub-total", "grand total", "total amount for invoice",
        "net payable", "net amount", "total payable", "round off", "total tax", "tax total",
        "taxable value", "taxable amount", "amount paid", "balance due"
    ]
    footer_stops = [
        "authorized signatory", "authorised signatory", "bank details", "bank name",
        "terms & conditions", "terms and conditions", "declaration", "for ", "e. & o.e.",
        "receiver's signature", "customer signature", "page 1 of"
    ]

    unit_suffix_pattern = re.compile(r"^\d+(\.\d+)?(kg|g|gm|gms|l|ltr|ltrs|ml|pcs|pkt|pkts|box)$", re.IGNORECASE)
    unit_word_pattern = re.compile(r"^(kg|g|gm|gms|l|ltr|ltrs|ml|pcs|pkt|pkts|box)$", re.IGNORECASE)

    for l_idx in range(start_row, len(lines_of_words)):
        row_words = lines_of_words[l_idx]
        row_text = " ".join(w["text"] for w in row_words).strip()
        low_row = row_text.lower()

        # Stop extraction when table reaches footer metadata or summary totals
        if any(sk in low_row for sk in footer_stops):
            break
        if any(sk in low_row for sk in totals_stops):
            break

        cell_words: Dict[str, List[Dict[str, Any]]] = {c[0]: [] for c in col_intervals}

        for w in row_words:
            # Packaging units always belong to product description
            if unit_suffix_pattern.match(w["text"]) or unit_word_pattern.match(w["text"]):
                if "DESCRIPTION" in cell_words:
                    cell_words["DESCRIPTION"].append(w)
                continue

            for col_name, left_b, right_b in col_intervals:
                if left_b <= w["cx"] < right_b:
                    cell_words[col_name].append(w)
                    break

        num_fields_present = sum(
            1 for c_type in ["QTY", "UNIT_COST", "TOTAL_MRP", "TAXABLE_BASE"]
            if cell_words.get(c_type)
        )
        desc_words = cell_words.get("DESCRIPTION", [])

        # Wrapped description from row above: Combine continuation lines with the correct product instead of creating separate products
        if num_fields_present == 0 and desc_words and extracted_items:
            continuation_text = " ".join(w["text"] for w in desc_words).strip()
            if continuation_text and not any(k in continuation_text.lower() for k in ["total", "gstin", "invoice", "bank", "terms", "signat"]):
                combined_name = clean_product_name(f"{extracted_items[-1]['name']} {continuation_text}")
                if combined_name and is_genuine_product_name(combined_name):
                    extracted_items[-1]["name"] = combined_name
            continue

        if num_fields_present == 0 and not desc_words:
            continue

        raw_desc = " ".join(w["text"] for w in desc_words).strip()
        if not raw_desc:
            first_num_left = min(
                (c[1] for c in col_intervals if c[0] in ["QTY", "UNIT_COST", "TOTAL_MRP"] and cell_words.get(c[0])),
                default=float('inf'),
            )
            left_words = [w for w in row_words if w["cx"] < first_num_left]
            raw_desc = " ".join(w["text"] for w in left_words).strip()

        clean_name = clean_product_name(raw_desc)
        # Verify genuine product name: Exclude metadata, company names, headers, taxes, etc.
        if not clean_name or len(clean_name) < 2 or not is_genuine_product_name(clean_name):
            continue

        raw_qty_str = " ".join(w["text"] for w in cell_words.get("QTY", [])).strip()
        raw_cost_str = " ".join(w["text"] for w in cell_words.get("UNIT_COST", [])).strip()
        raw_tax_str = " ".join(w["text"] for w in cell_words.get("TAX", [])).strip()
        raw_mrp_str = " ".join(w["text"] for w in cell_words.get("TOTAL_MRP", [])).strip()
        raw_taxable_str = " ".join(w["text"] for w in cell_words.get("TAXABLE_BASE", [])).strip()
        raw_taxamt_str = " ".join(w["text"] for w in cell_words.get("TAX_AMOUNT", [])).strip()

        qty_val = clean_numeric_value(raw_qty_str) if raw_qty_str else 1.0
        cost_val = clean_numeric_value(raw_cost_str) if raw_cost_str else None
        mrp_val = clean_numeric_value(raw_mrp_str) if raw_mrp_str else None
        taxable_val = clean_numeric_value(raw_taxable_str) if raw_taxable_str else None
        taxamt_val = clean_numeric_value(raw_taxamt_str) if raw_taxamt_str else None

        extracted_items.append({
            "name": clean_name,
            "qty": qty_val or 1.0,
            "cost_price": cost_val,
            "tax": raw_tax_str if raw_tax_str else None,
            "amount": mrp_val,
            "taxable_amount": taxable_val,
            "tax_amount": taxamt_val,
            "page": page_num,
            "raw_text": row_text,
        })

    return extracted_items


async def extract_with_local_ocr(
    image_input: Union[bytes, Image.Image],
    page_num: int = 1,
) -> Optional[Dict[str, Any]]:
    """
    Offline Local OCR Fallback Engine using native Windows Media OCR.
    Extracts text lines, reconstructs 2D visual layout via word bounding boxes,
    and parses invoice items, supplier, dates, and amounts via spatial column detection.
    Supports single images and multipage PDFs without cross-page item pollution.
    """
    try:
        import winocr
    except ImportError:
        return None

    try:
        # Multipage PDF handling
        if isinstance(image_input, (bytes, bytearray)) and is_pdf(image_input):
            rendered_pages = render_pdf_to_images(image_input, max_pages=10, scale=2.0)
            if not rendered_pages:
                return None
            all_page_items = []
            supplier = None
            invoice_number = None
            invoice_date = None
            total = None
            subtotal = None
            tax = None

            for pil_img, p_num in rendered_pages:
                page_res = await extract_with_local_ocr(pil_img, page_num=p_num)
                if page_res and page_res.get("items"):
                    all_page_items.extend(page_res["items"])
                    if not supplier and page_res.get("supplier"):
                        supplier = page_res["supplier"]
                    if not invoice_number and page_res.get("invoice_number"):
                        invoice_number = page_res["invoice_number"]
                    if not invoice_date and page_res.get("invoice_date"):
                        invoice_date = page_res["invoice_date"]
                    if page_res.get("total") is not None:
                        total = page_res["total"]
                    if page_res.get("subtotal") is not None:
                        subtotal = page_res["subtotal"]
                    if page_res.get("tax") is not None:
                        tax = page_res["tax"]

            if not all_page_items:
                return None

            return {
                "supplier": supplier or "Local Wholesale Supplier",
                "vendor": supplier or "Local Wholesale Supplier",
                "invoice_number": invoice_number,
                "invoice_date": invoice_date or datetime.now().strftime("%Y-%m-%d"),
                "date": invoice_date or datetime.now().strftime("%Y-%m-%d"),
                "currency": "INR",
                "subtotal": round(subtotal, 2) if subtotal is not None else None,
                "tax": round(tax, 2) if tax is not None else None,
                "total": round(total, 2) if total is not None else None,
                "total_amount_for_invoice": round(total, 2) if total is not None else None,
                "invoice_grand_total": round(total, 2) if total is not None else None,
                "page_count": len(rendered_pages),
                "document_type": "scanned_pdf",
                "items": all_page_items,
                "is_mock": False,
                "ocr_engine": "Windows Native OCR (Multipage)",
                "message": f"Scanned {len(rendered_pages)} pages locally with Windows Native OCR. Extracted {len(all_page_items)} line items.",
            }

        # Single image handling (PIL or bytes)
        if isinstance(image_input, Image.Image):
            img = image_input
        else:
            processed_bytes, _, _ = preprocess_image_for_ocr(image_input)
            img = Image.open(io.BytesIO(processed_bytes))

        ocr_result = await asyncio.to_thread(winocr.recognize_pil_sync, img, "en")
        if not ocr_result or not isinstance(ocr_result, dict):
            return None

        ocr_lines = ocr_result.get("lines", [])
        if not ocr_lines:
            return None

        # 1. Collect all words and their bounding boxes
        words = []
        raw_lines = []
        for line_obj in ocr_lines:
            line_text = (line_obj.get("text") or "").strip()
            if line_text:
                raw_lines.append(line_text)
            for w in line_obj.get("words", []):
                text_w = (w.get("text") or "").strip()
                br = w.get("bounding_rect", {})
                if text_w and br:
                    bx = float(br.get("x", 0.0))
                    by = float(br.get("y", 0.0))
                    bw = float(br.get("width", 0.0))
                    bh = float(br.get("height", 0.0))
                    words.append({
                        "text": text_w,
                        "x": bx,
                        "y": by,
                        "w": bw,
                        "h": bh,
                        "cx": bx + (bw / 2.0),
                        "cy": by + (bh / 2.0),
                    })

        # 2. Reconstruct 2D horizontal lines from word bounding boxes
        lines = []
        if words:
            heights = [w["h"] for w in words if w.get("h", 0) > 0]
            med_h = statistics.median(heights) if heights else 15.0
            y_threshold = max(8.0, med_h * 0.85)
            words_sorted = sorted(words, key=lambda w: w["cy"])

            curr_line = []
            curr_cy = None
            for w in words_sorted:
                if curr_cy is None:
                    curr_line = [w]
                    curr_cy = w["cy"]
                elif abs(w["cy"] - curr_cy) <= y_threshold:
                    curr_line.append(w)
                    curr_cy = sum(item["cy"] for item in curr_line) / len(curr_line)
                else:
                    curr_line.sort(key=lambda item: item["x"])
                    lines.append(" ".join(item["text"] for item in curr_line))
                    curr_line = [w]
                    curr_cy = w["cy"]
            if curr_line:
                curr_line.sort(key=lambda item: item["x"])
                lines.append(" ".join(item["text"] for item in curr_line))
        else:
            lines = raw_lines

        if not lines:
            return None

        # 3. Extract Supplier / Vendor name
        supplier = None
        supplier_keywords = [
            "traders", "wholesale", "distributor", "enterprises", "agency",
            "agencies", "store", "mart", "cash & carry", "bhandar", "ltd",
            "limited", "pvt", "supermarket", "kirana", "supply", "supplies"
        ]
        skip_supplier_patterns = ["tax invoice", "invoice", "cash memo", "original", "duplicate", "bill to", "ship to", "gstin"]
        for line in lines[:8]:
            low = line.lower()
            if any(k in low for k in skip_supplier_patterns):
                continue
            if any(k in low for k in supplier_keywords) or (len(line) > 5 and line.isupper() and not any(c.isdigit() for c in line)):
                supplier = line.strip(" :-#|")
                break

        # 4. Extract Invoice Number
        invoice_number = None
        all_header_text = " ".join(lines[:10])
        inv_match = re.search(
            r"(?:invoice\s*(?:no|number|#)?|bill\s*(?:no|#)?|inv\s*(?:no|#)?|memo\s*(?:no|#)?|receipt\s*(?:no|#)?|imoice\s*no)[\s.:#\-]*([A-Za-z0-9\/\-_]{3,25})",
            all_header_text,
            re.IGNORECASE,
        )
        if inv_match:
            invoice_number = inv_match.group(1).strip(" -:#")

        # 5. Extract Invoice Date
        invoice_date = None
        date_pattern = re.compile(r"\b(\d{1,2})[/\-\.](\d{1,2})[/\-\.](\d{2,4})\b")
        for line in lines[:12]:
            m = date_pattern.search(line)
            if m:
                d, m_val, y = m.groups()
                if len(y) == 2:
                    y = f"20{y}"
                try:
                    invoice_date = f"{y}-{int(m_val):02d}-{int(d):02d}"
                    break
                except ValueError:
                    pass

        # 6. Extract Subtotal, Tax, and Grand Total
        subtotal = None
        tax = None
        total = None
        for line in lines:
            low = line.lower()
            m_sub = re.search(r"(?:sub\s*total|subtotal|taxable\s*(?:value|amt|amount))[\s.:#₹$Rs]*([0-9,]+(?:\.[0-9]+)?)", low)
            if m_sub and subtotal is None:
                cleaned_val = m_sub.group(1).replace(",", "")
                try:
                    val = float(cleaned_val)
                    subtotal = val / 100.0 if (val > 5000 and "." not in m_sub.group(1)) else val
                except ValueError:
                    pass

            m_tax = re.search(r"(?:gst|cgst\s*\+\s*sgst|tax\s*amount|total\s*tax)[\s\d%.:#₹$Rs]*([0-9,]+(?:\.[0-9]+)?)", low)
            if m_tax and tax is None and not any(k in low for k in ["grand", "sub", "taxable"]):
                cleaned_val = m_tax.group(1).replace(",", "")
                try:
                    val = float(cleaned_val)
                    tax = val / 100.0 if (val > 2000 and "." not in m_tax.group(1)) else val
                except ValueError:
                    pass

        # Extract Grand Total accurately from the bottom summary area of invoice
        total = extract_invoice_grand_total(lines, words=words, image_height=float(img.height))

        # 7. Extract Line Items:
        # Step A: 2D Spatial Table & Column Detector using bounding boxes
        raw_items = detect_spatial_table_and_extract_items(words, image_width=float(img.width), page_num=page_num)

        # Step B: Fallback token-based line extractor if no formal column headers detected
        if not raw_items:
            seen_names = set()
            candidate_lines = lines + [rl for rl in raw_lines if rl not in lines]
            for line in candidate_lines:
                low = line.lower()
                if any(h in low for h in ["tax invoice", "bill to", "ship to", "gstin", "pan no", "authorized", "signature", "terms &", "terms and", "bank name", "ifsc"]):
                    continue
                tokens = line.split()
                if len(tokens) < 2:
                    continue
                first_two = " ".join(tokens[:2]).lower()
                if any(h in first_two for h in ["sub total", "subtotal", "grand total", "total amount", "tax", "gst", "cgst", "sgst"]):
                    continue
                start_idx = 0
                clean_first = re.sub(r"[\.\-\)]", "", tokens[0])
                if clean_first.isdigit() and int(clean_first) < 300:
                    start_idx = 1
                content_tokens = tokens[start_idx:]
                if not content_tokens:
                    continue
                unit_suffix_pattern = re.compile(r"^\d+(\.\d+)?(kg|g|gm|gms|l|ltr|ltrs|ml|pcs|pkt|pkts|box)$", re.IGNORECASE)
                unit_word_pattern = re.compile(r"^(kg|g|gm|gms|l|ltr|ltrs|ml|pcs|pkt|pkts|box)$", re.IGNORECASE)
                num_vals = []
                num_indices = []
                for idx, t in enumerate(content_tokens):
                    if unit_suffix_pattern.match(t):
                        continue
                    if idx + 1 < len(content_tokens) and unit_word_pattern.match(content_tokens[idx + 1]):
                        continue
                    cleaned_t = re.sub(r"^[₹\$@=Rs\.]+|[₹\$@=Rs,\.\(\)]+$", "", t, flags=re.IGNORECASE).replace(",", "")
                    try:
                        val = float(cleaned_t)
                        if cleaned_t.isdigit() and len(cleaned_t) in (4, 6, 8) and val > 1000 and idx < len(content_tokens) - 2:
                            continue
                        num_vals.append(val)
                        num_indices.append(idx)
                    except ValueError:
                        pass
                if not num_vals:
                    continue
                first_num_pos = num_indices[0]
                name_tokens = content_tokens[:first_num_pos]
                if not name_tokens:
                    continue
                raw_name = clean_product_name(" ".join(name_tokens))
                if len(raw_name) < 2 or not is_genuine_product_name(raw_name):
                    continue
                qty = 1
                rate = 0.0
                line_tot = 0.0
                if len(num_vals) >= 3:
                    n1, n2, n3 = num_vals[-3], num_vals[-2], num_vals[-1]
                    if n1 * n2 == n3 or abs(n1 * n2 - n3) <= max(2.0, n3 * 0.05):
                        qty = int(n1) if n1.is_integer() else 1
                        rate = n2
                        line_tot = n3
                    else:
                        qty = int(n1) if (n1.is_integer() and 1 <= n1 <= 1000) else 1
                        rate = n2
                        line_tot = n3
                elif len(num_vals) == 2:
                    n1, n2 = num_vals[0], num_vals[1]
                    rate = min(n1, n2)
                    line_tot = max(n1, n2)
                    qty = max(1, int(round(line_tot / rate))) if rate > 0 else 1
                elif len(num_vals) == 1:
                    qty = 1
                    line_tot = num_vals[0]
                    rate = num_vals[0]
                norm_name = raw_name.lower()
                if norm_name not in seen_names and (rate > 0 or line_tot > 0):
                    seen_names.add(norm_name)
                    raw_items.append({
                        "name": raw_name,
                        "qty": max(1, qty),
                        "cost_price": round(rate, 2),
                        "line_total": round(line_tot, 2),
                        "confidence": 0.88,
                        "page": page_num,
                        "raw_text": line,
                    })

        if raw_items:
            corrected_items = validate_and_correct_items(raw_items)
            items_sum = sum((item.get("line_total") or 0.0) for item in corrected_items)
            if (subtotal is None or subtotal == 0) and items_sum > 0:
                subtotal = round(items_sum, 2)
            return {
                "supplier": supplier or "Local Wholesale Supplier",
                "vendor": supplier or "Local Wholesale Supplier",
                "invoice_number": invoice_number,
                "invoice_date": invoice_date or datetime.now().strftime("%Y-%m-%d"),
                "date": invoice_date or datetime.now().strftime("%Y-%m-%d"),
                "currency": "INR",
                "subtotal": round(subtotal, 2) if subtotal is not None else None,
                "tax": round(tax, 2) if tax is not None else None,
                "total": round(total, 2) if total is not None else None,
                "total_amount_for_invoice": round(total, 2) if total is not None else None,
                "invoice_grand_total": round(total, 2) if total is not None else None,
                "page_count": 1,
                "document_type": "image",
                "items": corrected_items,
                "is_mock": False,
                "ocr_engine": "Windows Native OCR",
                "message": f"Scanned locally with Windows Native OCR. Extracted {len(corrected_items)} line items.",
            }

    except Exception:
        pass

    return None


# High-precision prompt optimized for kirana & retail distributor bills with standardized fields and tax extraction
INVOICE_EXTRACTION_PROMPT = (
    "You are an expert OCR and document understanding system for retail, grocery, and wholesale store invoices, distributor bills, and tax memos.\n"
    "Carefully extract all line items and invoice headers into valid raw JSON matching this schema:\n"
    "{\n"
    '  "invoice_number": string,\n'
    '  "vendor": string,\n'
    '  "date": string,\n'
    '  "currency": "INR",\n'
    '  "subtotal": number,\n'
    '  "tax": number,\n'
    '  "total": number,\n'
    '  "total_amount_for_invoice": number,\n'
    '  "invoice_grand_total": number,\n'
    '  "items": [\n'
    '    {\n'
    '      "description": string,\n'
    '      "quantity": number,\n'
    '      "unit_price": number,\n'
    '      "tax_rate": number or null,\n'
    '      "tax_percent": string,\n'
    '      "cgst_rate": number or null,\n'
    '      "sgst_rate": number or null,\n'
    '      "igst_rate": number or null,\n'
    '      "is_tax_inclusive": boolean,\n'
    '      "amount": number,\n'
    '      "expiry_date": string\n'
    '    }\n'
    '  ]\n'
    "}\n\n"
    "CRITICAL RULES FOR ACCURATE EXTRACTION:\n"
    "1. Read every single genuine product line item row in the product table. Do NOT extract company names, customer names, addresses, invoice numbers, dates, GSTIN/HSN codes, table column headers, subtotals, grand totals, taxes, bank details, terms, or signatures as product items.\n"
    "2. description (Product / Description): Clean product name with weight/pack size (e.g. 'Tata Salt 1kg', 'Fortune Oil 1L'). Combine multiline continuation rows into the single product description.\n"
    "3. quantity (QTY): Standardize from 'Qty', 'Qty.', 'Quantity', 'Quantities', 'Quantity Ordered', 'Order Qty', 'Item Quantity', 'Nos', 'Units', 'PCS', 'Billed Qty'. Support whole and decimal quantities (e.g. 1, 5, 12, 2.5, 0.75). NEVER leave quantity as 0 or null.\n"
    "4. unit_price (UNIT COST): The pre-tax price per unit from 'Rate', 'Price', 'Price per Unit', 'Rate per Unit', 'Unit Price', 'Cost per Unit', 'Basic Rate', 'Item Rate'. Distinguish unit price from line total.\n"
    "5. tax_rate / tax_percent (TAX): The tax rate percentage (e.g. 18.0 / '18%', 5.0 / '5%', 12.0 / '12%', 28.0 / '28%', 0.0 / '0%') from 'Tax', 'Tax %', 'GST', 'GST %', 'IGST', 'IGST %', 'CGST', 'CGST %', 'SGST', 'SGST %', 'VAT', 'VAT %', 'Tax Rate', 'GST Rate'.\n"
    "   - If separate CGST and SGST rates are present (e.g. CGST 9% and SGST 9%), COMBINE them into a unified tax rate of 18.0 ('18%').\n"
    "   - If an IGST rate is present (e.g. 18%), use it as the unified tax rate.\n"
    "   - If an item is exempt or explicitly 0% tax, set tax_rate: 0.0 and tax_percent: '0%'.\n"
    "   - If the tax rate cannot be determined reliably, set tax_rate: null and tax_percent: 'Needs Review'. Do NOT silently assume 0%.\n"
    "   - If unit price is already tax-inclusive, set is_tax_inclusive: true.\n"
    "6. amount (TOTAL MRP): CRITICAL. Extract the original product-line amount directly from the invoice row from 'Amount', 'Total', 'Total Amount', 'Item Amount', 'Line Amount', 'Line Total', 'Total Price', or 'Extended Amount'. Do NOT calculate, estimate, or overwrite it with a formula (do not multiply quantity by unit price or add tax). Extract the exact printed final product amount. If not visible or uncertain, set amount: null.\n"
    "7. total / invoice_grand_total: Inspect the lower summary/footer section near the bottom of the invoice to find the printed final invoice grand total (labeled 'Grand Total', 'Invoice Total', 'Total Amount', 'Net Total', 'Net Payable', 'Amount Payable', 'Total Payable', 'Total Due', 'Final Amount', 'Total Including Tax'). Strictly distinguish from Subtotal, Taxable Amount, Total Tax, Discount, Amount Paid, and Balance Due. Do not confuse Grand Total with Amount Paid or Balance Due. If not printed, set to null.\n"
    "8. Numbers must be plain numeric values without currency symbols (like ₹, $, Rs) and without commas.\n"
    "9. Respond with ONLY the raw JSON object, without any markdown code fence (no ```json)."
)


async def extract_invoice_from_image(
    image_bytes: bytes,
    mime_type: Optional[str] = None,
    api_key: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Primary Invoice Extraction Function:
    1. Preprocesses image: fixes EXIF rotation, normalizes dimensions, enhances contrast.
    2. Identifies provider:
       - Anthropic Claude (Claude 3.5 Sonnet / Haiku) if ANTHROPIC_API_KEY / sk-ant- key
       - Google Gemini (Gemini 1.5/2.0 Flash) if GEMINI_API_KEY / AIza key
    3. Prompts model with strict reference schema: plain numbers, no currency symbols or markdown preamble.
    4. Cross-validates mathematics (Unit Cost vs Line Total vs MRP) and auto-corrects.
    5. Falls back to local Windows OCR if no API key is configured or offline.
    """
    # 0. Check if file is a PDF
    if is_pdf(image_bytes, mime_type):
        # A. Try direct digital text and table extraction first
        digital_result = extract_digital_pdf_text_and_tables(image_bytes)
        if digital_result and digital_result.get("items"):
            return digital_result

    # 1. Image preprocessing pipeline
    processed_bytes, final_mime, dims = preprocess_image_for_ocr(image_bytes)
    b64_image = base64.b64encode(processed_bytes).decode("utf-8")

    # 2. Check for configured API keys
    def _sanitize(k: Optional[str]) -> str:
        if not k:
            return ""
        val = str(k).strip()
        if val.lower() in ("undefined", "null", "none", "false", ""):
            return ""
        return val

    key_candidate = _sanitize(api_key)
    anthropic_key = _sanitize(os.environ.get("ANTHROPIC_API_KEY", ""))
    gemini_key = _sanitize(os.environ.get("GEMINI_API_KEY", ""))

    # If key passed in header/param, detect provider by prefix
    if key_candidate:
        if key_candidate.startswith("sk-ant-"):
            anthropic_key = key_candidate
        elif key_candidate.startswith("AIza"):
            gemini_key = key_candidate
        else:
            # Generic key: try as Gemini first, then Anthropic
            if not gemini_key:
                gemini_key = key_candidate
            elif not anthropic_key:
                anthropic_key = key_candidate

    # If neither key is configured, check local OCR or mock
    if not anthropic_key and not gemini_key:
        local_result = await extract_with_local_ocr(image_bytes)
        if local_result:
            return local_result
        return get_mock_result()

    last_error: Optional[Exception] = None

    # --- STRATEGY 1: ANTHROPIC CLAUDE VISION ---
    if anthropic_key:
        for model_name in ANTHROPIC_MODELS:
            try:
                async with httpx.AsyncClient(timeout=45.0) as client:
                    resp = await client.post(
                        "https://api.anthropic.com/v1/messages",
                        headers={
                            "x-api-key": anthropic_key,
                            "anthropic-version": "2023-06-01",
                            "content-type": "application/json",
                        },
                        json={
                            "model": model_name,
                            "max_tokens": 2500,
                            "messages": [
                                {
                                    "role": "user",
                                    "content": [
                                        {
                                            "type": "image",
                                            "source": {
                                                "type": "base64",
                                                "media_type": final_mime,
                                                "data": b64_image,
                                            },
                                        },
                                        {
                                            "type": "text",
                                            "text": INVOICE_EXTRACTION_PROMPT,
                                        },
                                    ],
                                }
                            ],
                        },
                    )

                    if resp.status_code == 200:
                        data = resp.json()
                        raw_text = "".join([b.get("text", "") for b in data.get("content", [])]).strip()
                        parsed = clean_json_response(raw_text)

                        raw_items = parsed.get("items", [])
                        if isinstance(raw_items, dict):
                            raw_items = list(raw_items.values())
                        elif not isinstance(raw_items, list):
                            raw_items = []

                        validated_items = validate_and_correct_items(raw_items)

                        supplier = parsed.get("vendor") or parsed.get("supplier") or ""
                        inv_date = parsed.get("date") or parsed.get("invoice_date") or ""
                        inv_num = parsed.get("invoice_number") or parsed.get("invoice_no") or ""
                        currency = (parsed.get("currency") or "INR").strip().upper()

                        subtotal = parse_num(parsed.get("subtotal") or parsed.get("sub_total") or parsed.get("taxable_amount") or parsed.get("taxable_value"))
                        tax = parse_num(parsed.get("tax") or parsed.get("gst") or parsed.get("total_tax"))
                        total = extract_total_from_dict(parsed)

                        computed_items_total = sum((item.get("line_total") or 0.0) for item in validated_items)
                        if (subtotal is None or subtotal == 0) and computed_items_total > 0:
                            subtotal = round(computed_items_total, 2)

                        return {
                            "supplier": supplier.strip() or "Wholesale Distributor",
                            "vendor": supplier.strip() or "Wholesale Distributor",
                            "invoice_number": inv_num.strip() or None,
                            "invoice_date": inv_date.strip() or datetime.now().strftime("%Y-%m-%d"),
                            "date": inv_date.strip() or datetime.now().strftime("%Y-%m-%d"),
                            "currency": currency,
                            "subtotal": round(subtotal, 2) if subtotal is not None else None,
                            "tax": round(tax, 2) if tax is not None else None,
                            "total": round(total, 2) if total is not None else None,
                            "total_amount_for_invoice": round(total, 2) if total is not None else None,
                            "invoice_grand_total": round(total, 2) if total is not None else None,
                            "items": validated_items,
                            "is_mock": False,
                            "ocr_engine": f"Claude Vision AI ({model_name})",
                            "message": f"Successfully extracted and verified {len(validated_items)} items using Claude Vision AI.",
                        }
                    elif resp.status_code in (404, 400):
                        last_error = VisionApiError(f"Claude model {model_name} failed ({resp.status_code}): {resp.text}")
                        continue
                    else:
                        last_error = VisionApiError(f"Claude API error ({resp.status_code}): {resp.text}")

            except httpx.TimeoutException:
                last_error = VisionApiError("Claude Vision request timed out. Please retry.")
            except json.JSONDecodeError as e:
                last_error = VisionBadJsonError(f"Invalid JSON returned by Claude: {str(e)}")
            except Exception as e:
                last_error = e

    # --- STRATEGY 2: GOOGLE GEMINI VISION ---
    if gemini_key:
        gemini_payload = {
            "contents": [
                {
                    "parts": [
                        {"text": INVOICE_EXTRACTION_PROMPT},
                        {
                            "inline_data": {
                                "mime_type": final_mime,
                                "data": b64_image,
                            }
                        },
                    ]
                }
            ],
            "generationConfig": {
                "response_mime_type": "application/json",
                "temperature": 0.1,
            },
        }

        for model_name in GEMINI_MODELS:
            api_url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent"

            for attempt in range(2):
                try:
                    async with httpx.AsyncClient(timeout=40.0) as client:
                        resp = await client.post(
                            f"{api_url}?key={gemini_key}",
                            headers={"Content-Type": "application/json"},
                            json=gemini_payload,
                        )

                        if resp.status_code == 200:
                            data = resp.json()
                            candidates = data.get("candidates", [])
                            if not candidates:
                                raise VisionBadJsonError("No extraction candidate was returned by Vision model.")

                            text_content = (
                                candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "").strip()
                            )
                            parsed = clean_json_response(text_content)

                            raw_items = parsed.get("items", [])
                            if isinstance(raw_items, dict):
                                raw_items = list(raw_items.values())
                            elif not isinstance(raw_items, list):
                                raw_items = []

                            validated_items = validate_and_correct_items(raw_items)

                            supplier = parsed.get("vendor") or parsed.get("supplier") or ""
                            inv_date = parsed.get("date") or parsed.get("invoice_date") or ""
                            inv_num = parsed.get("invoice_number") or parsed.get("invoice_no") or ""
                            currency = (parsed.get("currency") or "INR").strip().upper()

                            subtotal = parse_num(parsed.get("subtotal") or parsed.get("sub_total") or parsed.get("taxable_amount") or parsed.get("taxable_value"))
                            tax = parse_num(parsed.get("tax") or parsed.get("gst") or parsed.get("total_tax"))
                            total = extract_total_from_dict(parsed)

                            computed_items_total = sum((item.get("line_total") or 0.0) for item in validated_items)
                            if (subtotal is None or subtotal == 0) and computed_items_total > 0:
                                subtotal = round(computed_items_total, 2)

                            return {
                                "supplier": supplier.strip() or "Wholesale Distributor",
                                "vendor": supplier.strip() or "Wholesale Distributor",
                                "invoice_number": inv_num.strip() or None,
                                "invoice_date": inv_date.strip() or datetime.now().strftime("%Y-%m-%d"),
                                "date": inv_date.strip() or datetime.now().strftime("%Y-%m-%d"),
                                "currency": currency,
                                "subtotal": round(subtotal, 2) if subtotal is not None else None,
                                "tax": round(tax, 2) if tax is not None else None,
                                "total": round(total, 2) if total is not None else None,
                                "total_amount_for_invoice": round(total, 2) if total is not None else None,
                                "invoice_grand_total": round(total, 2) if total is not None else None,
                                "items": validated_items,
                                "is_mock": False,
                                "ocr_engine": f"Gemini Vision AI ({model_name})",
                                "message": f"Successfully extracted and validated {len(validated_items)} items using Gemini Vision AI.",
                            }

                        elif resp.status_code in (404, 400):
                            err_msg = resp.text
                            try:
                                err_msg = resp.json().get("error", {}).get("message", err_msg)
                            except Exception:
                                pass
                            last_error = VisionApiError(f"{model_name} failed ({resp.status_code}): {err_msg}")
                            break

                        else:
                            err_msg = resp.text
                            try:
                                err_msg = resp.json().get("error", {}).get("message", err_msg)
                            except Exception:
                                pass
                            last_error = VisionApiError(f"Gemini API error ({resp.status_code}): {err_msg}")

                except httpx.TimeoutException:
                    last_error = VisionApiError("Vision API request timed out. Please check your internet connection and retry.")
                except httpx.RequestError as e:
                    last_error = VisionApiError(f"Network error connecting to Vision API: {str(e)}")
                except json.JSONDecodeError as e:
                    last_error = VisionBadJsonError(f"Invalid JSON returned by Vision model: {str(e)}")
                except Exception as e:
                    last_error = e

    # Fallback to local Windows OCR if remote models failed
    local_result = await extract_with_local_ocr(processed_bytes)
    if local_result:
        return local_result

    if last_error:
        if isinstance(last_error, VisionError):
            raise last_error
        raise VisionApiError(f"Extraction failed: {str(last_error)}")

    return dict(SAMPLE_MOCK_RESULT)


def extract_invoice_from_image_sync(
    image_bytes: bytes,
    mime_type: Optional[str] = None,
    api_key: Optional[str] = None,
) -> Dict[str, Any]:
    """Synchronous wrapper for extract_invoice_from_image."""
    return asyncio.run(extract_invoice_from_image(image_bytes, mime_type=mime_type, api_key=api_key))
