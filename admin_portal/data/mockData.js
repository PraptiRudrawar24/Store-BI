/**
 * ==============================================================================
 * STORE BI - ADMIN WEB PANEL MOCK DATA REPOSITORY
 * ==============================================================================
 * Realistic dummy data for 28+ Indian retail merchant tenants across Maharashtra,
 * Madhya Pradesh, and Gujarat, plus subscriptions, payments, tickets, logs, and config.
 * ==============================================================================
 */

const StoreBI_Data = (() => {
  // 1. TENANT SHOPS (28+ shops across India)
  const shops = [
    {
      id: "SHP-1001",
      name: "Prapti Kirana & Superstore",
      ownerName: "Prapti Rudrawar",
      phone: "+91 98765 43210",
      email: "prapti@storebi.com",
      category: "Kirana / Grocery",
      city: "Pune",
      state: "Maharashtra",
      pincode: "411038",
      gstin: "27AABCP1234F1Z5",
      plan: "Pro Retailer",
      status: "active",
      signupDate: "2026-08-15",
      lastActive: "Just now",
      lastActiveTimestamp: Date.now() - 2 * 60 * 1000,
      mrr: 999,
      totalBills: 1420,
      posTransactions: 1250,
      ocrUploads: 48,
      inventoryCount: 312,
      hardware: "58mm Thermal Printer, Honeywell 2D Barcode Scanner, Samsung Galaxy Tab",
      trialDaysLeft: 0,
      supportNotes: [
        { author: "Operations Lead", date: "2026-09-02", text: "Helped merchant configure thermal printer via USB OTG. Working smoothly." },
        { author: "Support Agent", date: "2026-10-10", text: "Merchant inquired about adding a second cashier billing counter." }
      ],
      recentActivity: [
        { time: "10 mins ago", event: "Recorded sale of ₹1,450 (UPI)", type: "pos" },
        { time: "2 hours ago", event: "Uploaded distributor bill (Hindustan Unilever)", type: "ocr" },
        { time: "Yesterday", event: "Updated reorder level for 12 grocery items", type: "inventory" }
      ]
    },
    {
      id: "SHP-1002",
      name: "Ramesh Kirana & General Stores",
      ownerName: "Ramesh Patel",
      phone: "+91 98220 11445",
      email: "ramesh.patel@gmail.com",
      category: "Kirana / Grocery",
      city: "Nagpur",
      state: "Maharashtra",
      pincode: "440010",
      gstin: "27AAACR5566G1ZH",
      plan: "Starter Kirana",
      status: "active",
      signupDate: "2026-09-01",
      lastActive: "15 mins ago",
      lastActiveTimestamp: Date.now() - 15 * 60 * 1000,
      mrr: 499,
      totalBills: 840,
      posTransactions: 780,
      ocrUploads: 22,
      inventoryCount: 185,
      hardware: "TVS RP 3160 Gold Thermal Printer, Android Phone",
      trialDaysLeft: 0,
      supportNotes: [
        { author: "Support Agent", date: "2026-09-05", text: "Requested guidance on FMCG bulk import CSV." }
      ],
      recentActivity: [
        { time: "15 mins ago", event: "Generated receipt #B-840 (Cash ₹340)", type: "pos" },
        { time: "3 hours ago", event: "Stock replenishment added: 25 items", type: "inventory" }
      ]
    },
    {
      id: "SHP-1003",
      name: "Sanjivani Medical & General",
      ownerName: "Dr. Nilesh Deshmukh",
      phone: "+91 94221 88990",
      email: "sanjivani.med@yahoo.com",
      category: "Medical & Pharma",
      city: "Mumbai",
      state: "Maharashtra",
      pincode: "400053",
      gstin: "27AABCS9988D1Z2",
      plan: "Pro Retailer",
      status: "active",
      signupDate: "2026-07-20",
      lastActive: "4 mins ago",
      lastActiveTimestamp: Date.now() - 4 * 60 * 1000,
      mrr: 999,
      totalBills: 2890,
      posTransactions: 2890,
      ocrUploads: 94,
      inventoryCount: 1240,
      hardware: "Epson TM-T82X, Zebra LS2208 Scanner, Windows PC Terminal",
      trialDaysLeft: 0,
      supportNotes: [
        { author: "Operations Lead", date: "2026-08-10", text: "Requires batch & expiry tracking on 100% medicines. Very happy with Store BI expiry alerts." }
      ],
      recentActivity: [
        { time: "4 mins ago", event: "Expiry alert triggered: 4 syrups expiring in 7 days", type: "alert" },
        { time: "25 mins ago", event: "Checkout sale: ₹860 (Card)", type: "pos" }
      ]
    },
    {
      id: "SHP-1004",
      name: "Mahalaxmi Sweets & Farsan",
      ownerName: "Gopal Shinde",
      phone: "+91 97654 33211",
      email: "gopal.sweets@gmail.com",
      category: "Sweets & Farsan",
      city: "Kolhapur",
      state: "Maharashtra",
      pincode: "416002",
      gstin: "27AAGCS7711K1ZX",
      plan: "Super Kirana Multi-counter",
      status: "active",
      signupDate: "2026-06-10",
      lastActive: "1 hour ago",
      lastActiveTimestamp: Date.now() - 60 * 60 * 1000,
      mrr: 1999,
      totalBills: 4120,
      posTransactions: 4120,
      ocrUploads: 31,
      inventoryCount: 94,
      hardware: "3x Posiflex Counter Terminals, Weighing Scale USB interface",
      trialDaysLeft: 0,
      supportNotes: [
        { author: "Operations Lead", date: "2026-07-01", text: "Setup 3 concurrent billing counters for festive rush." }
      ],
      recentActivity: [
        { time: "1 hour ago", event: "Counter 2 sale: ₹2,400 (UPI)", type: "pos" },
        { time: "5 hours ago", event: "Batch production recorded: 40kg Kaju Katli", type: "inventory" }
      ]
    },
    {
      id: "SHP-1005",
      name: "Apex Footwear & Bags",
      ownerName: "Mohd. Shakeel",
      phone: "+91 99234 55678",
      email: "shakeel.apex@hotmail.com",
      category: "Footwear & Leather",
      city: "Indore",
      state: "Madhya Pradesh",
      pincode: "452001",
      gstin: "23AAMCS4422E1ZQ",
      plan: "Starter Kirana",
      status: "trial",
      signupDate: "2026-10-13",
      lastActive: "2 hours ago",
      lastActiveTimestamp: Date.now() - 120 * 60 * 1000,
      mrr: 0,
      totalBills: 64,
      posTransactions: 60,
      ocrUploads: 6,
      inventoryCount: 240,
      hardware: "Mobile Phone + Bluetooth 58mm Thermal Printer",
      trialDaysLeft: 2,
      supportNotes: [
        { author: "Support Agent", date: "2026-10-14", text: "Guided merchant on shoe size variants (6 to 10 UK)." }
      ],
      recentActivity: [
        { time: "2 hours ago", event: "Sale recorded: Sparx Sandals (₹799)", type: "pos" },
        { time: "1 day ago", event: "Added 45 footwear SKUs with sizes", type: "inventory" }
      ]
    },
    {
      id: "SHP-1006",
      name: "Vidya Stationery & Xerox Corner",
      ownerName: "Sunita Joshi",
      phone: "+91 98901 23456",
      email: "vidyastationery.pune@gmail.com",
      category: "Stationery & Xerox",
      city: "Pune",
      state: "Maharashtra",
      pincode: "411004",
      gstin: "27AAAPJ1290B1ZC",
      plan: "Starter Kirana",
      status: "active",
      signupDate: "2026-08-01",
      lastActive: "35 mins ago",
      lastActiveTimestamp: Date.now() - 35 * 60 * 1000,
      mrr: 499,
      totalBills: 1100,
      posTransactions: 1040,
      ocrUploads: 14,
      inventoryCount: 460,
      hardware: "Laptop + Canon Laser + USB handheld scanner",
      trialDaysLeft: 0,
      supportNotes: [],
      recentActivity: [
        { time: "35 mins ago", event: "Sale: Classmate Notebooks x 6 (₹360)", type: "pos" }
      ]
    },
    {
      id: "SHP-1007",
      name: "Shree Ganesh Provision Stores",
      ownerName: "Anand Gupta",
      phone: "+91 93710 44556",
      email: "anand.ganeshstore@gmail.com",
      category: "Kirana / Grocery",
      city: "Nashik",
      state: "Maharashtra",
      pincode: "422001",
      gstin: "27AABCG3344M1ZK",
      plan: "Pro Retailer",
      status: "active",
      signupDate: "2026-05-18",
      lastActive: "10 mins ago",
      lastActiveTimestamp: Date.now() - 10 * 60 * 1000,
      mrr: 999,
      totalBills: 3200,
      posTransactions: 3050,
      ocrUploads: 82,
      inventoryCount: 520,
      hardware: "Weighing scale integrated POS, 80mm thermal",
      trialDaysLeft: 0,
      supportNotes: [
        { author: "Operations Lead", date: "2026-06-20", text: "High volume merchant in old Nashik bazaar. Requested multi-language receipt." }
      ],
      recentActivity: [
        { time: "10 mins ago", event: "Recorded sale of ₹3,120 (Split: Cash ₹120, UPI ₹3,000)", type: "pos" }
      ]
    },
    {
      id: "SHP-1008",
      name: "Sai Krupa Medicals",
      ownerName: "Kishor Wagh",
      phone: "+91 98600 77881",
      email: "saikrupa.med@rediffmail.com",
      category: "Medical & Pharma",
      city: "Nagpur",
      state: "Maharashtra",
      pincode: "440024",
      gstin: "27AAACW8899N1ZV",
      plan: "Pro Retailer",
      status: "trial",
      signupDate: "2026-10-14",
      lastActive: "5 hours ago",
      lastActiveTimestamp: Date.now() - 300 * 60 * 1000,
      mrr: 0,
      totalBills: 42,
      posTransactions: 42,
      ocrUploads: 8,
      inventoryCount: 310,
      hardware: "Android Phone",
      trialDaysLeft: 3,
      supportNotes: [
        { author: "Support Agent", date: "2026-10-15", text: "Trial ends in 3 days. Send discount upgrade coupon." }
      ],
      recentActivity: [
        { time: "5 hours ago", event: "Uploaded distributor invoice from Cipla", type: "ocr" }
      ]
    },
    {
      id: "SHP-1009",
      name: "Surat Cutpiece & Saree Depot",
      ownerName: "Dharmesh Chokshi",
      phone: "+91 98251 66778",
      email: "dharmesh.chokshi@gmail.com",
      category: "Apparel & Textiles",
      city: "Surat",
      state: "Gujarat",
      pincode: "395002",
      gstin: "24AABCC1122D1ZF",
      plan: "Pro Retailer",
      status: "active",
      signupDate: "2026-07-04",
      lastActive: "50 mins ago",
      lastActiveTimestamp: Date.now() - 50 * 60 * 1000,
      mrr: 999,
      totalBills: 1890,
      posTransactions: 1890,
      ocrUploads: 55,
      inventoryCount: 680,
      hardware: "Desktop PC, Barcode Label Printer, Wireless Scanner",
      trialDaysLeft: 0,
      supportNotes: [],
      recentActivity: [
        { time: "50 mins ago", event: "Checkout bill: Cotton Sarees x 4 (₹4,800)", type: "pos" }
      ]
    },
    {
      id: "SHP-1010",
      name: "Bhavani Hardware & Paints",
      ownerName: "Vikram Pawar",
      phone: "+91 94230 11992",
      email: "bhavani.hardware@gmail.com",
      category: "Hardware & Electricals",
      city: "Solapur",
      state: "Maharashtra",
      pincode: "413001",
      gstin: "27AABCP8833J1ZP",
      plan: "Starter Kirana",
      status: "expired",
      signupDate: "2026-09-10",
      lastActive: "12 days ago",
      lastActiveTimestamp: Date.now() - 12 * 86400 * 1000,
      mrr: 0,
      totalBills: 18,
      posTransactions: 18,
      ocrUploads: 2,
      inventoryCount: 45,
      hardware: "Basic Smartphone",
      trialDaysLeft: 0,
      supportNotes: [
        { author: "Support Agent", date: "2026-09-22", text: "Merchant stopped using after trial. Mentioned shop renovation." }
      ],
      recentActivity: [
        { time: "12 days ago", event: "App session opened for 2 minutes", type: "system" }
      ]
    },
    {
      id: "SHP-1011",
      name: "Kaka Halwai Farsan Mart",
      ownerName: "Pravin Kaka",
      phone: "+91 98223 99001",
      email: "kakahalwai.pune@gmail.com",
      category: "Sweets & Farsan",
      city: "Pune",
      state: "Maharashtra",
      pincode: "411030",
      gstin: "27AAACK5544H1Z0",
      plan: "Super Kirana Multi-counter",
      status: "active",
      signupDate: "2026-04-12",
      lastActive: "1 min ago",
      lastActiveTimestamp: Date.now() - 60 * 1000,
      mrr: 1999,
      totalBills: 5800,
      posTransactions: 5800,
      ocrUploads: 60,
      inventoryCount: 140,
      hardware: "2x NGX billing machines, 1x iPad front counter",
      trialDaysLeft: 0,
      supportNotes: [
        { author: "Operations Lead", date: "2026-05-15", text: "Power user. VIP merchant in Sadashiv Peth." }
      ],
      recentActivity: [
        { time: "1 min ago", event: "Sale: Bakarwadi 500g + Chiwda (₹380 UPI)", type: "pos" }
      ]
    },
    {
      id: "SHP-1012",
      name: "New Bombay Footwear",
      ownerName: "Akram Khan",
      phone: "+91 98920 33441",
      email: "akram.footwear@gmail.com",
      category: "Footwear & Leather",
      city: "Thane",
      state: "Maharashtra",
      pincode: "400601",
      gstin: "27AABCK4411F1ZZ",
      plan: "Starter Kirana",
      status: "suspended",
      signupDate: "2026-08-20",
      lastActive: "25 days ago",
      lastActiveTimestamp: Date.now() - 25 * 86400 * 1000,
      mrr: 0,
      totalBills: 5,
      posTransactions: 5,
      ocrUploads: 1,
      inventoryCount: 12,
      hardware: "Android phone",
      trialDaysLeft: 0,
      supportNotes: [
        { author: "Security / Ops", date: "2026-09-18", text: "Suspended due to chargeback dispute & non-compliant license data." }
      ],
      recentActivity: [
        { time: "25 days ago", event: "Account suspended by Platform Administrator", type: "admin" }
      ]
    },
    {
      id: "SHP-1013",
      name: "City Medical & Surgical",
      ownerName: "Dr. Mahesh Rathi",
      phone: "+91 94222 33118",
      email: "citymed.indore@gmail.com",
      category: "Medical & Pharma",
      city: "Indore",
      state: "Madhya Pradesh",
      pincode: "452003",
      gstin: "23AABCR1234K1ZM",
      plan: "Pro Retailer",
      status: "active",
      signupDate: "2026-07-15",
      lastActive: "18 mins ago",
      lastActiveTimestamp: Date.now() - 18 * 60 * 1000,
      mrr: 999,
      totalBills: 2140,
      posTransactions: 2140,
      ocrUploads: 70,
      inventoryCount: 1650,
      hardware: "POS Billing Terminal, Honeywell Barcode Scanner",
      trialDaysLeft: 0,
      supportNotes: [],
      recentActivity: [
        { time: "18 mins ago", event: "Counter bill #412: ₹1,120 (Cash)", type: "pos" }
      ]
    },
    {
      id: "SHP-1014",
      name: "Tirupati Balaji Kirana",
      ownerName: "Venkatesh Rao",
      phone: "+91 97631 88220",
      email: "balaji.kirana.pune@gmail.com",
      category: "Kirana / Grocery",
      city: "Pune",
      state: "Maharashtra",
      pincode: "411014",
      gstin: "27AAACV9012J1ZL",
      plan: "Starter Kirana",
      status: "trial",
      signupDate: "2026-10-15",
      lastActive: "1 hour ago",
      lastActiveTimestamp: Date.now() - 60 * 60 * 1000,
      mrr: 0,
      totalBills: 12,
      posTransactions: 12,
      ocrUploads: 3,
      inventoryCount: 88,
      hardware: "Android Phone",
      trialDaysLeft: 4,
      supportNotes: [],
      recentActivity: [
        { time: "1 hour ago", event: "New product added: Fortune Sunflower Oil 1L", type: "inventory" }
      ]
    },
    {
      id: "SHP-1015",
      name: "National Book Depot & Xerox",
      ownerName: "Irfan Mansoori",
      phone: "+91 99260 55112",
      email: "national.books@gmail.com",
      category: "Stationery & Xerox",
      city: "Indore",
      state: "Madhya Pradesh",
      pincode: "452002",
      gstin: "23AABCM8890P1ZR",
      plan: "Starter Kirana",
      status: "active",
      signupDate: "2026-08-25",
      lastActive: "2 hours ago",
      lastActiveTimestamp: Date.now() - 120 * 60 * 1000,
      mrr: 499,
      totalBills: 640,
      posTransactions: 620,
      ocrUploads: 9,
      inventoryCount: 390,
      hardware: "Desktop + HP Barcode Gun",
      trialDaysLeft: 0,
      supportNotes: [],
      recentActivity: [
        { time: "2 hours ago", event: "Sale: Parker Pen Gift Set (₹450 UPI)", type: "pos" }
      ]
    },
    {
      id: "SHP-1016",
      name: "Modern Footwear Junction",
      ownerName: "Sanjay Solanki",
      phone: "+91 98261 44009",
      email: "modernfootwear.solanki@gmail.com",
      category: "Footwear & Leather",
      city: "Nagpur",
      state: "Maharashtra",
      pincode: "440012",
      gstin: "27AAGCS1109Q1ZW",
      plan: "Pro Retailer",
      status: "active",
      signupDate: "2026-06-28",
      lastActive: "40 mins ago",
      lastActiveTimestamp: Date.now() - 40 * 60 * 1000,
      mrr: 999,
      totalBills: 1530,
      posTransactions: 1510,
      ocrUploads: 38,
      inventoryCount: 420,
      hardware: "Tablet + Sunmi V2 Pro All-in-one terminal",
      trialDaysLeft: 0,
      supportNotes: [],
      recentActivity: [
        { time: "40 mins ago", event: "Sale: Red Tape Leather Shoes (₹1,899 Card)", type: "pos" }
      ]
    },
    {
      id: "SHP-1017",
      name: "Navrang Sweet Mart",
      ownerName: "Deepak Soni",
      phone: "+91 94250 88771",
      email: "navrangsweets@gmail.com",
      category: "Sweets & Farsan",
      city: "Nashik",
      state: "Maharashtra",
      pincode: "422002",
      gstin: "27AABCS3321R1ZT",
      plan: "Pro Retailer",
      status: "active",
      signupDate: "2026-07-10",
      lastActive: "15 mins ago",
      lastActiveTimestamp: Date.now() - 15 * 60 * 1000,
      mrr: 999,
      totalBills: 2400,
      posTransactions: 2400,
      ocrUploads: 18,
      inventoryCount: 75,
      hardware: "Touchscreen POS with thermal slip printer",
      trialDaysLeft: 0,
      supportNotes: [],
      recentActivity: [
        { time: "15 mins ago", event: "Sale: Motichoor Ladoo 1kg (₹480 Cash)", type: "pos" }
      ]
    },
    {
      id: "SHP-1018",
      name: "Prabhat Daily Needs & Kirana",
      ownerName: "Vikas Dhawale",
      phone: "+91 98230 77123",
      email: "prabhatkirana.amravati@gmail.com",
      category: "Kirana / Grocery",
      city: "Amravati",
      state: "Maharashtra",
      pincode: "444601",
      gstin: "27AAACD9911A1ZY",
      plan: "Starter Kirana",
      status: "trial",
      signupDate: "2026-10-16",
      lastActive: "3 hours ago",
      lastActiveTimestamp: Date.now() - 180 * 60 * 1000,
      mrr: 0,
      totalBills: 8,
      posTransactions: 8,
      ocrUploads: 1,
      inventoryCount: 65,
      hardware: "Android Phone",
      trialDaysLeft: 5,
      supportNotes: [
        { author: "Support Agent", date: "2026-10-16", text: "New signup from Vidarbha retail campaign." }
      ],
      recentActivity: [
        { time: "3 hours ago", event: "First bill created: ₹140", type: "pos" }
      ]
    },
    {
      id: "SHP-1019",
      name: "Geeta Medical Hall",
      ownerName: "Ashok Agrawal",
      phone: "+91 98270 33882",
      email: "geetamedical.indore@gmail.com",
      category: "Medical & Pharma",
      city: "Indore",
      state: "Madhya Pradesh",
      pincode: "452009",
      gstin: "23AABCA4433C1ZX",
      plan: "Pro Retailer",
      status: "active",
      signupDate: "2026-05-30",
      lastActive: "8 mins ago",
      lastActiveTimestamp: Date.now() - 8 * 60 * 1000,
      mrr: 999,
      totalBills: 3410,
      posTransactions: 3410,
      ocrUploads: 110,
      inventoryCount: 1890,
      hardware: "Dell Desktop, TVS Printer, Symbol Barcode Gun",
      trialDaysLeft: 0,
      supportNotes: [],
      recentActivity: [
        { time: "8 mins ago", event: "Bill #3410 generated (₹420)", type: "pos" }
      ]
    },
    {
      id: "SHP-1020",
      name: "Vardhman Electricals & Hardware",
      ownerName: "Mahaveer Jain",
      phone: "+91 94220 55441",
      email: "vardhman.jain@gmail.com",
      category: "Hardware & Electricals",
      city: "Jalgaon",
      state: "Maharashtra",
      pincode: "425001",
      gstin: "27AABCJ7788D1Z9",
      plan: "Starter Kirana",
      status: "active",
      signupDate: "2026-08-11",
      lastActive: "1 hour ago",
      lastActiveTimestamp: Date.now() - 60 * 60 * 1000,
      mrr: 499,
      totalBills: 720,
      posTransactions: 700,
      ocrUploads: 19,
      inventoryCount: 310,
      hardware: "Laptop + Bluetooth Receipt Printer",
      trialDaysLeft: 0,
      supportNotes: [],
      recentActivity: [
        { time: "1 hour ago", event: "Sale: Polycab Wires 90m + 3x switches (₹1,620)", type: "pos" }
      ]
    },
    {
      id: "SHP-1021",
      name: "Gajanan Super Bazaar",
      ownerName: "Sunil Kale",
      phone: "+91 98810 99443",
      email: "gajanan.bazaar@gmail.com",
      category: "Kirana / Grocery",
      city: "Aurangabad",
      state: "Maharashtra",
      pincode: "431001",
      gstin: "27AABCK6611M1ZS",
      plan: "Super Kirana Multi-counter",
      status: "active",
      signupDate: "2026-06-01",
      lastActive: "12 mins ago",
      lastActiveTimestamp: Date.now() - 12 * 60 * 1000,
      mrr: 1999,
      totalBills: 4890,
      posTransactions: 4890,
      ocrUploads: 74,
      inventoryCount: 890,
      hardware: "Dual billing PC counters, Zebra Desktop Scanners",
      trialDaysLeft: 0,
      supportNotes: [
        { author: "Operations Lead", date: "2026-06-15", text: "Multi-counter setup completed. Zero downtime reported." }
      ],
      recentActivity: [
        { time: "12 mins ago", event: "Checkout bill: ₹2,180 (UPI)", type: "pos" }
      ]
    },
    {
      id: "SHP-1022",
      name: "Saraswati Book & Xerox Center",
      ownerName: "Mangesh Kulkarni",
      phone: "+91 97640 22119",
      email: "saraswatibooks.kolhapur@gmail.com",
      category: "Stationery & Xerox",
      city: "Kolhapur",
      state: "Maharashtra",
      pincode: "416003",
      gstin: "27AAAPK8844K1ZR",
      plan: "Starter Kirana",
      status: "active",
      signupDate: "2026-09-05",
      lastActive: "45 mins ago",
      lastActiveTimestamp: Date.now() - 45 * 60 * 1000,
      mrr: 499,
      totalBills: 490,
      posTransactions: 470,
      ocrUploads: 11,
      inventoryCount: 280,
      hardware: "Desktop + Epson Thermal",
      trialDaysLeft: 0,
      supportNotes: [],
      recentActivity: [
        { time: "45 mins ago", event: "Sale: Engineering Drawing Sheets x 10 (₹200)", type: "pos" }
      ]
    },
    {
      id: "SHP-1023",
      name: "KGN Footwear & Chappal House",
      ownerName: "Shafiq Qureshi",
      phone: "+91 98221 66550",
      email: "kgnfootwear.solapur@gmail.com",
      category: "Footwear & Leather",
      city: "Solapur",
      state: "Maharashtra",
      pincode: "413002",
      gstin: "27AABCQ9933L1ZH",
      plan: "Starter Kirana",
      status: "trial",
      signupDate: "2026-10-14",
      lastActive: "6 hours ago",
      lastActiveTimestamp: Date.now() - 360 * 60 * 1000,
      mrr: 0,
      totalBills: 24,
      posTransactions: 24,
      ocrUploads: 4,
      inventoryCount: 160,
      hardware: "Android Phone",
      trialDaysLeft: 3,
      supportNotes: [],
      recentActivity: [
        { time: "6 hours ago", event: "Sale: Paragon Slippers x 2 (₹420 Cash)", type: "pos" }
      ]
    },
    {
      id: "SHP-1024",
      name: "Krishna Dairy & Kirana",
      ownerName: "Baban Yadav",
      phone: "+91 98500 11234",
      email: "krishnadairy.satara@gmail.com",
      category: "Kirana / Grocery",
      city: "Satara",
      state: "Maharashtra",
      pincode: "415001",
      gstin: "27AAACY4411P1ZK",
      plan: "Starter Kirana",
      status: "active",
      signupDate: "2026-08-18",
      lastActive: "25 mins ago",
      lastActiveTimestamp: Date.now() - 25 * 60 * 1000,
      mrr: 499,
      totalBills: 1320,
      posTransactions: 1290,
      ocrUploads: 29,
      inventoryCount: 195,
      hardware: "Phone + Portable Bluetooth Printer",
      trialDaysLeft: 0,
      supportNotes: [],
      recentActivity: [
        { time: "25 mins ago", event: "Sale: Amul Butter 500g + Milk 2L (₹390 UPI)", type: "pos" }
      ]
    },
    {
      id: "SHP-1025",
      name: "Shri Ram Medical Store",
      ownerName: "Harish Sharma",
      phone: "+91 94251 77665",
      email: "shriram.medicals@gmail.com",
      category: "Medical & Pharma",
      city: "Ujjain",
      state: "Madhya Pradesh",
      pincode: "456001",
      gstin: "23AABCS8811E1ZU",
      plan: "Pro Retailer",
      status: "active",
      signupDate: "2026-07-22",
      lastActive: "2 mins ago",
      lastActiveTimestamp: Date.now() - 2 * 60 * 1000,
      mrr: 999,
      totalBills: 2750,
      posTransactions: 2750,
      ocrUploads: 88,
      inventoryCount: 1410,
      hardware: "PC + POS Barcode Terminal",
      trialDaysLeft: 0,
      supportNotes: [],
      recentActivity: [
        { time: "2 mins ago", event: "Prescription billing: ₹680 (UPI)", type: "pos" }
      ]
    },
    {
      id: "SHP-1026",
      name: "Ahuja Cloth Store",
      ownerName: "Mukesh Ahuja",
      phone: "+91 98260 22338",
      email: "ahuja.textiles@gmail.com",
      category: "Apparel & Textiles",
      city: "Indore",
      state: "Madhya Pradesh",
      pincode: "452007",
      gstin: "23AABCA9944F1ZT",
      plan: "Starter Kirana",
      status: "active",
      signupDate: "2026-09-02",
      lastActive: "1 hour ago",
      lastActiveTimestamp: Date.now() - 60 * 60 * 1000,
      mrr: 499,
      totalBills: 510,
      posTransactions: 490,
      ocrUploads: 14,
      inventoryCount: 340,
      hardware: "Laptop + Thermal printer",
      trialDaysLeft: 0,
      supportNotes: [],
      recentActivity: [
        { time: "1 hour ago", event: "Sale: Raymond Shirting 2.5m (₹1,250)", type: "pos" }
      ]
    },
    {
      id: "SHP-1027",
      name: "Rajeshwar General Store",
      ownerName: "Rajesh Gaikwad",
      phone: "+91 99220 88114",
      email: "rajeshwar.sangli@gmail.com",
      category: "Kirana / Grocery",
      city: "Sangli",
      state: "Maharashtra",
      pincode: "416416",
      gstin: "27AABCG5511B1ZX",
      plan: "Starter Kirana",
      status: "expired",
      signupDate: "2026-09-12",
      lastActive: "18 days ago",
      lastActiveTimestamp: Date.now() - 18 * 86400 * 1000,
      mrr: 0,
      totalBills: 26,
      posTransactions: 26,
      ocrUploads: 3,
      inventoryCount: 70,
      hardware: "Mobile only",
      trialDaysLeft: 0,
      supportNotes: [
        { author: "Support Agent", date: "2026-09-24", text: "SMS reminder sent for subscription renewal." }
      ],
      recentActivity: [
        { time: "18 days ago", event: "Trial expired", type: "system" }
      ]
    },
    {
      id: "SHP-1028",
      name: "Maratha Bazaar Wholesale Kirana",
      ownerName: "Tanaji Sawant",
      phone: "+91 98229 44331",
      email: "marathabazaar.pune@gmail.com",
      category: "Kirana / Grocery",
      city: "Pune",
      state: "Maharashtra",
      pincode: "411037",
      gstin: "27AABCS7722P1ZY",
      plan: "Super Kirana Multi-counter",
      status: "active",
      signupDate: "2026-03-15",
      lastActive: "Just now",
      lastActiveTimestamp: Date.now() - 30 * 1000,
      mrr: 1999,
      totalBills: 7600,
      posTransactions: 7600,
      ocrUploads: 142,
      inventoryCount: 1100,
      hardware: "3x Windows POS Counters, Handheld wireless 2D scanners",
      trialDaysLeft: 0,
      supportNotes: [
        { author: "Operations Lead", date: "2026-04-01", text: "Highest GMV merchant in Pune Market Yard area. Zero complaints." }
      ],
      recentActivity: [
        { time: "30s ago", event: "Checkout bill: Rice 25kg + Sugar 10kg (₹2,840 Cash)", type: "pos" }
      ]
    }
  ];

  // 2. SUBSCRIPTION PLANS
  const plans = [
    {
      id: "plan-starter",
      name: "Starter Kirana",
      badge: "Popular for Single Shop",
      priceMonthlyPaise: 49900,
      priceAnnualPaise: 499000,
      formattedMonthly: "₹499",
      formattedAnnual: "₹4,990",
      trialDays: 5,
      features: [
        "1 Billing Counter (Terminal)",
        "Up to 500 Inventory Items",
        "Unlimited POS Billing & Receipts",
        "WhatsApp / SMS Digital Slips",
        "30 AI Bill OCR Scans / mo",
        "Daily Sales & Profit Breakdown"
      ],
      limits: { counters: 1, items: 500, ocrScans: 30, multiUser: false },
      subscriberCount: 18,
      status: "active"
    },
    {
      id: "plan-pro",
      name: "Pro Retailer",
      badge: "Best for Growing Shops",
      priceMonthlyPaise: 99900,
      priceAnnualPaise: 999000,
      formattedMonthly: "₹999",
      formattedAnnual: "₹9,990",
      trialDays: 7,
      features: [
        "2 Billing Counters",
        "Up to 2,500 Inventory Items",
        "Batch & Expiry Date Intelligence",
        "Weighing Scale & Barcode Integration",
        "150 AI Bill OCR Scans / mo",
        "Profit Waterfall & Dead Stock Alerts",
        "GST Invoice Generator & GSTR-1 Prep"
      ],
      limits: { counters: 2, items: 2500, ocrScans: 150, multiUser: true },
      subscriberCount: 8,
      status: "active"
    },
    {
      id: "plan-super",
      name: "Super Kirana Multi-counter",
      badge: "Enterprise Multi-counter",
      priceMonthlyPaise: 199900,
      priceAnnualPaise: 1999000,
      formattedMonthly: "₹1,999",
      formattedAnnual: "₹19,990",
      trialDays: 10,
      features: [
        "Up to 5 Billing Counters",
        "Unlimited Inventory Items",
        "Multi-Staff Cashier Permissions",
        "Unlimited AI Invoice Extraction",
        "Priority 24/7 WhatsApp & Phone Support",
        "Automated Nightly Cloud Backup & Audit",
        "Custom Logo On Receipts & Thermal Slips"
      ],
      limits: { counters: 5, items: 999999, ocrScans: 999999, multiUser: true },
      subscriberCount: 4,
      status: "active"
    }
  ];

  // 3. TRANSACTIONS & PAYMENTS LEDGER (Recent 12)
  const payments = [
    { id: "TXN-9081", shopName: "Maratha Bazaar Wholesale", owner: "Tanaji Sawant", plan: "Super Kirana", amount: 1999, date: "2026-10-15 11:20", gateway: "Razorpay (UPI AutoPay)", ref: "pay_Rzp9081xQ", status: "success", gstInvoice: "INV-2026-1081" },
    { id: "TXN-9080", shopName: "Prapti Kirana & Superstore", owner: "Prapti Rudrawar", plan: "Pro Retailer", amount: 999, date: "2026-10-15 09:14", gateway: "Razorpay (Netbanking)", ref: "pay_Rzp9080bM", status: "success", gstInvoice: "INV-2026-1080" },
    { id: "TXN-9079", shopName: "Kaka Halwai Farsan Mart", owner: "Pravin Kaka", plan: "Super Kirana", amount: 1999, date: "2026-10-14 16:45", gateway: "Razorpay (Card)", ref: "pay_Rzp9079zL", status: "success", gstInvoice: "INV-2026-1079" },
    { id: "TXN-9078", shopName: "Apex Footwear & Bags", owner: "Mohd. Shakeel", plan: "Starter Kirana", amount: 499, date: "2026-10-14 14:10", gateway: "Cashfree (UPI)", ref: "cf_90781aB", status: "failed", gstInvoice: "-", reason: "Bank server timeout (NPCI error)" },
    { id: "TXN-9077", shopName: "Sanjivani Medical", owner: "Dr. Nilesh Deshmukh", plan: "Pro Retailer", amount: 999, date: "2026-10-13 18:30", gateway: "Razorpay (UPI AutoPay)", ref: "pay_Rzp9077kP", status: "success", gstInvoice: "INV-2026-1077" },
    { id: "TXN-9076", shopName: "Gajanan Super Bazaar", owner: "Sunil Kale", plan: "Super Kirana", amount: 1999, date: "2026-10-12 10:05", gateway: "Razorpay (UPI)", ref: "pay_Rzp9076wX", status: "success", gstInvoice: "INV-2026-1076" },
    { id: "TXN-9075", shopName: "Surat Cutpiece Depot", owner: "Dharmesh Chokshi", plan: "Pro Retailer", amount: 999, date: "2026-10-10 12:40", gateway: "Razorpay (Card)", ref: "pay_Rzp9075mQ", status: "success", gstInvoice: "INV-2026-1075" },
    { id: "TXN-9074", shopName: "Shree Ganesh Provision", owner: "Anand Gupta", plan: "Pro Retailer", amount: 999, date: "2026-10-09 17:15", gateway: "Razorpay (UPI)", ref: "pay_Rzp9074yT", status: "success", gstInvoice: "INV-2026-1074" },
    { id: "TXN-9073", shopName: "Bhavani Hardware", owner: "Vikram Pawar", plan: "Starter Kirana", amount: 499, date: "2026-10-08 08:30", gateway: "Cashfree (UPI)", ref: "cf_90738rE", status: "failed", gstInvoice: "-", reason: "Mandate revoked by merchant" },
    { id: "TXN-9072", shopName: "Vidya Stationery", owner: "Sunita Joshi", plan: "Starter Kirana", amount: 499, date: "2026-10-05 15:22", gateway: "Razorpay (UPI AutoPay)", ref: "pay_Rzp9072uV", status: "success", gstInvoice: "INV-2026-1072" },
    { id: "TXN-9071", shopName: "Ramesh Kirana", owner: "Ramesh Patel", plan: "Starter Kirana", amount: 499, date: "2026-10-01 11:00", gateway: "Razorpay (Netbanking)", ref: "pay_Rzp9071pA", status: "success", gstInvoice: "INV-2026-1071" },
    { id: "TXN-9070", shopName: "New Bombay Footwear", owner: "Akram Khan", plan: "Starter Kirana", amount: 499, date: "2026-09-28 14:15", gateway: "Razorpay (Card)", ref: "pay_Rzp9070nK", status: "refunded", gstInvoice: "INV-2026-1070-CN", reason: "Chargeback requested & approved" }
  ];

  // 4. POS MONITORING & ANOMALIES
  const posAnomalies = [
    {
      id: "ANM-201",
      shopId: "SHP-1007",
      shopName: "Shree Ganesh Provision",
      type: "Extreme Bill Amount",
      severity: "warning",
      detail: "Single cash transaction recorded of ₹1,48,500. Exceeds standard ₹20,000 threshold for retail kirana.",
      timestamp: "Today, 11:42 AM",
      status: "under_review"
    },
    {
      id: "ANM-202",
      shopId: "SHP-1002",
      shopName: "Ramesh Kirana & General",
      type: "Duplicate Bill Sequence",
      severity: "critical",
      detail: "Bill number #B-838 generated twice within 4 seconds with identical item lines (Fortune Oil 1L x 2).",
      timestamp: "Today, 09:12 AM",
      status: "open"
    },
    {
      id: "ANM-203",
      shopId: "SHP-1009",
      shopName: "Surat Cutpiece Depot",
      type: "Negative Inventory Depletion",
      severity: "warning",
      detail: "SKU 'Bandhani Georgette Saree' sold while stock showed -3 units. Stock count needs reconciliation.",
      timestamp: "Yesterday, 07:15 PM",
      status: "resolved"
    }
  ];

  // 5. STUCK ONBOARDING SHOPS (Registered > 3 days, 0 sales)
  const stuckOnboarding = [
    {
      shopId: "SHP-1010",
      shopName: "Bhavani Hardware & Paints",
      owner: "Vikram Pawar",
      phone: "+91 94230 11992",
      city: "Solapur",
      daysSinceSignup: 37,
      inventoryAdded: 45,
      salesCount: 0,
      stage: "Step 2: Inventory Catalog",
      nudgeSent: "2026-10-12"
    },
    {
      shopId: "SHP-1027",
      shopName: "Rajeshwar General Store",
      owner: "Rajesh Gaikwad",
      phone: "+91 99220 88114",
      city: "Sangli",
      daysSinceSignup: 35,
      inventoryAdded: 70,
      salesCount: 0,
      stage: "Step 3: Billing Setup",
      nudgeSent: "2026-10-14"
    }
  ];

  // 6. DATA UPLOAD & AI OCR REVIEW QUEUE
  const ocrQueue = [
    {
      id: "OCR-5501",
      shopId: "SHP-1001",
      shopName: "Prapti Kirana & Superstore",
      invoiceType: "Printed Distributor Invoice",
      supplier: "Hindustan Unilever Limited (HUL)",
      uploadTime: "Today, 10:14 AM",
      processingDuration: "1.2s",
      confidence: 98.4,
      status: "auto_approved",
      itemsExtracted: 14,
      totalAmountPaise: 1845000,
      formattedAmount: "₹18,450",
      extractedSample: [
        { name: "Lifebuoy Total Soap 125g (Pack of 4)", qty: 24, cost: 110.0, mrp: 135.0 },
        { name: "Surf Excel Easy Wash 1kg", qty: 36, cost: 122.5, mrp: 145.0 },
        { name: "Red Label Tea 500g", qty: 20, cost: 240.0, mrp: 280.0 },
        { name: "Kissan Mixed Fruit Jam 500g", qty: 12, cost: 135.0, mrp: 160.0 }
      ]
    },
    {
      id: "OCR-5502",
      shopId: "SHP-1003",
      shopName: "Sanjivani Medical & General",
      invoiceType: "Handwritten Counter Parchaa / Slip",
      supplier: "Local Wholesaler (Nagpur Mandi)",
      uploadTime: "Today, 08:35 AM",
      processingDuration: "2.4s",
      confidence: 78.2,
      status: "needs_manual_review",
      itemsExtracted: 6,
      totalAmountPaise: 642000,
      formattedAmount: "₹6,420",
      extractedSample: [
        { name: "Dolo 650mg Strip (15 tabs)", qty: 50, cost: 26.5, mrp: 34.0, flag: "Low confidence on quantity" },
        { name: "Azithromycin 500mg Strip", qty: 20, cost: 82.0, mrp: 110.0 },
        { name: "Pantocid DSR Capsule", qty: 30, cost: 145.0, mrp: 195.0 }
      ]
    },
    {
      id: "OCR-5503",
      shopId: "SHP-1008",
      shopName: "Sai Krupa Medicals",
      invoiceType: "Tax Invoice PDF / Thermal",
      supplier: "Sun Pharma Distributors",
      uploadTime: "Yesterday, 04:20 PM",
      processingDuration: "1.1s",
      confidence: 99.1,
      status: "auto_approved",
      itemsExtracted: 22,
      totalAmountPaise: 4218000,
      formattedAmount: "₹42,180",
      extractedSample: [
        { name: "Volini Gel 50g", qty: 30, cost: 125.0, mrp: 155.0 },
        { name: "Revital H Daily Caps (30s)", qty: 15, cost: 270.0, mrp: 340.0 }
      ]
    },
    {
      id: "OCR-5504",
      shopId: "SHP-1005",
      shopName: "Apex Footwear & Bags",
      invoiceType: "Blurry Mobile Photo",
      supplier: "Paragon Footwear Agency",
      uploadTime: "Yesterday, 02:10 PM",
      processingDuration: "3.8s",
      confidence: 42.0,
      status: "failed",
      itemsExtracted: 0,
      totalAmountPaise: 0,
      formattedAmount: "₹0",
      failureReason: "Severe motion blur & glare over subtotal column. Recommended merchant retake with flash."
    }
  ];

  // 7. SUPPORT TICKETS
  const tickets = [
    {
      id: "TCK-801",
      shopId: "SHP-1005",
      shopName: "Apex Footwear & Bags",
      owner: "Mohd. Shakeel",
      phone: "+91 99234 55678",
      subject: "How to add shoe size variations (UK 6, 7, 8, 9) in bulk?",
      priority: "medium",
      status: "open",
      assignee: "Pooja Kulkarni (Support)",
      theme: "inventory",
      createdAt: "Today, 10:20 AM",
      slaHoursLeft: 3.5,
      messages: [
        { sender: "Mohd. Shakeel", time: "10:20 AM", text: "Namaste team, I am entering Sparx slippers. Each comes in 5 sizes. Can I create one master item with sizes or do I enter 5 separate items?" },
        { sender: "Pooja (Support)", time: "10:35 AM", text: "Hello Shakeel ji, you can use the 'Variant Matrix' toggle on the Add Product screen. Let me share a quick 1-minute video demo." }
      ]
    },
    {
      id: "TCK-802",
      shopId: "SHP-1002",
      shopName: "Ramesh Kirana & General",
      owner: "Ramesh Patel",
      phone: "+91 98220 11445",
      subject: "TVS Thermal printer printing blank slips after Windows update",
      priority: "high",
      status: "in_progress",
      assignee: "Rahul Sharma (Hardware Ops)",
      theme: "thermal_printer",
      createdAt: "Today, 08:45 AM",
      slaHoursLeft: 1.2,
      messages: [
        { sender: "Ramesh Patel", time: "08:45 AM", text: "Paper is coming out but no letters are printed. Only plain white." },
        { sender: "Rahul (Support)", time: "09:00 AM", text: "Ramesh bhai, please check if the thermal paper roll is placed upside down (shiny side facing thermal head). Also checking baud rate settings." }
      ]
    },
    {
      id: "TCK-803",
      shopId: "SHP-1003",
      shopName: "Sanjivani Medical",
      owner: "Dr. Nilesh Deshmukh",
      phone: "+91 94221 88990",
      subject: "Expiry alert notification: Can I get SMS alert 30 days prior?",
      priority: "low",
      status: "resolved",
      assignee: "Amit Jadhav (Product)",
      theme: "expiry_alerts",
      createdAt: "Yesterday, 03:10 PM",
      slaHoursLeft: 0,
      messages: [
        { sender: "Dr. Nilesh", time: "Yesterday, 03:10 PM", text: "Can Store BI send WhatsApp alert 30 days before medicines expire so I can return them to distributor?" },
        { sender: "Amit (Product)", time: "Yesterday, 04:00 PM", text: "Yes Dr. Nilesh, enabled WhatsApp 30-day clearance digest in your store settings. Done!" }
      ]
    },
    {
      id: "TCK-804",
      shopId: "SHP-1011",
      shopName: "Kaka Halwai Farsan Mart",
      owner: "Pravin Kaka",
      phone: "+91 98223 99001",
      subject: "Need GSTR-1 B2C sales summary export for accountant",
      priority: "medium",
      status: "open",
      assignee: "Pooja Kulkarni (Support)",
      theme: "pricing_gst",
      createdAt: "Yesterday, 11:30 AM",
      slaHoursLeft: 8.0,
      messages: [
        { sender: "Pravin Kaka", time: "Yesterday, 11:30 AM", text: "My CA needs monthly sales Excel with 5% and 12% GST breakdown." }
      ]
    }
  ];

  // 8. BROADCAST ANNOUNCEMENTS & TEMPLATES
  const broadcasts = [
    {
      id: "BRD-101",
      title: "Diwali Festive Rush Guide: Barcode Fast-Checkout Mode",
      channel: "In-App Banner + WhatsApp",
      targetSegment: "Active Paid Merchants (Pune & Mumbai)",
      sentDate: "2026-10-10",
      deliveredCount: 24,
      readRate: "91.6%",
      status: "completed"
    },
    {
      id: "BRD-102",
      title: "Trial Ending Alert: Lock in ₹499/mo Kirana Rate Today",
      channel: "WhatsApp + Email",
      targetSegment: "Merchants with Trials Ending ≤ 48 Hours",
      sentDate: "2026-10-15",
      deliveredCount: 14,
      readRate: "85.7%",
      status: "active_recurring"
    },
    {
      id: "BRD-103",
      title: "New Feature: Google Gemini 2.5 Flash Instant Invoice OCR",
      channel: "In-App Modal Notification",
      targetSegment: "All Registered Stores",
      sentDate: "2026-10-01",
      deliveredCount: 28,
      readRate: "96.4%",
      status: "completed"
    }
  ];

  // 9. PRODUCT CATALOG STARTER TEMPLATES
  const catalogTemplates = [
    {
      category: "Kirana / Grocery",
      icon: "shopping_basket",
      itemCount: 420,
      description: "Top 400 Indian FMCG items (Atta, Dal, Edible Oil, Spices, Soaps, Detergents, Biscuits, Tea) with default HSN & GST 5%/12%/18% codes.",
      popularBrands: "Amul, Fortune, Aashirvaad, Tata, Parle, Britannia, HUL, ITC, MDH, Everest"
    },
    {
      category: "Medical & Pharma",
      icon: "medication",
      itemCount: 650,
      description: "Essential OTC & prescription medicines with Batch number, Expiry date, Schedule H flags, and standard distributor margins.",
      popularBrands: "Cipla, Sun Pharma, Dr. Reddy's, Mankind, Abbott, Torrent, Alkem"
    },
    {
      category: "Footwear & Leather",
      icon: "footprint",
      itemCount: 180,
      description: "Footwear SKU matrix with Size presets (UK 6 to 11), Color variants, and MRP brackets.",
      popularBrands: "Sparx, Bata, Paragon, Campus, Relaxo, Action, Flite"
    },
    {
      category: "Stationery & Xerox",
      icon: "edit_note",
      itemCount: 260,
      description: "School and office supplies with Unit conversions (Pcs, Box, Ream, Dozen).",
      popularBrands: "Classmate, Navneet, Cello, Camlin, Reynolds, JK Copier, Kangaro"
    },
    {
      category: "Sweets & Farsan",
      icon: "bakery_dining",
      itemCount: 95,
      description: "Perishable sweets with shelf-life tracking (2 to 7 days), Kg/Gm weight pricing, and festive gift boxes.",
      popularBrands: "In-house Kitchen, Haldiram, Bikaji, Chitale Bandhu"
    }
  ];

  // 10. SYSTEM HEALTH & ERROR LOGS
  const systemHealth = {
    uptime: "99.98%",
    apiLatencyMs: 42,
    errorRate: "0.04%",
    activeWebSocketConnections: 146,
    dbConnections: "12 / 50 (SQLite pool)",
    databaseSize: "92 MB",
    lastBackupTimestamp: "Today, 04:00 AM (Automated S3 Glacier snapshot)",
    geminiOcrStatus: "Operational (Latency 1.4s avg)",
    razorpayWebhookStatus: "Healthy (100% 200 OK)",
    emailSmtpStatus: "Operational (SendGrid API)"
  };

  const errorLogs = [
    {
      id: "ERR-9941",
      timestamp: "2026-10-17 10:14:22",
      severity: "WARNING",
      endpoint: "POST /auth/google/url",
      message: "OAuth state cookie not found on callback attempt. Potential CSRF or stale browser tab.",
      ip: "157.34.88.19",
      shopId: "SHP-1005"
    },
    {
      id: "ERR-9940",
      timestamp: "2026-10-17 08:35:10",
      severity: "CRITICAL",
      endpoint: "POST /api/ocr/extract",
      message: "Gemini Vision API timeout (Exceeded 8000ms deadline) on 12MB raw image upload. Retried successfully.",
      ip: "103.21.144.92",
      shopId: "SHP-1003"
    },
    {
      id: "ERR-9939",
      timestamp: "2026-10-16 19:42:01",
      severity: "ERROR",
      endpoint: "POST /api/sales/checkout",
      message: "SQLite operational error: database is locked for 45ms during concurrent batch checkout. Auto-recovered.",
      ip: "114.143.19.2",
      shopId: "SHP-1028"
    }
  ];

  // 11. AUDIT LOGS (Who did what, when, IP)
  const auditLogs = [
    { id: "AUD-401", admin: "admin@storebi.com (Operations Lead)", action: "Extended Free Trial (+7 days)", target: "Apex Footwear & Bags (SHP-1005)", timestamp: "Today, 10:45 AM", ip: "103.24.120.5" },
    { id: "AUD-402", admin: "admin@storebi.com (Operations Lead)", action: "Updated Subscription Plan Price", target: "Pro Retailer Plan -> ₹999/mo", timestamp: "Today, 09:30 AM", ip: "103.24.120.5" },
    { id: "AUD-403", admin: "pooja@storebi.com (Support Agent)", action: "Created Support Ticket", target: "TCK-801 (Mohd. Shakeel)", timestamp: "Today, 10:20 AM", ip: "49.36.18.99" },
    { id: "AUD-404", admin: "finance@storebi.com (Finance Lead)", action: "Approved Payment Refund (₹499)", target: "New Bombay Footwear (TXN-9070)", timestamp: "Yesterday, 04:15 PM", ip: "122.161.42.11" },
    { id: "AUD-405", admin: "admin@storebi.com (Operations Lead)", action: "Suspended Store Account", target: "New Bombay Footwear (SHP-1012)", timestamp: "2026-09-18 16:30", ip: "103.24.120.5" }
  ];

  // 12. ADMIN TEAM & ROLES
  const adminUsers = [
    { id: "ADM-01", name: "Operations Lead", email: "admin@storebi.com", role: "Super Admin", status: "Active", twoFactorEnabled: true, lastLogin: "Just now" },
    { id: "ADM-02", name: "Pooja Kulkarni", email: "pooja.support@storebi.com", role: "Support Agent", status: "Active", twoFactorEnabled: true, lastLogin: "30 mins ago" },
    { id: "ADM-03", name: "Milind Deshpande", email: "milind.finance@storebi.com", role: "Finance", status: "Active", twoFactorEnabled: true, lastLogin: "2 hours ago" },
    { id: "ADM-04", name: "Ananya Sen", email: "ananya.analyst@storebi.com", role: "Read-only Analyst", status: "Active", twoFactorEnabled: false, lastLogin: "Yesterday" }
  ];

  // Helper Indian Currency Formatter (₹1,25,000)
  function formatINR(val) {
    if (val === null || val === undefined || isNaN(val)) return "₹0";
    const num = Math.round(val);
    const isNeg = num < 0;
    const absStr = Math.abs(num).toString();
    if (absStr.length <= 3) {
      return (isNeg ? "-₹" : "₹") + absStr;
    }
    const lastThree = absStr.substring(absStr.length - 3);
    const otherNumbers = absStr.substring(0, absStr.length - 3);
    const formatted = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + lastThree;
    return (isNeg ? "-₹" : "₹") + formatted;
  }

  return {
    shops,
    plans,
    payments,
    posAnomalies,
    stuckOnboarding,
    ocrQueue,
    tickets,
    broadcasts,
    catalogTemplates,
    systemHealth,
    errorLogs,
    auditLogs,
    adminUsers,
    formatINR
  };
})();
