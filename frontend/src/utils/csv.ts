/**
 * CSV Utility for Store BI
 * Handles template downloads, robust CSV parsing, and validation.
 */

export interface ProductCsvRow {
  rowIndex: number;
  name: string;
  category: string;
  cost_price: number;
  selling_price: number;
  stock_qty: number;
  reorder_level: number;
  expiry_date?: string;
  errors: string[];
  isValid: boolean;
}

export interface SaleCsvRow {
  rowIndex: number;
  product_name: string;
  qty: number;
  unit_price: number;
  payment_mode: string;
  date_time: string;
  matchedProductId?: number;
  unit_cost?: number;
  line_total?: number;
  line_profit?: number;
  errors: string[];
  isValid: boolean;
}

/**
 * Downloads a string content as a CSV file in the browser.
 */
export function downloadCsvFile(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Robust CSV parser that handles quotes, commas, and line endings.
 */
export function parseCsv(text: string): string[][] {
  const lines: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let insideQuotes = false;

  const cleanText = text.replace(/^\uFEFF/, ''); // Strip BOM if present

  for (let i = 0; i < cleanText.length; i++) {
    const char = cleanText[i];
    const nextChar = cleanText[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentField += '"';
        i++; // Skip escaped quote
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      currentRow.push(currentField.trim());
      currentField = '';
    } else if ((char === '\r' || char === '\n') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++; // Skip LF in CRLF
      }
      currentRow.push(currentField.trim());
      currentField = '';
      if (currentRow.some((field) => field.length > 0)) {
        lines.push(currentRow);
      }
      currentRow = [];
    } else {
      currentField += char;
    }
  }

  // Push last field and row if any
  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some((field) => field.length > 0)) {
      lines.push(currentRow);
    }
  }

  return lines;
}

// ==========================================
// Product CSV Templates and Validation
// ==========================================

export const PRODUCT_CSV_TEMPLATE = `name,category,cost_price,selling_price,stock_qty,reorder_level,expiry_date
Tata Salt 1kg,Grocery,22,28,50,10,2027-12-31
Amul Taaza Milk 500ml,Dairy & Bakery,26,28,25,5,2026-10-15
Fortune Sunlite Oil 1L,Grocery,130,155,30,8,2027-04-30
Parle-G Gold 1kg,Snacks & Beverages,110,130,40,10,2027-06-30
Dettol Soap 75g,Personal Care,35,42,60,15,2028-01-31`;

export function validateProductCsv(rawText: string): {
  rows: ProductCsvRow[];
  totalValid: number;
  totalErrors: number;
} {
  const parsed = parseCsv(rawText);
  if (parsed.length <= 1) {
    return { rows: [], totalValid: 0, totalErrors: 0 };
  }

  const header = parsed[0].map((h) => h.toLowerCase().replace(/[\s_]+/g, ''));
  const nameIdx = header.findIndex((h) => h.includes('name') || h.includes('product'));
  const catIdx = header.findIndex((h) => h.includes('cat'));
  const costIdx = header.findIndex((h) => h.includes('cost') || h.includes('buy') || h.includes('cp'));
  const priceIdx = header.findIndex((h) => h.includes('sell') || h.includes('price') || h.includes('sp') || h.includes('mrp'));
  const stockIdx = header.findIndex((h) => h.includes('stock') || h.includes('qty') || h.includes('quantity'));
  const reorderIdx = header.findIndex((h) => h.includes('reorder') || h.includes('alert') || h.includes('min'));
  const expiryIdx = header.findIndex((h) => h.includes('exp') || h.includes('date'));

  const rows: ProductCsvRow[] = [];

  for (let r = 1; r < parsed.length; r++) {
    const rawRow = parsed[r];
    const errors: string[] = [];

    const name = nameIdx !== -1 && rawRow[nameIdx] ? rawRow[nameIdx].trim() : '';
    const category = catIdx !== -1 && rawRow[catIdx] ? rawRow[catIdx].trim() : 'Grocery';
    const rawCost = costIdx !== -1 && rawRow[costIdx] ? rawRow[costIdx].replace(/[₹,\s]/g, '') : '0';
    const rawPrice = priceIdx !== -1 && rawRow[priceIdx] ? rawRow[priceIdx].replace(/[₹,\s]/g, '') : '';
    const rawStock = stockIdx !== -1 && rawRow[stockIdx] ? rawRow[stockIdx].trim() : '0';
    const rawReorder = reorderIdx !== -1 && rawRow[reorderIdx] ? rawRow[reorderIdx].trim() : '10';
    const expiry = expiryIdx !== -1 && rawRow[expiryIdx] ? rawRow[expiryIdx].trim() : '';

    if (!name) {
      errors.push('Product name is required');
    }

    const costPrice = parseFloat(rawCost);
    if (isNaN(costPrice) || costPrice < 0) {
      errors.push('Cost price must be a valid number >= ₹0');
    }

    const sellingPrice = parseFloat(rawPrice);
    if (isNaN(sellingPrice) || sellingPrice <= 0) {
      errors.push('Selling price must be a valid number > ₹0');
    }

    const stockQty = parseInt(rawStock, 10);
    if (isNaN(stockQty) || stockQty < 0) {
      errors.push('Stock quantity must be a non-negative integer');
    }

    const reorderLevel = parseInt(rawReorder, 10);
    if (isNaN(reorderLevel) || reorderLevel < 0) {
      errors.push('Reorder level must be a non-negative integer');
    }

    let cleanExpiry: string | undefined = undefined;
    if (expiry) {
      // Basic check for YYYY-MM-DD
      if (/^\d{4}-\d{2}-\d{2}$/.test(expiry)) {
        cleanExpiry = expiry;
      } else {
        errors.push('Expiry date must follow YYYY-MM-DD format (or leave blank)');
      }
    }

    rows.push({
      rowIndex: r,
      name,
      category: category || 'Grocery',
      cost_price: isNaN(costPrice) ? 0 : costPrice,
      selling_price: isNaN(sellingPrice) ? 0 : sellingPrice,
      stock_qty: isNaN(stockQty) ? 0 : stockQty,
      reorder_level: isNaN(reorderLevel) ? 10 : reorderLevel,
      expiry_date: cleanExpiry,
      errors,
      isValid: errors.length === 0,
    });
  }

  const totalValid = rows.filter((r) => r.isValid).length;
  const totalErrors = rows.filter((r) => !r.isValid).length;

  return { rows, totalValid, totalErrors };
}

// ==========================================
// Sale CSV Templates and Validation
// ==========================================

export const SALE_CSV_TEMPLATE = `product_name,qty,unit_price,payment_mode,date_time
Tata Salt 1kg,2,28,Cash,2026-10-08T10:30
Amul Taaza Milk 500ml,3,28,UPI,2026-10-08T11:15
Fortune Sunlite Oil 1L,1,155,Card,2026-10-08T12:00
Parle-G Gold 1kg,2,130,Credit,2026-10-08T14:45`;

export interface ProductInventoryLookup {
  id: number;
  name: string;
  stock_qty: number;
  selling_price: number;
  cost_price: number;
}

export function validateSaleCsv(
  rawText: string,
  existingProducts: ProductInventoryLookup[]
): {
  rows: SaleCsvRow[];
  totalValid: number;
  totalErrors: number;
} {
  const parsed = parseCsv(rawText);
  if (parsed.length <= 1) {
    return { rows: [], totalValid: 0, totalErrors: 0 };
  }

  const header = parsed[0].map((h) => h.toLowerCase().replace(/[\s_]+/g, ''));
  const nameIdx = header.findIndex((h) => h.includes('name') || h.includes('product') || h.includes('item'));
  const qtyIdx = header.findIndex((h) => h.includes('qty') || h.includes('quantity') || h.includes('count'));
  const priceIdx = header.findIndex((h) => h.includes('price') || h.includes('rate') || h.includes('amount'));
  const modeIdx = header.findIndex((h) => h.includes('mode') || h.includes('payment') || h.includes('pay'));
  const dateIdx = header.findIndex((h) => h.includes('date') || h.includes('time'));

  // Build product lookup map (case-insensitive)
  const productMap = new Map<string, ProductInventoryLookup>();
  existingProducts.forEach((p) => {
    productMap.set(p.name.trim().toLowerCase(), p);
  });

  // Track cumulative stock demanded by valid rows in this CSV
  const cumulativeUsedStock = new Map<number, number>();

  const rows: SaleCsvRow[] = [];

  for (let r = 1; r < parsed.length; r++) {
    const rawRow = parsed[r];
    const errors: string[] = [];

    const rawName = nameIdx !== -1 && rawRow[nameIdx] ? rawRow[nameIdx].trim() : '';
    const rawQty = qtyIdx !== -1 && rawRow[qtyIdx] ? rawRow[qtyIdx].trim() : '1';
    const rawPrice = priceIdx !== -1 && rawRow[priceIdx] ? rawRow[priceIdx].replace(/[₹,\s]/g, '') : '';
    const rawMode = modeIdx !== -1 && rawRow[modeIdx] ? rawRow[modeIdx].trim() : 'Cash';
    const rawDate = dateIdx !== -1 && rawRow[dateIdx] ? rawRow[dateIdx].trim() : '';

    if (!rawName) {
      errors.push('Product name is required');
    }

    const matchedProduct = rawName ? productMap.get(rawName.toLowerCase()) : undefined;
    if (rawName && !matchedProduct) {
      errors.push(`Product "${rawName}" not found in inventory. Please add it first.`);
    }

    const qty = parseInt(rawQty, 10);
    if (isNaN(qty) || qty <= 0) {
      errors.push('Quantity must be an integer >= 1');
    }

    let unitPrice = parseFloat(rawPrice);
    if (isNaN(unitPrice) || unitPrice <= 0) {
      if (matchedProduct) {
        unitPrice = matchedProduct.selling_price;
      } else {
        errors.push('Unit price must be a valid number > ₹0');
      }
    }

    // Check stock availability
    if (matchedProduct && qty > 0) {
      const alreadyUsed = cumulativeUsedStock.get(matchedProduct.id) || 0;
      const totalNeeded = alreadyUsed + qty;
      if (totalNeeded > matchedProduct.stock_qty) {
        errors.push(
          `Insufficient stock for "${matchedProduct.name}". Available: ${matchedProduct.stock_qty}, requested: ${qty}${
            alreadyUsed > 0 ? ` (+${alreadyUsed} in earlier rows)` : ''
          }`
        );
      } else {
        cumulativeUsedStock.set(matchedProduct.id, totalNeeded);
      }
    }

    // Normalize payment mode: Cash, UPI, Card, Credit
    let paymentMode = 'Cash';
    const lowerMode = rawMode.toLowerCase();
    if (lowerMode.includes('upi') || lowerMode.includes('gpay') || lowerMode.includes('phonepe') || lowerMode.includes('paytm')) {
      paymentMode = 'UPI';
    } else if (lowerMode.includes('card') || lowerMode.includes('debit') || lowerMode.includes('credit card')) {
      paymentMode = 'Card';
    } else if (lowerMode.includes('credit') || lowerMode.includes('udhar') || lowerMode.includes('khata')) {
      paymentMode = 'Credit';
    } else {
      paymentMode = 'Cash';
    }

    const dateTime = rawDate && !isNaN(Date.parse(rawDate))
      ? new Date(rawDate).toISOString()
      : new Date().toISOString();

    const unitCost = matchedProduct ? matchedProduct.cost_price : 0;
    const lineTotal = (qty || 0) * (unitPrice || 0);
    const lineProfit = (qty || 0) * ((unitPrice || 0) - unitCost);

    rows.push({
      rowIndex: r,
      product_name: matchedProduct ? matchedProduct.name : rawName,
      qty: isNaN(qty) ? 1 : qty,
      unit_price: isNaN(unitPrice) ? 0 : unitPrice,
      payment_mode: paymentMode,
      date_time: dateTime,
      matchedProductId: matchedProduct?.id,
      unit_cost: unitCost,
      line_total: lineTotal,
      line_profit: lineProfit,
      errors,
      isValid: errors.length === 0,
    });
  }

  const totalValid = rows.filter((r) => r.isValid).length;
  const totalErrors = rows.filter((r) => !r.isValid).length;

  return { rows, totalValid, totalErrors };
}
