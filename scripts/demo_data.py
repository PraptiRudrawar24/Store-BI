"""
DEMO DATA SEED SCRIPT (MANUAL TESTING ONLY)
-------------------------------------------
IMPORTANT:
1. OFF BY DEFAULT.
2. NEVER CALLED AUTOMATICALLY BY THE APPLICATION OR API.
3. ADHERES TO STORE BI STANDING RULES (ZERO-START IN PRODUCTION).

Run manually via command line:
    python scripts/demo_data.py
"""

import sys
import os
from datetime import datetime, date, timedelta

# Add backend to path so models & database can be imported
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from database import SessionLocal, engine, Base
import models

def seed_demo_data():
    print("=" * 60)
    print("Store BI - Manual Demo Data Seeder")
    print("Warning: This populates testing data into storebi.db")
    print("=" * 60)

    # Ensure tables exist
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # Check if shop already exists
        existing_shop = db.query(models.Shop).first()
        if existing_shop:
            print(f"Data already exists in database ({existing_shop.name}).")
            proceed = input("Do you want to re-seed / add more test data? (y/N): ").strip().lower()
            if proceed != 'y':
                print("Aborting seed operation.")
                return

        # 1. Create Sample Shop
        shop = models.Shop(
            name="Shree Ganesh Kirana & General Stores",
            owner_name="Ramesh Patel",
            phone="9876543210",
            email="ramesh@ganeshkirana.in",
            category="Kirana & Grocery",
            city="Pune",
            state="Maharashtra",
            pincode="411038",
            gstin="27ABCDE1234F1Z5",
            language="hi",
        )
        db.add(shop)
        db.flush()
        print(f"Created sample shop: {shop.name}")

        # 2. Create Sample Products
        products_data = [
            {"name": "Aashirvaad Shudh Chakki Atta 10kg", "category": "Flour & Grains", "cost_price": 390.0, "selling_price": 440.0, "stock_qty": 18, "reorder_level": 5},
            {"name": "Fortune Sunlite Sunflower Oil 1L", "category": "Edible Oils", "cost_price": 115.0, "selling_price": 135.0, "stock_qty": 24, "reorder_level": 8},
            {"name": "Tata Salt Vacuum Evaporated 1kg", "category": "Salt & Sugar", "cost_price": 22.0, "selling_price": 28.0, "stock_qty": 45, "reorder_level": 15},
            {"name": "Madhur Pure & Hygienic Sugar 5kg", "category": "Salt & Sugar", "cost_price": 210.0, "selling_price": 240.0, "stock_qty": 12, "reorder_level": 5},
            {"name": "Parle-G Gold Biscuits 1kg", "category": "Biscuits & Snacks", "cost_price": 95.0, "selling_price": 120.0, "stock_qty": 30, "reorder_level": 10},
            {"name": "Maggi 2-Minute Masala Noodles 280g", "category": "Instant Food", "cost_price": 45.0, "selling_price": 56.0, "stock_qty": 40, "reorder_level": 10},
            {"name": "Amul Butter Pasteurised 500g", "category": "Dairy", "cost_price": 245.0, "selling_price": 275.0, "stock_qty": 8, "reorder_level": 10}, # Low stock
            {"name": "Dettol Original Soap 125g (Pack of 3)", "category": "Personal Care", "cost_price": 120.0, "selling_price": 145.0, "stock_qty": 15, "reorder_level": 5},
            {"name": "Surf Excel Easy Wash Detergent Powder 1kg", "category": "Cleaning & Household", "cost_price": 118.0, "selling_price": 140.0, "stock_qty": 20, "reorder_level": 6},
            {"name": "Wagh Bakri Premium CTC Tea 500g", "category": "Beverages", "cost_price": 240.0, "selling_price": 290.0, "stock_qty": 3, "reorder_level": 5}, # Low stock
        ]

        created_products = []
        for p in products_data:
            prod = models.Product(**p)
            db.add(prod)
            created_products.append(prod)
        db.flush()
        print(f"Created {len(created_products)} sample retail products.")

        # 3. Create Sample Sales
        today = datetime.now()
        sales_records = [
            {
                "offset_days": 2,
                "items": [(created_products[0], 1), (created_products[1], 2), (created_products[4], 1)],
                "payment_mode": "UPI",
            },
            {
                "offset_days": 1,
                "items": [(created_products[2], 2), (created_products[3], 1), (created_products[5], 2)],
                "payment_mode": "Cash",
            },
            {
                "offset_days": 0,
                "items": [(created_products[6], 1), (created_products[7], 1), (created_products[9], 1)],
                "payment_mode": "UPI",
            },
        ]

        for s_data in sales_records:
            sale_date = today - timedelta(days=s_data["offset_days"])
            tot_amt = 0.0
            tot_cost = 0.0
            sale_items = []
            for prod, qty in s_data["items"]:
                amt = prod.selling_price * qty
                cost = prod.cost_price * qty
                tot_amt += amt
                tot_cost += cost
                sale_items.append((prod.id, qty, prod.selling_price, prod.cost_price))

            sale = models.Sale(
                date_time=sale_date,
                total_amount=tot_amt,
                total_profit=tot_amt - tot_cost,
                payment_mode=s_data["payment_mode"],
            )
            db.add(sale)
            db.flush()

            for pid, qty, price, cost in sale_items:
                item = models.SaleItem(
                    sale_id=sale.id,
                    product_id=pid,
                    qty=qty,
                    unit_price=price,
                    unit_cost=cost,
                )
                db.add(item)

        print("Created 3 sample retail sales transactions.")

        # 4. Create Sample Expenses
        expenses_data = [
            {"date": date.today() - timedelta(days=3), "category": "Shop Rent", "amount": 6000.0, "note": "Monthly shop advance"},
            {"date": date.today() - timedelta(days=2), "category": "Electricity Bill", "amount": 1450.0, "note": "MSEDCL bill for cooler and lights"},
            {"date": date.today() - timedelta(days=1), "category": "Packaging Bags", "amount": 350.0, "note": "Biodegradable carry bags 500 pcs"},
        ]
        for exp in expenses_data:
            db.add(models.Expense(**exp))

        print(f"Created {len(expenses_data)} sample operational expenses.")

        db.commit()
        print("\nSUCCESS: Demo data populated successfully in storebi.db!")
        print("Note: Run anytime manually for testing with: python scripts/demo_data.py")
    except Exception as e:
        db.rollback()
        print(f"Error seeding data: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_demo_data()
