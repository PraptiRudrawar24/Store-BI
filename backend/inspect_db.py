import sqlite3
import os

db_path = os.path.join(os.path.dirname(__file__), 'storebi.db')
if not os.path.exists(db_path):
    db_path = 'storebi.db'

conn = sqlite3.connect(db_path)
tables = [r[0] for r in conn.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()]
print("Tables in", db_path, ":", tables)
for t in tables:
    cols = [c[1] for c in conn.execute(f"PRAGMA table_info({t})").fetchall()]
    count = conn.execute(f"SELECT count(*) FROM {t}").fetchone()[0]
    print(f"  {t} ({count} rows): {cols}")
conn.close()
