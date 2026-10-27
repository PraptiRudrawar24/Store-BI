import * as React from 'react';
import {
  Camera,
  Upload,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Plus,
  RefreshCw,
  ArrowRight,
  Eye,
  X,
  FileText,
  PackageCheck,
  RotateCw,
  RotateCcw,
  Key,
  Settings,
  HelpCircle,
  Cpu,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card, CardHeader, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../ui/Table';
import { useToast } from '../ui/Toast';
import {
  api,
  type Product,
  type ExtractedInvoiceItem,
  type ExtractedInvoiceResponse,
  type ConfirmInvoiceItemPayload,
} from '../../api/client';

interface ImageToDataProps {
  onDataSaved: (type: 'product' | 'sale' | 'expense') => Promise<void>;
  onNavigateToEntered: (subView?: 'products' | 'sales' | 'expenses') => void;
}

interface EditableExtractedItem extends ExtractedInvoiceItem {
  id: string; // internal client id for keys
  selling_price: number;
  category: string;
  action: 'update' | 'create';
  matched_product_id: number | null;
  matched_product_name: string | null;
  match_confidence: number;
  tax_input_str?: string;
}

function parseTaxInput(raw: string): { rate: number | null; str: string; needsReview: boolean } {
  const clean = (raw || '').trim().toLowerCase();
  if (!clean || clean === 'needs review' || clean === 'unknown' || clean === '-' || clean === 'n/a' || clean === '—') {
    return { rate: null, str: 'Needs Review', needsReview: true };
  }
  if (clean === '0' || clean === '0%' || clean === '0.0%' || clean === 'exempt' || clean === 'nil' || clean === 'zero') {
    return { rate: 0, str: '0%', needsReview: false };
  }
  const match = clean.match(/(\d+(?:\.\d+)?)\s*%?/);
  if (match) {
    const val = parseFloat(match[1]);
    if (!isNaN(val) && val >= 0 && val <= 50) {
      return { rate: val, str: `${val}%`, needsReview: false };
    }
  }
  return { rate: null, str: raw, needsReview: true };
}

const PRODUCT_CATEGORIES = [
  'Grocery',
  'Dairy & Bakery',
  'Snacks & Beverages',
  'Personal Care',
  'Household',
  'Spices & Staples',
  'Confectionery',
  'Pharmacy',
  'Stationery',
  'Other',
];

/**
 * Enhanced fuzzy matching helper to match extracted invoice item names with existing store products.
 * Strips weight suffixes and common units to find the core product brand.
 */
function fuzzyMatchProduct(
  extractedName: string,
  products: Product[]
): { product: Product; score: number } | null {
  if (!extractedName || products.length === 0) return null;

  // Clean and remove common measurement tokens (kg, g, l, ml, pcs)
  const normalize = (str: string) =>
    str
      .toLowerCase()
      .replace(/\b\d+\s*(?:kg|g|gm|gms|l|ltr|ltrs|ml|pcs|pkt|pkts|box)\b/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  const cleanExtracted = normalize(extractedName);
  const extractedTokens = cleanExtracted.split(/\s+/).filter((t) => t.length > 1);

  let bestMatch: Product | null = null;
  let highestScore = 0;

  for (const prod of products) {
    const cleanProd = normalize(prod.name);
    if (cleanExtracted === cleanProd && cleanExtracted.length > 2) {
      return { product: prod, score: 1.0 };
    }

    const prodTokens = cleanProd.split(/\s+/).filter((t) => t.length > 1);
    if (extractedTokens.length === 0 || prodTokens.length === 0) continue;

    const matchingTokens = extractedTokens.filter((t) => prodTokens.includes(t));
    const tokenScore = matchingTokens.length / Math.max(extractedTokens.length, prodTokens.length);

    let substringScore = 0;
    if (cleanProd.includes(cleanExtracted) || cleanExtracted.includes(cleanProd)) {
      substringScore = 0.85;
    }

    const score = Math.max(tokenScore, substringScore);
    if (score > highestScore && score >= 0.45) {
      highestScore = score;
      bestMatch = prod;
    }
  }

  return bestMatch ? { product: bestMatch, score: highestScore } : null;
}

export function ImageToData({ onDataSaved, onNavigateToEntered }: ImageToDataProps) {
  const toast = useToast();

  // Existing products for matching
  const [existingProducts, setExistingProducts] = React.useState<Product[]>([]);

  // Engine status
  const [ocrStatus, setOcrStatus] = React.useState<{
    gemini_configured: boolean;
    active_engine: string;
    windows_native_available: boolean;
  }>({
    gemini_configured: false,
    active_engine: 'Checking...',
    windows_native_available: false,
  });

  // API Key modal state
  const [showApiKeyModal, setShowApiKeyModal] = React.useState(false);
  const [apiKeyInput, setApiKeyInput] = React.useState('');
  const [isSavingKey, setIsSavingKey] = React.useState(false);

  // Image capture & preview state
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [showImageModal, setShowImageModal] = React.useState(false);
  const [isRotating, setIsRotating] = React.useState(false);

  const isPdf = Boolean(
    selectedFile?.type === 'application/pdf' ||
    selectedFile?.name?.toLowerCase().endsWith('.pdf')
  );

  // Extraction state
  const [isExtracting, setIsExtracting] = React.useState(false);
  const [extractError, setExtractError] = React.useState<string | null>(null);

  // Extraction results state
  const [supplierName, setSupplierName] = React.useState('');
  const [invoiceNumber, setInvoiceNumber] = React.useState('');
  const [invoiceDate, setInvoiceDate] = React.useState('');
  const [currency, setCurrency] = React.useState('INR');
  const [subtotal, setSubtotal] = React.useState<number | null>(null);
  const [tax, setTax] = React.useState<number | null>(null);
  const [total, setTotal] = React.useState<number | null>(null);
  const [isMockResult, setIsMockResult] = React.useState(false);
  const [mockMessage, setMockMessage] = React.useState<string | null>(null);
  const [ocrEngineUsed, setOcrEngineUsed] = React.useState<string | null>(null);
  const [items, setItems] = React.useState<EditableExtractedItem[]>([]);

  // Confirmation state
  const [isConfirming, setIsConfirming] = React.useState(false);

  // Load existing products and OCR status on mount
  React.useEffect(() => {
    api.getProducts().then(setExistingProducts).catch(() => {});
    api.getOcrStatus().then(setOcrStatus).catch(() => {});

    const localKey = localStorage.getItem('gemini_api_key') || localStorage.getItem('anthropic_api_key');
    if (localKey) {
      setApiKeyInput(localKey);
    }
  }, []);

  // Handle file selection from camera or upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setExtractError(null);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    // Reset previous extracted items
    setItems([]);
  };

  // Rotate image clockwise or counter-clockwise (useful for phone camera orientation)
  const handleRotateImage = (direction: 'cw' | 'ccw') => {
    if (!previewUrl || !selectedFile || isRotating) return;

    setIsRotating(true);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = previewUrl;

    img.onload = () => {
      const canvas = document.createElement('canvas');
      // For 90 degree rotation, swap width and height
      canvas.width = img.height;
      canvas.height = img.width;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        setIsRotating(false);
        return;
      }

      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((direction === 'cw' ? 90 : -90) * (Math.PI / 180));
      ctx.drawImage(img, -img.width / 2, -img.height / 2);

      canvas.toBlob((blob) => {
        setIsRotating(false);
        if (!blob) return;

        const rotatedFile = new File([blob], selectedFile.name, {
          type: 'image/jpeg',
          lastModified: Date.now(),
        });

        setSelectedFile(rotatedFile);
        const newUrl = URL.createObjectURL(rotatedFile);
        setPreviewUrl(newUrl);
        toast.info(direction === 'cw' ? 'Rotated 90° clockwise' : 'Rotated 90° counter-clockwise');
      }, 'image/jpeg', 0.95);
    };

    img.onerror = () => {
      setIsRotating(false);
      toast.error('Failed to rotate image');
    };
  };


  // Save Gemini / Claude Key handler
  const handleSaveApiKey = async () => {
    const key = apiKeyInput.trim();
    if (!key) {
      toast.error('Please enter a valid API key');
      return;
    }

    setIsSavingKey(true);
    try {
      if (key.startsWith('sk-ant-')) {
        localStorage.setItem('anthropic_api_key', key);
      } else {
        localStorage.setItem('gemini_api_key', key);
      }
      await api.saveGeminiKey(key);
      const status = await api.getOcrStatus();
      setOcrStatus(status);
      setShowApiKeyModal(false);
      toast.success('API key saved! AI Vision extraction is now enabled.');
    } catch (err: any) {
      // Even if server save failed, localStorage is set
      if (key.startsWith('sk-ant-')) {
        localStorage.setItem('anthropic_api_key', key);
      } else {
        localStorage.setItem('gemini_api_key', key);
      }
      setShowApiKeyModal(false);
      toast.info('API key saved in browser for your scans.');
    } finally {
      setIsSavingKey(false);
    }
  };

  // Run AI extraction
  const handleExtractInvoice = async () => {
    if (!selectedFile) {
      toast.error('Please select or capture a photo first');
      return;
    }

    setIsExtracting(true);
    setExtractError(null);

    try {
      const storedKey =
        localStorage.getItem('gemini_api_key') ||
        localStorage.getItem('anthropic_api_key') ||
        undefined;
      const response: ExtractedInvoiceResponse = await api.extractInvoice(selectedFile, storedKey);

      setSupplierName(response.vendor || response.supplier || 'Wholesale Supplier');
      setInvoiceNumber(response.invoice_number || '');
      setInvoiceDate(response.date || response.invoice_date || new Date().toISOString().split('T')[0]);
      setCurrency(response.currency || 'INR');
      setSubtotal(response.subtotal ?? null);
      setTax(response.tax ?? null);
      setTotal(response.invoice_grand_total ?? response.total_amount_for_invoice ?? response.total ?? null);
      setIsMockResult(response.is_mock);
      setMockMessage(response.message || null);
      setOcrEngineUsed(response.ocr_engine || (response.is_mock ? 'Sample Demo Mock' : 'AI Vision'));

      // Map items with fuzzy matching to existing inventory
      const mappedItems: EditableExtractedItem[] = response.items.map((item, idx) => {
        const itemName = (item.name || item.description || '').trim();
        const rawQty = item.qty ?? item.quantity;
        const itemQty = rawQty && rawQty > 0 ? rawQty : 1;
        const match = fuzzyMatchProduct(itemName, existingProducts);
        const costPrice = item.cost_price ?? item.unit_price ?? null;

        const taxRate = item.tax_rate !== undefined ? item.tax_rate : null;
        const taxPercentStr = item.tax_percent || (taxRate !== null ? `${taxRate}%` : 'Needs Review');
        const baseAmt = item.base_amount ?? (costPrice && itemQty ? Math.round(costPrice * itemQty * 100) / 100 : null);
        const taxAmt = item.tax_amount ?? (baseAmt && taxRate !== null ? Math.round(baseAmt * (taxRate / 100) * 100) / 100 : null);
        // Preserves original extracted line amount directly from invoice; do not formula-calculate
        const lineTotal = item.line_total !== null && item.line_total !== undefined ? item.line_total : (item.amount ?? null);

        // User requirement: sell price should be filled by user only (no auto-calculated markup or MRP)
        const defaultSelling = 0;

        return {
          ...item,
          name: itemName,
          qty: itemQty,
          id: `item-${Date.now()}-${idx}`,
          cost_price: costPrice,
          tax_rate: taxRate,
          tax_percent: taxPercentStr,
          tax_input_str: taxPercentStr,
          tax_amount: taxAmt,
          base_amount: baseAmt,
          mrp: lineTotal,
          line_total: lineTotal,
          selling_price: defaultSelling,
          category: match ? match.product.category : 'Grocery',
          action: match ? 'update' : 'create',
          matched_product_id: match ? match.product.id : null,
          matched_product_name: match ? match.product.name : null,
          match_confidence: match ? match.score : 0,
          needs_review: item.needs_review || taxRate === null || lineTotal === null,
        };
      });

      setItems(mappedItems);

      if (response.is_mock) {
        toast.info('Loaded demo extraction results. Review and confirm below.');
      } else {
        toast.success(`Successfully extracted ${mappedItems.length} items from image`);
      }
    } catch (err: any) {
      const msg = err.message || 'Failed to extract items from invoice';
      setExtractError(msg);
      toast.error(msg);
    } finally {
      setIsExtracting(false);
    }
  };

  // Add a blank row manually
  const handleAddBlankRow = () => {
    const newItem: EditableExtractedItem = {
      id: `item-manual-${Date.now()}`,
      name: '',
      qty: 1,
      cost_price: 0,
      tax_rate: 0,
      tax_percent: '0%',
      tax_input_str: '0%',
      tax_amount: 0,
      base_amount: 0,
      mrp: 0,
      line_total: 0,
      selling_price: 0,
      category: 'Grocery',
      expiry_date: null,
      confidence: 1.0,
      field_confidence: { name: 1.0, qty: 1.0, cost_price: 1.0, tax: 1.0, total_mrp: 1.0 },
      needs_review: false,
      action: 'create',
      matched_product_id: null,
      matched_product_name: null,
      match_confidence: 0,
    };
    setItems((prev) => [...prev, newItem]);
  };

  // Remove a row
  const handleRemoveRow = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  // Update a field in a row:
  // User specification:
  // - Extract TOTAL MRP exactly from the corresponding product row in the invoice.
  // - Do not calculate, estimate, or replace it with a formula-derived value.
  // - If QTY, UNIT COST, or TAX is manually edited, do NOT automatically recalculate TOTAL MRP.
  // - If user edits TOTAL MRP directly, preserve user's edited amount.
  const handleUpdateItemField = (id: string, field: keyof EditableExtractedItem, value: any) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;

        const updated = { ...item, [field]: value };

        // Handle user editing TAX field (e.g. "18%", "5%", "0%", or "Needs Review")
        if (field === 'tax_input_str') {
          const parsed = parseTaxInput(String(value || ''));
          updated.tax_rate = parsed.rate;
          updated.tax_percent = parsed.str;
          updated.tax_input_str = value;
        }

        // When TOTAL MRP (line_total) is directly edited by user, preserve user's entered value
        if (field === 'line_total') {
          updated.mrp = value;
          updated.line_total = value;
        }

        // Recalculate field confidences
        const fieldConf: Record<string, number> = {
          name: updated.name.trim().length >= 3 ? 0.95 : 0.40,
          qty: updated.qty > 0 ? 0.95 : 0.40,
          cost_price: updated.cost_price && updated.cost_price > 0 ? 0.95 : 0.40,
          tax: updated.tax_rate !== null ? 0.95 : 0.40,
          total_mrp: updated.line_total && updated.line_total > 0 ? 0.95 : 0.30,
        };
        updated.field_confidence = fieldConf;
        updated.needs_review = (
          updated.line_total === null ||
          updated.line_total === undefined ||
          updated.line_total <= 0 ||
          updated.tax_rate === null ||
          Object.values(fieldConf).some((v) => v < 0.7)
        );

        // If action toggled to update, pick closest match or first product if not set
        if (field === 'action' && value === 'update' && !updated.matched_product_id) {
          const match = fuzzyMatchProduct(updated.name, existingProducts);
          if (match) {
            updated.matched_product_id = match.product.id;
            updated.matched_product_name = match.product.name;
            updated.category = match.product.category;
          } else if (existingProducts.length > 0) {
            updated.matched_product_id = existingProducts[0].id;
            updated.matched_product_name = existingProducts[0].name;
            updated.category = existingProducts[0].category;
          }
        }

        // If name changes, check if it matches an existing product in inventory
        if (field === 'name' && typeof value === 'string' && value.trim().length > 1) {
          const match = fuzzyMatchProduct(value.trim(), existingProducts);
          if (match && match.score >= 0.75) {
            updated.action = 'update';
            updated.matched_product_id = match.product.id;
            updated.matched_product_name = match.product.name;
            updated.match_confidence = match.score;
            if (!updated.category || updated.category === 'Grocery') {
              updated.category = match.product.category;
            }
          }
        }

        // If matched product changed via select
        if (field === 'matched_product_id') {
          const prod = existingProducts.find((p) => p.id === Number(value));
          if (prod) {
            updated.matched_product_id = prod.id;
            updated.matched_product_name = prod.name;
            updated.category = prod.category;
          }
        }

        return updated;
      })
    );
  };

  // Reset entire form
  const handleReset = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setItems([]);
    setExtractError(null);
    setIsMockResult(false);
    setMockMessage(null);
    setOcrEngineUsed(null);
    setSupplierName('');
    setInvoiceNumber('');
    setInvoiceDate('');
    setCurrency('INR');
    setSubtotal(null);
    setTax(null);
    setTotal(null);
  };

  // Confirm and save to database
  const handleConfirmAndSave = async () => {
    if (items.length === 0) {
      toast.error('No items to save');
      return;
    }

    // Validation: make sure all items have a name, positive qty, and sell price entered by user
    for (const item of items) {
      if (!item.name.trim()) {
        toast.error('All items must have a product name');
        return;
      }
      if (item.qty <= 0) {
        toast.error(`Quantity for "${item.name}" must be at least 1`);
        return;
      }
      if (!item.selling_price || item.selling_price <= 0) {
        toast.error(`Please enter the sell price for "${item.name}"`);
        return;
      }
    }

    setIsConfirming(true);
    try {
      const payloadItems: ConfirmInvoiceItemPayload[] = items.map((item) => ({
        name: item.name.trim(),
        qty: item.qty,
        cost_price: item.cost_price || 0,
        selling_price: item.selling_price || 0,
        category: item.category || 'Grocery',
        expiry_date: item.expiry_date || null,
        action: item.action,
        matched_product_id: item.action === 'update' ? item.matched_product_id : null,
      }));

      const res = await api.confirmExtractedInvoice({
        supplier: supplierName.trim() || undefined,
        vendor: supplierName.trim() || undefined,
        invoice_number: invoiceNumber.trim() || undefined,
        invoice_date: invoiceDate || undefined,
        currency: currency || 'INR',
        items: payloadItems,
      });

      toast.success(
        `Invoice confirmed! ${res.updated_count} products updated with new stock, and ${res.created_count} new products created.`
      );

      // Refresh parent and inventory
      await onDataSaved('product');
      handleReset();
      onNavigateToEntered('products');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save confirmed invoice');
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Page / Section Header */}
      <Card>
        <CardHeader
          title="Image to data (AI Bill & Handwritten OCR)"
          subtitle="Photograph supplier bills, wholesaler GST invoices, or handwritten counter notes to extract items into your store inventory."
          action={
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowApiKeyModal(true)}
                className="text-xs font-semibold px-2.5 py-1.5 rounded-[6px] border border-border bg-surface hover:bg-canvas text-text-medium hover:text-text-high transition-colors flex items-center gap-1.5"
                title="Configure Gemini API Key"
              >
                <Key className="w-3.5 h-3.5 text-primary" />
                <span>OCR settings</span>
              </button>

              <button
                type="button"
                onClick={() => onNavigateToEntered()}
                className="text-xs font-semibold text-text-medium hover:text-primary transition-colors flex items-center gap-1.5"
              >
                <span>View already entered</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          }
        />
        <CardContent className="p-6 flex flex-col gap-6">
          {/* Active OCR Engine Indicator Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-[8px] bg-canvas border border-border text-xs">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-primary shrink-0" />
              <span className="font-semibold text-text-high">Active OCR engine:</span>
              {ocrStatus.gemini_configured || localStorage.getItem('gemini_api_key') ? (
                <Badge variant="success">⚡ Gemini Vision AI (Active)</Badge>
              ) : ocrStatus.windows_native_available ? (
                <Badge variant="neutral">💻 Windows Native OCR (Offline)</Badge>
              ) : (
                <Badge variant="warning">🧪 Demo Preview Mode</Badge>
              )}
            </div>

            <div className="flex items-center gap-2 text-text-medium">
              <span className="text-[11px]">
                {ocrStatus.gemini_configured || localStorage.getItem('gemini_api_key')
                  ? 'High-precision multi-model extraction enabled'
                  : 'Enter your free Gemini key to scan custom invoices'}
              </span>
              <button
                type="button"
                onClick={() => setShowApiKeyModal(true)}
                className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1"
              >
                <Settings className="w-3 h-3" />
                <span>Change key</span>
              </button>
            </div>
          </div>

          {/* STEP 1: Upload or Capture Image */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-text-high">
                Step 1: Capture or upload invoice photo
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Capture / Upload Zone */}
              <div className="border-2 border-dashed border-border rounded-[12px] p-6 text-center hover:border-primary/50 transition-colors bg-canvas/30 flex flex-col items-center justify-center gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/[0.08] flex items-center justify-center text-primary">
                    <Camera className="w-6 h-6" />
                  </div>
                  <div className="w-12 h-12 rounded-full bg-surface border border-border flex items-center justify-center text-text-medium">
                    <Upload className="w-6 h-6" />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-center gap-3">
                    {/* Mobile Camera Capture */}
                    <label className="cursor-pointer inline-flex items-center gap-2 h-11 px-4 rounded-[8px] bg-primary text-primary-foreground font-semibold text-xs hover:bg-primary/90 transition-colors">
                      <Camera className="w-4 h-4" />
                      <span>Take photo</span>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={handleFileChange}
                      />
                    </label>

                    {/* Standard File Upload */}
                    <label className="cursor-pointer inline-flex items-center gap-2 h-11 px-4 rounded-[8px] bg-surface border border-border text-text-high font-semibold text-xs hover:bg-canvas transition-colors">
                      <Upload className="w-4 h-4" />
                      <span>Upload file</span>
                      <input
                        type="file"
                        accept="image/*,application/pdf,.pdf"
                        className="hidden"
                        onChange={handleFileChange}
                      />
                    </label>
                  </div>
                  <span className="text-[11px] text-text-medium mt-1">
                    Supports PDF, JPG, PNG, WEBP invoices and handwritten order slips
                  </span>
                </div>
              </div>

              {/* Live Preview Zone */}
              <div className="border border-border rounded-[12px] p-4 bg-canvas/50 flex flex-col justify-between min-h-[160px]">
                {previewUrl ? (
                  <div className="flex flex-col gap-3 h-full justify-between">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-primary shrink-0" />
                        <span className="text-xs font-semibold text-text-high truncate max-w-[170px]">
                          {selectedFile?.name || 'Captured Invoice Photo'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        {/* Orientation Rotation Controls (only for images) */}
                        {!isPdf && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleRotateImage('ccw')}
                              disabled={isRotating}
                              className="h-8 w-8 rounded-[6px] border border-border bg-surface text-text-medium hover:text-text-high flex items-center justify-center"
                              title="Rotate left 90°"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRotateImage('cw')}
                              disabled={isRotating}
                              className="h-8 w-8 rounded-[6px] border border-border bg-surface text-text-medium hover:text-text-high flex items-center justify-center"
                              title="Rotate right 90°"
                            >
                              <RotateCw className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => setShowImageModal(true)}
                          className="h-8 px-2 rounded-[6px] border border-border bg-surface text-xs text-text-medium hover:text-text-high flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          View
                        </button>
                        <button
                          type="button"
                          onClick={handleReset}
                          className="h-8 px-2 rounded-[6px] text-text-medium hover:text-destructive hover:bg-surface transition-colors"
                          title="Remove file"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {isPdf ? (
                      <div
                        className="relative rounded-[8px] overflow-hidden border border-border/80 h-36 bg-surface flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-canvas transition-colors p-4"
                        onClick={() => setShowImageModal(true)}
                      >
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                          <FileText className="w-6 h-6" />
                        </div>
                        <div className="flex flex-col items-center text-center">
                          <span className="text-xs font-bold text-text-high truncate max-w-[220px]">
                            {selectedFile?.name}
                          </span>
                          <span className="text-[11px] text-text-medium">
                            PDF Invoice ({selectedFile ? `${(selectedFile.size / 1024).toFixed(0)} KB` : ''}) • Click to preview
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="relative rounded-[8px] overflow-hidden border border-border/80 max-h-36 bg-surface flex items-center justify-center">
                        <img
                          src={previewUrl}
                          alt="Invoice preview"
                          className="object-contain max-h-36 w-full cursor-pointer hover:opacity-95 transition-opacity"
                          onClick={() => setShowImageModal(true)}
                        />
                      </div>
                    )}

                    <Button
                      type="button"
                      variant="primary"
                      disabled={isExtracting || isRotating}
                      onClick={handleExtractInvoice}
                      className="h-11 min-h-[44px] text-xs font-semibold w-full"
                    >
                      {isExtracting ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Extracting items with AI Vision...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-2" />
                          Extract items with AI
                        </>
                      )}
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center text-text-medium py-8">
                    <Camera className="w-8 h-8 text-text-low mb-2 stroke-[1.5]" />
                    <span className="text-xs font-medium">No photo selected yet</span>
                    <span className="text-[11px] text-text-low mt-0.5">
                      Take a photo or choose an image on the left to preview it here
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Friendly Error Alert with Retry */}
          {extractError && (
            <div className="p-4 rounded-[10px] bg-destructive/10 border border-destructive/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-destructive">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                <div>
                  <span className="font-bold">Extraction Issue:</span> {extractError}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleExtractInvoice}
                  disabled={isExtracting}
                  className="h-9 min-h-[36px] text-xs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isExtracting ? 'animate-spin' : ''}`} />
                  Retry extraction
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setExtractError(null);
                    handleAddBlankRow();
                  }}
                  className="h-9 min-h-[36px] text-xs"
                >
                  Enter manually
                </Button>
              </div>
            </div>
          )}

          {/* STEP 2: Editable Review Table */}
          {items.length > 0 && (
            <div className="flex flex-col gap-5 pt-2 border-t border-border">
              {/* Extraction Engine Notice */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-[8px] bg-canvas border border-border text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-text-high">Processed by:</span>
                  <Badge variant={isMockResult ? 'warning' : 'success'}>
                    {ocrEngineUsed || (isMockResult ? 'Demo Mode' : 'AI Vision')}
                  </Badge>
                  {isMockResult && (
                    <span className="text-amber-800 text-[11px]">
                      {mockMessage || '(Sample preview. Enter your Gemini API key in settings to scan your own bills.)'}
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-text-medium">
                  {items.length} items detected • Check amber fields before confirming
                </div>
              </div>

              {/* Invoice Meta header: Supplier, Invoice Number, Date & Total Amount read from invoice */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 rounded-[10px] bg-canvas border border-border">
                <Input
                  label="Supplier / Vendor"
                  placeholder="e.g. Metro Cash & Carry, Local Wholesaler"
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  helperText="Wholesaler or distributor"
                />

                <Input
                  label="Invoice #"
                  placeholder="e.g. INV-104, Bill #12"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  helperText="Detected invoice or bill number"
                />

                <Input
                  type="date"
                  label="Invoice date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  helperText="Extracted invoice or receipt date"
                />

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-text-high flex items-center justify-between">
                    <span>INVOICE GRAND TOTAL</span>
                    {total === null && <Badge variant="warning">Needs Review</Badge>}
                  </label>
                  <div
                    id="invoice-grand-total-display"
                    className={`flex items-center h-12 min-h-[48px] px-3.5 rounded-[6px] border ${
                      total === null
                        ? 'border-amber-400 bg-amber-50/50 text-amber-800'
                        : 'border-border-strong bg-surface text-primary'
                    } font-mono text-base font-bold select-all`}
                  >
                    {total !== null
                      ? `${currency === 'USD' ? '$' : '₹'}${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      : 'Not Printed / Needs Review'}
                  </div>
                  <span className="text-xs text-text-medium">
                    {total !== null
                      ? 'Printed grand total extracted from bottom/summary section of invoice'
                      : 'Invoice grand total was not clearly detected from bottom/summary area. Flagged for review.'}
                  </span>
                </div>
              </div>

              {/* Financial Totals Ribbon from Invoice */}
              {(subtotal !== null || total !== null || items.length > 0) && (
                <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-[10px] bg-surface border border-border text-xs">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary shrink-0" />
                    <span className="font-bold text-text-high">Invoice Summary:</span>
                    <Badge variant="neutral">{items.length} line items</Badge>
                    {currency && <Badge variant="neutral">{currency}</Badge>}
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
                    {subtotal !== null && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-text-medium text-[11px] font-sans">Subtotal:</span>
                        <span className="font-semibold text-text-high">
                          {currency === 'USD' ? '$' : '₹'}{subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    )}

                    {tax !== null && tax > 0 && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-text-medium text-[11px] font-sans">Tax / GST:</span>
                        <span className="font-semibold text-text-high">
                          {currency === 'USD' ? '$' : '₹'}{tax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    )}

                    {total !== null && (
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] bg-primary/[0.08] border border-primary/20">
                        <span className="text-text-medium text-[11px] font-sans">INVOICE GRAND TOTAL:</span>
                        <span className="font-bold text-primary">
                          {currency === 'USD' ? '$' : '₹'}{total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    )}

                    {(() => {
                      const calculatedSum = items.reduce((sum, item) => sum + (item.line_total || 0), 0);
                      const isMatch = total !== null && Math.abs(calculatedSum - total) <= Math.max(2, total * 0.05);
                      return (
                        <div className="flex items-center gap-1.5 text-text-medium text-[11px]">
                          <span className="font-sans">Items sum (TOTAL MRP):</span>
                          <span className="font-semibold text-text-high">
                            {currency === 'USD' ? '$' : '₹'}{calculatedSum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          {isMatch && (
                            <span className="text-emerald-600 flex items-center gap-0.5 font-sans font-semibold ml-1" title="Items line total matches invoice grand total">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Matched
                            </span>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* Printed Total Discrepancy Validation Banner */}
              {total !== null && total > 0 && (() => {
                const calculatedSum = items.reduce((sum, item) => sum + (item.line_total || 0), 0);
                const diff = Math.round(Math.abs(calculatedSum - total) * 100) / 100;
                const isMismatch = diff > 1.0;

                if (isMismatch) {
                  return (
                    <div className="flex items-start gap-2.5 p-3.5 rounded-[8px] bg-amber-500/10 border border-amber-500/30 text-amber-900 text-xs">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-bold">Printed Invoice Grand Total Discrepancy</div>
                        <div className="text-amber-800 mt-0.5 leading-relaxed">
                          The printed final invoice total (<strong>INVOICE GRAND TOTAL</strong>) is <strong>{currency === 'USD' ? '$' : '₹'}{total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>, but the sum of extracted individual product amounts (TOTAL MRP) is <strong>{currency === 'USD' ? '$' : '₹'}{calculatedSum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong> (discrepancy: {currency === 'USD' ? '$' : '₹'}{diff.toFixed(2)}). Both values are preserved without alteration. Please review individual item rows or summary amounts below.
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <div className="flex items-center gap-2 p-3 rounded-[8px] bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 text-xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      <strong>Total Reconciled:</strong> Sum of extracted product amounts ({currency === 'USD' ? '$' : '₹'}{calculatedSum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}) reconciles with printed <strong>INVOICE GRAND TOTAL</strong> ({currency === 'USD' ? '$' : '₹'}{total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}).
                    </span>
                  </div>
                );
              })()}

              {/* Review Table Header with Action and Counts */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-text-high flex items-center gap-2">
                    <span>Review & Verify Extracted Items</span>
                    <Badge variant="neutral">{items.length} items</Badge>
                  </h3>
                  <p className="text-xs text-text-medium mt-0.5">
                    Original product line amounts extracted directly from invoice. Review fields or update any marked 'Needs Review'.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleAddBlankRow}
                    className="h-10 min-h-[40px] text-xs"
                  >
                    <Plus className="w-4 h-4 mr-1.5" />
                    Add item
                  </Button>
                </div>
              </div>

              {/* Editable Table */}
              <div className="border border-border rounded-[10px] overflow-x-auto bg-surface">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10 text-center">#</TableHead>
                      <TableHead className="min-w-[190px]">Product / Description</TableHead>
                      <TableHead className="w-24 min-w-[85px] text-center">QTY</TableHead>
                      <TableHead className="w-32 min-w-[130px]">UNIT COST (₹)</TableHead>
                      <TableHead className="w-28 min-w-[110px] text-center">TAX</TableHead>
                      <TableHead className="w-32 min-w-[130px]">TOTAL MRP (₹)</TableHead>
                      <TableHead className="w-32 min-w-[130px]">Sell Price (₹)</TableHead>
                      <TableHead className="w-32">Category</TableHead>
                      <TableHead className="w-32">Expiry</TableHead>
                      <TableHead className="min-w-[220px]">Inventory Action</TableHead>
                      <TableHead className="w-10 text-center"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item, idx) => {
                      const isLowConfidence = item.confidence < 0.7;
                      const isLowQtyConfidence = (item.field_confidence?.qty ?? 1.0) < 0.7;
                      const isLowCostConfidence = (item.field_confidence?.cost_price ?? 1.0) < 0.7;
                      const isMissingPrice =
                        item.cost_price === null || item.cost_price === undefined || item.cost_price <= 0;
                      const isMissingSellPrice =
                        !item.selling_price || item.selling_price <= 0;
                      const isTaxReview =
                        item.tax_rate === null || item.tax_percent === 'Needs Review';
                      const hasAmberFlag =
                        item.needs_review || isLowConfidence || isLowQtyConfidence || isLowCostConfidence || isMissingPrice || isMissingSellPrice || isTaxReview;

                      return (
                        <TableRow
                          key={item.id}
                          title={item.raw_text ? `Original OCR: ${item.raw_text}` : undefined}
                          className={hasAmberFlag ? 'bg-amber-500/[0.04] border-l-4 border-l-amber-500' : undefined}
                        >
                          {/* Row Index */}
                          <TableCell className="text-center text-xs text-text-medium tabular-nums">
                            {idx + 1}
                          </TableCell>

                          {/* Product / Description */}
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <Input
                                value={item.name}
                                onChange={(e) => handleUpdateItemField(item.id, 'name', e.target.value)}
                                className={`h-11 min-h-[44px] text-xs font-semibold ${
                                  !item.name.trim() ? 'border-destructive' : ''
                                }`}
                                placeholder="Product name or description"
                              />
                              {isLowConfidence && (
                                <span className="inline-flex items-center gap-1 text-[10px] text-amber-700 font-medium">
                                  <AlertTriangle className="w-3 h-3 text-amber-600" />
                                  Check spelling ({Math.round(item.confidence * 100)}%)
                                </span>
                              )}
                            </div>
                          </TableCell>

                          {/* QTY - Supports Whole Numbers & Decimals (e.g. 1, 5, 2.5, 0.75) */}
                          <TableCell className="px-2 py-2 w-24 min-w-[85px]">
                            <div className="flex flex-col gap-0.5">
                              <Input
                                type="number"
                                step="any"
                                min="0.01"
                                placeholder="1"
                                value={item.qty !== null && item.qty !== undefined && item.qty > 0 ? item.qty : ''}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value);
                                  handleUpdateItemField(item.id, 'qty', isNaN(val) ? 1 : val);
                                }}
                                className={`h-11 min-h-[44px] text-xs tabular-nums text-center font-bold px-2 ${
                                  (!item.qty || item.qty <= 0 || isLowQtyConfidence)
                                    ? 'border-amber-500 bg-amber-500/[0.04] focus-visible:border-amber-500'
                                    : ''
                                }`}
                              />
                              {(!item.qty || item.qty <= 0) ? (
                                <span className="text-[10px] text-amber-700 font-semibold text-center">
                                  Enter qty
                                </span>
                              ) : isLowQtyConfidence ? (
                                <span className="text-[10px] text-amber-700 font-semibold text-center">
                                  Verify qty ({Math.round((item.field_confidence?.qty ?? 0.5) * 100)}%)
                                </span>
                              ) : null}
                            </div>
                          </TableCell>

                          {/* UNIT COST - Price per Unit before Tax */}
                          <TableCell className="px-2 py-2 min-w-[130px]">
                            <div className="flex flex-col gap-1">
                              <Input
                                isCurrency={true}
                                placeholder="0"
                                value={item.cost_price !== null && item.cost_price !== undefined ? item.cost_price : ''}
                                onChange={(e) => {
                                  const raw = e.target.value.replace(/[^0-9.]/g, '');
                                  const val = raw ? parseFloat(raw) : null;
                                  handleUpdateItemField(item.id, 'cost_price', val);
                                }}
                                className={`h-11 min-h-[44px] text-xs tabular-nums pl-6 pr-2 font-medium ${
                                  (isMissingPrice || isLowCostConfidence)
                                    ? 'border-amber-500 bg-amber-500/[0.04] focus-visible:border-amber-500'
                                    : ''
                                }`}
                              />
                              {isMissingPrice ? (
                                <span className="text-[10px] text-amber-700 font-semibold">
                                  Missing unit price
                                </span>
                              ) : isLowCostConfidence ? (
                                <span className="text-[10px] text-amber-700 font-semibold">
                                  Verify rate ({Math.round((item.field_confidence?.cost_price ?? 0.5) * 100)}%)
                                </span>
                              ) : null}
                            </div>
                          </TableCell>

                          {/* TAX - Percentage Rate (e.g. 18%, 5%, 0% or Needs Review) */}
                          <TableCell className="px-2 py-2 w-28 min-w-[110px]">
                            <div className="flex flex-col gap-0.5">
                              <Input
                                placeholder="e.g. 18%"
                                value={item.tax_input_str ?? item.tax_percent ?? (item.tax_rate !== null && item.tax_rate !== undefined ? `${item.tax_rate}%` : 'Needs Review')}
                                onChange={(e) => {
                                  handleUpdateItemField(item.id, 'tax_input_str', e.target.value);
                                }}
                                className={`h-11 min-h-[44px] text-xs text-center font-bold px-2 ${
                                  isTaxReview
                                    ? 'border-amber-500 bg-amber-500/[0.06] text-amber-900 focus-visible:border-amber-500'
                                    : 'tabular-nums'
                                }`}
                              />
                              {isTaxReview ? (
                                <span className="text-[10px] text-amber-700 font-semibold text-center">
                                  Needs Review
                                </span>
                              ) : (
                                <span className="text-[10px] text-text-medium text-center font-mono">
                                  {item.tax_amount !== null && item.tax_amount !== undefined
                                    ? `+₹${item.tax_amount.toFixed(2)}`
                                    : '0% tax'}
                                </span>
                              )}
                            </div>
                          </TableCell>

                          {/* TOTAL MRP - Original Extracted Product Line Amount */}
                          <TableCell className="px-2 py-2 min-w-[130px]">
                            <div className="flex flex-col gap-0.5">
                              <Input
                                isCurrency={true}
                                placeholder="0"
                                value={item.line_total !== null && item.line_total !== undefined ? item.line_total : ''}
                                onChange={(e) => {
                                  const raw = e.target.value.replace(/[^0-9.]/g, '');
                                  const val = raw ? parseFloat(raw) : null;
                                  handleUpdateItemField(item.id, 'line_total', val);
                                }}
                                className={`h-11 min-h-[44px] text-xs tabular-nums pl-6 pr-2 font-medium ${
                                  item.line_total === null || item.line_total === undefined || item.line_total <= 0
                                    ? 'border-amber-500 bg-amber-500/[0.06] focus-visible:border-amber-500'
                                    : ''
                                }`}
                              />
                              <span className="text-[10px] text-text-medium font-mono">
                                {item.line_total !== null && item.line_total !== undefined && item.line_total > 0
                                  ? 'Invoice line amount'
                                  : 'Needs Review'}
                              </span>
                            </div>
                          </TableCell>

                          {/* Sell Price (₹) - Filled by User Only */}
                          <TableCell className="px-2 py-2 min-w-[130px]">
                            <div className="flex flex-col gap-1">
                              <Input
                                isCurrency={true}
                                placeholder="Enter sell price"
                                value={item.selling_price && item.selling_price > 0 ? item.selling_price : ''}
                                onChange={(e) => {
                                  const raw = e.target.value.replace(/[^0-9.]/g, '');
                                  handleUpdateItemField(
                                    item.id,
                                    'selling_price',
                                    raw ? parseFloat(raw) : 0
                                  );
                                }}
                                className={`h-11 min-h-[44px] text-xs tabular-nums pl-6 pr-2 font-semibold ${
                                  isMissingSellPrice ? 'border-amber-500 focus-visible:border-amber-500' : ''
                                }`}
                              />
                              {isMissingSellPrice && (
                                <span className="text-[10px] text-amber-700 font-semibold">
                                  Enter sell price
                                </span>
                              )}
                            </div>
                          </TableCell>

                          {/* Category */}
                          <TableCell>
                            <select
                              value={item.category}
                              onChange={(e) => handleUpdateItemField(item.id, 'category', e.target.value)}
                              className="w-full h-11 min-h-[44px] px-2 rounded-[8px] border border-border bg-surface text-xs text-text-high"
                            >
                              {PRODUCT_CATEGORIES.map((cat) => (
                                <option key={cat} value={cat}>
                                  {cat}
                                </option>
                              ))}
                            </select>
                          </TableCell>

                          {/* Expiry Date */}
                          <TableCell>
                            <Input
                              type="date"
                              value={item.expiry_date || ''}
                              onChange={(e) =>
                                handleUpdateItemField(item.id, 'expiry_date', e.target.value || null)
                              }
                              className="h-11 min-h-[44px] text-xs"
                            />
                          </TableCell>

                          {/* Inventory Action & Fuzzy Match */}
                          <TableCell>
                            <div className="flex flex-col gap-1.5">
                              {/* Toggle between Update vs Create */}
                              <div className="flex items-center gap-1 bg-canvas p-0.5 rounded-[6px] border border-border w-fit">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateItemField(item.id, 'action', 'update')}
                                  className={`px-2 py-1 rounded-[4px] text-[11px] font-semibold transition-colors ${
                                    item.action === 'update'
                                      ? 'bg-primary text-primary-foreground'
                                      : 'text-text-medium hover:text-text-high'
                                  }`}
                                >
                                  Update existing
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateItemField(item.id, 'action', 'create')}
                                  className={`px-2 py-1 rounded-[4px] text-[11px] font-semibold transition-colors ${
                                    item.action === 'create'
                                      ? 'bg-primary text-primary-foreground'
                                      : 'text-text-medium hover:text-text-high'
                                  }`}
                                >
                                  Create new
                                </button>
                              </div>

                              {/* If update, show matched product select */}
                              {item.action === 'update' ? (
                                <div className="flex flex-col gap-0.5">
                                  {existingProducts.length > 0 ? (
                                    <select
                                      value={item.matched_product_id || ''}
                                      onChange={(e) =>
                                        handleUpdateItemField(
                                          item.id,
                                          'matched_product_id',
                                          parseInt(e.target.value, 10)
                                        )
                                      }
                                      className="h-8 px-2 rounded-[6px] border border-border bg-surface text-[11px] text-text-high font-medium"
                                    >
                                      {existingProducts.map((p) => (
                                        <option key={p.id} value={p.id}>
                                          {p.name} (Current: {p.stock_qty})
                                        </option>
                                      ))}
                                    </select>
                                  ) : (
                                    <span className="text-[11px] text-text-medium italic">
                                      No existing products in inventory
                                    </span>
                                  )}
                                  {(() => {
                                    const matched = existingProducts.find((p) => p.id === item.matched_product_id);
                                    const curr = matched ? matched.stock_qty : 0;
                                    return (
                                      <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold">
                                        Adds +{item.qty} units (Stock: {curr} &rarr; {curr + item.qty})
                                      </span>
                                    );
                                  })()}
                                </div>
                              ) : (
                                <span className="text-[10px] text-text-medium">
                                  Will create a new inventory item with {item.qty} units
                                </span>
                              )}
                            </div>
                          </TableCell>

                          {/* Delete */}
                          <TableCell className="text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveRow(item.id)}
                              className="text-text-medium hover:text-destructive p-1 rounded transition-colors"
                              title="Delete row"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* STEP 3: Confirm and Save */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-[10px] bg-canvas border border-border">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600 shrink-0">
                    <PackageCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-text-high">Ready to update store ledger</h4>
                    <p className="text-xs text-text-medium">
                      {items.filter((i) => i.action === 'update').length} products will be incremented with new stock, and{' '}
                      {items.filter((i) => i.action === 'create').length} new products will be created.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleReset}
                    className="h-12 min-h-[48px] px-4 text-xs font-medium"
                  >
                    Cancel / Discard
                  </Button>

                  <Button
                    type="button"
                    variant="primary"
                    disabled={isConfirming || items.length === 0}
                    onClick={handleConfirmAndSave}
                    className="h-12 min-h-[48px] px-6 text-sm font-semibold"
                  >
                    {isConfirming ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Saving to inventory...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Confirm & Save to Inventory ({items.length} items)
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal to view enlarged captured photo */}
      {showImageModal && previewUrl && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="relative bg-surface rounded-[8px] overflow-hidden max-w-2xl w-full border border-border flex flex-col max-h-[90vh]">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-canvas">
              <span className="text-xs font-bold text-text-high">
                {isPdf ? 'PDF Invoice preview' : 'Invoice image preview'}
              </span>
              <div className="flex items-center gap-2">
                {!isPdf && (
                  <button
                    type="button"
                    onClick={() => handleRotateImage('cw')}
                    className="h-7 px-2 rounded border border-border text-xs flex items-center gap-1 hover:bg-surface"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    Rotate
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowImageModal(false)}
                  className="text-text-medium hover:text-text-high p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-4 flex items-center justify-center overflow-auto flex-1 bg-black/5">
              {isPdf ? (
                <iframe
                  src={previewUrl}
                  title="PDF invoice viewer"
                  className="w-full h-[75vh] rounded border border-border"
                />
              ) : (
                <img
                  src={previewUrl}
                  alt="Enlarged invoice"
                  className="max-h-[75vh] object-contain rounded"
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal to Configure Vision AI Key */}
      {showApiKeyModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="relative bg-surface rounded-[8px] overflow-hidden max-w-md w-full border border-border flex flex-col">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-canvas">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-bold text-text-high">Configure Vision AI key</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowApiKeyModal(false)}
                className="text-text-medium hover:text-text-high p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 flex flex-col gap-4 text-xs">
              <p className="text-text-medium leading-relaxed">
                Enter your Google Gemini (<code className="text-primary font-mono">AIza...</code>) or Anthropic Claude (<code className="text-primary font-mono">sk-ant-...</code>) API key to enable high-accuracy multimodal invoice extraction for your printed distributor bills, GST invoices, and handwritten slips.
              </p>

              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-text-high">AI Vision API key</label>
                <input
                  type="password"
                  placeholder="AIzaSy... or sk-ant-..."
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  className="h-12 px-3 rounded-[8px] border border-border bg-surface text-xs text-text-high font-mono focus:outline-none focus:border-primary"
                />
              </div>

              <div className="p-3 rounded-[8px] bg-canvas border border-border flex items-start gap-2 text-text-medium">
                <HelpCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <div className="text-[11px] leading-normal">
                  <span>Get a free key from </span>
                  <a
                    href="https://aistudio.google.com/"
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary font-semibold hover:underline"
                  >
                    Google AI Studio
                  </a>
                  <span> or from </span>
                  <a
                    href="https://console.anthropic.com/"
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary font-semibold hover:underline"
                  >
                    Anthropic Console
                  </a>
                  <span>.</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowApiKeyModal(false)}
                  className="min-h-[48px] text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleSaveApiKey}
                  disabled={isSavingKey}
                  className="min-h-[48px] text-xs font-semibold"
                >
                  {isSavingKey ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save key'
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
