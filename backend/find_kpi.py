with open("main.py", encoding="utf-8") as f:
    for i, line in enumerate(f):
        if "api/dashboard/kpis" in line:
            print(f"Line {i+1}: {line.strip()}")
