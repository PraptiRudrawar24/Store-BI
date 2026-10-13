with open("main.py", encoding="utf-8") as f:
    for i, line in enumerate(f):
        if any(k in line for k in ["weekly-trend", "category-sales", "def get_alerts", "@app.get(\"/alerts\""]):
            print(f"Line {i+1}: {line.strip()}")
