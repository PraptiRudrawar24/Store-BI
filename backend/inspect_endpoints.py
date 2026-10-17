import re

with open("main.py", encoding="utf-8") as f:
    text = f.read()

endpoints = [
    "/products/", "/sales/", "/expenses/", "/upload/counts",
    "/api/dashboard/kpis", "/api/dashboard/today-vs-yesterday",
    "/api/dashboard/sales-trend", "/api/dashboard/category-sales",
    "/api/alerts", "/api/analytics/sales", "/api/analytics/products",
    "/api/analytics/inventory", "/api/analytics/profitability",
    "/api/ai/sales-forecast", "/api/ai/demand-forecast",
    "/api/ai/recommendations", "/api/confirm-extracted-invoice"
]

for ep in endpoints:
    pos = text.find(f'"{ep}"')
    if pos == -1:
        pos = text.find(f"'{ep}'")
    if pos != -1:
        func_snippet = text[pos:pos+2000]
        has_shop = ("current_shop" in func_snippet) or ("shop_id" in func_snippet)
        # Check first line of def
        def_match = re.search(r"def\s+([a-zA-Z0-9_]+)\s*\((.*?)\):", func_snippet, re.DOTALL)
        fn_name = def_match.group(1) if def_match else "unknown"
        params = def_match.group(2).replace("\n", " ") if def_match else ""
        print(f"{ep:30} -> {fn_name:25} | shop in body: {has_shop} | params: {params[:60]}")
    else:
        print(f"{ep:30} -> NOT FOUND")
