with open("main.py", encoding="utf-8") as f:
    for i, line in enumerate(f):
        if "sales/weekly-trend" in line or "dashboard/weekly-trend" in line or "weekly_trend" in line or "sales-trend" in line:
            print(f"Line {i+1}: {line.strip()}")
