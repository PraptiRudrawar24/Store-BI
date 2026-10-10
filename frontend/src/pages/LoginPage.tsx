import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { useToast } from '../components/ui/Toast';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Smartphone, ShieldCheck, RefreshCw } from 'lucide-react';

export function LoginPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { login, sendOTP, user } = useAuth();

  const [step, setStep] = React.useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [otp, setOtp] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [devOtp, setDevOtp] = React.useState('123456');

  // If already logged in, navigate accordingly
  React.useEffect(() => {
    if (user) {
      if (!user.onboarding_completed) {
        navigate('/onboarding');
      } else {
        navigate('/');
      }
    }
  }, [user, navigate]);

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length !== 10) {
      toast.error('Please enter a valid 10-digit mobile number');
      return;
    }

    setSubmitting(true);
    try {
      const res = await sendOTP(cleanPhone);
      setDevOtp(res.dev_otp || '123456');
      setStep('otp');
      toast.success('OTP sent successfully');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send OTP';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || otp.length !== 6) {
      toast.error('Please enter the 6-digit OTP code');
      return;
    }

    setSubmitting(true);
    try {
      const res = await login(phone, otp, email || undefined);
      toast.success(res.is_new_user ? 'Welcome to Store BI! Starting setup.' : 'Signed in successfully');
      if (res.is_new_user || !res.onboarding_completed) {
        navigate('/onboarding');
      } else {
        navigate('/');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid OTP code';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm flex flex-col gap-6">
        <Card>
          <CardContent className="p-6 sm:p-8 flex flex-col items-center text-center">
            {/* Store BI Logo */}
            <img
              src="/logo/store-bi-logo.jpeg"
              alt="Store BI logo"
              className="w-16 h-16 rounded-[8px] object-cover border border-border mb-4"
            />
            <h1 className="text-xl font-bold text-text-high">
              {step === 'phone' ? 'Welcome to Store BI' : 'Verify mobile number'}
            </h1>
            <p className="text-sm text-text-medium mt-1 mb-6">
              {step === 'phone'
                ? 'Sign in or start your 5-day free store trial'
                : `Enter the 6-digit code sent to +91 ${phone}`}
            </p>

            {/* Development Mode Notice */}
            <div className="w-full mb-5 p-3 rounded-[8px] bg-canvas border border-border flex items-start gap-2.5 text-left">
              <ShieldCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" strokeWidth={2} />
              <div className="text-xs">
                <span className="font-semibold text-text-high">Dev mode active: </span>
                <span className="text-text-medium">
                  Any 6-digit OTP is accepted. Default test OTP is{' '}
                  <span className="font-bold text-primary font-mono">{devOtp}</span>.
                </span>
              </div>
            </div>

            {step === 'phone' ? (
              <form onSubmit={handleSendOTP} className="w-full flex flex-col gap-4 text-left">
                <Input
                  label="Mobile number"
                  type="tel"
                  placeholder="10-digit mobile number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  prefixLabel="+91"
                  required
                  autoFocus
                />
                <Input
                  label="Email address (optional)"
                  type="email"
                  placeholder="owner@store.in"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <Button type="submit" variant="primary" fullWidth disabled={submitting} className="mt-2">
                  <Smartphone className="w-4 h-4" strokeWidth={2} />
                  <span>{submitting ? 'Sending OTP...' : 'Get OTP'}</span>
                </Button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOTP} className="w-full flex flex-col gap-4 text-left">
                <Input
                  label="6-digit OTP"
                  type="text"
                  inputMode="numeric"
                  placeholder="123456"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  required
                  autoFocus
                />
                <Button type="submit" variant="primary" fullWidth disabled={submitting} className="mt-2">
                  <ShieldCheck className="w-4 h-4" strokeWidth={2} />
                  <span>{submitting ? 'Verifying...' : 'Verify and continue'}</span>
                </Button>
                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setStep('phone')}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-medium hover:text-text-high"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" strokeWidth={2} />
                    <span>Change number</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleSendOTP}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                  >
                    <RefreshCw className="w-3.5 h-3.5" strokeWidth={2} />
                    <span>Resend OTP</span>
                  </button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>

        <div className="flex items-center justify-center gap-2">
          <Badge variant="neutral">5-day full access trial</Badge>
          <span className="text-xs text-text-medium">• No credit card needed</span>
        </div>
      </div>
    </div>
  );
}
