import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { useToast } from '../components/ui/Toast';
import { useAuth } from '../context/AuthContext';
import {
  Check,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';

export function OnboardingPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { user, saveStep } = useAuth();

  const [step, setStep] = React.useState<number>(1);
  const [submitting, setSubmitting] = React.useState(false);

  // Form State
  const [ownerName, setOwnerName] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [language, setLanguage] = React.useState('en');

  const [shopName, setShopName] = React.useState('');
  const [category, setCategory] = React.useState('Grocery & kirana');
  const [city, setCity] = React.useState('');
  const [state, setState] = React.useState('Maharashtra');
  const [pincode, setPincode] = React.useState('');
  const [gstin, setGstin] = React.useState('');

  const [approxProducts, setApproxProducts] = React.useState('100 - 500');
  const [monthlyTurnover, setMonthlyTurnover] = React.useState('₹50,000 - ₹2,00,000');
  const [currentTrackingMethod, setCurrentTrackingMethod] = React.useState('paper khata');
  const [sellsExpiringGoods, setSellsExpiringGoods] = React.useState(false);

  const [challenges, setChallenges] = React.useState<string[]>(['stock-outs', 'profit unknown']);

  // Prepopulate from user object if available
  React.useEffect(() => {
    if (user) {
      if (user.onboarding_completed) {
        navigate('/');
        return;
      }
      setPhone(user.phone || '');
      setEmail(user.email || '');
      if (user.owner_name) setOwnerName(user.owner_name);
      if (user.language) setLanguage(user.language);
      if (user.name) setShopName(user.name);
      if (user.category) setCategory(user.category);
      if (user.city) setCity(user.city);
      if (user.state) setState(user.state);
      if (user.pincode) setPincode(user.pincode);
      if (user.gstin) setGstin(user.gstin);
      if (user.onboarding_step && user.onboarding_step > 1) {
        setStep(Math.min(user.onboarding_step, 4));
      }
    }
  }, [user, navigate]);

  const toggleChallenge = (item: string) => {
    if (challenges.includes(item)) {
      setChallenges(challenges.filter((c) => c !== item));
    } else {
      setChallenges([...challenges, item]);
    }
  };

  const validateGSTIN = (val: string): boolean => {
    if (!val || val.trim() === '') return true;
    const regex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    return regex.test(val.trim().toUpperCase());
  };

  const handleNext = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (step === 1) {
        if (!ownerName.trim()) {
          toast.error('Please enter the shop owner name');
          setSubmitting(false);
          return;
        }
        await saveStep(1, {
          owner_name: ownerName.trim(),
          phone: phone.trim(),
          email: email.trim() || undefined,
          language,
        });
        toast.success('Owner profile saved');
        setStep(2);
      } else if (step === 2) {
        if (!shopName.trim()) {
          toast.error('Please enter the shop name');
          setSubmitting(false);
          return;
        }
        if (!city.trim() || !pincode.trim()) {
          toast.error('Please enter city and 6-digit pincode');
          setSubmitting(false);
          return;
        }
        if (pincode.trim().length !== 6 || !/^\d{6}$/.test(pincode.trim())) {
          toast.error('Pincode must be exactly 6 digits');
          setSubmitting(false);
          return;
        }
        if (gstin && !validateGSTIN(gstin)) {
          toast.error('Invalid GSTIN format. Expected 15-character Indian GST format (e.g., 27ABCDE1234F1Z5)');
          setSubmitting(false);
          return;
        }
        await saveStep(2, {
          name: shopName.trim(),
          category,
          city: city.trim(),
          state: state.trim(),
          pincode: pincode.trim(),
          gstin: gstin.trim().toUpperCase() || undefined,
        });
        toast.success('Store details saved');
        setStep(3);
      } else if (step === 3) {
        await saveStep(3, {
          approx_products: approxProducts,
          monthly_turnover: monthlyTurnover,
          current_tracking_method: currentTrackingMethod,
          sells_expiring_goods: sellsExpiringGoods,
        });
        toast.success('Operational setup saved');
        setStep(4);
      } else if (step === 4) {
        if (challenges.length === 0) {
          toast.error('Please select at least one problem to solve');
          setSubmitting(false);
          return;
        }
        await saveStep(4, {
          challenges,
        });
        toast.success('Setup complete! Welcome to Store BI.');
        // Landing on empty dashboard per ZERO-START rule
        navigate('/');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save step';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const categories = [
    'Grocery & kirana',
    'Medical & pharmacy',
    'Stationery',
    'Footwear',
    'Electronics',
    'General store',
    'Other',
  ];

  const productRanges = ['< 100 items', '100 - 500 items', '500 - 2,000 items', '2,000+ items'];
  const turnoverRanges = ['Under ₹50,000', '₹50,000 - ₹2,00,000', '₹2,00,000 - ₹5,00,000', 'Above ₹5,00,000'];
  const trackingOptions = [
    { id: 'paper khata', label: 'Paper khata (बही खाता)' },
    { id: 'Excel', label: 'Excel sheet' },
    { id: 'another app', label: 'Another mobile app' },
    { id: 'nothing', label: 'Nothing / Memory' },
  ];

  const problemOptions = [
    { id: 'stock-outs', label: 'Stock-outs (running out of fast-selling goods)' },
    { id: 'overstock', label: 'Overstock (dead money locked in inventory)' },
    { id: 'expiry waste', label: 'Expiry waste (expired items discarded)' },
    { id: 'profit unknown', label: 'Profit unknown (unclear daily gross margin)' },
    { id: 'other', label: 'Other operational challenges' },
  ];

  return (
    <div className="min-h-screen bg-canvas flex flex-col items-center justify-center p-4 py-8">
      <div className="w-full max-w-xl flex flex-col gap-6">
        {/* Header with Progress Indicator */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/logo/store-bi-logo.jpeg"
              alt="Store BI logo"
              className="w-8 h-8 rounded-[8px] object-cover border border-border"
            />
            <span className="font-bold text-base text-text-high">Store BI</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-text-medium">
              Step {step} of 4
            </span>
            <Badge variant="success" dot>
              Trial active
            </Badge>
          </div>
        </div>

        {/* 4-Step Progress Bar */}
        <div className="w-full h-2 bg-surface border border-border rounded-full overflow-hidden flex">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className={`h-full flex-1 transition-all duration-300 ${
                i <= step ? 'bg-primary' : 'bg-transparent'
              } ${i > 1 ? 'border-l border-border' : ''}`}
            />
          ))}
        </div>

        <Card>
          <CardHeader
            title={
              step === 1
                ? 'Owner and contact'
                : step === 2
                ? 'Store and business registration'
                : step === 3
                ? 'Store operational setup'
                : 'Biggest problems to solve'
            }
            subtitle={
              step === 1
                ? 'Tell us who runs this store and your preferred language.'
                : step === 2
                ? 'Enter your store address and optional GSTIN.'
                : step === 3
                ? 'Help us tailor inventory alerts and financial calculations.'
                : 'Select the primary goals you want Store BI to help with.'
            }
          />

          <CardContent className="p-6">
            <form onSubmit={handleNext} className="flex flex-col gap-5">
              {/* STEP 1: Owner and Contact */}
              {step === 1 && (
                <div className="flex flex-col gap-4">
                  <Input
                    label="Owner full name"
                    placeholder="e.g. Ramesh Patel"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    required
                    autoFocus
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Mobile / WhatsApp number"
                      placeholder="10-digit number"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      prefixLabel="+91"
                      required
                    />
                    <Input
                      label="Email address (optional)"
                      type="email"
                      placeholder="owner@store.in"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-text-high">
                      App language preference
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { id: 'en', label: 'English' },
                        { id: 'hi', label: 'हिन्दी' },
                        { id: 'mr', label: 'मराठी' },
                      ].map((lang) => (
                        <button
                          key={lang.id}
                          type="button"
                          onClick={() => setLanguage(lang.id)}
                          className={`h-12 rounded-[8px] border font-semibold text-sm transition-colors flex items-center justify-center gap-2 ${
                            language === lang.id
                              ? 'border-primary bg-primary text-primary-foreground'
                              : 'border-border bg-surface text-text-high hover:bg-canvas'
                          }`}
                        >
                          {language === lang.id && <Check className="w-4 h-4" strokeWidth={2} />}
                          <span>{lang.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: Store and Business Registration */}
              {step === 2 && (
                <div className="flex flex-col gap-4">
                  <Input
                    label="Store / Shop name"
                    placeholder="e.g. Shree Ganesh Kirana Stores"
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                    required
                    autoFocus
                  />

                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-text-high">
                      Business category
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {categories.map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setCategory(cat)}
                          className={`h-11 px-3 rounded-[8px] border text-xs font-semibold transition-colors truncate text-left flex items-center justify-between ${
                            category === cat
                              ? 'border-primary bg-primary text-primary-foreground'
                              : 'border-border bg-surface text-text-high hover:bg-canvas'
                          }`}
                        >
                          <span className="truncate">{cat}</span>
                          {category === cat && <Check className="w-3.5 h-3.5 shrink-0 ml-1" strokeWidth={2} />}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <Input
                      label="City / Town"
                      placeholder="e.g. Pune"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      required
                    />
                    <Input
                      label="State"
                      placeholder="e.g. Maharashtra"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      required
                    />
                    <Input
                      label="Pincode (6 digits)"
                      placeholder="411038"
                      value={pincode}
                      onChange={(e) => setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      required
                    />
                  </div>

                  <Input
                    label="GSTIN (optional)"
                    placeholder="e.g. 27ABCDE1234F1Z5"
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value.toUpperCase())}
                    helperText="15-character Indian GST format. Leave blank if not GST registered."
                    error={gstin && !validateGSTIN(gstin) ? 'Format must be 2 digits state + 10 alphanumeric PAN + 3 chars' : undefined}
                  />
                </div>
              )}

              {/* STEP 3: Store Operational Setup */}
              {step === 3 && (
                <div className="flex flex-col gap-5">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-text-high">
                      Approximate number of products
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {productRanges.map((range) => (
                        <button
                          key={range}
                          type="button"
                          onClick={() => setApproxProducts(range)}
                          className={`h-12 px-3 rounded-[8px] border text-xs font-semibold transition-colors flex items-center justify-between ${
                            approxProducts === range
                              ? 'border-primary bg-primary text-primary-foreground'
                              : 'border-border bg-surface text-text-high hover:bg-canvas'
                          }`}
                        >
                          <span>{range}</span>
                          {approxProducts === range && <Check className="w-3.5 h-3.5" strokeWidth={2} />}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-text-high">
                      Approximate monthly turnover
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {turnoverRanges.map((turnover) => (
                        <button
                          key={turnover}
                          type="button"
                          onClick={() => setMonthlyTurnover(turnover)}
                          className={`h-12 px-3 rounded-[8px] border text-xs font-semibold transition-colors flex items-center justify-between ${
                            monthlyTurnover === turnover
                              ? 'border-primary bg-primary text-primary-foreground'
                              : 'border-border bg-surface text-text-high hover:bg-canvas'
                          }`}
                        >
                          <span>{turnover}</span>
                          {monthlyTurnover === turnover && <Check className="w-3.5 h-3.5" strokeWidth={2} />}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-text-high">
                      How do you track business right now?
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {trackingOptions.map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setCurrentTrackingMethod(opt.id)}
                          className={`h-12 px-3 rounded-[8px] border text-xs font-semibold transition-colors flex items-center justify-between ${
                            currentTrackingMethod === opt.id
                              ? 'border-primary bg-primary text-primary-foreground'
                              : 'border-border bg-surface text-text-high hover:bg-canvas'
                          }`}
                        >
                          <span>{opt.label}</span>
                          {currentTrackingMethod === opt.id && <Check className="w-3.5 h-3.5" strokeWidth={2} />}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-[8px] border border-border bg-surface flex items-center justify-between">
                    <div>
                      <span className="text-sm font-semibold text-text-high block">
                        Do you sell perishable or expiring goods?
                      </span>
                      <span className="text-xs text-text-medium">
                        Dairy, bread, medicines, cosmetics with expiry dates.
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSellsExpiringGoods(false)}
                        className={`h-9 px-3 rounded-[6px] text-xs font-semibold border ${
                          !sellsExpiringGoods
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-canvas text-text-medium border-border'
                        }`}
                      >
                        No
                      </button>
                      <button
                        type="button"
                        onClick={() => setSellsExpiringGoods(true)}
                        className={`h-9 px-3 rounded-[6px] text-xs font-semibold border ${
                          sellsExpiringGoods
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-canvas text-text-medium border-border'
                        }`}
                      >
                        Yes
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 4: Biggest Problems to Solve */}
              {step === 4 && (
                <div className="flex flex-col gap-4">
                  <span className="text-sm text-text-medium">
                    Choose what matters most (multi-select):
                  </span>
                  <div className="flex flex-col gap-2.5">
                    {problemOptions.map((item) => {
                      const isSelected = challenges.includes(item.id);
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => toggleChallenge(item.id)}
                          className={`min-h-[48px] p-3 rounded-[8px] border text-sm font-semibold transition-colors text-left flex items-center justify-between ${
                            isSelected
                              ? 'border-primary bg-primary text-primary-foreground'
                              : 'border-border bg-surface text-text-high hover:bg-canvas'
                          }`}
                        >
                          <span>{item.label}</span>
                          <span
                            className={`w-5 h-5 rounded-[4px] border flex items-center justify-center shrink-0 ml-3 ${
                              isSelected
                                ? 'bg-primary-foreground text-primary border-primary-foreground'
                                : 'border-border bg-canvas'
                            }`}
                          >
                            {isSelected && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Navigation Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-border mt-2">
                {step > 1 ? (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setStep(step - 1)}
                    disabled={submitting}
                  >
                    <ArrowLeft className="w-4 h-4" strokeWidth={2} />
                    <span>Back</span>
                  </Button>
                ) : (
                  <div />
                )}

                <Button type="submit" variant="primary" disabled={submitting}>
                  <span>
                    {submitting
                      ? 'Saving...'
                      : step === 4
                      ? 'Complete setup'
                      : 'Save and continue'}
                  </span>
                  <ArrowRight className="w-4 h-4" strokeWidth={2} />
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
