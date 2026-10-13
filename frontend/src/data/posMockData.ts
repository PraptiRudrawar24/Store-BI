import type { ProductItem, CartItem } from '../types/pos';

export const INITIAL_POS_PRODUCTS: ProductItem[] = [
  // 1. Dettol Antiseptic Liquid
  {
    id: 'prod-01',
    name: 'Dettol Antiseptic Liquid 550ml',
    sku: 'DET-550M',
    barcode: '8901396112015',
    category: 'Personal Care',
    pricePaise: 22500, // ₹225.00
    stock: 27,
    lowStockThreshold: 5,
  },
  // 2. Paracetamol (Low Stock)
  {
    id: 'prod-02',
    name: 'Paracetamol 500mg 3004 81234',
    sku: '12/26 2 20.00',
    barcode: '8901030456123',
    category: 'Health & OTC',
    pricePaise: 5250, // ₹52.50
    stock: 2,
    lowStockThreshold: 5,
    batchInfo: 'Batch #B-9104',
  },
  // 3. Lay's Magic Masala
  {
    id: 'prod-03',
    name: "Lay's India's Magic Masala 90g",
    sku: 'LYS-90G-MM',
    barcode: '8901491101824',
    category: 'Snacks & Sweets',
    pricePaise: 3000, // ₹30.00
    stock: 109,
    lowStockThreshold: 10,
  },
  // 4. Cadbury Silk
  {
    id: 'prod-04',
    name: 'Cadbury Dairy Milk Silk 150g',
    sku: 'CAD-SLK-150',
    barcode: '8901233024512',
    category: 'Snacks & Sweets',
    pricePaise: 17500, // ₹175.00
    stock: 69,
    lowStockThreshold: 10,
  },
  // 5. Amul Butter
  {
    id: 'prod-05',
    name: 'Amul Butter 500g Tub',
    sku: 'AML-BTR-500',
    barcode: '8901262010052',
    category: 'Dairy & Staples',
    pricePaise: 27500, // ₹275.00
    stock: 42,
    lowStockThreshold: 8,
  },
  // 6. Tata Salt
  {
    id: 'prod-06',
    name: 'Tata Salt Iodized 1kg',
    sku: 'TAT-SLT-1KG',
    barcode: '8901030383112',
    category: 'Dairy & Staples',
    pricePaise: 3000, // ₹30.00
    stock: 215,
    lowStockThreshold: 20,
  },
  // 7. Colgate Total Toothpaste
  {
    id: 'prod-07',
    name: 'Colgate Total Toothpaste 120g',
    sku: 'CLG-TOT-120',
    barcode: '8901314010202',
    category: 'Personal Care',
    pricePaise: 11500, // ₹115.00
    stock: 54,
    lowStockThreshold: 10,
  },
  // 8. Frooti Fresh Mango
  {
    id: 'prod-08',
    name: 'Frooti Fresh Mango 1.2L',
    sku: 'FRT-MNG-12L',
    barcode: '8901725121021',
    category: 'Beverages',
    pricePaise: 6500, // ₹65.00
    stock: 38,
    lowStockThreshold: 8,
  },
  // 9. Vicks VapoRub
  {
    id: 'prod-09',
    name: 'Vicks VapoRub Balm 50g',
    sku: 'VIC-VR-50G',
    barcode: '8901030012450',
    category: 'Health & OTC',
    pricePaise: 15500, // ₹155.00
    stock: 3,
    lowStockThreshold: 5,
  },
  // 10. Coca-Cola 750ml
  {
    id: 'prod-10',
    name: 'Coca-Cola Zero Sugar 750ml',
    sku: 'COKE-ZR-750',
    barcode: '8901764012111',
    category: 'Beverages',
    pricePaise: 4000, // ₹40.00
    stock: 84,
    lowStockThreshold: 12,
  },
  // 11. Surf Excel Quick Wash
  {
    id: 'prod-11',
    name: 'Surf Excel Quick Wash 1kg',
    sku: 'SRF-QW-1KG',
    barcode: '8901030612401',
    category: 'Household',
    pricePaise: 14500, // ₹145.00
    stock: 45,
    lowStockThreshold: 6,
  },
  // 12. Vim Dishwash Gel
  {
    id: 'prod-12',
    name: 'Vim Lemon Dishwash Gel 500ml',
    sku: 'VIM-GEL-500',
    barcode: '8901030701198',
    category: 'Household',
    pricePaise: 12000, // ₹120.00
    stock: 62,
    lowStockThreshold: 10,
  },
  // 13. Aashirvaad Shudh Chakki Atta 5kg
  {
    id: 'prod-13',
    name: 'Aashirvaad Whole Wheat Atta 5kg',
    sku: 'ASH-ATTA-5K',
    barcode: '8901725134014',
    category: 'Dairy & Staples',
    pricePaise: 26000, // ₹260.00
    stock: 19,
    lowStockThreshold: 5,
  },
  // 14. Fortune Sunlite Sunflower Oil 1L
  {
    id: 'prod-14',
    name: 'Fortune Sunlite Refined Oil 1L',
    sku: 'FRT-SUN-1L',
    barcode: '8906007281023',
    category: 'Dairy & Staples',
    pricePaise: 13500, // ₹135.00
    stock: 4,
    lowStockThreshold: 5,
  },
  // 15. Dove Cream Beauty Bathing Bar 100g
  {
    id: 'prod-15',
    name: 'Dove Beauty Bar 100g (Pack of 3)',
    sku: 'DOV-BAR-3PK',
    barcode: '8901030821032',
    category: 'Personal Care',
    pricePaise: 19500, // ₹195.00
    stock: 33,
    lowStockThreshold: 8,
  },
  // 16. Head & Shoulders Anti-Dandruff 340ml
  {
    id: 'prod-16',
    name: 'Head & Shoulders Cool Menthol 340ml',
    sku: 'HNS-MNT-340',
    barcode: '8901030910119',
    category: 'Personal Care',
    pricePaise: 29900, // ₹299.00
    stock: 22,
    lowStockThreshold: 5,
  },
  // 17. Digene Antacid Gel Orange 200ml
  {
    id: 'prod-17',
    name: 'Digene Antacid Gel Orange 200ml',
    sku: 'DIG-GEL-200',
    barcode: '8901117012019',
    category: 'Health & OTC',
    pricePaise: 16500, // ₹165.00
    stock: 1,
    lowStockThreshold: 4,
  },
  // 18. Band-Aid Washproof 20 Strips
  {
    id: 'prod-18',
    name: 'Band-Aid Washproof Strips (20s)',
    sku: 'BND-WSH-20S',
    barcode: '8901012110201',
    category: 'Health & OTC',
    pricePaise: 5000, // ₹50.00
    stock: 58,
    lowStockThreshold: 10,
  },
  // 19. Parle-G Gold Biscuits 1kg
  {
    id: 'prod-19',
    name: 'Parle-G Gold Glucose Biscuits 1kg',
    sku: 'PRL-GLD-1KG',
    barcode: '8901719101015',
    category: 'Snacks & Sweets',
    pricePaise: 9000, // ₹90.00
    stock: 75,
    lowStockThreshold: 15,
  },
  // 20. Haldiram's Nagpur Aloo Bhujia 400g
  {
    id: 'prod-20',
    name: "Haldiram's Aloo Bhujia Namkeen 400g",
    sku: 'HLD-ALU-400',
    barcode: '8904004402012',
    category: 'Snacks & Sweets',
    pricePaise: 11000, // ₹110.00
    stock: 48,
    lowStockThreshold: 10,
  },
  // 21. Red Label Natural Care Tea 500g
  {
    id: 'prod-21',
    name: 'Brooke Bond Red Label Tea 500g',
    sku: 'BBD-RL-500G',
    barcode: '8901030112456',
    category: 'Beverages',
    pricePaise: 28000, // ₹280.00
    stock: 29,
    lowStockThreshold: 6,
  },
  // 22. Nescafe Classic Instant Coffee 100g
  {
    id: 'prod-22',
    name: 'Nescafe Classic Instant Coffee Jar 100g',
    sku: 'NES-CLS-100',
    barcode: '8901058012011',
    category: 'Beverages',
    pricePaise: 34000, // ₹340.00
    stock: 14,
    lowStockThreshold: 5,
  },
  // 23. Harpic Power Plus Toilet Cleaner 1L
  {
    id: 'prod-23',
    name: 'Harpic Power Plus Original 1L',
    sku: 'HRP-PWR-100',
    barcode: '8901396311029',
    category: 'Household',
    pricePaise: 19800, // ₹198.00
    stock: 31,
    lowStockThreshold: 8,
  },
  // 24. Goodknight Gold Flash Liquid Refill (Twin Pack)
  {
    id: 'prod-24',
    name: 'Goodknight Gold Flash Twin Refill 90ml',
    sku: 'GDK-FLS-2PK',
    barcode: '8901023021402',
    category: 'Household',
    pricePaise: 17000, // ₹170.00
    stock: 2,
    lowStockThreshold: 5,
  },
];

/**
 * Initial 3 cart items faithfully matching the reference design in code.html & screen.png:
 * 1. Dettol Antiseptic Liquid 550ml (Qty: 1) -> ₹225.00
 * 2. Paracetamol 500mg 3004 81234 (Qty: 1) -> ₹52.50
 * 3. Lay's India's Magic Masala 90g (Qty: 1) -> ₹30.00
 * Subtotal: ₹307.50, GST 5%: ₹15.38, Grand Total: ₹322.88 (or ₹323.00 rounded)
 */
export const INITIAL_CART_ITEMS: CartItem[] = [
  { product: INITIAL_POS_PRODUCTS[0], quantity: 1 },
  { product: INITIAL_POS_PRODUCTS[1], quantity: 1 },
  { product: INITIAL_POS_PRODUCTS[2], quantity: 1 },
];

export const MOCK_TERMINAL_CONFIG = {
  storeName: 'Metro Retail & Supermart',
  storeDivision: 'Pune Regional Division • Store #114',
  storeCode: 'POS-01',
  branch: 'Pune Central',
  hardwarePrinter: 'Citizen CTS-310II (Thermal)',
  defaultCashier: 'Dr. Rajesh Sharma',
};
