/**
 * Inventra Retail Intelligence Landing Page Content Configuration
 * Easily update headlines, copy, stats, features, pricing and links in one place.
 */

export interface NavItem {
  label: string;
  href: string;
}

export interface MetricItem {
  value: string;
  label: string;
  highlight?: boolean;
}

export interface FeatureItem {
  id: string;
  title: string;
  description: string;
  badge: string;
  icon: string;
  accent?: 'teal' | 'rose' | 'emerald';
}

export interface PricingPlan {
  id: string;
  name: string;
  price: string;
  period?: string;
  description: string;
  features: string[];
  ctaLabel: string;
  ctaHref: string;
  isPopular?: boolean;
}

export const landingContent = {
  meta: {
    title: 'Inventra Intel — Modern Retail & Supermarket Business Intelligence',
    description:
      'Automate inventory velocity, capture multi-counter billing terminals, calculate exact net margin per SKU, and predict stockouts. Built explicitly for supermarkets and grocery chains.',
  },
  brand: {
    name: 'Inventra',
    tagline: 'Retail Intelligence',
    badge: 'PRO',
  },
  navigation: [
    { label: 'Features', href: '#features' },
    { label: 'Live POS Sync', href: '#demo' },
    { label: 'Capabilities', href: '#capabilities' },
    { label: 'Enterprise ROI', href: '#metrics' },
    { label: 'Pricing', href: '#pricing' },
  ] as NavItem[],
  hero: {
    chipText: 'From Retail Data to Profitable Decisions — Zero Complexity',
    headlineStart: 'Turn Your Supermarket Data Into ',
    headlineHighlight: 'High-Impact Decisions.',
    subheadline:
      'Automate inventory velocity, capture multi-counter billing terminals, calculate exact net margin per SKU, and predict dairy & grocery stockouts before shelves empty. Built explicitly for Indian supermarkets & grocery chains.',
    primaryCta: {
      label: 'Start 5-day trial',
      href: '/login',
    },
    secondaryCta: {
      label: 'Explore Interactive Demo',
      href: '#demo',
    },
    trustBadges: [
      'No Credit Card Required',
      '5-Minute POS Setup',
      'Multi-Store Ready',
    ],
    liveWindow: {
      title: 'Inventra Live Intelligence Engine',
      syncStatus: 'Real-Time Sync',
      kpis: [
        {
          label: '30-Day Sales',
          value: '₹14,22,219',
          change: '+12.4% MoM',
          type: 'positive',
          icon: 'TrendingUp',
        },
        {
          label: 'Net Profit',
          value: '₹2,14,630',
          subtext: '15.1% Real Margin',
          type: 'neutral',
          icon: 'Wallet',
        },
        {
          label: 'Health Score',
          value: '88',
          max: '/100',
          subtext: 'Optimal Stock',
          type: 'accent',
          icon: 'ShieldCheck',
        },
      ],
      chart: {
        title: 'Daily Footfall & Sales Forecast vs Run-Rate',
        subtitle: 'Pune Regional Hub • POS Counter 01-04 Aggregated',
        confidence: 'Confidence: 94.2%',
        weekdayLabel: 'Weekday Run-Rate',
        weekendLabel: 'Weekend Rush Surge (+38%)',
      },
      alertBanner: {
        title: 'Critical Reorder: Amul Pure Ghee 1L Tin & Salted Butter',
        subtitle: 'Stock depleting in 3 days. Vendor lead time: 48h',
        buttonLabel: 'View Reorder',
        buttonHref: '/dashboard#alerts',
      },
    },
  },
  metrics: [
    { value: '₹48 Cr+', label: 'Retail Turnover Tracked' },
    { value: '1,200+', label: 'Active Supermarket Counters', highlight: true },
    { value: '99.4%', label: 'Stockout Prevention Rate' },
    { value: '4.2 Hrs', label: 'Weekly Store Admin Saved', highlight: true },
  ] as MetricItem[],
  features: {
    eyebrow: 'Engineered for Retail Efficiency',
    headline: 'Everything Supermarket Owners Need. Zero Fluff.',
    subhead:
      'Say goodbye to delayed tally entries and guesswork. Inventra bridges the gap between your physical POS counters, distributor bills, and daily net margins.',
    items: [
      {
        id: 'ocr-scanner',
        title: 'Fast Invoice OCR & Paper Bill Importer',
        description:
          'Directly scan or upload distributor paper invoices. Automatic extraction maps HSN codes, wholesale purchase prices, and batch numbers into current stock in seconds.',
        badge: 'Scan 50+ Line Items in 8 Sec',
        icon: 'Receipt',
        accent: 'teal',
      },
      {
        id: 'sku-margin',
        title: 'Net Profit Per SKU & Category',
        description:
          'Gross sales lie; net margin tells the truth. Factoring in overhead, shelf space cost, staff wages, and supplier kickbacks gives you real profitability across FMCG, Dairy, and Produce.',
        badge: 'True Gross-to-Net Analytics',
        icon: 'BarChart3',
        accent: 'teal',
      },
      {
        id: 'expiry-guard',
        title: '30-Day Expiry & Shrinkage Guard',
        description:
          'Prevent dead inventory and write-offs. Get notified 30, 15, and 7 days prior to expiry so floor managers can bundle discount items before it turns into dead loss.',
        badge: 'Zero Wastage Triggers',
        icon: 'Clock',
        accent: 'rose',
      },
      {
        id: 'multi-branch',
        title: 'Multi-Branch Regional Sync',
        description:
          'Manage Pune Central, Kothrud, and Baner outlets from one master console. Shift slow-moving stock between stores with one-click inter-branch transfer challans.',
        badge: 'Inter-Branch Transfer Engine',
        icon: 'Network',
        accent: 'teal',
      },
      {
        id: 'lead-time',
        title: 'Dynamic Lead-Time Reordering',
        description:
          'Never miss festive rush or weekend spikes. The algorithm learns seasonal buying rhythms and generates draft purchase orders sent straight to your registered suppliers.',
        badge: 'Automated Purchase Orders',
        icon: 'Send',
        accent: 'teal',
      },
      {
        id: 'whatsapp-digest',
        title: 'Daily WhatsApp Store Digest',
        description:
          'Get an automated 10:00 PM summary straight to your phone: Total gross receipts, top 5 fast-movers, cash collected vs UPI, and stockouts detected on the floor.',
        badge: 'Delivered Nightly at 10:00 PM',
        icon: 'MessageSquare',
        accent: 'emerald',
      },
    ] as FeatureItem[],
  },
  comparison: {
    eyebrow: 'Tangible Store Returns',
    headline: 'Spreadsheet Chaos vs Inventra Intel',
    stat: 'Average +₹85,000 / Mo',
    statSub: 'Recovered profit per 2,000 sq ft retail store',
    traditional: {
      title: 'Manual Spreadsheet Tracking',
      points: [
        'Manual bill entry takes 2-3 hours each evening after closing.',
        'Unnoticed expired biscuits, juices, and dairy lead to 3-5% margin loss.',
        'Sudden OOS on top grocery brands loses loyal walk-in shoppers.',
      ],
    },
    inventra: {
      title: 'With Inventra Intel Automation',
      points: [
        'Instant paper bill scan maps distributor prices in seconds.',
        'Automatic 30-day early warnings prevent expiry write-offs.',
        'Proactive distributor PO generation ensures 99.4% shelf availability.',
      ],
    },
  },
  pricing: {
    eyebrow: 'Predictable Pricing',
    headline: 'Transparent Plans for Every Store Size',
    subhead: 'Zero long-term lock-in. Cancel or adjust counters anytime.',
    plans: [
      {
        id: 'starter',
        name: 'Single Store POS',
        price: '₹1,999',
        period: '/mo',
        description:
          'Ideal for standalone grocery outlets and convenience marts with 1-2 billing counters.',
        features: [
          'Up to 2 Billing Counters',
          'OCR Invoice Scanner (100/mo)',
          'Nightly WhatsApp Digest',
        ],
        ctaLabel: 'Get Started',
        ctaHref: '/login',
      },
      {
        id: 'growth',
        name: 'Multi-Counter Supermarket',
        price: '₹4,499',
        period: '/mo',
        description:
          'For mid-to-large supermarkets with 3-6 checkout terminals and multi-category bays.',
        features: [
          'Up to 6 POS Billing Terminals',
          'Unlimited Bill OCR & CSV Import',
          'ML 30-Day Expiry & Demand Forecast',
          'Net Profit Breakdown per SKU',
        ],
        ctaLabel: 'Start 5-day trial',
        ctaHref: '/login',
        isPopular: true,
      },
      {
        id: 'enterprise',
        name: 'Regional Chain / Multi-Branch',
        price: 'Custom',
        period: ' / enterprise',
        description:
          'For store owners operating 3+ outlets across city zones requiring inter-branch stock logistics.',
        features: [
          'Unlimited Outlets & Warehouse Hubs',
          'Inter-Branch Transfer Orders',
          'Dedicated Pune Implementation Mgr',
        ],
        ctaLabel: 'Contact Enterprise Sales',
        ctaHref: '/login',
      },
    ] as PricingPlan[],
  },
  trial: {
    badge: 'Instant Cloud Deployment',
    headline: 'Take Control of Your Supermarket Margins Today.',
    subhead:
      'Join over 1,200 store owners across Pune, Mumbai, and regional hubs who have stopped spreadsheet errors and unlocked predictive profits.',
    primaryCta: 'Start 5-day trial',
    secondaryCta: 'Schedule Pune Floor Demo',
    guarantees: [
      'No Credit Card Required',
      'Compatible with all POS Terminals',
      'GST Ready',
    ],
  },
  footer: {
    description:
      'Enterprise supermarket data intelligence, inventory velocity, and multi-store profit telemetry. Pune Regional Division.',
    platformLinks: [
      { label: 'Invoice OCR Importer', href: '#features' },
      { label: 'Net Profit Per SKU', href: '#features' },
      { label: '30-Day Expiry Guard', href: '#features' },
      { label: 'WhatsApp Nightly Digest', href: '#features' },
    ],
    regionalHubs: [
      'Branch: Pune Central',
      'Kothrud Commercial Hub',
      'Baner Retail Center',
      'Viman Nagar Outlets',
    ],
    supportLegal: [
      { label: 'Help & Documentation', href: '#support' },
      { label: 'POS Integration API', href: '#status' },
      { label: 'Privacy Policy', href: '#privacy' },
      { label: 'Terms of Service', href: '#terms' },
    ],
    copyright: '© 2025 Inventra Intel Technologies Pvt. Ltd. All rights reserved.',
    sslNote: 'Encrypted with 256-Bit SSL',
    locationNote: 'Pune, Maharashtra, India',
  },
};

export default landingContent;
