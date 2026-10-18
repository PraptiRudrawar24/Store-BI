import pytest
import io
import json
import hashlib
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from database import engine, Base, SessionLocal
import models
import payment_service
from main import app
from auth import create_access_token

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_test_db():
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        # Clear existing payment test data
        db.query(models.SettlementEntry).delete()
        db.query(models.SettlementBatch).delete()
        db.query(models.PaymentRefund).delete()
        db.query(models.TaxInvoice).delete()
        db.query(models.PaymentTransaction).delete()
        db.query(models.WebhookEvent).delete()
        db.commit()

        # Ensure admin user
        admin = db.query(models.Shop).filter(models.Shop.email == "admin@storebi.com").first()
        if not admin:
            admin = models.Shop(
                name="Store BI Operations",
                owner_name="Platform Admin",
                email="admin@storebi.com",
                phone="9999999999",
                is_admin=True,
                is_paid=True,
                plan_name="Enterprise Admin",
            )
            db.add(admin)
            db.commit()

        # Ensure a test merchant shop
        merchant = db.query(models.Shop).filter(models.Shop.phone == "9876543210").first()
        if not merchant:
            merchant = models.Shop(
                name="Ramesh Kirana Store",
                owner_name="Ramesh",
                phone="9876543210",
                email="ramesh@kirana.in",
                is_admin=False,
                is_paid=True,
                plan_name="Annual Pro",
                state="Maharashtra"
            )
            db.add(merchant)
            db.commit()

        # Seed realistic baseline payments
        payment_service.seed_payment_data_if_empty(db)
    yield

def get_admin_headers():
    with SessionLocal() as db:
        admin = db.query(models.Shop).filter(models.Shop.email == "admin@storebi.com").first()
        token = create_access_token({"sub": str(admin.id)})
        return {"Authorization": f"Bearer {token}", "Cookie": f"store_bi_session={token}"}

def get_merchant_headers():
    with SessionLocal() as db:
        merchant = db.query(models.Shop).filter(models.Shop.phone == "9876543210").first()
        token = create_access_token({"sub": str(merchant.id)})
        return {"Authorization": f"Bearer {token}", "Cookie": f"store_bi_session={token}"}


# 1. Exact Paise Financial Math & Rounding
def test_financial_paise_conversions_and_fees():
    # 5999.00 -> 599900 paise
    paise = payment_service.inr_to_paise(5999.00)
    assert paise == 599900
    assert payment_service.paise_to_inr(599900) == 5999.00

    # UPI: 0% fee
    fee_p, tax_p, net_p = payment_service.calculate_gateway_fee(599900, "upi")
    assert fee_p == 0
    assert tax_p == 0
    assert net_p == 599900

    # Card / Netbanking: 2% fee + 18% GST on fee
    # 599900 * 0.02 = 11998 paise (₹119.98)
    # 11998 * 0.18 = 2159.64 -> 2160 paise (₹21.60)
    # net = 599900 - 11998 - 2160 = 585742 paise (₹5,857.42)
    fee_p, tax_p, net_p = payment_service.calculate_gateway_fee(599900, "card")
    assert fee_p == 11998
    assert tax_p == 2160
    assert net_p == 585742
    assert (fee_p + tax_p + net_p) == 599900  # Zero leakage


# 2. GST Tax Invoicing Calculation (Intra vs Inter-State)
def test_gst_tax_calculations_intra_and_interstate():
    # Intra-state: Maharashtra -> Maharashtra (CGST 9% + SGST 9%)
    gst_intra = payment_service.calculate_gst_breakdown(599900, "Maharashtra")
    assert gst_intra["is_interstate"] is False
    assert gst_intra["cgst_rate"] == 9.0
    assert gst_intra["sgst_rate"] == 9.0
    assert gst_intra["igst_rate"] == 0.0
    total_tax = gst_intra["cgst_amount_paise"] + gst_intra["sgst_amount_paise"]
    assert (gst_intra["taxable_amount_paise"] + total_tax) == 599900

    # Inter-state: Maharashtra -> Gujarat (IGST 18%)
    gst_inter = payment_service.calculate_gst_breakdown(599900, "Gujarat")
    assert gst_inter["is_interstate"] is True
    assert gst_inter["cgst_amount_paise"] == 0
    assert gst_inter["sgst_amount_paise"] == 0
    assert gst_inter["igst_rate"] == 18.0
    assert (gst_inter["taxable_amount_paise"] + gst_inter["igst_amount_paise"]) == 599900


# 3. Super Admin Payment Overview Endpoint & Seed Verification
def test_admin_payments_overview():
    headers = get_admin_headers()
    res = client.get("/api/admin/payments/overview?range=30d", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["gross_amount"] > 0
    assert data["successful_amount"] > 0
    assert data["total_transactions_count"] >= 8
    assert len(data["payment_methods_breakdown"]) > 0
    assert len(data["gateways_breakdown"]) > 0
    assert len(data["daily_trends"]) > 0
    assert len(data["recent_transactions"]) > 0


# 4. Search, Filter & CSV Export of Transactions
def test_admin_payments_transactions_and_csv_export():
    headers = get_admin_headers()

    # List with search
    res = client.get("/api/admin/payments/transactions?search=Ramesh", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["total_count"] >= 1
    assert "Ramesh" in data["items"][0]["shop_name"]

    # Filter by status
    res_captured = client.get("/api/admin/payments/transactions?status=captured", headers=headers)
    assert res_captured.status_code == 200
    for it in res_captured.json()["items"]:
        assert it["status"] == "captured"

    # Export CSV
    res_csv = client.get("/api/admin/payments/transactions/export-csv?status=all", headers=headers)
    assert res_csv.status_code == 200
    assert res_csv.headers["content-type"] == "text/csv; charset=utf-8"
    assert "Transaction ID" in res_csv.text
    assert "Gross Amount (INR)" in res_csv.text


# 5. Refund Boundary Conditions & Idempotency
def test_admin_refund_workflow():
    headers = get_admin_headers()
    # Find a captured transaction
    with SessionLocal() as db:
        txn = db.query(models.PaymentTransaction).filter(models.PaymentTransaction.status == "captured").first()
        txn_id = txn.id
        orig_amount = payment_service.paise_to_inr(txn.amount_paise)

    # 1. Attempt refund exceeding total balance -> Must fail
    res_excess = client.post(
        f"/api/admin/payments/transactions/{txn_id}/refund",
        json={"amount": orig_amount + 500.0, "reason": "customer_request"},
        headers=headers
    )
    assert res_excess.status_code == 400
    assert "exceeds remaining refundable balance" in res_excess.json()["detail"]

    # 2. Partial refund of ₹500
    res_partial = client.post(
        f"/api/admin/payments/transactions/{txn_id}/refund",
        json={"amount": 500.0, "reason": "billing_error", "admin_notes": "Test refund"},
        headers=headers
    )
    assert res_partial.status_code == 200
    partial_data = res_partial.json()
    assert partial_data["success"] is True
    assert partial_data["transaction_status"] == "partially_refunded"

    # 3. Verify in Refunds list
    res_rfnds = client.get("/api/admin/payments/refunds", headers=headers)
    assert res_rfnds.status_code == 200
    assert len(res_rfnds.json()) >= 1


# 6. Settlement CSV Ingestion & Auto-Reconciliation
def test_settlement_reconciliation_workflow():
    headers = get_admin_headers()

    # Grab a payment id from DB
    with SessionLocal() as db:
        txn = db.query(models.PaymentTransaction).filter(models.PaymentTransaction.status == "captured").first()
        pay_id = txn.gateway_payment_id
        gross_inr = payment_service.paise_to_inr(txn.amount_paise)

    # Build valid settlement CSV
    csv_content = (
        "payment_id,amount,fee,tax,net,utr,date\n"
        f"{pay_id},{gross_inr},119.98,21.60,{gross_inr - 141.58},UTR99887766,2026-10-15\n"
        f"pay_UNKNOWN_9999,999.00,20.00,3.60,975.40,UTR11223344,2026-10-15\n"
    )

    file_obj = io.BytesIO(csv_content.encode("utf-8"))
    res_upload = client.post(
        "/api/admin/payments/settlements/upload",
        files={"file": ("test_oct_settlement.csv", file_obj, "text/csv")},
        headers=headers
    )
    assert res_upload.status_code == 200
    batch_data = res_upload.json()
    assert batch_data["entry_count"] == 2
    assert batch_data["matched_count"] == 1
    assert batch_data["unmatched_count"] == 1
    assert batch_data["status"] == "discrepancy"

    batch_id = batch_data["id"]

    # Test batch detail endpoint
    res_detail = client.get(f"/api/admin/payments/settlements/{batch_id}", headers=headers)
    assert res_detail.status_code == 200
    entries = res_detail.json()["entries"]
    assert len(entries) == 2

    # Resolve the unmatched discrepancy
    unmatched_entry = next(e for e in entries if e["status"] == "unmatched")
    res_resolve = client.post(
        f"/api/admin/payments/settlements/entries/{unmatched_entry['id']}/resolve",
        json={"resolution_notes": "Verified offline manual wholesale settlement credit."},
        headers=headers
    )
    assert res_resolve.status_code == 200
    assert res_resolve.json()["success"] is True

    # Test download of reconciliation CSV
    res_rep = client.get(f"/api/admin/payments/settlements/{batch_id}/export-csv", headers=headers)
    assert res_rep.status_code == 200
    assert "Provider Payment ID" in res_rep.text


# 7. GST Tax Invoices Generation & Detail Endpoint
def test_gst_tax_invoice_generation():
    headers = get_admin_headers()

    with SessionLocal() as db:
        txn = db.query(models.PaymentTransaction).filter(models.PaymentTransaction.status == "captured").first()
        txn_id = txn.id

    res_gen = client.post(f"/api/admin/payments/invoices/generate/{txn_id}", headers=headers)
    assert res_gen.status_code == 200
    inv_data = res_gen.json()
    assert "SBI-2026-" in inv_data["invoice_number"]
    assert inv_data["supplier_gstin"] == "27AABCS1429B1Z"
    assert inv_data["sac_code"] == "998314"
    assert inv_data["taxable_amount"] > 0

    # List invoices
    res_list = client.get("/api/admin/payments/invoices", headers=headers)
    assert res_list.status_code == 200
    assert len(res_list.json()) >= 1


# 8. Webhook Signature Verification & Idempotency
def test_razorpay_webhook_signature_and_idempotency():
    # 1. Reject invalid signature
    payload = {"event_id": "evt_test_001", "event": "payment.captured", "payload": {}}
    res_invalid = client.post(
        "/api/webhooks/razorpay",
        json=payload,
        headers={"X-Razorpay-Signature": "invalid_signature"}
    )
    assert res_invalid.status_code == 400
    assert "Invalid webhook signature" in res_invalid.json()["detail"]

    # 2. Accept valid test signature
    res_valid = client.post(
        "/api/webhooks/razorpay",
        json=payload,
        headers={"X-Razorpay-Signature": "valid_test_signature"}
    )
    assert res_valid.status_code == 200
    assert res_valid.json()["status"] == "ok"

    # 3. Duplicate delivery (Idempotent ignore)
    res_dup = client.post(
        "/api/webhooks/razorpay",
        json=payload,
        headers={"X-Razorpay-Signature": "valid_test_signature"}
    )
    assert res_dup.status_code == 200
    assert "already processed" in res_dup.json()["message"]


# 9. Security & Access Control: Merchant cannot access Super Admin Payments
def test_merchant_cannot_access_admin_payments():
    merchant_headers = get_merchant_headers()
    res = client.get("/api/admin/payments/overview", headers=merchant_headers)
    assert res.status_code == 403
    assert "Admin privileges required" in res.json()["detail"]
