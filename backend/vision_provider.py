"""
Vision LLM & OCR Provider Module
Isolates vision model extraction logic into a single swappable, resilient file.
Features:
- Camera EXIF rotation correction & image contrast enhancement pipeline
- Domain-specific prompt engineering for Indian Wholesale GST bills & Kirana handwritten notes
- Mathematical cross-validation and self-correction (Unit Cost vs Line Total vs MRP)
- Local Windows OCR fallback when no API key is configured or offline
- Support for Gemini 1.5/2.0 Flash with automatic retries
"""

import os
import io
import json
import base64
import re
import asyncio
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

# Primary and fallback Gemini models
GEMINI_MODELS = [
    "gemini-1.5-flash",
    "gemini-2.0-flash",
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

def get_mock_result() -> Dict[str, Any]:
    """
    Returns clearly labeled mock invoice extraction when no GEMINI_API_KEY is configured.
    Includes realistic items with high and low confidence, missing values, and wholesale pricing.
    """
    return {
        "supplier": "Blink Wholesale Distributors",
        "invoice_date": datetime.now().strftime("%Y-%m-%d"),
        "is_mock": True,
        "ocr_engine": "Sample Demo Mock",
        "message": "MOCK MODE: No Gemini API key provided. Sample kirana invoice loaded for preview. To scan real invoices with AI, enter your Gemini API key in settings.",
        "items": [
            {
                "name": "Tata Salt 1kg",
                "qty": 30,
                "cost_price": 22.0,
                "mrp": 28.0,
                "line_total": 660.0,
                "expiry_date": "2027-12-31",
                "confidence": 0.96,
            },
            {
                "name": "Fortune Sunlite Oil 1L",
                "qty": 20,
                "cost_price": 132.0,
                "mrp": 155.0,
                "line_total": 2640.0,
                "expiry_date": None,
                "confidence": 0.65,  # Amber flag: medium confidence
            },
            {
                "name": "Parle-G Gold 250g",
                "qty": 40,
                "cost_price": 20.0,
                "mrp": 25.0,
                "line_total": 800.0,
                "expiry_date": "2027-08-15",
                "confidence": 0.94,
            },
            {
                "name": "Handwritten Country Jaggery 1kg",
                "qty": 15,
                "cost_price": None,  # Amber flag: missing price in handwritten note
                "mrp": None,
                "line_total": None,
                "expiry_date": None,
                "confidence": 0.45,  # Amber flag: low confidence
            },
        ],
    }


# Backwards compatibility alias
SAMPLE_MOCK_RESULT = get_mock_result()


def preprocess_image_for_ocr(image_bytes: bytes) -> Tuple[bytes, str, Tuple[int, int]]:
    """
    Critical Image Preprocessing Pipeline:
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
                # Downsample large phone photos to avoid remote downscaling blur
                scale = 2048.0 / max_dim
                new_size = (int(width * scale), int(height * scale))
                img = img.resize(new_size, Image.Resampling.LANCZOS)
            elif min_dim < 750 and max_dim < 1200:
                # Upscale tiny images slightly so small print numbers have sharp edges
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
                pass  # Non-fatal if enhancement fails

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
    Fixes column confusion between:
    - Line Total (Total Row Amount)
    - Unit Cost Price (Rate per single piece)
    - MRP (Retail customer price)
    - Quantity (Number of pieces received)
    """
    corrected: List[Dict[str, Any]] = []

    for item in items:
        raw_name = clean_product_name(item.get("name", ""))
        if not raw_name or len(raw_name) < 2:
            continue

        # 1. Parse quantity
        raw_qty = item.get("qty", 1)
        try:
            qty = max(1, int(round(float(raw_qty))))
        except (ValueError, TypeError):
            qty = 1

        # 2. Parse numbers
        cost_price = None
        if item.get("cost_price") is not None:
            try:
                val = float(item["cost_price"])
                cost_price = round(val, 2) if val > 0 else None
            except (ValueError, TypeError):
                cost_price = None

        mrp = None
        if item.get("mrp") is not None:
            try:
                val = float(item["mrp"])
                mrp = round(val, 2) if val > 0 else None
            except (ValueError, TypeError):
                mrp = None

        line_total = None
        if item.get("line_total") is not None:
            try:
                val = float(item["line_total"])
                line_total = round(val, 2) if val > 0 else None
            except (ValueError, TypeError):
                line_total = None

        confidence = 0.90
        if item.get("confidence") is not None:
            try:
                confidence = float(item["confidence"])
            except (ValueError, TypeError):
                confidence = 0.85

        # --- MATHEMATICAL SELF-CORRECTION RULES ---

        # RULE A: Inversion detection (Model set cost_price = line_total for qty > 1)
        if cost_price and line_total and qty > 1:
            if abs(cost_price - line_total) <= 1.0 or (mrp and cost_price > mrp and (line_total / qty) <= mrp):
                # The OCR model picked the total row price as unit cost!
                cost_price = round(line_total / qty, 2)

        # RULE B: Cost price exceeds MRP
        # In wholesale, buying cost cannot exceed retail MRP!
        if mrp and cost_price and cost_price > mrp:
            if qty > 1 and (cost_price / qty) <= (mrp * 1.05):
                # cost_price was actually the line total!
                line_total = cost_price
                cost_price = round(line_total / qty, 2)
            else:
                # Discrepancy flag
                confidence = min(confidence, 0.60)

        # RULE C: Missing cost price, but line_total and qty exist
        if (cost_price is None or cost_price <= 0) and line_total and line_total > 0 and qty > 0:
            cost_price = round(line_total / qty, 2)

        # RULE D: Missing line_total, but cost_price exists
        if (line_total is None or line_total <= 0) and cost_price and cost_price > 0:
            line_total = round(cost_price * qty, 2)

        # RULE E: Math consistency verification
        if cost_price and line_total and qty > 1:
            expected_total = qty * cost_price
            if abs(expected_total - line_total) > max(2.0, line_total * 0.08):
                # Inconsistency between qty, rate, and line total
                # Check if line_total / qty makes more sense
                calc_rate = round(line_total / qty, 2)
                if mrp and calc_rate <= mrp and cost_price > mrp:
                    cost_price = calc_rate
                else:
                    confidence = min(confidence, 0.65)

        # Format expiry date
        expiry = item.get("expiry_date")
        if expiry and not re.match(r"^\d{4}-\d{2}-\d{2}$", str(expiry).strip()):
            expiry = None

        corrected.append({
            "name": raw_name,
            "qty": qty,
            "cost_price": cost_price,
            "mrp": mrp,
            "line_total": line_total,
            "expiry_date": expiry,
            "confidence": round(confidence, 2),
        })

    return corrected


async def extract_with_local_ocr(image_bytes: bytes) -> Optional[Dict[str, Any]]:
    """
    Offline Local OCR Fallback Engine using native Windows Media OCR.
    Extracts text lines and parses bill items via rule-based patterns.
    Returns structured result if successful, or None if unavailable/unparseable.
    """
    try:
        import winocr
    except ImportError:
        return None

    try:
        # Load and preprocess image
        processed_bytes, _, _ = preprocess_image_for_ocr(image_bytes)
        img = Image.open(io.BytesIO(processed_bytes))

        # Run winocr asynchronously without blocking thread
        try:
            ocr_result = await winocr.recognize_pil(img, "en")
        except Exception:
            return None

        if not ocr_result:
            return None

        lines = [line.text.strip() for line in getattr(ocr_result, "lines", []) if line.text.strip()]
        if not lines:
            return None

        # Heuristic parsing for supplier, date, and items
        supplier = None
        invoice_date = None
        raw_items: List[Dict[str, Any]] = []

        # Look for supplier in the top 5 lines
        supplier_keywords = ["wholesaler", "distributor", "traders", "agency", "enterprises", "m/s", "store", "mart", "cash & carry", "bhandar"]
        for line in lines[:5]:
            low = line.lower()
            if any(k in low for k in supplier_keywords) or (len(line) > 5 and line.isupper() and not any(c.isdigit() for c in line)):
                supplier = line.strip(" :-#|")
                break

        # Look for date
        date_pattern = re.compile(r"\b(\d{1,2})[/\-\.](\d{1,2})[/\-\.](\d{2,4})\b")
        for line in lines[:8]:
            m = date_pattern.search(line)
            if m:
                d, m_val, y = m.groups()
                if len(y) == 2:
                    y = f"20{y}"
                invoice_date = f"{y}-{int(m_val):02d}-{int(d):02d}"
                break

        # Parse item lines with regex
        # Pattern matches: <Product Name> [Qty] [Rate] [Total]
        line_item_pattern = re.compile(
            r"^(?:\d+[\.\-\)]\s*)?([A-Za-z][A-Za-z0-9\s\.\-]{3,35})\s+(?:HSN\s*\d+\s+)?(?:Qty:?\s*)?(\d+)\s*(?:pcs|pkts|pkt|box|cases)?\s*(?:@|Rate:?|MRP:\s*\d+\.?\d*\s*Rate:?)?\s*[₹\$\s]*(\d+\.?\d*)\s*(?:Total:?|Amt:?|=)?\s*[₹\$\s]*(\d+\.?\d*)?",
            re.IGNORECASE,
        )

        for line in lines:
            # Skip header or footer lines
            low = line.lower()
            if any(h in low for h in ["invoice", "bill to", "ship to", "grand total", "subtotal", "gstin", "pan no", "authorized", "signature", "terms"]):
                continue

            match = line_item_pattern.search(line)
            if match:
                name, qty_str, rate_str, total_str = match.groups()
                qty = int(qty_str) if qty_str else 1
                rate = float(rate_str) if rate_str else None
                total = float(total_str) if total_str else None

                if rate and total and rate > total:
                    # Swapped columns
                    rate, total = total, rate

                raw_items.append({
                    "name": name.strip(),
                    "qty": qty,
                    "cost_price": rate,
                    "line_total": total,
                    "confidence": 0.82,
                })

        if raw_items:
            corrected_items = validate_and_correct_items(raw_items)
            return {
                "supplier": supplier or "Local Supplier",
                "invoice_date": invoice_date,
                "items": corrected_items,
                "is_mock": False,
                "ocr_engine": "Windows Native OCR",
                "message": f"Scanned locally with Windows OCR engine. Extracted {len(corrected_items)} line items.",
            }

    except Exception:
        pass

    return None


async def extract_invoice_from_image(
    image_bytes: bytes,
    mime_type: Optional[str] = None,
    api_key: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Primary Invoice Extraction Function (Asynchronous):
    1. Preprocesses image: fixes EXIF rotation, normalizes dimensions, enhances contrast.
    2. Uses Gemini Vision API with high-precision Indian Kirana domain prompt.
    3. Cross-validates mathematics (Unit Cost vs Line Total vs MRP) and auto-corrects.
    4. Falls back to local Windows OCR if no API key is configured or API is unreachable.
    """
    # 1. Image preprocessing pipeline
    processed_bytes, final_mime, dims = preprocess_image_for_ocr(image_bytes)

    # 2. Check for configured API key
    active_key = (api_key or os.environ.get("GEMINI_API_KEY", "")).strip()

    if not active_key:
        return get_mock_result()

    # 3. Call Gemini Vision API with Indian Wholesale & Kirana Domain Prompt
    b64_image = base64.b64encode(processed_bytes).decode("utf-8")

    prompt = (
        "You are an expert Indian grocery store (Kirana) invoice auditor and wholesale bill extraction specialist.\n"
        "Accurately read this supplier invoice, cash memo, or handwritten ledger slip.\n\n"
        "CRITICAL RULES FOR ACCURATE EXTRACTION:\n"
        "1. DISTINGUISH UNIT COST PRICE VS LINE TOTAL VS MRP:\n"
        "   - Indian invoices have multiple numeric columns:\n"
        "     * MRP = Maximum Retail Price printed on product (customer selling price, e.g. ₹50)\n"
        "     * Rate / Basic Price / Unit Rate = Wholesale buying cost per single piece paid by shop owner (e.g. ₹38). THIS IS cost_price.\n"
        "     * Amount / Taxable Value / Net Total = Row total (e.g. 10 pcs * ₹38 = ₹380). DO NOT RETURN ROW TOTAL AS cost_price!\n"
        "     * HSN/SAC = 4-8 digit tax classification code (e.g. 190531, 210690). IGNORE HSN, DO NOT confuse it with price or quantity!\n"
        "   - Wholesale cost_price is ALWAYS less than or equal to MRP. If cost_price > MRP, you selected the line total instead of unit rate!\n"
        "   - Cross-check math: qty * cost_price ≈ line_total.\n\n"
        "2. QUANTITY (qty):\n"
        "   - Count of individual retail sellable units (integer >= 1).\n"
        "   - If billed as '1 Box (20 pcs)', extract qty: 20 and cost_price per single piece.\n"
        "   - If 'Free/Scheme' items exist (e.g. '10 + 2 Free'), received inventory qty is 12.\n\n"
        "3. PRODUCT NAME CLEANING:\n"
        "   - Keep clean Brand + Name + Pack Size (e.g., 'Tata Salt 1kg', 'Fortune Sunlite Oil 1L', 'Parle-G Gold 250g').\n"
        "   - Remove noise: barcodes, HSN codes, batch numbers, 'TAX INCL', internal item IDs.\n\n"
        "4. HANDWRITTEN KIRANA RECEIPTS / KHATA PARCHI:\n"
        "   - Handle common grocery shorthand (Hindi/Hinglish/English):\n"
        "     'Chini 5kg 210' -> Name: 'Sugar / Chini 5kg', Qty: 5, Cost: 42.0, Total: 210.0\n"
        "     'Atta 10kg 380' -> Name: 'Wheat Atta 10kg', Qty: 1, Cost: 380.0, Total: 380.0\n"
        "     'Tel 1L x 10 @ 135' -> Name: 'Cooking Oil 1L', Qty: 10, Cost: 135.0, Total: 1350.0\n\n"
        "RETURN STRICT JSON ONLY MATCHING THIS SCHEMA:\n"
        "{\n"
        '  "supplier": "Distributor/Wholesaler name or null",\n'
        '  "invoice_date": "YYYY-MM-DD or null",\n'
        '  "items": [\n'
        "    {\n"
        '      "name": "Clean product name with weight/size",\n'
        '      "qty": 1,\n'
        '      "cost_price": 22.0,\n'
        '      "mrp": 28.0,\n'
        '      "line_total": 660.0,\n'
        '      "expiry_date": "YYYY-MM-DD or null",\n'
        '      "confidence": 0.95\n'
        "    }\n"
        "  ]\n"
        "}\n"
    )

    payload = {
        "contents": [
            {
                "parts": [
                    {"text": prompt},
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

    # Attempt extraction across models with retry logic
    last_error: Optional[Exception] = None

    for model_name in GEMINI_MODELS:
        api_url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent"

        # Retry up to 2 times per model for network socket glitches
        for attempt in range(2):
            try:
                async with httpx.AsyncClient(timeout=40.0) as client:
                    resp = await client.post(
                        f"{api_url}?key={active_key}",
                        headers={"Content-Type": "application/json"},
                        json=payload,
                    )

                    if resp.status_code == 200:
                        data = resp.json()
                        candidates = data.get("candidates", [])
                        if not candidates:
                            raise VisionBadJsonError("No extraction candidate was returned by Vision model.")

                        text_content = (
                            candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "").strip()
                        )

                        # Strip markdown code blocks if any
                        text_content = re.sub(r"^```(?:json)?\s*", "", text_content, flags=re.MULTILINE)
                        text_content = re.sub(r"\s*```$", "", text_content, flags=re.MULTILINE)

                        parsed = json.loads(text_content)
                        raw_items = parsed.get("items", [])

                        # Apply mathematical validation and auto-correction
                        validated_items = validate_and_correct_items(raw_items)

                        return {
                            "supplier": parsed.get("supplier"),
                            "invoice_date": parsed.get("invoice_date"),
                            "items": validated_items,
                            "is_mock": False,
                            "ocr_engine": f"Gemini Vision AI ({model_name})",
                            "message": f"Successfully extracted and validated {len(validated_items)} items using Gemini Vision AI.",
                        }

                    elif resp.status_code in (404, 400):
                        # Model not found or bad request for this model, try next model
                        err_msg = resp.text
                        try:
                            err_msg = resp.json().get("error", {}).get("message", err_msg)
                        except Exception:
                            pass
                        last_error = VisionApiError(f"{model_name} failed ({resp.status_code}): {err_msg}")
                        break  # Break retry loop to try next model

                    else:
                        err_msg = resp.text
                        try:
                            err_msg = resp.json().get("error", {}).get("message", err_msg)
                        except Exception:
                            pass
                        last_error = VisionApiError(f"API error ({resp.status_code}): {err_msg}")

            except httpx.TimeoutException:
                last_error = VisionApiError("Vision API request timed out. Please check your internet connection and retry.")
            except httpx.RequestError as e:
                last_error = VisionApiError(f"Network error connecting to Vision API: {str(e)}")
            except json.JSONDecodeError as e:
                last_error = VisionBadJsonError(f"Invalid JSON returned by Vision model: {str(e)}")
            except Exception as e:
                last_error = e

    # If all remote models failed, try local Windows OCR as last resort before raising error
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

