import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from datetime import datetime

import models
from database import Base, get_db
from main import app
from auth import create_access_token, COOKIE_NAME

SQLALCHEMY_DATABASE_URL = "sqlite:///./test_support_feedback.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

@pytest.fixture(scope="module", autouse=True)
def setup_database():
    app.dependency_overrides[get_db] = override_get_db
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()

    # Create Customer 1
    cust1 = models.Shop(
        name="Kirana Mart",
        owner_name="Ramesh Gupta",
        phone="9876543210",
        email="ramesh@kirana.com",
        is_admin=False,
        is_paid=True,
        status="active"
    )
    # Create Customer 2
    cust2 = models.Shop(
        name="Apex Electronics",
        owner_name="Sunil Joshi",
        phone="9876543211",
        email="sunil@apex.com",
        is_admin=False,
        is_paid=True,
        status="active"
    )
    # Create Admin
    admin = models.Shop(
        name="Store BI Operations",
        owner_name="Platform Admin",
        phone="9999999999",
        email="admin@storebi.com",
        is_admin=True,
        is_paid=True,
        status="active"
    )

    db.add_all([cust1, cust2, admin])
    db.commit()
    db.refresh(cust1)
    db.refresh(cust2)
    db.refresh(admin)

    yield {
        "cust1": cust1,
        "cust2": cust2,
        "admin": admin
    }

    Base.metadata.drop_all(bind=engine)
    app.dependency_overrides.pop(get_db, None)


def test_support_and_feedback_full_flow(setup_database):
    client = TestClient(app)
    cust1 = setup_database["cust1"]
    cust2 = setup_database["cust2"]
    admin = setup_database["admin"]

    cust1_token = create_access_token({"sub": str(cust1.id)})
    cust2_token = create_access_token({"sub": str(cust2.id)})
    admin_token = create_access_token({"sub": str(admin.id)})

    client_cust1 = TestClient(app, cookies={COOKIE_NAME: cust1_token})
    client_cust2 = TestClient(app, cookies={COOKIE_NAME: cust2_token})
    client_admin = TestClient(app, cookies={COOKIE_NAME: admin_token})

    # 1. Customer 1 creates a support ticket
    ticket_payload = {
        "subject": "POS Billing Printer Not Responding",
        "category": "POS Billing",
        "description": "When clicking complete sale, receipt printing fails intermittently on USB thermal printer.",
        "priority": "High"
    }
    res = client_cust1.post("/api/support/tickets", json=ticket_payload)
    assert res.status_code == 200, res.text
    ticket_data = res.json()
    assert ticket_data["subject"] == ticket_payload["subject"]
    assert ticket_data["category"] == "POS Billing"
    assert ticket_data["priority"] == "High"
    assert ticket_data["status"] == "Open"
    assert ticket_data["ticket_number"].startswith("TKT-")
    assert ticket_data["messages_count"] == 1
    assert len(ticket_data["messages"]) == 1
    assert ticket_data["messages"][0]["sender_role"] == "customer"
    ticket_id = ticket_data["id"]

    # 2. Customer 1 lists their tickets
    res = client_cust1.get("/api/support/tickets")
    assert res.status_code == 200
    my_tickets = res.json()
    assert len(my_tickets) >= 1
    assert my_tickets[0]["id"] == ticket_id

    # 3. Tenant Isolation Check: Customer 2 cannot view or access Customer 1's ticket
    res = client_cust2.get(f"/api/support/tickets/{ticket_id}")
    assert res.status_code == 404
    # Customer 2's list is empty
    res = client_cust2.get("/api/support/tickets")
    assert res.status_code == 200
    assert len(res.json()) == 0

    # 4. Security check: Customer 1 cannot access admin endpoints
    res = client_cust1.get("/api/admin/support/overview")
    assert res.status_code == 403

    # 5. Admin Support Overview KPI
    res = client_admin.get("/api/admin/support/overview")
    assert res.status_code == 200
    overview = res.json()
    assert overview["total_tickets"] >= 1
    assert overview["open_tickets"] >= 1
    assert overview["unanswered_tickets"] >= 1

    # 6. Admin lists tickets with search and filter
    res = client_admin.get(f"/api/admin/support/tickets?search=Printer")
    assert res.status_code == 200
    admin_tickets = res.json()
    assert admin_tickets["total"] >= 1
    assert admin_tickets["tickets"][0]["id"] == ticket_id
    assert admin_tickets["tickets"][0]["customer_name"] == "Ramesh Gupta"

    # 7. Admin opens ticket detail
    res = client_admin.get(f"/api/admin/support/tickets/{ticket_id}")
    assert res.status_code == 200
    detail = res.json()
    assert detail["has_admin_unread"] is False

    # 8. Admin sends reply to Customer
    admin_reply_payload = {
        "message": "Hello Ramesh, please ensure the USB driver is updated and set to default raw ESC/POS mode.",
        "status": "Waiting for Customer"
    }
    res = client_admin.post(f"/api/admin/support/tickets/{ticket_id}/messages", json=admin_reply_payload)
    assert res.status_code == 200
    msg_data = res.json()
    assert msg_data["sender_role"] == "admin"
    assert msg_data["message"] == admin_reply_payload["message"]

    # Check unread indicator for Customer 1
    res = client_cust1.get("/api/support/unread-count")
    assert res.status_code == 200
    assert res.json()["unread_count"] == 1

    # 9. Customer 1 opens ticket detail (unread clears)
    res = client_cust1.get(f"/api/support/tickets/{ticket_id}")
    assert res.status_code == 200
    cust_view = res.json()
    assert cust_view["status"] == "Waiting for Customer"
    assert len(cust_view["messages"]) == 2

    # Verify unread count cleared
    res = client_cust1.get("/api/support/unread-count")
    assert res.status_code == 200
    assert res.json()["unread_count"] == 0

    # 10. Customer 1 responds to admin
    cust_reply = {
        "message": "Thank you! Updating the ESC/POS driver resolved the issue completely."
    }
    res = client_cust1.post(f"/api/support/tickets/{ticket_id}/messages", json=cust_reply)
    assert res.status_code == 200
    # Status should automatically change from Waiting for Customer to In Progress
    res = client_cust1.get(f"/api/support/tickets/{ticket_id}")
    assert res.status_code == 200
    assert res.json()["status"] == "In Progress"

    # 11. Admin updates ticket status to Resolved
    res = client_admin.patch(f"/api/admin/support/tickets/{ticket_id}", json={"status": "Resolved"})
    assert res.status_code == 200
    assert res.json()["status"] == "Resolved"

    # 12. Feedback submission by Customer 2
    feedback_payload = {
        "category": "Feature Suggestion",
        "rating": 5,
        "subject": "Add WhatsApp Invoice Sharing",
        "comments": "It would be great if we could directly send the POS bill to the customer WhatsApp number."
    }
    res = client_cust2.post("/api/support/feedback", json=feedback_payload)
    assert res.status_code == 200
    fb_data = res.json()
    assert fb_data["rating"] == 5
    assert fb_data["status"] == "New"
    feedback_id = fb_data["id"]

    # Customer 2 views their feedback
    res = client_cust2.get("/api/support/feedback")
    assert res.status_code == 200
    assert len(res.json()) >= 1

    # 13. Admin views feedback list
    res = client_admin.get("/api/admin/support/feedback")
    assert res.status_code == 200
    all_fb = res.json()
    assert len(all_fb) >= 1
    assert any(f["id"] == feedback_id for f in all_fb)

    # 14. Admin updates feedback review status
    res = client_admin.patch(f"/api/admin/support/feedback/{feedback_id}", json={
        "status": "Planned",
        "admin_notes": "Added to Q4 product roadmap"
    })
    assert res.status_code == 200
    assert res.json()["status"] == "Planned"

    # 15. Admin converts feedback to support ticket
    res = client_admin.post(f"/api/admin/support/feedback/{feedback_id}/convert-to-ticket")
    assert res.status_code == 200
    converted_ticket = res.json()
    assert converted_ticket["category"] == "Feature Request"
    assert f"Feedback #{feedback_id}" in converted_ticket["subject"]
    assert converted_ticket["shop_id"] == cust2.id
