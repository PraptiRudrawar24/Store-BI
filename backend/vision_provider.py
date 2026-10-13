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
from typing import Dict, Any, Optional, List, Tuple
import httpx
from PIL import Image, ImageOps, ImageEnhance

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
    """Raised when uploaded file is corrupted or not a valid image."""
    pass

class VisionApiError(VisionError):
    """Raised when LLM API call fails or times out."""
    pass

class VisionBadJsonError(VisionError):
    """Raised when LLM returns invalid or unparseable JSON."""
    pass


def parse_num(val: Any) -> Optional[float]:
    """
    Safely extracts a numeric float from any input (number or string).
    Strips currency symbols (₹, $, Rs, €), commas, spaces, and trailing symbols.
    Examples:
      "Rs 20" -> 20.0
      "₹ 1,250.50" -> 1250.50
      "$ 15.00" -> 15.0
      "25/-" -> 25.0
      20 -> 20.0
      None / "" -> None
    """
    if val is None or val == "" or val == "—" or val == "-":
        return None
    if isinstance(val, (int, float)):
        return float(val)
    s = str(val).strip()
    s = re.sub(r"[^\d\.\-]", "", s)
    if not s or s == "-" or s == ".":
        return None
    try:
        return float(s)
    except (ValueError, TypeError):
        return None


def get_mock_result() -> Dict[str, Any]:
    """
    Returns clearly labeled mock invoice extraction when no API key is configured.
    Includes realistic items with high and low confidence, wholesale pricing, and totals.
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
        "tax": 205.0,
        "total": 4305.0,
        "is_mock": True,
        "ocr_engine": "Sample Demo Mock",
        "message": "MOCK MODE: No Gemini or Claude API key provided. Sample kirana invoice loaded for preview. To scan real invoices with AI, enter your API key in settings.",
        "items": [
            {
                "name": "Tata Salt 1kg",
                "description": "Tata Salt 1kg",
                "qty": 30,
                "quantity": 30,
                "cost_price": 22.0,
                "unit_price": 22.0,
                "mrp": 28.0,
                "line_total": 660.0,
                "amount": 660.0,
                "expiry_date": "2027-12-31",
                "confidence": 0.96,
            },
            {
                "name": "Fortune Sunlite Oil 1L",
                "description": "Fortune Sunlite Oil 1L",
                "qty": 20,
                "quantity": 20,
                "cost_price": 132.0,
                "unit_price": 132.0,
                "mrp": 155.0,
                "line_total": 2640.0,
                "amount": 2640.0,
                "expiry_date": None,
                "confidence": 0.65,
            },
            {
                "name": "Parle-G Gold 250g",
                "description": "Parle-G Gold 250g",
                "qty": 40,
                "quantity": 40,
                "cost_price": 20.0,
                "unit_price": 20.0,
                "mrp": 25.0,
                "line_total": 800.0,
                "amount": 800.0,
                "expiry_date": "2027-08-15",
                "confidence": 0.94,
            },
            {
                "name": "Handwritten Country Jaggery 1kg",
                "description": "Handwritten Country Jaggery 1kg",
                "qty": 15,
                "quantity": 15,
                "cost_price": None,
                "unit_price": None,
                "mrp": None,
                "line_total": None,
                "amount": None,
                "expiry_date": None,
                "confidence": 0.45,
            },
        ],
    }

SAMPLE_MOCK_RESULT = get_mock_result()


def preprocess_image_for_ocr(image_bytes: bytes) -> Tuple[bytes, str, Tuple[int, int]]:
    """
    Image Preprocessing Pipeline:
    1. EXIF Transposition: Corrects camera photos taken in landscape/portrait/upside-down.
    2. Format & Alpha Normalization: Converts RGBA, CMYK, Palette to clean 3-channel RGB.
    3. Dimension Optimization: Keeps resolution sharp (min 900px, max 2048px) to preserve small fonts.
    4. Contrast & Sharpness Boost: Enhances faded ink, thermal prints, carbon copies, and shadows.
    """
    if not image_bytes or len(image_bytes) < 16:
        raise UnreadableImageError("The uploaded file is empty or corrupted. Please upload a clear photo.")

    try:
        with Image.open(io.BytesIO(image_bytes)) as raw_img:
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

            # 4. Enhance contrast & sharpness to make faint carbon copy text clear
            try:
                contrast_enhancer = ImageEnhance.Contrast(img)
                img = contrast_enhancer.enhance(1.22)
                sharpness_enhancer = ImageEnhance.Sharpness(img)
                img = sharpness_enhancer.enhance(1.25)
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
        raise UnreadableImageError(f"Unreadable image format. Please capture or upload a valid photo (JPG, PNG, or WEBP). Details: {str(e)}")


def clean_product_name(raw_name: str) -> str:
    """
    Sanitizes extracted product names:
    - Removes invoice noise (HSN codes, barcodes, batch numbers, tax annotations)
    - Fixes ALL-CAPS to Title Case
    - Normalizes packaging units (kg, g, L, ml, pcs, pkt)
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

    # Convert ALL CAPS to clean Title Case if longer than 3 chars
    if name.isupper() and len(name) > 3:
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


def validate_and_correct_items(items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Mathematical Cross-Validation & Self-Correction Algorithm:
    Ingests items from standard or reference schemas:
    - Name: item.description or item.name or item.item_name or item.particulars
    - Quantity: item.quantity or item.qty
    - Unit price: item.unit_price or item.cost_price or item.rate or item.price
    - MRP: item.mrp
    - Amount: item.amount or item.line_total or item.total
    Fixes column confusion between Unit Rate and Row Total.
    Outputs normalized objects with both standard and reference field keys.
    """
    corrected: List[Dict[str, Any]] = []

    for item in items:
        raw_name = (
            item.get("description")
            or item.get("name")
            or item.get("item_name")
            or item.get("particulars")
            or item.get("product_name")
            or ""
        )
        clean_name = clean_product_name(raw_name)
        if not clean_name or len(clean_name) < 2:
            continue

        # 1. Parse quantity safely
        raw_qty = item.get("quantity") if item.get("quantity") is not None else item.get("qty", 1)
        qty_num = parse_num(raw_qty)
        qty = max(1, int(round(qty_num))) if qty_num is not None else 1

        # 2. Parse unit price / cost price
        raw_cost = item.get("unit_price") if item.get("unit_price") is not None else item.get("cost_price")
        if raw_cost is None:
            raw_cost = item.get("rate") or item.get("price")
        cost_price = parse_num(raw_cost)

        mrp = parse_num(item.get("mrp"))

        # 3. Parse line total / amount
        raw_total = item.get("amount") if item.get("amount") is not None else item.get("line_total")
        if raw_total is None:
            raw_total = item.get("total") or item.get("net_amount")
        line_total = parse_num(raw_total)

        confidence = 0.95
        if item.get("confidence") is not None:
            try:
                confidence = float(item["confidence"])
            except (ValueError, TypeError):
                confidence = 0.90

        # --- MATHEMATICAL SELF-CORRECTION & RECONCILIATION ---

        # RULE A: Inversion detection (Rate and Total were swapped by OCR when qty > 1)
        if cost_price and line_total and qty > 1 and cost_price > line_total:
            if abs(cost_price - (line_total * qty)) <= max(2.0, cost_price * 0.05):
                cost_price, line_total = line_total, cost_price

        # RULE B: Model set cost_price = line_total for qty > 1
        if cost_price and line_total and qty > 1:
            if abs(cost_price - line_total) <= 1.0 or (mrp and cost_price > mrp and (line_total / qty) <= mrp):
                cost_price = round(line_total / qty, 2)

        # RULE C: Cost price exceeds MRP
        if mrp and cost_price and cost_price > mrp:
            if qty > 1 and (cost_price / qty) <= (mrp * 1.05):
                line_total = cost_price
                cost_price = round(line_total / qty, 2)
            else:
                confidence = min(confidence, 0.60)

        # RULE D: Missing cost price, but line_total and qty exist
        if (cost_price is None or cost_price <= 0) and line_total and line_total > 0 and qty > 0:
            cost_price = round(line_total / qty, 2)

        # RULE E: Missing line_total, but cost_price exists
        if (line_total is None or line_total <= 0) and cost_price and cost_price > 0:
            line_total = round(cost_price * qty, 2)

        # RULE F: Math consistency verification
        if cost_price and line_total and qty > 1:
            expected_total = qty * cost_price
            if abs(expected_total - line_total) > max(2.0, line_total * 0.08):
                calc_rate = round(line_total / qty, 2)
                if mrp and calc_rate <= mrp and cost_price > mrp:
                    cost_price = calc_rate
                else:
                    confidence = min(confidence, 0.65)

        # Format expiry date
        expiry = item.get("expiry_date")
        if expiry and not re.match(r"^\d{4}-\d{2}-\d{2}$", str(expiry).strip()):
            expiry = None

        final_cost = round(cost_price, 2) if cost_price is not None else None
        final_total = round(line_total, 2) if line_total is not None else None

        corrected.append({
            # Standard project schema
            "name": clean_name,
            "qty": qty,
            "cost_price": final_cost,
            "mrp": round(mrp, 2) if mrp is not None else None,
            "line_total": final_total,
            "expiry_date": expiry,
            "confidence": round(confidence, 2),
            # Reference schema compatibility
            "description": clean_name,
            "quantity": qty,
            "unit_price": final_cost,
            "amount": final_total,
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


async def extract_with_local_ocr(image_bytes: bytes) -> Optional[Dict[str, Any]]:
    """
    Offline Local OCR Fallback Engine using native Windows Media OCR.
    Extracts text lines, reconstructs 2D visual layout via word bounding boxes,
    and parses invoice items, supplier, dates, and amounts via rule-based patterns.
    """
    try:
        import winocr
    except ImportError:
        return None

    try:
        processed_bytes, _, _ = preprocess_image_for_ocr(image_bytes)
        img = Image.open(io.BytesIO(processed_bytes))

        # winocr.recognize_pil_sync is synchronous; run in threadpool so as not to block event loop
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
                    words.append({
                        "text": text_w,
                        "x": float(br.get("x", 0.0)),
                        "y": float(br.get("y", 0.0)),
                        "w": float(br.get("width", 0.0)),
                        "h": float(br.get("height", 0.0)),
                    })

        # 2. Reconstruct 2D horizontal lines from word bounding boxes
        lines = []
        if words:
            heights = [w["h"] for w in words if w.get("h", 0) > 0]
            med_h = statistics.median(heights) if heights else 15.0
            y_threshold = max(6.0, med_h * 0.65)
            for w in words:
                w["cy"] = w["y"] + (w["h"] / 2.0)
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

            m_tot = re.search(r"(?:grand\s*total|net\s*(?:amount|amt|total)|total\s*(?:amount|payable|amt)|invoice\s*total)[\s.:#₹$Rs]*([0-9,]+(?:\.[0-9]+)?)", low)
            if m_tot and total is None:
                cleaned_val = m_tot.group(1).replace(",", "")
                try:
                    val = float(cleaned_val)
                    total = val / 100.0 if (val > 5000 and "." not in m_tot.group(1)) else val
                except ValueError:
                    pass

        # 7. Extract Line Items (combining 2D reconstructed lines and raw lines)
        raw_items: List[Dict[str, Any]] = []
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
            if any(h in first_two for h in ["sub total", "subtotal", "grand total", "total amount", "tax", "gst", "cgst", "sgst", "sr decription", "sr description"]):
                continue

            # Strip leading serial number (e.g. 1, 1., 01, 1-)
            start_idx = 0
            clean_first = re.sub(r"[\.\-\)]", "", tokens[0])
            if clean_first.isdigit() and int(clean_first) < 300:
                start_idx = 1

            content_tokens = tokens[start_idx:]
            if not content_tokens:
                continue

            # Collect numeric tokens from the right
            num_vals = []
            num_indices = []
            for idx, t in enumerate(content_tokens):
                cleaned_t = re.sub(r"^[₹\$@=Rs\.]+|[₹\$@=Rs,\.\(\)]+$", "", t, flags=re.IGNORECASE).replace(",", "")
                try:
                    val = float(cleaned_t)
                    num_vals.append(val)
                    num_indices.append(idx)
                except ValueError:
                    pass

            if len(num_vals) < 2:
                continue

            first_num_pos = num_indices[0]
            name_tokens = content_tokens[:first_num_pos]
            if not name_tokens:
                continue

            raw_name = clean_product_name(" ".join(name_tokens))
            if len(raw_name) < 2 or any(hw in raw_name.lower() for hw in ["sr decription", "description", "qty rate", "amount"]):
                continue

            qty = 1
            rate = 0.0
            line_tot = 0.0

            if len(num_vals) >= 3:
                n1, n2, n3 = num_vals[-3], num_vals[-2], num_vals[-1]
                # Check for dropped decimal points in rate & total
                if n2 > 500 and n3 > 500 and (n2 % 100 == 0 or n3 % 100 == 0):
                    n2 = n2 / 100.0
                    n3 = n3 / 100.0

                if abs(n1 * n2 - n3) < 1.0 or abs(n1 * n3 - n2) < 1.0:
                    if n1.is_integer() and n1 <= 1000:
                        qty = int(n1)
                        rate = n2 if n1 * n2 <= n3 + 1 else n3
                        line_tot = n3 if n1 * n2 <= n3 + 1 else n2
                    else:
                        rate = n1
                        qty = int(n2) if n2.is_integer() else 1
                        line_tot = n3
                else:
                    qty = int(n1) if (n1.is_integer() and n1 <= 500) else 1
                    rate = n2
                    line_tot = n3
            elif len(num_vals) == 2:
                n1, n2 = num_vals[-2], num_vals[-1]
                if n1 > 500 and n2 > 500:
                    ratio = n2 / n1
                    if 1 <= ratio <= 500 and abs(ratio - round(ratio)) < 0.05:
                        qty = int(round(ratio))
                        rate = n1 / 100.0
                        line_tot = n2 / 100.0
                    else:
                        rate = n1 / 100.0
                        line_tot = n2 / 100.0
                        qty = max(1, int(round(line_tot / rate))) if rate > 0 else 1
                else:
                    if n1.is_integer() and n1 <= 200 and n2 >= n1:
                        qty = int(n1)
                        rate = round(n2 / qty, 2)
                        line_tot = n2
                    else:
                        rate = n1
                        line_tot = n2
                        qty = max(1, int(round(line_tot / rate))) if rate > 0 else 1

            if qty > 1 and rate > line_tot:
                rate, line_tot = line_tot, rate

            norm_name = raw_name.lower()
            if norm_name not in seen_names and (rate > 0 or line_tot > 0):
                seen_names.add(norm_name)
                raw_items.append({
                    "name": raw_name,
                    "qty": max(1, qty),
                    "cost_price": round(rate, 2),
                    "line_total": round(line_tot, 2),
                    "confidence": 0.88,
                })

        if raw_items:
            corrected_items = validate_and_correct_items(raw_items)

            items_sum = sum((item.get("line_total") or 0.0) for item in corrected_items)
            if (subtotal is None or subtotal == 0) and items_sum > 0:
                subtotal = round(items_sum, 2)
            if (total is None or total == 0) and subtotal is not None:
                total = round(subtotal + (tax or 0.0), 2)
            if (tax is None or tax == 0) and subtotal is not None and total is not None and total > subtotal:
                tax = round(total - subtotal, 2)

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
                "items": corrected_items,
                "is_mock": False,
                "ocr_engine": "Windows Native OCR",
                "message": f"Scanned locally with Windows Native OCR. Extracted {len(corrected_items)} line items.",
            }

    except Exception:
        pass

    return None


# High-precision prompt inspired by reference implementation
INVOICE_EXTRACTION_PROMPT = (
    "Read this invoice image and respond with ONLY valid JSON, no markdown fences, no preamble, matching exactly this shape: "
    "{\"invoice_number\": string, \"vendor\": string, \"date\": string, \"currency\": string, "
    "\"items\": [{\"description\": string, \"quantity\": number, \"unit_price\": number, \"mrp\": number, \"amount\": number, \"expiry_date\": string}], "
    "\"subtotal\": number, \"tax\": number, \"total\": number}.\n\n"
    "CRITICAL RULES FOR ACCURATE EXTRACTION:\n"
    "1. Read every single line item accurately from top to bottom. Do not skip or truncate any rows.\n"
    "2. description: clean item name with size/weight/volume (e.g. 'Tata Salt 1kg', 'Fortune Oil 1L'). Omit table row numbers, HSN/SAC codes, barcodes, or batch numbers.\n"
    "3. quantity: number of units/pieces received (positive integer >= 1).\n"
    "4. unit_price: wholesale purchase cost per single unit/piece (paid by shop owner, NOT the row total).\n"
    "5. mrp: Maximum Retail Price printed on item if listed, otherwise 0.\n"
    "6. amount: line total for that item row (quantity * unit_price). Do NOT swap unit_price and amount.\n"
    "7. Numbers must be plain numbers, no currency symbols (like ₹, $, Rs, €) and no commas.\n"
    "8. If a field is not visible on the invoice, make a reasonable placeholder (empty string for text, 0 for numbers).\n"
    "9. vendor: the supplier, wholesaler, distributor, or seller name at the top (NOT the customer or store billed to).\n"
    "10. invoice_number: invoice, cash memo, or bill number printed on invoice.\n"
    "11. date: invoice date (format as YYYY-MM-DD if possible).\n"
    "12. currency: 3-letter currency code (best guess, default INR).\n"
    "13. subtotal: sum of item amounts before tax (plain number).\n"
    "14. tax: total GST/tax amount (plain number).\n"
    "15. total: grand total / net invoice amount payable (plain number)."
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
        local_result = await extract_with_local_ocr(processed_bytes)
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

                        subtotal = parse_num(parsed.get("subtotal"))
                        tax = parse_num(parsed.get("tax"))
                        total = parse_num(parsed.get("total"))

                        computed_items_total = sum((item.get("line_total") or 0.0) for item in validated_items)
                        if (subtotal is None or subtotal == 0) and computed_items_total > 0:
                            subtotal = round(computed_items_total, 2)
                        if (total is None or total == 0) and subtotal is not None:
                            total = round(subtotal + (tax or 0.0), 2)

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

                            subtotal = parse_num(parsed.get("subtotal"))
                            tax = parse_num(parsed.get("tax"))
                            total = parse_num(parsed.get("total"))

                            computed_items_total = sum((item.get("line_total") or 0.0) for item in validated_items)
                            if (subtotal is None or subtotal == 0) and computed_items_total > 0:
                                subtotal = round(computed_items_total, 2)
                            if (total is None or total == 0) and subtotal is not None:
                                total = round(subtotal + (tax or 0.0), 2)

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
