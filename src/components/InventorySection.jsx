import React, { useState, useRef } from "react";
import {
  Download,
  FileSpreadsheet,
  FileText,
  Plus,
  Upload,
  Camera,
  X,
  Check,
  Search,
  Filter,
  Package,
  PencilLine,
  Sparkles,
  ChevronDown,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";

// ---- Mock inventory data (mirrors the dashboard's category language) ----
const today = new Date();
const iso = (d) => d.toISOString().slice(0, 10);
const daysFromNow = (n) => {
  const d = new Date(today);
  d.setDate(d.getDate() + n);
  return iso(d);
};

const CATEGORIES = [
  "Fresh Produce",
  "Dairy & Eggs",
  "Meat & Seafood",
  "Pantry Staples",
  "Beverages",
  "Bakery",
  "Frozen Foods",
  "Household & Personal Care",
  "Other",
];

// Stock can be counted in whatever unit actually fits the product —
// loose produce by kg, bottled goods by L, packaged items by piece, etc.
const UNITS = ["pcs", "kg", "g", "l", "ml", "dozen", "box", "pack"];

let idCounter = 0;
const makeId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `id-${Date.now()}-${idCounter++}`;

const initialInventory = [
  { id: makeId(), hsn: "0702000", gst: "27AAAPL1234C1ZV", name: "Organic Roma Tomatoes", category: "Fresh Produce", broughtFrom: "Greenfield Wholesalers, Pune", dateOfEntry: daysFromNow(-6), expiryDate: daysFromNow(4), stock: 184, unit: "kg", reorder: 60, price: 189, status: "In Stock" },
  { id: makeId(), hsn: "0401200", gst: "27AACCM5678D1ZQ", name: "Whole Milk 1L", category: "Dairy & Eggs", broughtFrom: "Amul Distributors, Pune", dateOfEntry: daysFromNow(-1), expiryDate: daysFromNow(5), stock: 42, unit: "l", reorder: 50, price: 68, status: "Low Stock" },
  { id: makeId(), hsn: "0304410", gst: "27AADFS4321E1ZR", name: "Atlantic Salmon Fillet", category: "Meat & Seafood", broughtFrom: "Coastal Fresh Foods, Mumbai", dateOfEntry: daysFromNow(-3), expiryDate: daysFromNow(1), stock: 0, unit: "kg", reorder: 20, price: 899, status: "Out of Stock" },
  { id: makeId(), hsn: "1006301", gst: "27AABCR8765F1ZS", name: "Basmati Rice 5kg", category: "Pantry Staples", broughtFrom: "Rajdhani Grains, Pune", dateOfEntry: daysFromNow(-20), expiryDate: daysFromNow(240), stock: 96, unit: "kg", reorder: 30, price: 649, status: "In Stock" },
  { id: makeId(), hsn: "0407210", gst: "27AAECP2345G1ZT", name: "Free-Range Eggs (12)", category: "Dairy & Eggs", broughtFrom: "Sunrise Poultry Farm, Pune", dateOfEntry: daysFromNow(-2), expiryDate: daysFromNow(9), stock: 27, unit: "dozen", reorder: 40, price: 95, status: "Low Stock" },
  { id: makeId(), hsn: "0804400", gst: "27AAFCQ3456H1ZU", name: "Hass Avocados", category: "Fresh Produce", broughtFrom: "Greenfield Wholesalers, Pune", dateOfEntry: daysFromNow(-4), expiryDate: daysFromNow(6), stock: 210, unit: "pcs", reorder: 80, price: 109, status: "In Stock" },
  { id: makeId(), hsn: "0201300", gst: "27AAGCT4567I1ZW", name: "Ground Beef 500g", category: "Meat & Seafood", broughtFrom: "Coastal Fresh Foods, Mumbai", dateOfEntry: daysFromNow(-1), expiryDate: daysFromNow(3), stock: 15, unit: "kg", reorder: 25, price: 449, status: "Low Stock" },
  { id: makeId(), hsn: "1509100", gst: "27AAHCU5678J1ZX", name: "Extra Virgin Olive Oil 1L", category: "Pantry Staples", broughtFrom: "Mediterra Imports, Mumbai", dateOfEntry: daysFromNow(-15), expiryDate: daysFromNow(300), stock: 58, unit: "l", reorder: 20, price: 799, status: "In Stock" },
];

const statusStyles = {
  "In Stock": "bg-emerald-50 text-emerald-600 ring-emerald-100",
  "Low Stock": "bg-amber-50 text-amber-600 ring-amber-100",
  "Out of Stock": "bg-rose-50 text-rose-600 ring-rose-100",
};

const CSV_HEADERS = ["GST No.", "HSN No.", "Product", "Category", "Brought From", "Date of Entry", "Expiry Date", "Stock", "Unit", "Reorder Level", "Price (Rs.)", "Status"];

function toCSV(rows) {
  const lines = [CSV_HEADERS.join(",")];
  rows.forEach((r) => {
    lines.push(
      [r.gst, r.hsn, `"${r.name}"`, r.category, `"${r.broughtFrom}"`, r.dateOfEntry, r.expiryDate, r.stock, r.unit, r.reorder, r.price.toFixed(2), r.status].join(",")
    );
  });
  return lines.join("\n");
}

function toXLSHTML(rows) {
  let html = `<table><thead><tr>${CSV_HEADERS.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>`;
  rows.forEach((r) => {
    html += `<tr><td>${r.gst}</td><td>${r.hsn}</td><td>${r.name}</td><td>${r.category}</td><td>${r.broughtFrom}</td><td>${r.dateOfEntry}</td><td>${r.expiryDate}</td><td>${r.stock}</td><td>${r.unit}</td><td>${r.reorder}</td><td>${r.price.toFixed(
      2
    )}</td><td>${r.status}</td></tr>`;
  });
  html += "</tbody></table>";
  return `<html xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="UTF-8"></head><body>${html}</body></html>`;
}

function downloadBlob(content, filename, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const emptyDraft = {
  gst: "",
  hsn: "",
  name: "",
  category: "Fresh Produce",
  broughtFrom: "",
  dateOfEntry: iso(today),
  expiryDate: "",
  stock: "",
  unit: "pcs",
  reorder: "",
  price: "",
};

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result.split(",")[1]);
    r.onerror = () => reject(new Error("Could not read file"));
    r.readAsDataURL(file);
  });
}

// ---- Real invoice reading, via the Claude API (vision) ----
// Sends the uploaded photo/PDF straight to the model and asks for the line
// items back as structured JSON. Anything the model can't confidently read
// is left blank so the person fills it in during confirmation — nothing is
// invented.
async function extractInvoiceData(file) {
  const base64Data = await fileToBase64(file);
  const mediaType = file.type || "image/jpeg";
  const isPdf = mediaType === "application/pdf";

  const fileBlock = isPdf
    ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64Data } }
    : { type: "image", source: { type: "base64", media_type: mediaType, data: base64Data } };

  const instructions = `This is a photo of a supplier invoice for a supermarket. Read every distinct product line item on it.

For each line item, return an object with exactly these keys:
- "name": the product name as printed on the invoice (string)
- "hsn": the HSN/SAC code for that line, if printed (string, "" if not visible)
- "gst": the supplier's GSTIN, if printed anywhere on the invoice — use the same value for every line item unless a line clearly shows a different one (string, "" if not visible)
- "category": your best guess, chosen EXACTLY from this list: ${JSON.stringify(CATEGORIES)}
- "broughtFrom": the supplier/shop name and city, e.g. "Greenfield Wholesalers, Pune" (string, "" if not visible)
- "dateOfEntry": the invoice date in YYYY-MM-DD format if printed, else "" 
- "expiryDate": only if an expiry date is printed for that item, in YYYY-MM-DD, else ""
- "stock": the quantity for that line item (number, or "" if not legible)
- "unit": the unit that quantity is measured in — choose the closest match from EXACTLY this list: ${JSON.stringify(UNITS)} (default to "pcs" if unclear)
- "price": the unit price in rupees, numbers only, no currency symbol or commas (number, or "" if not legible)

Rules:
- Only include products actually printed on the invoice. Never invent, guess, or add example products.
- If you cannot read a field confidently, return "" for it rather than guessing.
- Respond with ONLY a raw JSON array of these objects — no markdown code fences, no commentary, no extra text before or after.`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      messages: [
        {
          role: "user",
          content: [fileBlock, { type: "text", text: instructions }],
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error("Request to the reading service failed");
  }

  const data = await response.json();
  const text = (data.content || [])
    .map((block) => block.text || "")
    .join("")
    .trim();

  const cleaned = text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    throw new Error("Couldn't understand the response from the reading service");
  }

  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error("No line items were found on that invoice");
  }

  return parsed.map((item) => ({
    id: makeId(),
    hsn: item.hsn ?? "",
    gst: item.gst ?? "",
    name: item.name ?? "",
    category: CATEGORIES.includes(item.category) ? item.category : "Other",
    broughtFrom: item.broughtFrom ?? "",
    dateOfEntry: item.dateOfEntry || iso(today),
    expiryDate: item.expiryDate ?? "",
    stock: item.stock === "" || item.stock == null ? "" : String(item.stock),
    unit: UNITS.includes(item.unit) ? item.unit : "pcs",
    price: item.price === "" || item.price == null ? "" : String(item.price),
    reorder: "",
  }));
}

export default function InventorySection() {
  const [inventory, setInventory] = useState(initialInventory);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [showAddModal, setShowAddModal] = useState(false);
  const [mode, setMode] = useState("manual"); // manual | invoice
  const [draft, setDraft] = useState(emptyDraft);
  const [scanState, setScanState] = useState("idle"); // idle | scanning | reviewing | error
  const [scanError, setScanError] = useState("");
  const [scannedRows, setScannedRows] = useState([]);
  const [fileName, setFileName] = useState("");
  const fileInputRef = useRef(null);

  const filtered = inventory.filter((r) => {
    const matchesQuery =
      r.name.toLowerCase().includes(query.toLowerCase()) ||
      r.hsn.toLowerCase().includes(query.toLowerCase()) ||
      r.gst.toLowerCase().includes(query.toLowerCase());
    const matchesStatus = statusFilter === "All" || r.status === statusFilter;
    return matchesQuery && matchesStatus;
  });

  function resetModal() {
    setShowAddModal(false);
    setMode("manual");
    setDraft(emptyDraft);
    setScanState("idle");
    setScanError("");
    setScannedRows([]);
    setFileName("");
  }

  function handleManualSubmit(e) {
    e.preventDefault();
    if (!draft.name) return;
    const status =
      Number(draft.stock) <= 0 ? "Out of Stock" : Number(draft.stock) < Number(draft.reorder) ? "Low Stock" : "In Stock";
    setInventory((prev) => [
      {
        id: makeId(),
        gst: draft.gst,
        hsn: draft.hsn,
        name: draft.name,
        category: draft.category,
        broughtFrom: draft.broughtFrom,
        dateOfEntry: draft.dateOfEntry,
        expiryDate: draft.expiryDate,
        stock: Number(draft.stock) || 0,
        unit: draft.unit || "pcs",
        reorder: Number(draft.reorder) || 0,
        price: Number(draft.price) || 0,
        status,
      },
      ...prev,
    ]);
    resetModal();
  }

  function deleteEntry(id, name) {
    const ok = window.confirm(`Remove "${name}" from inventory? This can't be undone.`);
    if (!ok) return;
    setInventory((prev) => prev.filter((r) => r.id !== id));
  }

  async function runExtraction(file) {
    setFileName(file.name);
    setScanState("scanning");
    setScanError("");
    try {
      const rows = await extractInvoiceData(file);
      setScannedRows(rows);
      setScanState("reviewing");
    } catch (err) {
      setScanError(err.message || "Something went wrong while reading that invoice.");
      setScanState("error");
    }
  }

  function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    runExtraction(file);
  }

  function retrySameFile() {
    const file = fileInputRef.current?.files?.[0];
    if (file) runExtraction(file);
    else {
      setScanState("idle");
      setScanError("");
    }
  }

  function updateScannedRow(idx, field, value) {
    setScannedRows((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r)));
  }

  function removeScannedRow(idx) {
    setScannedRows((prev) => prev.filter((_, i) => i !== idx));
  }

  function confirmScannedRows() {
    const withStatus = scannedRows
      .filter((r) => r.name.trim())
      .map((r) => ({
        ...r,
        stock: Number(r.stock) || 0,
        reorder: Number(r.reorder) || 0,
        price: Number(r.price) || 0,
        status:
          Number(r.stock) <= 0 ? "Out of Stock" : Number(r.stock) < Number(r.reorder) ? "Low Stock" : "In Stock",
      }));
    setInventory((prev) => [...withStatus, ...prev]);
    resetModal();
  }

  return (
    <div className="min-h-screen bg-[#F6F8FB] font-sans text-[#1E293B] p-4 sm:p-8">
      <div className="max-w-6xl mx-auto space-y-5">
        {/* Section header card */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_1px_3px_rgba(15,23,42,0.06)] p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                <Package className="w-5 h-5 text-blue-600" strokeWidth={2} />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-slate-900">Sales Inventory</h1>
                <p className="text-sm text-slate-500 mt-0.5">Live stock levels across all branches</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <ExportMenu rows={filtered} />
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors text-white text-sm font-medium px-3.5 py-2 shadow-sm"
              >
                <Plus className="w-4 h-4" strokeWidth={2.5} />
                Add New Data
              </button>
            </div>
          </div>

          {/* filters row */}
          <div className="flex flex-col sm:flex-row gap-2.5 mt-5">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search GST no., HSN no. or product name..."
                className="w-full text-sm rounded-lg border border-slate-200 bg-slate-50/60 pl-9 pr-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 placeholder:text-slate-400"
              />
            </div>
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="appearance-none text-sm rounded-lg border border-slate-200 bg-slate-50/60 pl-9 pr-8 py-2.5 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 text-slate-600"
              >
                <option>All</option>
                <option>In Stock</option>
                <option>Low Stock</option>
                <option>Out of Stock</option>
              </select>
              <Filter className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Table card */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_1px_3px_rgba(15,23,42,0.06)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-400 border-b border-slate-100 whitespace-nowrap">
                  <th className="font-medium px-5 py-3">GST No.</th>
                  <th className="font-medium px-5 py-3">HSN No.</th>
                  <th className="font-medium px-5 py-3">Product</th>
                  <th className="font-medium px-5 py-3">Category</th>
                  <th className="font-medium px-5 py-3">Brought From</th>
                  <th className="font-medium px-5 py-3">Date of Entry</th>
                  <th className="font-medium px-5 py-3">Expiry Date</th>
                  <th className="font-medium px-5 py-3 text-right">Stock</th>
                  <th className="font-medium px-5 py-3 text-right">Price</th>
                  <th className="font-medium px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => (
                  <tr key={r.hsn + i} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60 transition-colors whitespace-nowrap">
                    <td className="px-5 py-3.5 text-slate-500 font-mono text-xs">{r.gst}</td>
                    <td className="px-5 py-3.5 text-slate-500 font-mono text-xs">{r.hsn}</td>
                    <td className="px-5 py-3.5 font-medium text-slate-800">{r.name}</td>
                    <td className="px-5 py-3.5 text-slate-500">{r.category}</td>
                    <td className="px-5 py-3.5 text-slate-500">{r.broughtFrom}</td>
                    <td className="px-5 py-3.5 text-slate-500">{r.dateOfEntry}</td>
                    <td className="px-5 py-3.5 text-slate-500">{r.expiryDate}</td>
                    <td className="px-5 py-3.5 text-right text-slate-700">{r.stock}</td>
                    <td className="px-5 py-3.5 text-right text-slate-700">Rs. {r.price.toFixed(2)}</td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full ring-1 ${statusStyles[r.status]}`}>
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={10} className="text-center text-slate-400 text-sm py-10">
                      No products match your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 text-xs text-slate-400">
            <span>{filtered.length} of {inventory.length} products</span>
            <span>Synced with Stitch just now</span>
          </div>
        </div>
      </div>

      {showAddModal && (
        <AddDataModal
          mode={mode}
          setMode={setMode}
          draft={draft}
          setDraft={setDraft}
          onManualSubmit={handleManualSubmit}
          onClose={resetModal}
          scanState={scanState}
          scanError={scanError}
          scannedRows={scannedRows}
          updateScannedRow={updateScannedRow}
          removeScannedRow={removeScannedRow}
          confirmScannedRows={confirmScannedRows}
          fileName={fileName}
          fileInputRef={fileInputRef}
          handleFileSelect={handleFileSelect}
          retrySameFile={retrySameFile}
        />
      )}
    </div>
  );
}

function ExportMenu({ rows }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors text-slate-700 text-sm font-medium px-3.5 py-2"
      >
        <Download className="w-4 h-4" strokeWidth={2} />
        Export
        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-44 bg-white rounded-xl border border-slate-100 shadow-lg z-20 py-1.5 overflow-hidden">
            <button
              onClick={() => {
                downloadBlob(toCSV(rows), "sales-inventory.csv", "text/csv");
                setOpen(false);
              }}
              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <FileText className="w-4 h-4 text-blue-500" />
              Download .csv
            </button>
            <button
              onClick={() => {
                downloadBlob(toXLSHTML(rows), "sales-inventory.xls", "application/vnd.ms-excel");
                setOpen(false);
              }}
              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
              Download .xls
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function AddDataModal({
  mode,
  setMode,
  draft,
  setDraft,
  onManualSubmit,
  onClose,
  scanState,
  scanError,
  scannedRows,
  updateScannedRow,
  removeScannedRow,
  confirmScannedRows,
  fileName,
  fileInputRef,
  handleFileSelect,
  retrySameFile,
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 bg-slate-900/40 backdrop-blur-[2px] overflow-y-auto">
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-xl my-4 sm:my-0 max-h-[90vh] overflow-y-auto"
        style={{ WebkitOverflowScrolling: "touch", overscrollBehavior: "contain" }}
      >{/* single scroll container for the whole modal — avoid nesting scrollable areas inside, or scroll gets trapped */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 sticky top-0 bg-white rounded-t-2xl z-10">
          <h2 className="text-base font-semibold text-slate-900">Add New Inventory Data</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-50">
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* tabs */}
        <div className="flex gap-1 mx-5 mt-4 p-1 bg-slate-50 rounded-lg">
          <button
            onClick={() => setMode("manual")}
            className={`flex-1 flex items-center justify-center gap-1.5 text-sm font-medium py-2 rounded-md transition-colors ${
              mode === "manual" ? "bg-white shadow-sm text-blue-600" : "text-slate-500"
            }`}
          >
            <PencilLine className="w-4 h-4" />
            Manual Entry
          </button>
          <button
            onClick={() => setMode("invoice")}
            className={`flex-1 flex items-center justify-center gap-1.5 text-sm font-medium py-2 rounded-md transition-colors ${
              mode === "invoice" ? "bg-white shadow-sm text-blue-600" : "text-slate-500"
            }`}
          >
            <Camera className="w-4 h-4" />
            Upload Invoice
          </button>
        </div>

        {mode === "manual" ? (
          <form onSubmit={onManualSubmit} className="p-5 space-y-3.5">
            <div className="grid grid-cols-2 gap-3">
              <Field label="GST No.">
                <input
                  value={draft.gst}
                  onChange={(e) => setDraft({ ...draft, gst: e.target.value })}
                  placeholder="27AAAPL1234C1ZV"
                  className="input font-mono"
                />
              </Field>
              <Field label="HSN No.">
                <input
                  value={draft.hsn}
                  onChange={(e) => setDraft({ ...draft, hsn: e.target.value })}
                  placeholder="e.g. 0702000"
                  className="input font-mono"
                />
              </Field>
            </div>
            <Field label="Product Name">
              <input
                required
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="e.g. Organic Roma Tomatoes"
                className="input"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Category">
                <select
                  value={draft.category}
                  onChange={(e) => setDraft({ ...draft, category: e.target.value })}
                  className="input"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </Field>
              <Field label="Brought From (Shop, City)">
                <input
                  value={draft.broughtFrom}
                  onChange={(e) => setDraft({ ...draft, broughtFrom: e.target.value })}
                  placeholder="e.g. Greenfield Wholesalers, Pune"
                  className="input"
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Date of Entry">
                <input
                  type="date"
                  value={draft.dateOfEntry}
                  onChange={(e) => setDraft({ ...draft, dateOfEntry: e.target.value })}
                  className="input"
                />
              </Field>
              <Field label="Expiry Date">
                <input
                  type="date"
                  value={draft.expiryDate}
                  onChange={(e) => setDraft({ ...draft, expiryDate: e.target.value })}
                  className="input"
                />
              </Field>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Stock Qty">
                <input
                  type="number"
                  min="0"
                  value={draft.stock}
                  onChange={(e) => setDraft({ ...draft, stock: e.target.value })}
                  placeholder="0"
                  className="input"
                />
              </Field>
              <Field label="Reorder Lvl">
                <input
                  type="number"
                  min="0"
                  value={draft.reorder}
                  onChange={(e) => setDraft({ ...draft, reorder: e.target.value })}
                  placeholder="0"
                  className="input"
                />
              </Field>
              <Field label="Price (Rs.)">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={draft.price}
                  onChange={(e) => setDraft({ ...draft, price: e.target.value })}
                  placeholder="0.00"
                  className="input"
                />
              </Field>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={onClose} className="text-sm font-medium text-slate-500 px-4 py-2 rounded-lg hover:bg-slate-50">
                Cancel
              </button>
              <button type="submit" className="text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg shadow-sm">
                Add Product
              </button>
            </div>
            <style>{`.input { width:100%; font-size:0.875rem; border:1px solid #E2E8F0; border-radius:0.5rem; padding:0.55rem 0.7rem; outline:none; background:#F8FAFC; color:#1E293B; } .input:focus { box-shadow:0 0 0 3px rgba(37,99,235,0.1); border-color:#93C5FD; }`}</style>
          </form>
        ) : (
          <div className="p-5">
            {scanState === "idle" && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-slate-200 rounded-xl py-10 flex flex-col items-center gap-2.5 hover:border-blue-300 hover:bg-blue-50/30 transition-colors"
              >
                <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center">
                  <Upload className="w-5 h-5 text-blue-600" />
                </div>
                <p className="text-sm font-medium text-slate-700">Upload a photo of your invoice</p>
                <p className="text-xs text-slate-400">PNG, JPG or PDF · you'll confirm every field before it's saved</p>
                <input ref={fileInputRef} type="file" accept="image/*,.pdf" onChange={handleFileSelect} className="hidden" />
              </button>
            )}

            {scanState === "scanning" && (
              <div className="flex flex-col items-center gap-3 py-12">
                <div className="w-10 h-10 rounded-full border-2 border-blue-100 border-t-blue-600 animate-spin" />
                <p className="text-sm font-medium text-slate-600">Reading {fileName}...</p>
                <p className="text-xs text-slate-400">Looking for GST, HSN, dates & line items</p>
              </div>
            )}

            {scanState === "error" && (
              <div className="flex flex-col items-center gap-3 py-10 text-center">
                <div className="w-11 h-11 rounded-xl bg-rose-50 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-rose-500" />
                </div>
                <p className="text-sm font-medium text-slate-700">Couldn't read {fileName}</p>
                <p className="text-xs text-slate-400 max-w-xs">{scanError}. Try a clearer, well-lit photo with the invoice flat and fully in frame.</p>
                <div className="flex gap-2 mt-1">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="text-sm font-medium text-slate-600 border border-slate-200 px-3.5 py-2 rounded-lg hover:bg-slate-50"
                  >
                    Choose another file
                  </button>
                  <button
                    onClick={retrySameFile}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 px-3.5 py-2 rounded-lg"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Try again
                  </button>
                </div>
                <input ref={fileInputRef} type="file" accept="image/*,.pdf" onChange={handleFileSelect} className="hidden" />
              </div>
            )}

            {scanState === "reviewing" && (
              <div className="space-y-3">
                <div className="flex items-start gap-2 text-xs font-medium text-blue-700 bg-blue-50 rounded-lg px-3 py-2.5">
                  <Sparkles className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span>
                    {scannedRows.length} item{scannedRows.length === 1 ? "" : "s"} read from {fileName}. Every field below,
                    including the product name, came straight off the scan — check each one, fix anything that's wrong, and
                    fill in whatever the scan missed. Nothing is added to inventory until you confirm.
                  </span>
                </div>

                <div className="space-y-3">
                  {scannedRows.map((row, idx) => (
                    <ScannedItemCard
                      key={idx}
                      row={row}
                      onChange={(field, value) => updateScannedRow(idx, field, value)}
                      onRemove={() => removeScannedRow(idx)}
                    />
                  ))}
                  {scannedRows.length === 0 && (
                    <p className="text-center text-sm text-slate-400 py-8">All items removed. Cancel or upload another invoice.</p>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button onClick={onClose} className="text-sm font-medium text-slate-500 px-4 py-2 rounded-lg hover:bg-slate-100">
                    Cancel
                  </button>
                  <button
                    onClick={confirmScannedRows}
                    disabled={scannedRows.length === 0}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2 rounded-lg shadow-sm"
                  >
                    <Check className="w-4 h-4" />
                    Confirm & Save to Inventory
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ScannedItemCard({ row, onChange, onRemove }) {
  const missing = [];
  if (!row.hsn) missing.push("HSN No.");
  if (!row.gst) missing.push("GST No.");
  if (!row.expiryDate) missing.push("Expiry Date");
  if (!row.price) missing.push("Price");
  if (!row.reorder) missing.push("Reorder Level");

  return (
    <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50/60">
      <div className="flex items-end gap-2 mb-2.5">
        <div className="flex-1">
          <MiniInput label="Product Name" value={row.name} onChange={(v) => onChange("name", v)} placeholder="Product name" />
        </div>
        <button onClick={onRemove} title="Remove this item" className="text-slate-300 hover:text-rose-500 shrink-0 p-1.5">
          <X className="w-4 h-4" />
        </button>
      </div>

      {missing.length > 0 && (
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-amber-600 bg-amber-50 rounded-md px-2 py-1 mb-2.5">
          <AlertTriangle className="w-3 h-3 shrink-0" />
          Couldn't read: {missing.join(", ")} — please fill in
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 mb-2">
        <MiniInput label="GST No." value={row.gst} onChange={(v) => onChange("gst", v)} placeholder="27AAAPL1234C1ZV" mono />
        <MiniInput label="HSN No." value={row.hsn} onChange={(v) => onChange("hsn", v)} placeholder="e.g. 0702000" mono />
      </div>
      <div className="grid grid-cols-2 gap-2 mb-2">
        <MiniSelect label="Category" value={row.category} onChange={(v) => onChange("category", v)} options={CATEGORIES} />
        <MiniInput label="Brought From" value={row.broughtFrom} onChange={(v) => onChange("broughtFrom", v)} placeholder="Shop, City" />
      </div>
      <div className="grid grid-cols-2 gap-2 mb-2">
        <MiniInput label="Date of Entry" value={row.dateOfEntry} onChange={(v) => onChange("dateOfEntry", v)} type="date" />
        <MiniInput label="Expiry Date" value={row.expiryDate} onChange={(v) => onChange("expiryDate", v)} type="date" />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <MiniInput label="Qty" value={row.stock} onChange={(v) => onChange("stock", v)} type="number" />
        <MiniInput label="Reorder" value={row.reorder} onChange={(v) => onChange("reorder", v)} type="number" />
        <MiniInput label="Price (Rs.)" value={row.price} onChange={(v) => onChange("price", v)} type="number" />
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-slate-500 mb-1 block">{label}</span>
      {children}
    </label>
  );
}

function MiniInput({ label, value, onChange, type = "text", placeholder = "", mono = false }) {
  return (
    <label className="block">
      <span className="text-[10px] text-slate-400 block mb-0.5">{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full text-xs rounded-md border px-2 py-1.5 outline-none focus:ring-2 focus:ring-blue-100 bg-white ${
          mono ? "font-mono" : ""
        } ${!value ? "border-amber-200" : "border-slate-200"}`}
      />
    </label>
  );
}

function MiniSelect({ label, value, onChange, options }) {
  return (
    <label className="block">
      <span className="text-[10px] text-slate-400 block mb-0.5">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full text-xs rounded-md border border-slate-200 bg-white px-2 py-1.5 outline-none focus:ring-2 focus:ring-blue-100"
      >
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    </label>
  );
}
