import { useLocation, useNavigate } from 'react-router-dom';
import {
  CreditCard,
  BarChart3,
  Settings,
  ArrowRight,
  Shield,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';

export function AdminPlaceholderPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const getSectionInfo = () => {
    const path = location.pathname;
    if (path.includes('payments')) {
      return {
        title: 'Payments & payouts',
        description: 'Settlement reconciliation, UPI/Razorpay transaction fees, and GST tax invoice generation.',
        icon: CreditCard,
        status: 'In development (v2.5)',
        features: [
          'Direct merchant bank account payout batching via NPCI IMPS/NEFT',
          'Automated GST 18% tax invoice generation for B2B merchants',
          'Razorpay, Pine Labs & Paytm gateway webhook dispute resolution',
          'Failed charge auto-retry cadence and dunning WhatsApp notifications',
        ],
      };
    } else if (path.includes('reports')) {
      return {
        title: 'Operations reports',
        description: 'Comprehensive platform cohort retention, geographical store density, and GMV throughput.',
        icon: BarChart3,
        status: 'In development (v2.5)',
        features: [
          'State & Tier-2/3 city adoption heatmaps across Maharashtra and Gujarat',
          'Cohort retention analysis (Day 1, Day 7, Day 30, Day 90)',
          'High-throughput product category GMV benchmarking across Kirana shops',
          'Scheduled CSV and PDF report deliveries to operations leads',
        ],
      };
    } else {
      return {
        title: 'Platform settings',
        description: 'Global Store BI operational configurations, RBAC permissions, and AI provider credentials.',
        icon: Settings,
        status: 'In development (v2.5)',
        features: [
          'Role-Based Access Control (Super admin, Field operations, Auditor)',
          'Gemini Flash LLM & OCR API quota monitoring and failover rules',
          'SMS & WhatsApp notification gateway credentials (MSG91 / Gupshup)',
          'Platform maintenance mode & broadcast banner management',
        ],
      };
    }
  };

  const section = getSectionInfo();
  const Icon = section.icon;

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-2xl font-bold text-text-high">{section.title}</h1>
          <Badge variant="neutral" className="text-xs">{section.status}</Badge>
        </div>
        <p className="text-xs text-text-medium">{section.description}</p>
      </div>

      {/* Main Feature Showcase Card */}
      <Card className="border border-border bg-surface p-6">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-12 h-12 rounded-[8px] bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
            <Icon className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-text-high">Planned capabilities roadmap</h2>
            <p className="text-xs text-text-medium mt-0.5">
              This module is scheduled for the next Store BI platform release. All foundational database models and RBAC guards are ready.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
          {section.features.map((feature, i) => (
            <div
              key={i}
              className="p-3.5 rounded-[8px] bg-canvas border border-border flex items-start gap-3"
            >
              <div className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                ✓
              </div>
              <span className="text-xs text-text-high leading-relaxed">{feature}</span>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-border flex-wrap gap-3">
          <div className="flex items-center gap-2 text-xs text-text-medium">
            <Shield className="w-4 h-4 text-emerald-600" />
            <span>Guarded by super admin security policy</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={() => navigate('/admin/businesses')}
              className="min-h-[48px] text-xs px-4"
            >
              View registered businesses
            </Button>
            <Button
              variant="primary"
              onClick={() => navigate('/admin/overview')}
              className="min-h-[48px] text-xs px-4 gap-1.5"
            >
              <span>Back to overview</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
