import sqlite3
import security

def update():
    admin_hash = security.hash_password('Admin@1234')
    prapti_hash = security.hash_password('Prapti@1234')

    conn = sqlite3.connect('storebi.db')
    c = conn.cursor()

    c.execute("UPDATE shops SET hashed_password = ?, is_email_verified = 1, onboarding_completed = 1, status = 'active' WHERE email = 'admin@storebi.com'", (admin_hash,))
    c.execute("UPDATE shops SET hashed_password = ?, is_email_verified = 1, onboarding_completed = 1, status = 'trial' WHERE email = 'prapti@storebi.com'", (prapti_hash,))

    conn.commit()
    rows = c.execute("SELECT id, name, email, is_admin, is_email_verified FROM shops WHERE email IN ('admin@storebi.com', 'prapti@storebi.com')").fetchall()
    print("Updated shops:", rows)
    conn.close()

if __name__ == '__main__':
    update()
