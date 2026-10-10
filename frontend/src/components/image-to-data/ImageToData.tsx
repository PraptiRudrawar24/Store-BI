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

  // Extraction state
  const [isExtracting, setIsExtracting] = React.useState(false);
  const [extractError, setExtractError] = React.useState<string | null>(null);

  // Extraction results state
  const [supplierName, setSupplierName] = React.useState('');
  const [invoiceDate, setInvoiceDate] = React.useState('');
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

    const localKey = localStorage.getItem('gemini_api_key');
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


  // Save Gemini Key handler
  const handleSaveApiKey = async () => {
    const key = apiKeyInput.trim();
    if (!key) {
      toast.error('Please enter a valid Gemini API key');
      return;
    }

    setIsSavingKey(true);
    try {
      localStorage.setItem('gemini_api_key', key);
      await api.saveGeminiKey(key);
      const status = await api.getOcrStatus();
      setOcrStatus(status);
      setShowApiKeyModal(false);
      toast.success('Gemini API key saved! AI Vision extraction is now enabled.');
    } catch (err: any) {
      // Even if server save failed, localStorage is set
      localStorage.setItem('gemini_api_key', key);
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
      const storedKey = localStorage.getItem('gemini_api_key') || undefined;
      const response: ExtractedInvoiceResponse = await api.extractInvoice(selectedFile, storedKey);

      setSupplierName(response.supplier || 'Wholesale Supplier');
      setInvoiceDate(response.invoice_date || new Date().toISOString().split('T')[0]);
      setIsMockResult(response.is_mock);
      setMockMessage(response.message || null);
      setOcrEngineUsed(response.ocr_engine || (response.is_mock ? 'Sample Demo Mock' : 'AI Vision'));

      // Map items with fuzzy matching to existing inventory
      const mappedItems: EditableExtractedItem[] = response.items.map((item, idx) => {
        const match = fuzzyMatchProduct(item.name, existingProducts);
        const costPrice = item.cost_price || 0;
        const mrp = item.mrp || 0;

        // Default selling price: if MRP is known, use MRP; else 25% markup on cost
        const defaultSelling = match
          ? match.product.selling_price
          : mrp > 0
          ? mrp
          : costPrice > 0
          ? Math.round(costPrice * 1.25)
          : 25;

        return {
          ...item,
          id: `item-${Date.now()}-${idx}`,
          cost_price: item.cost_price,
          mrp: item.mrp || null,
          line_total: item.line_total || (costPrice > 0 ? Math.round(costPrice * item.qty) : null),
          selling_price: defaultSelling,
          category: match ? match.product.category : 'Grocery',
          action: match ? 'update' : 'create',
          matched_product_id: match ? match.product.id : null,
          matched_product_name: match ? match.product.name : null,
          match_confidence: match ? match.score : 0,
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
      mrp: null,
      line_total: 0,
      selling_price: 0,
      category: 'Grocery',
      expiry_date: null,
      confidence: 1.0,
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

  // Update a field in a row
  const handleUpdateItemField = (id: string, field: keyof EditableExtractedItem, value: any) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;

        const updated = { ...item, [field]: value };

        // Automatically update line total when qty or cost_price changes
        if (field === 'qty' || field === 'cost_price') {
          const q = field === 'qty' ? value : updated.qty;
          const c = field === 'cost_price' ? value : updated.cost_price;
          if (c !== null && c !== undefined && q > 0) {
            updated.line_total = Math.round(q * c * 100) / 100;
          }
        }

        // If action toggled to update, pick closest match or first product if not set
        if (field === 'action' && value === 'update' && !updated.matched_product_id) {
          const match = fuzzyMatchProduct(updated.name, existingProducts);
          if (match) {
            updated.matched_product_id = match.product.id;
            updated.matched_product_name = match.product.name;
            updated.selling_price = match.product.selling_price;
            updated.category = match.product.category;
          } else if (existingProducts.length > 0) {
            updated.matched_product_id = existingProducts[0].id;
            updated.matched_product_name = existingProducts[0].name;
            updated.selling_price = existingProducts[0].selling_price;
            updated.category = existingProducts[0].category;
          }
        }

        // If matched product changed via select
        if (field === 'matched_product_id') {
          const prod = existingProducts.find((p) => p.id === Number(value));
          if (prod) {
            updated.matched_product_id = prod.id;
            updated.matched_product_name = prod.name;
            updated.selling_price = prod.selling_price;
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
    setInvoiceDate('');
  };

  // Confirm and save to database
  const handleConfirmAndSave = async () => {
    if (items.length === 0) {
      toast.error('No items to save');
      return;
    }

    // Validation: make sure all items have a name and positive qty
    for (const item of items) {
      if (!item.name.trim()) {
        toast.error('All items must have a product name');
        return;
      }
      if (item.qty <= 0) {
        toast.error(`Quantity for "${item.name}" must be at least 1`);
        return;
      }
    }

    setIsConfirming(true);
    try {
      const payloadItems: ConfirmInvoiceItemPayload[] = items.map((item) => ({
        name: item.name.trim(),
        qty: item.qty,
        cost_price: item.cost_price || 0,
        selling_price: item.selling_price || (item.cost_price ? Math.round(item.cost_price * 1.25) : 20),
        category: item.category || 'Grocery',
        expiry_date: item.expiry_date || null,
        action: item.action,
        matched_product_id: item.action === 'update' ? item.matched_product_id : null,
      }));

      const res = await api.confirmExtractedInvoice({
        supplier: supplierName.trim() || undefined,
        invoice_date: invoiceDate || undefined,
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
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileChange}
                      />
                    </label>
                  </div>
                  <span className="text-[11px] text-text-medium mt-1">
                    Supports JPG, PNG, WEBP invoices and handwritten order slips
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
                        {/* Orientation Rotation Controls */}
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
                          title="Remove photo"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="relative rounded-[8px] overflow-hidden border border-border/80 max-h-36 bg-surface flex items-center justify-center">
                      <img
                        src={previewUrl}
                        alt="Invoice preview"
                        className="object-contain max-h-36 w-full cursor-pointer hover:opacity-95 transition-opacity"
                        onClick={() => setShowImageModal(true)}
                      />
                    </div>

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

              {/* Invoice Meta header: Supplier & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-[10px] bg-canvas border border-border">
                <Input
                  label="Supplier name"
                  placeholder="e.g. Metro Cash & Carry, Local Wholesaler"
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  helperText="Extracted from invoice header"
                />

                <Input
                  type="date"
                  label="Invoice date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  helperText="Extracted invoice or receipt date"
                />
              </div>

              {/* Review Table Header with Action and Counts */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-text-high flex items-center gap-2">
                    <span>Review & Verify Extracted Items</span>
                    <Badge variant="neutral">{items.length} items</Badge>
                  </h3>
                  <p className="text-xs text-text-medium mt-0.5">
                    Unit Cost Price = wholesale buying rate per piece. Check that Line Total ≈ Qty × Cost Price.
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
                      <TableHead className="min-w-[190px]">Item Name</TableHead>
                      <TableHead className="w-20">Qty</TableHead>
                      <TableHead className="w-28">₹ Unit Cost</TableHead>
                      <TableHead className="w-28">₹ MRP</TableHead>
                      <TableHead className="w-28">₹ Line Total</TableHead>
                      <TableHead className="w-28">₹ Sell Price</TableHead>
                      <TableHead className="w-32">Category</TableHead>
                      <TableHead className="w-32">Expiry</TableHead>
                      <TableHead className="min-w-[210px]">Inventory Action</TableHead>
                      <TableHead className="w-10 text-center"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item, idx) => {
                      const isLowConfidence = item.confidence < 0.7;
                      const isMissingPrice =
                        item.cost_price === null || item.cost_price === undefined || item.cost_price <= 0;
                      const hasAmberFlag = isLowConfidence || isMissingPrice;

                      // Math check: qty * cost_price == line_total
                      const calculatedTotal =
                        item.cost_price && item.qty ? Math.round(item.qty * item.cost_price * 100) / 100 : null;
                      const isMathConsistent =
                        calculatedTotal !== null &&
                        item.line_total !== null &&
                        item.line_total !== undefined &&
                        Math.abs(calculatedTotal - item.line_total) <= 1.5;

                      return (
                        <TableRow
                          key={item.id}
                          className={hasAmberFlag ? 'bg-amber-500/[0.04] border-l-4 border-l-amber-500' : undefined}
                        >
                          {/* Row Index */}
                          <TableCell className="text-center text-xs text-text-medium tabular-nums">
                            {idx + 1}
                          </TableCell>

                          {/* Item Name */}
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <Input
                                value={item.name}
                                onChange={(e) => handleUpdateItemField(item.id, 'name', e.target.value)}
                                className={`h-11 min-h-[44px] text-xs font-semibold ${
                                  !item.name.trim() ? 'border-destructive' : ''
                                }`}
                                placeholder="Product name"
                              />
                              {isLowConfidence && (
                                <span className="inline-flex items-center gap-1 text-[10px] text-amber-700 font-medium">
                                  <AlertTriangle className="w-3 h-3 text-amber-600" />
                                  Check spelling ({Math.round(item.confidence * 100)}%)
                                </span>
                              )}
                            </div>
                          </TableCell>

                          {/* Qty */}
                          <TableCell>
                            <Input
                              type="number"
                              min="1"
                              value={item.qty}
                              onChange={(e) =>
                                handleUpdateItemField(item.id, 'qty', parseInt(e.target.value, 10) || 1)
                              }
                              className="h-11 min-h-[44px] text-xs tabular-nums text-center"
                            />
                          </TableCell>

                          {/* Unit Cost Price */}
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <Input
                                isCurrency={true}
                                placeholder="0"
                                value={item.cost_price !== null && item.cost_price !== undefined ? item.cost_price : ''}
                                onChange={(e) => {
                                  const val = e.target.value ? parseFloat(e.target.value) : null;
                                  handleUpdateItemField(item.id, 'cost_price', val);
                                }}
                                className={`h-11 min-h-[44px] text-xs tabular-nums ${
                                  isMissingPrice ? 'border-amber-500 focus-visible:border-amber-500' : ''
                                }`}
                              />
                              {isMissingPrice && (
                                <span className="text-[10px] text-amber-700 font-semibold">
                                  Missing price
                                </span>
                              )}
                            </div>
                          </TableCell>

                          {/* MRP */}
                          <TableCell>
                            <Input
                              isCurrency={true}
                              placeholder="0"
                              value={item.mrp !== null && item.mrp !== undefined ? item.mrp : ''}
                              onChange={(e) => {
                                const val = e.target.value ? parseFloat(e.target.value) : null;
                                handleUpdateItemField(item.id, 'mrp', val);
                              }}
                              className="h-11 min-h-[44px] text-xs tabular-nums"
                            />
                          </TableCell>

                          {/* Line Total */}
                          <TableCell>
                            <div className="flex flex-col gap-0.5">
                              <Input
                                isCurrency={true}
                                placeholder="0"
                                value={item.line_total !== null && item.line_total !== undefined ? item.line_total : ''}
                                onChange={(e) => {
                                  const val = e.target.value ? parseFloat(e.target.value) : null;
                                  handleUpdateItemField(item.id, 'line_total', val);
                                }}
                                className="h-11 min-h-[44px] text-xs tabular-nums"
                              />
                              {isMathConsistent && (
                                <span className="text-[10px] text-emerald-700 font-medium flex items-center gap-0.5">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600 inline" />
                                  Qty × Cost verified
                                </span>
                              )}
                            </div>
                          </TableCell>

                          {/* Selling Price */}
                          <TableCell>
                            <Input
                              isCurrency={true}
                              placeholder="0"
                              value={item.selling_price || ''}
                              onChange={(e) =>
                                handleUpdateItemField(
                                  item.id,
                                  'selling_price',
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              className="h-11 min-h-[44px] text-xs tabular-nums"
                            />
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
                                          {p.name} (Stock: {p.stock_qty})
                                        </option>
                                      ))}
                                    </select>
                                  ) : (
                                    <span className="text-[11px] text-text-medium italic">
                                      No existing products in inventory
                                    </span>
                                  )}
                                  <span className="text-[10px] text-emerald-700 font-semibold">
                                    Adds +{item.qty} units to existing stock
                                  </span>
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
              <span className="text-xs font-bold text-text-high">Invoice image preview</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleRotateImage('cw')}
                  className="h-7 px-2 rounded border border-border text-xs flex items-center gap-1 hover:bg-surface"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  Rotate
                </button>
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
              <img
                src={previewUrl}
                alt="Enlarged invoice"
                className="max-h-[75vh] object-contain rounded"
              />
            </div>
          </div>
        </div>
      )}

      {/* Modal to Configure Gemini API Key */}
      {showApiKeyModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="relative bg-surface rounded-[8px] overflow-hidden max-w-md w-full border border-border flex flex-col">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-canvas">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-bold text-text-high">Configure Gemini OCR key</h3>
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
                Enter your Google Gemini API key to enable high-accuracy AI extraction for your store bills, wholesaler GST invoices, and handwritten ledger slips.
              </p>

              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-text-high">Gemini API key</label>
                <input
                  type="password"
                  placeholder="AIzaSy..."
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  className="h-12 px-3 rounded-[8px] border border-border bg-surface text-xs text-text-high font-mono focus:outline-none focus:border-primary"
                />
              </div>

              <div className="p-3 rounded-[8px] bg-canvas border border-border flex items-start gap-2 text-text-medium">
                <HelpCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <div className="text-[11px] leading-normal">
                  <span>Don't have a key? Get one for free from </span>
                  <a
                    href="https://aistudio.google.com/"
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary font-semibold hover:underline"
                  >
                    Google AI Studio
                  </a>
                  <span>. It takes less than 1 minute.</span>
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
