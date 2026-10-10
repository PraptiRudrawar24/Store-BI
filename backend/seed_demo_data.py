import random
from datetime import datetime, timedelta, date
import models
from database import engine, SessionLocal

def seed_demo():
    models.Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # Check if shop already exists
        shop = db.query(models.Shop).filter(models.Shop.phone == "9876543210").first()
        if not shop:
            shop = models.Shop(
                name="Prapti Kirana & Superstore",
                owner_name="Prapti Rudrawar",
                phone="9876543210",
                email="prapti@storebi.com",
                category="Kirana / Grocery",
                city="Pune",
                state="Maharashtra",
                pincode="411038",
                onboarding_completed=True,
                onboarding_step=4,
                trial_start_date=datetime.utcnow() - timedelta(days=2),
                trial_end_date=datetime.utcnow() + timedelta(days=12),
            )
            db.add(shop)
            db.commit()

        # Seed products if empty
        if db.query(models.Product).count() == 0:
            products_data = [
                {"name": "Aashirvaad Shudh Chakki Atta 10kg", "category": "Staples & Grains", "cost_price": 380.0, "selling_price": 440.0, "stock_qty": 18, "reorder_level": 15},
                {"name": "Amul Taaza Toned Milk 1L", "category": "Dairy & Breakfast", "cost_price": 54.0, "selling_price": 58.0, "stock_qty": 4, "reorder_level": 20},  # Critical!
                {"name": "Fortune Sunlite Sunflower Oil 1L", "category": "Oils & Ghee", "cost_price": 125.0, "selling_price": 145.0, "stock_qty": 7, "reorder_level": 12},  # Warning!
                {"name": "Tata Salt Vaccum Evaporated 1kg", "category": "Spices & Salt", "cost_price": 24.0, "selling_price": 28.0, "stock_qty": 45, "reorder_level": 15},
                {"name": "Maggi 2-Minute Noodles 420g", "category": "Snacks & Instant Food", "cost_price": 82.0, "selling_price": 96.0, "stock_qty": 2, "reorder_level": 10},  # Critical!
                {"name": "Parle-G Gold Biscuits 1kg", "category": "Snacks & Instant Food", "cost_price": 110.0, "selling_price": 130.0, "stock_qty": 25, "reorder_level": 10},
                {"name": "Red Label Natural Care Tea 500g", "category": "Beverages", "cost_price": 270.0, "selling_price": 320.0, "stock_qty": 14, "reorder_level": 8},
                {"name": "Madhur Pure & Hygienic Sugar 5kg", "category": "Staples & Grains", "cost_price": 210.0, "selling_price": 245.0, "stock_qty": 12, "reorder_level": 10},
                {"name": "Dettol Original Bathing Soap 125g", "category": "Personal Care", "cost_price": 48.0, "selling_price": 58.0, "stock_qty": 30, "reorder_level": 12},
                {"name": "Surf Excel Quick Wash Detergent 1kg", "category": "Household & Cleaning", "cost_price": 160.0, "selling_price": 190.0, "stock_qty": 8, "reorder_level": 10},  # Warning!
                {"name": "Organic Black Pepper 100g", "category": "Spices & Salt", "cost_price": 95.0, "selling_price": 135.0, "stock_qty": 15, "reorder_level": 5},  # Low history!
            ]
            for p_info in products_data:
                prod = models.Product(**p_info)
                db.add(prod)
            db.commit()

        # Seed 25 days of sales if empty
        if db.query(models.Sale).count() == 0:
            products = db.query(models.Product).all()
            today = datetime.utcnow().date()
            start_date = today - timedelta(days=24)

            for day_offset in range(25):
                curr_date = start_date + timedelta(days=day_offset)
                dow = curr_date.weekday()  # 5=Sat, 6=Sun
                # Weekend multiplier
                base_tx = random.randint(8, 14) if dow in (5, 6) else random.randint(4, 9)

                for tx_num in range(base_tx):
                    sale_dt = datetime(curr_date.year, curr_date.month, curr_date.day, random.randint(9, 21), random.randint(0, 59))
                    # Pick 1-4 random products
                    sample_prods = random.sample(products, k=random.randint(1, min(3, len(products))))
                    items = []
                    total_amt = 0.0
                    total_cogs = 0.0

                    for p in sample_prods:
                        # Skip low history product mostly
                        if p.name == "Organic Black Pepper 100g" and day_offset < 20:
                            continue

                        qty = random.randint(1, 3)
                        item_total = round(qty * p.selling_price, 2)
                        item_cost = round(qty * p.cost_price, 2)
                        total_amt += item_total
                        total_cogs += item_cost
                        items.append(
                            models.SaleItem(
                                product_id=p.id,
                                qty=qty,
                                unit_price=p.selling_price,
                                unit_cost=p.cost_price
                            )
                        )

                    if items:
                        sale = models.Sale(
                            date_time=sale_dt,
                            total_amount=round(total_amt, 2),
                            total_profit=round(total_amt - total_cogs, 2),
                            payment_mode=random.choice(["UPI", "Cash", "UPI", "Card"]),
                            items=items
                        )
                        db.add(sale)

            db.commit()
            print("Successfully seeded 25 days of sales and inventory!")
        else:
            print("Sales already exist in database.")

    finally:
        db.close()

if __name__ == "__main__":
    seed_demo()
