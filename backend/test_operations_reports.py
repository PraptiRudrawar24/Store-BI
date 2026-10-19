"""
==============================================================================
STORE BI - OPERATIONS & PLATFORM ANALYTICS TEST SUITE
==============================================================================
Validates:
1. Platform Overview KPI calculations & date filtering
2. Empty database behavior & divide-by-zero safeguards
3. Geographic distribution & regional adoption classification
4. Cohort retention (Day 1, 7, 30, 90) & meaningful event definitions
5. Sales and GMV analytics & SaaS subscription revenue distinction
6. Category benchmarking & privacy preservation
7. Report builder & CSV formula injection sanitization (CWE-1236)
8. Scheduled report CRUD & immediate execution trigger
9. Operational alerts & monitoring thresholds
10. Super-admin authorization & data isolation
==============================================================================
"""

import pytest
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from database import Base, get_db
import models
import schemas
from auth import create_access_token, COOKIE_NAME
from main import app
import reports_service

TEST_DATABASE_URL = "sqlite:///./test_operations_reports.db"
test_engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_and_teardown():
    Base.metadata.drop_all(bind=test_engine)
    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)

def create_admin_and_auth_headers(db):
    admin = models.Shop(
        name="Platform HQ Operations",
        owner_name="Super Admin",
        phone="9999999999",
        email="admin@storebi.com",
        is_admin=True,
        status="active",
        city="Pune",
        state="Maharashtra",
        category="Operations",
        onboarding_completed=True,
        created_at=datetime.utcnow() - timedelta(days=60),
    )
    db.add(admin)
    db.commit()
    db.refresh(admin)

    token = create_access_token({"sub": str(admin.id), "email": admin.email})
    headers = {"Authorization": f"Bearer {token}"}
    return admin, headers, token

def create_regular_merchant(db, name="Regular Merchant", email="merchant@shop.com"):
    shop = models.Shop(
        name=name,
        owner_name="Shop Owner",
        phone="9876543210",
        email=email,
        is_admin=False,
        status="trial",
        city="Pune",
        state="Maharashtra",
        category="Grocery & kirana",
        onboarding_completed=True,
        created_at=datetime.utcnow() - timedelta(days=20),
    )
    db.add(shop)
    db.commit()
    db.refresh(shop)
    token = create_access_token({"sub": str(shop.id), "email": shop.email})
    headers = {"Authorization": f"Bearer {token}"}
    return shop, headers


# -----------------------------------------------------------------------------
# 1. Empty Database Test (Zero-Start Rule)
# -----------------------------------------------------------------------------

def test_empty_database_zero_start_safeguards():
    """
    Guarantees no divide-by-zero crashes or NaN values when no shops or sales exist.
    """
    db = TestingSessionLocal()
    admin, headers, _ = create_admin_and_auth_headers(db)

    # 1. Overview
    res = client.get("/api/admin/reports/overview?preset=30d", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["kpis"]["total_registered_businesses"] == 0
    assert data["kpis"]["platform_sales_volume"] == 0.0
    assert data["kpis"]["average_order_value"] == 0.0
    assert data["growth_trend"] != []

    # 2. Geographic
    res_geo = client.get("/api/admin/reports/geographic?preset=30d", headers=headers)
    assert res_geo.status_code == 200
    assert res_geo.json()["states"] == []
    assert res_geo.json()["cities"] == []

    # 3. Cohorts
    res_coh = client.get("/api/admin/reports/cohorts", headers=headers)
    assert res_coh.status_code == 200
    assert res_coh.json()["cohorts"] == []
    assert res_coh.json()["inactive_businesses"] == []

    # 4. Sales GMV
    res_gmv = client.get("/api/admin/reports/sales-gmv?preset=30d", headers=headers)
    assert res_gmv.status_code == 200
    assert res_gmv.json()["total_sales_gmv"] == 0.0
    assert res_gmv.json()["completed_orders"] == 0
    assert res_gmv.json()["average_order_value"] == 0.0

    # 5. Benchmarks
    res_bench = client.get("/api/admin/reports/benchmarks?preset=30d", headers=headers)
    assert res_bench.status_code == 200
    assert res_bench.json()["categories"] == []

    # 6. Report Builder
    res_bld = client.get("/api/admin/reports/builder?report_type=platform_summary", headers=headers)
    assert res_bld.status_code == 200
    assert res_bld.json()["total_rows"] > 0


# -----------------------------------------------------------------------------
# 2. Authorization & Access Control
# -----------------------------------------------------------------------------

def test_reports_authorization_guards():
    """
    Verifies that unauthenticated users and non-admin merchants are strictly rejected.
    """
    db = TestingSessionLocal()
    admin, admin_headers, _ = create_admin_and_auth_headers(db)
    merchant, merchant_headers = create_regular_merchant(db)

    # Unauthenticated request -> 401
    res_unauth = client.get("/api/admin/reports/overview")
    assert res_unauth.status_code == 401

    # Non-admin merchant request -> 403 Forbidden
    res_forbidden = client.get("/api/admin/reports/overview", headers=merchant_headers)
    assert res_forbidden.status_code == 403
    assert "Admin privileges required" in res_forbidden.json()["detail"]


# -----------------------------------------------------------------------------
# 3. Overview & Sales GMV vs SaaS Subscription Revenue Distinction
# -----------------------------------------------------------------------------

def test_overview_metrics_and_revenue_distinction():
    """
    Verifies metric calculations and the critical distinction between
    Merchant Retailer GMV and Store BI SaaS Revenue.
    """
    db = TestingSessionLocal()
    admin, headers, _ = create_admin_and_auth_headers(db)
    now = datetime.utcnow()

    # Create 3 shops
    shop1 = models.Shop(
        name="Kirana One", owner_name="Owner 1", phone="9000000001",
        category="Grocery & kirana", city="Pune", state="Maharashtra",
        status="active", is_paid=True, created_at=now - timedelta(days=15)
    )
    shop2 = models.Shop(
        name="Pharma Plus", owner_name="Owner 2", phone="9000000002",
        category="Medical & pharmacy", city="Ahmedabad", state="Gujarat",
        status="trial", is_paid=False, created_at=now - timedelta(days=5)
    )
    shop3 = models.Shop(
        name="Book Corner", owner_name="Owner 3", phone="9000000003",
        category="Stationery & books", city="Surat", state="Gujarat",
        status="trial", is_paid=False, created_at=now - timedelta(days=40)
    )
    db.add_all([shop1, shop2, shop3])
    db.commit()

    # Shop 1 records 2 sales (Retailer GMV = 1500 + 2500 = 4000)
    sale1 = models.Sale(shop_id=shop1.id, total_amount=1500.0, payment_mode="UPI", date_time=now - timedelta(days=2))
    sale2 = models.Sale(shop_id=shop1.id, total_amount=2500.0, payment_mode="Cash", date_time=now - timedelta(days=1))
    db.add_all([sale1, sale2])

    # Store BI SaaS Subscription payment collected from Shop 1 (₹999 = 99900 paise)
    sub_txn = models.PaymentTransaction(
        shop_id=shop1.id, transaction_ref="TXN-TEST-001", amount_paise=99900,
        status="captured", gateway="razorpay", created_at=now - timedelta(days=3)
    )
    db.add(sub_txn)
    db.commit()

    res = client.get("/api/admin/reports/overview?preset=30d", headers=headers)
    assert res.status_code == 200
    data = res.json()
    kpis = data["kpis"]

    assert kpis["total_registered_businesses"] == 3
    assert kpis["new_registrations"] == 2  # shop1 (15d) and shop2 (5d) are within 30d
    assert kpis["active_businesses"] == 1  # only shop1 had sales activity
    assert kpis["platform_sales_volume"] == 4000.0
    assert kpis["total_recorded_orders"] == 2
    assert kpis["average_order_value"] == 2000.0
    assert kpis["storebi_saas_revenue"] == 999.0  # ₹999 subscription revenue

    # Check definitions are returned
    assert len(data["metric_definitions"]) >= 6


# -----------------------------------------------------------------------------
# 4. Geographic Analytics & Adoption
# -----------------------------------------------------------------------------

def test_geographic_analytics():
    """
    Tests state and city aggregation, adoption level classification, and incomplete addresses.
    """
    db = TestingSessionLocal()
    admin, headers, _ = create_admin_and_auth_headers(db)
    now = datetime.utcnow()

    # Add shops across Maharashtra and Gujarat, plus one with missing city
    s1 = models.Shop(name="Shop MH 1", city="Pune", state="Maharashtra", category="Grocery", created_at=now - timedelta(days=10))
    s2 = models.Shop(name="Shop MH 2", city="Mumbai", state="Maharashtra", category="Medical", created_at=now - timedelta(days=8))
    s3 = models.Shop(name="Shop GJ 1", city="Ahmedabad", state="Gujarat", category="Grocery", created_at=now - timedelta(days=5))
    s4 = models.Shop(name="Shop Incomplete", city=None, state=None, category="Stationery", created_at=now - timedelta(days=2))
    db.add_all([s1, s2, s3, s4])
    db.commit()

    res = client.get("/api/admin/reports/geographic?preset=30d", headers=headers)
    assert res.status_code == 200
    data = res.json()

    assert data["unspecified_location_count"] == 1
    state_names = [st["state"] for st in data["states"]]
    assert "Maharashtra" in state_names
    assert "Gujarat" in state_names

    mh_entry = next(st for st in data["states"] if st["state"] == "Maharashtra")
    assert mh_entry["business_count"] == 2
    assert mh_entry["adoption_level"] == "moderate"


# -----------------------------------------------------------------------------
# 5. Cohort Retention and Meaningful Event Definition
# -----------------------------------------------------------------------------

def test_cohort_retention_and_inactive_stores():
    """
    Tests cohort grouping by month, Day 1 / Day 7 / Day 30 retention,
    and inactive business identification.
    """
    db = TestingSessionLocal()
    admin, headers, _ = create_admin_and_auth_headers(db)
    now = datetime.utcnow()

    # Shop registered 35 days ago, active on day 1 and day 32
    reg_date = now - timedelta(days=35)
    shop_retained = models.Shop(
        name="Retained Kirana", phone="9111111111",
        city="Pune", state="Maharashtra", category="Grocery",
        created_at=reg_date
    )
    # Shop registered 35 days ago, never active
    shop_inactive = models.Shop(
        name="Inactive Kirana", phone="9222222222",
        city="Pune", state="Maharashtra", category="Grocery",
        created_at=reg_date
    )
    db.add_all([shop_retained, shop_inactive])
    db.commit()

    # Meaningful activity: Sale on Day 1 (reg_date + 1 day) and Day 32 (reg_date + 32 days)
    sale_d1 = models.Sale(shop_id=shop_retained.id, total_amount=500.0, date_time=reg_date + timedelta(days=1))
    sale_d32 = models.Sale(shop_id=shop_retained.id, total_amount=1200.0, date_time=reg_date + timedelta(days=32))
    db.add_all([sale_d1, sale_d32])
    db.commit()

    res = client.get("/api/admin/reports/cohorts?group_by=month", headers=headers)
    assert res.status_code == 200
    data = res.json()

    assert len(data["cohorts"]) >= 1
    cohort = data["cohorts"][0]
    assert cohort["cohort_size"] == 2
    assert cohort["day_1_active"] == 1
    assert cohort["day_1_pct"] == 50.0
    assert cohort["day_30_active"] == 1
    assert cohort["day_30_pct"] == 50.0

    # Inactive list should contain shop_inactive
    inactive_ids = [item["shop_id"] for item in data["inactive_businesses"]]
    assert shop_inactive.id in inactive_ids


# -----------------------------------------------------------------------------
# 6. Category Benchmarking (Privacy-Preserved Aggregates)
# -----------------------------------------------------------------------------

def test_category_benchmarking():
    """
    Verifies median, average, inventory turnover proxy, and sample size warnings.
    """
    db = TestingSessionLocal()
    admin, headers, _ = create_admin_and_auth_headers(db)
    now = datetime.utcnow()

    # Create 3 Grocery shops to achieve sufficient sample size
    g1 = models.Shop(name="G1", category="Grocery & kirana", created_at=now - timedelta(days=20))
    g2 = models.Shop(name="G2", category="Grocery & kirana", created_at=now - timedelta(days=20))
    g3 = models.Shop(name="G3", category="Grocery & kirana", created_at=now - timedelta(days=20))
    # Create 1 Medical shop (low sample size)
    m1 = models.Shop(name="M1", category="Medical & pharmacy", created_at=now - timedelta(days=20))
    db.add_all([g1, g2, g3, m1])
    db.commit()

    # Sales: G1 = 1000, G2 = 2000, G3 = 6000 -> Median = 2000, Avg = 3000
    db.add_all([
        models.Sale(shop_id=g1.id, total_amount=1000.0, date_time=now - timedelta(days=5)),
        models.Sale(shop_id=g2.id, total_amount=2000.0, date_time=now - timedelta(days=5)),
        models.Sale(shop_id=g3.id, total_amount=6000.0, date_time=now - timedelta(days=5)),
        models.Sale(shop_id=m1.id, total_amount=4000.0, date_time=now - timedelta(days=5)),
    ])
    db.commit()

    res = client.get("/api/admin/reports/benchmarks?preset=30d", headers=headers)
    assert res.status_code == 200
    data = res.json()

    categories = {c["category"]: c for c in data["categories"]}
    assert "Grocery & kirana" in categories
    g_bench = categories["Grocery & kirana"]
    assert g_bench["sample_size"] == 3
    assert g_bench["sample_size_status"] == "sufficient"
    assert g_bench["median_sales"] == 2000.0
    assert g_bench["avg_sales"] == 3000.0

    m_bench = categories["Medical & pharmacy"]
    assert m_bench["sample_size"] == 1
    assert m_bench["sample_size_status"] == "low_sample"


# -----------------------------------------------------------------------------
# 7. CSV Export & Formula Injection Protection (CWE-1236)
# -----------------------------------------------------------------------------

def test_csv_formula_injection_protection():
    """
    Validates that CSV export neutralizes characters (=, +, -, @, \\t, \\r)
    that could execute malicious formulas in Excel or LibreOffice.
    """
    db = TestingSessionLocal()
    admin, headers, _ = create_admin_and_auth_headers(db)
    now = datetime.utcnow()

    # Malicious shop name containing formula injection payload
    malicious_shop = models.Shop(
        name="=SUM(A1:A10)",
        owner_name="+cmd|' /C calc'!A0",
        category="@DDE('cmd','/C calc')",
        city="-Pune",
        state="Maharashtra",
        created_at=now - timedelta(days=5)
    )
    db.add(malicious_shop)
    db.commit()

    db.add(models.Sale(shop_id=malicious_shop.id, total_amount=999.0, date_time=now - timedelta(days=2)))
    db.commit()

    res = client.get("/api/admin/reports/export-csv?report_type=sales_gmv", headers=headers)
    assert res.status_code == 200
    assert res.headers["content-type"].startswith("text/csv")
    csv_text = res.text

    # Formulas must be escaped with prepended single quote
    assert "'=SUM(A1:A10)" in csv_text
    assert "'+cmd|' /C calc'!A0" in csv_text
    assert "'@DDE('cmd','/C calc')" in csv_text
    assert "'-Pune" in csv_text


# -----------------------------------------------------------------------------
# 8. Report Builder & PDF/HTML Export
# -----------------------------------------------------------------------------

def test_report_builder_and_pdf_export():
    """
    Validates dynamic report builder pagination and printable PDF/HTML generation.
    """
    db = TestingSessionLocal()
    admin, headers, _ = create_admin_and_auth_headers(db)

    res_builder = client.get("/api/admin/reports/builder?report_type=geographic&page=1&page_size=10", headers=headers)
    assert res_builder.status_code == 200
    data = res_builder.json()
    assert data["report_type"] == "geographic"
    assert "columns" in data
    assert "rows" in data

    res_pdf = client.get("/api/admin/reports/export-pdf-html?report_type=platform_summary", headers=headers)
    assert res_pdf.status_code == 200
    assert "text/html" in res_pdf.headers["content-type"]
    assert "Store BI" in res_pdf.text
    assert "window.print()" in res_pdf.text


# -----------------------------------------------------------------------------
# 9. Scheduled Reports Management & Execution
# -----------------------------------------------------------------------------

def test_scheduled_reports_lifecycle():
    """
    Tests creating, listing, updating, immediate execution, and deleting report schedules.
    """
    db = TestingSessionLocal()
    admin, headers, _ = create_admin_and_auth_headers(db)

    # 1. Check scheduler status
    res_status = client.get("/api/admin/reports/scheduler-status", headers=headers)
    assert res_status.status_code == 200
    assert "provider" in res_status.json()

    # 2. Create schedule
    create_payload = {
        "name": "Weekly GMV Digest",
        "report_type": "sales_gmv",
        "frequency": "weekly",
        "recipients": "ops@storebi.com, lead@storebi.com",
        "format": "csv",
        "filters": {"preset": "7d", "state": "Maharashtra"}
    }
    res_create = client.post("/api/admin/reports/schedules", json=create_payload, headers=headers)
    assert res_create.status_code == 200
    sched = res_create.json()
    sched_id = sched["id"]
    assert sched["name"] == "Weekly GMV Digest"
    assert sched["status"] == "active"

    # 3. List schedules
    res_list = client.get("/api/admin/reports/schedules", headers=headers)
    assert res_list.status_code == 200
    assert len(res_list.json()) == 1

    # 4. Update schedule (Pause)
    res_patch = client.patch(f"/api/admin/reports/schedules/{sched_id}", json={"status": "paused"}, headers=headers)
    assert res_patch.status_code == 200
    assert res_patch.json()["status"] == "paused"

    # 5. Trigger Run Now
    res_run = client.post(f"/api/admin/reports/schedules/{sched_id}/run-now", headers=headers)
    assert res_run.status_code == 200
    log = res_run.json()
    assert log["schedule_id"] == sched_id
    assert log["status"] == "success"

    # 6. Check logs list
    res_logs = client.get("/api/admin/reports/schedules/logs", headers=headers)
    assert res_logs.status_code == 200
    assert len(res_logs.json()) >= 1

    # 7. Delete schedule
    res_del = client.delete(f"/api/admin/reports/schedules/{sched_id}", headers=headers)
    assert res_del.status_code == 200
    assert res_del.json()["status"] == "deleted"


# -----------------------------------------------------------------------------
# 10. Operational Monitoring & Alerts
# -----------------------------------------------------------------------------

def test_operational_alerts_evaluation():
    """
    Tests dynamic generation of operational monitoring alerts for data quality,
    inventory expiry, and merchant activity drops.
    """
    db = TestingSessionLocal()
    admin, headers, _ = create_admin_and_auth_headers(db)
    now = datetime.utcnow()

    # Seed an invalid price product and an expired product
    p1 = models.Product(name="Zero Price Item", cost_price=0.0, selling_price=-10.0, stock_qty=5)
    p2 = models.Product(
        name="Expired Biscuits", cost_price=10.0, selling_price=15.0, stock_qty=20,
        expiry_date=(now - timedelta(days=2)).date()
    )
    p3 = models.Product(name="Negative Stock Item", cost_price=5.0, selling_price=10.0, stock_qty=-5)
    db.add_all([p1, p2, p3])
    db.commit()

    res = client.get("/api/admin/reports/alerts", headers=headers)
    assert res.status_code == 200
    data = res.json()

    alert_types = [a["alert_type"] for a in data["alerts"]]
    assert "data_quality" in alert_types
    assert "inventory_expiry" in alert_types
    assert data["warning_count"] + data["info_count"] + data["critical_count"] >= 2
