import {
  Receipt,
  BarChart3,
  Clock,
  Network,
  Send,
  MessageSquare,
  Sparkles,
  TrendingUp,
  Bell,
  ArrowRightLeft,
  CheckCircle2,
} from 'lucide-react';
import type { FeatureItem } from '../../content/landingContent';
import { cn } from '../ui/utils';

interface FeatureCardProps {
  feature: FeatureItem;
}

export function FeatureCard({ feature }: FeatureCardProps) {
  // Map string icon name to Lucide Icon component
  const getIcon = (name: string) => {
    switch (name) {
      case 'Receipt':
        return <Receipt className="w-6 h-6" strokeWidth={2} />;
      case 'BarChart3':
        return <BarChart3 className="w-6 h-6" strokeWidth={2} />;
      case 'Clock':
        return <Clock className="w-6 h-6" strokeWidth={2} />;
      case 'Network':
        return <Network className="w-6 h-6" strokeWidth={2} />;
      case 'Send':
        return <Send className="w-6 h-6" strokeWidth={2} />;
      case 'MessageSquare':
        return <MessageSquare className="w-6 h-6" strokeWidth={2} />;
      default:
        return <Sparkles className="w-6 h-6" strokeWidth={2} />;
    }
  };

  const getBadgeIcon = (name: string) => {
    switch (name) {
      case 'Receipt':
        return <Sparkles className="w-4 h-4" strokeWidth={2} />;
      case 'BarChart3':
        return <TrendingUp className="w-4 h-4" strokeWidth={2} />;
      case 'Clock':
        return <Bell className="w-4 h-4" strokeWidth={2} />;
      case 'Network':
        return <ArrowRightLeft className="w-4 h-4" strokeWidth={2} />;
      case 'Send':
        return <Send className="w-4 h-4" strokeWidth={2} />;
      case 'MessageSquare':
        return <CheckCircle2 className="w-4 h-4" strokeWidth={2} />;
      default:
        return null;
    }
  };

  const isRose = feature.accent === 'rose';
  const isEmerald = feature.accent === 'emerald';

  return (
    <div
      className={cn(
        'p-6 rounded-[8px] bg-surface border border-border shadow-card transition-all duration-200 group flex flex-col justify-between hover:shadow-raised',
        isRose
          ? 'hover:border-destructive/60'
          : isEmerald
          ? 'hover:border-success/60'
          : 'hover:border-primary/60'
      )}
    >
      <div className="space-y-4">
        {/* Feature Icon Container */}
        <div
          className={cn(
            'h-12 w-12 rounded-[6px] border flex items-center justify-center group-hover:scale-105 transition-transform duration-200',
            isRose
              ? 'bg-destructive-bg border-destructive-border text-destructive'
              : isEmerald
              ? 'bg-success-bg border-success-border text-success'
              : 'bg-primary-light/20 border-primary/20 text-primary'
          )}
        >
          {getIcon(feature.icon)}
        </div>

        {/* Feature Title */}
        <h3
          className={cn(
            'text-lg font-bold text-text-high transition-colors',
            isRose
              ? 'group-hover:text-destructive'
              : isEmerald
              ? 'group-hover:text-success'
              : 'group-hover:text-primary'
          )}
        >
          {feature.title}
        </h3>

        {/* Feature Description */}
        <p className="text-sm text-text-medium leading-relaxed">
          {feature.description}
        </p>
      </div>

      {/* Feature Card Footer Badge */}
      <div
        className={cn(
          'mt-6 pt-4 border-t border-border flex items-center justify-between text-xs font-semibold',
          isRose
            ? 'text-destructive'
            : isEmerald
            ? 'text-success'
            : 'text-primary'
        )}
      >
        <span>{feature.badge}</span>
        {getBadgeIcon(feature.icon)}
      </div>
    </div>
  );
}

export default FeatureCard;
