import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, Check, MapPin, Building2,
  Upload, ImageIcon, Plus, Trash2, X, User, Mail,
  Lock, CreditCard, ChevronDown, Info, Eye, EyeOff, CheckCircle2, AlertCircle, Loader2
} from 'lucide-react';
import { Ticket as TIcon } from 'lucide-react';
import { Button, Input, showToast } from './ui';
import { api } from '../lib/api';

// =============================================
// DATA
// =============================================
const TICKET_TIERS = [
  'VIP', 'Regular', 'Early Bird', 'Table', 'VVIP', 'Gold', 'Silver', 'Bronze', 'Couple'
];

const EVENT_CATEGORIES = [
  'Campus Party', 'Club & Nightlife', 'Concert & Music', 'Beach & Pool Party',
  'Festival', 'Fashion & Runway', 'Rave', 'Conference & Meetup', 'Other'
];

// =============================================
// TYPES
// =============================================
interface TicketTierEntry {
  id: string;
  name: string;
  customName: string;
  genderPricing: boolean;
  price: string;
  malePrice: string;
  femalePrice: string;
  quantity: string;
  admits: string;
  imageFile: File | null;
  imagePreview: string | null;
}

// =============================================
// STEP INDICATOR
// =============================================
function StepIndicator({ steps, current }: { steps: string[]; current: number }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {steps.map((step, i) => (
        <div key={i} className="flex items-center">
          <div className="flex flex-col items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                i < current
                  ? 'bg-green-500 text-white'
                  : i === current
                  ? 'text-white shadow-lg'
                  : 'text-gray-400'
              }`}
              style={{
                backgroundColor: i < current ? 'var(--success)' : i === current ? 'var(--accent)' : 'var(--canvas)',
                border: i === current ? '2px solid var(--accent)' : '2px solid var(--border)',
              }}
            >
              {i < current ? <Check size={14} /> : <span>{i + 1}</span>}
            </div>
            <span
              className="text-[10px] mt-1 font-medium text-center max-w-[65px] leading-tight"
              style={{ color: i === current ? 'var(--accent)' : 'var(--text-muted)' }}
            >
              {step}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              className="w-10 sm:w-16 h-0.5 mx-1 mt-[-10px]"
              style={{ backgroundColor: i < current ? 'var(--success)' : 'var(--border)' }}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// =============================================
// TICKET TIER CARD
// =============================================
function TicketTierCard({
  tier,
  index,
  onChange,
  onRemove,
  isOnly,
}: {
  tier: TicketTierEntry;
  index: number;
  onChange: (updated: TicketTierEntry) => void;
  onRemove: () => void;
  isOnly: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    onChange({ ...tier, imageFile: file, imagePreview: url });
  };

  const displayName = tier.name === 'Custom' ? tier.customName : tier.name;

  return (
    <div
      className="neu-card p-5 rounded-2xl space-y-4 relative"
      style={{ border: '1px solid var(--border)' }}
    >
      {/* Tier header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
            style={{ backgroundColor: 'var(--accent)' }}
          >
            {index + 1}
          </span>
          <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
            {displayName || `Tier ${index + 1}`}
          </span>
        </div>
        {!isOnly && (
          <button
            onClick={onRemove}
            className="p-1.5 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>

      {/* Tier name selector */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-secondary)' }}>
          Tier Type
        </label>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {TICKET_TIERS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => onChange({ ...tier, name: t, customName: '' })}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                tier.name === t
                  ? 'text-white shadow-sm'
                  : 'hover:border-gray-400'
              }`}
              style={{
                backgroundColor: tier.name === t ? 'var(--accent)' : 'var(--canvas)',
                color: tier.name === t ? '#FFFFFF' : 'var(--text-secondary)',
                border: tier.name === t ? '1px solid var(--accent)' : '1px solid var(--border)',
              }}
            >
              {t}
            </button>
          ))}
          <button
            type="button"
            onClick={() => onChange({ ...tier, name: 'Custom' })}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
              tier.name === 'Custom'
                ? 'text-white shadow-sm'
                : 'hover:border-gray-400'
            }`}
            style={{
              backgroundColor: tier.name === 'Custom' ? 'var(--accent)' : 'var(--canvas)',
              color: tier.name === 'Custom' ? '#FFFFFF' : 'var(--text-secondary)',
              border: tier.name === 'Custom' ? '1px solid var(--accent)' : '1px solid var(--border)',
            }}
          >
            Custom
          </button>
        </div>

        {tier.name === 'Custom' && (
          <input
            type="text"
            placeholder="e.g. Backstage Pass, Fan Zone, Student Early Bird"
            value={tier.customName}
            onChange={(e) => onChange({ ...tier, customName: e.target.value })}
            className="neu-input w-full"
          />
        )}
      </div>

      {/* Ticket Image upload */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="block text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
            Ticket Graphic / Image
          </label>
          <span className="text-[11px] font-medium" style={{ color: 'var(--accent)' }}>
            Any aspect ratio supported
          </span>
        </div>

        <div
          onClick={() => fileRef.current?.click()}
          className="cursor-pointer rounded-xl border-2 border-dashed p-3 transition-all hover:border-[#00e5ff] relative overflow-hidden"
          style={{ borderColor: tier.imagePreview ? 'transparent' : 'var(--border)', backgroundColor: 'var(--canvas)' }}
        >
          {tier.imagePreview ? (
            <div className="relative group w-full rounded-xl overflow-hidden shadow-lg border border-white/10" style={{ backgroundColor: '#0a0a0a' }}>
              <div className="relative w-full overflow-hidden flex items-center justify-center bg-black/40">
                <img
                  src={tier.imagePreview}
                  alt={displayName}
                  className="w-full max-h-[220px] object-contain rounded-t-xl"
                />
              </div>

              <div className="p-3 bg-gradient-to-t from-black via-black/95 to-black/80 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-[#00e5ff] block">
                      {displayName || 'Event Ticket'}
                    </span>
                    <span className="text-xs font-medium text-white/70">
                      Admits {tier.admits || '1'} Person
                    </span>
                  </div>
                  {tier.genderPricing ? (
                    <div className="text-right">
                      <span className="text-[10px] text-gray-400 block">M: ₦{Number(tier.malePrice || 0).toLocaleString()}</span>
                      <span className="text-[10px] text-[#ff4081] block">F: ₦{Number(tier.femalePrice || 0).toLocaleString()}</span>
                    </div>
                  ) : (
                    <div className="text-right">
                      <span className="text-sm font-black text-white font-mono">
                        ₦{Number(tier.price || 0).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-end justify-between pt-1 border-t border-white/10">
                  <div className="bg-black/75 px-2 py-0.5 rounded border border-white/10">
                    <span className="text-[8px] uppercase tracking-wider block text-gray-400 font-mono">Verification Code</span>
                    <span className="font-mono text-[10px] font-bold text-[#00e5ff] tracking-widest">
                      TKT-XXXX-2026
                    </span>
                  </div>
                  <div className="w-10 h-10 bg-white p-1 rounded shadow-md flex items-center justify-center">
                    <div className="w-full h-full border border-black/20 flex flex-wrap p-0.5 gap-0.5 bg-gray-900 rounded-[2px]">
                      <div className="w-2.5 h-2.5 bg-white border border-gray-900" />
                      <div className="w-1.5 h-1.5 bg-white ml-auto" />
                      <div className="w-2.5 h-2.5 bg-white mt-auto" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-xl cursor-pointer">
                <Upload size={20} color="white" />
                <span className="text-white text-xs ml-2 font-semibold">Click to Change Image</span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-6 gap-2">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(0,229,255,0.1)' }}>
                <ImageIcon size={22} style={{ color: 'var(--accent)' }} />
              </div>
              <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                Upload ticket artwork <span style={{ color: 'var(--accent)' }}>(optional)</span>
              </span>
              <span className="text-[11px] text-center max-w-xs" style={{ color: 'var(--text-muted)' }}>
                TiKeTi automatically stamps a unique QR code onto each ticket for venue validation
              </span>
            </div>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
      </div>

      {/* Gender-based pricing toggle */}
      <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'var(--canvas)', border: '1px solid var(--border)' }}>
        <div>
          <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>Different Price for Male &amp; Female</p>
          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>e.g. Male ₦20,000 / Female ₦5,000</p>
        </div>
        <button
          type="button"
          onClick={() => onChange({ ...tier, genderPricing: !tier.genderPricing })}
          className="w-10 h-5 rounded-full transition-all relative"
          style={{
            backgroundColor: tier.genderPricing ? 'var(--accent)' : 'var(--border)',
          }}
        >
          <span
            className="absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all"
            style={{ left: tier.genderPricing ? '22px' : '2px' }}
          />
        </button>
      </div>

      {/* Pricing */}
      {tier.genderPricing ? (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              Male Price (₦)
            </label>
            <input
              type="number"
              placeholder="e.g. 20000"
              value={tier.malePrice}
              onChange={(e) => onChange({ ...tier, malePrice: e.target.value })}
              className="neu-input"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              Female Price (₦)
            </label>
            <input
              type="number"
              placeholder="e.g. 5000"
              value={tier.femalePrice}
              onChange={(e) => onChange({ ...tier, femalePrice: e.target.value })}
              className="neu-input"
            />
          </div>
        </div>
      ) : (
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-secondary)' }}>
            Ticket Price (₦)
          </label>
          <input
            type="number"
            placeholder="e.g. 5000"
            value={tier.price}
            onChange={(e) => onChange({ ...tier, price: e.target.value })}
            className="neu-input"
          />
        </div>
      )}

      {/* Quantity & Admits */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-secondary)' }}>
            Quantity Available
          </label>
          <input
            type="number"
            placeholder="e.g. 200"
            value={tier.quantity}
            onChange={(e) => onChange({ ...tier, quantity: e.target.value })}
            className="neu-input"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-secondary)' }}>
            Persons Admitted
          </label>
          <input
            type="number"
            placeholder="1"
            value={tier.admits}
            onChange={(e) => onChange({ ...tier, admits: e.target.value })}
            className="neu-input"
          />
        </div>
      </div>
    </div>
  );
}

// =============================================
// MAIN REGISTRATION COMPONENT
// =============================================
export function EventOrganizerRegistration() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submittedEventId, setSubmittedEventId] = useState<string | null>(null);

  // Step 1: Account Setup
  const [organizerName, setOrganizerName] = useState('');
  const [organizerEmail, setOrganizerEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Step 2: Event Details
  const [eventName, setEventName] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [venue, setVenue] = useState('');
  const [eventCategory, setEventCategory] = useState('Campus Party');
  const [eventDate, setEventDate] = useState('');
  const [salesEnd, setSalesEnd] = useState('');
  const [capacity, setCapacity] = useState('500');
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [posterPreview, setPosterPreview] = useState<string | null>(null);
  const bannerRef = useRef<HTMLInputElement>(null);
  const posterRef = useRef<HTMLInputElement>(null);

  // Step 3: Ticket Tiers
  const [tickets, setTickets] = useState<TicketTierEntry[]>([{
    id: 't_' + Date.now(),
    name: 'Regular',
    customName: '',
    genderPricing: false,
    price: '3000',
    malePrice: '',
    femalePrice: '',
    quantity: '200',
    admits: '1',
    imageFile: null,
    imagePreview: null,
  }]);

  // Step 4: Payout Details
  const [banks, setBanks] = useState<{ id: number; name: string; code: string }[]>([]);
  const [selectedBankCode, setSelectedBankCode] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [resolvingAccount, setResolvingAccount] = useState(false);
  const [accountResolveError, setAccountResolveError] = useState('');

  // Fetch banks on mount
  useEffect(() => {
    async function loadBanks() {
      try {
        const list = await api.auth.getBanks();
        setBanks(list);
        if (list.length > 0 && !selectedBankCode) {
          setSelectedBankCode(list[0].code);
          setBankName(list[0].name);
        }
      } catch (e) {
        console.error('Failed to load banks:', e);
      }
    }
    loadBanks();
  }, []);

  // When bank selection changes
  const handleBankChange = (code: string) => {
    setSelectedBankCode(code);
    const b = banks.find(x => x.code === code);
    if (b) setBankName(b.name);
    setAccountName('');
    setAccountResolveError('');
  };

  // Auto-resolve account name when 10 digits are typed
  useEffect(() => {
    const cleanNum = accountNumber.trim().replace(/\D/g, '');
    if (cleanNum.length === 10 && selectedBankCode) {
      let isMounted = true;
      setResolvingAccount(true);
      setAccountResolveError('');

      api.auth.resolveAccount(cleanNum, selectedBankCode)
        .then((name) => {
          if (isMounted) {
            setAccountName(name);
            setResolvingAccount(false);
          }
        })
        .catch((err) => {
          if (isMounted) {
            setAccountResolveError(err.message || 'Could not verify account');
            setResolvingAccount(false);
          }
        });

      return () => { isMounted = false; };
    } else {
      setAccountName('');
      setAccountResolveError('');
    }
  }, [accountNumber, selectedBankCode]);

  const STEPS = ['Account', 'Event Details', 'Tickets', 'Payout'];

  // ── Validation ──
  const validateStep = (): boolean => {
    if (step === 0) {
      if (!organizerName.trim()) { showToast('Organizer / Brand name is required', 'error'); return false; }
      if (!organizerEmail.trim() || !organizerEmail.includes('@')) { showToast('Valid email is required', 'error'); return false; }
      if (password.length < 8) { showToast('Password must be at least 8 characters', 'error'); return false; }
      if (password !== confirmPassword) { showToast('Passwords do not match', 'error'); return false; }
    }
    if (step === 1) {
      if (!eventName.trim()) { showToast('Event name is required', 'error'); return false; }
      if (!eventDescription.trim()) { showToast('Event description is required', 'error'); return false; }
      if (!venue.trim()) { showToast('Venue is required', 'error'); return false; }
      if (!eventDate) { showToast('Event date is required', 'error'); return false; }
      if (!salesEnd) { showToast('Ticket sales closing date is required', 'error'); return false; }
    }
    if (step === 2) {
      for (const t of tickets) {
        const name = t.name === 'Custom' ? t.customName : t.name;
        if (!name.trim()) { showToast('Ticket tier name is required', 'error'); return false; }
        if (t.genderPricing) {
          if (!t.malePrice || !t.femalePrice) { showToast('Both male and female prices are required', 'error'); return false; }
        } else {
          if (!t.price) { showToast('Ticket price is required', 'error'); return false; }
        }
        if (!t.quantity) { showToast('Ticket quantity is required', 'error'); return false; }
      }
    }
    if (step === 3) {
      if (!selectedBankCode || !bankName) { showToast('Please select your bank', 'error'); return false; }
      if (accountNumber.trim().length !== 10) { showToast('Account number must be 10 digits', 'error'); return false; }
      if (!accountName.trim()) { showToast('Account name must be verified via Paystack', 'error'); return false; }
    }
    return true;
  };

  const handleNext = () => {
    if (!validateStep()) return;
    if (step < STEPS.length - 1) setStep(step + 1);
  };

  const handlePrev = () => {
    if (step > 0) setStep(step - 1);
  };

  const handleSubmit = async () => {
    if (!validateStep()) return;
    setLoading(true);

    try {
      // 1. Register organizer account
      const regResult = await api.auth.registerOrganizer({
        name: organizerName.trim(),
        email: organizerEmail.trim().toLowerCase(),
        password,
        bank_name: bankName,
        bank_code: selectedBankCode,
        account_number: accountNumber.trim(),
        account_name: accountName.trim(),
        eventName: eventName.trim(),
      });

      // 2. Create the event
      const createdEvent = await api.events.create({
        name: eventName.trim(),
        description: eventDescription.trim() || 'Event details coming soon.',
        venue: venue.trim(),
        eventDate: eventDate || new Date(Date.now() + 86400000 * 7).toISOString(),
        salesEndDate: salesEnd || new Date(Date.now() + 86400000 * 6).toISOString(),
        capacity: parseInt(capacity) || 500,
        bannerUrl: bannerPreview || '',
        posterUrl: posterPreview || bannerPreview || '',
        category: eventCategory,
      });

      const eventId = createdEvent?.id || null;
      setSubmittedEventId(eventId);

      // 3. Create ticket tiers
      if (eventId) {
        for (const t of tickets) {
          const tierName = t.name === 'Custom' ? t.customName : t.name;
          if (!tierName) continue;

          try {
            await api.ticketTypes.create(eventId, {
              name: tierName,
              genderPricing: t.genderPricing,
              gender_pricing: t.genderPricing,
              malePrice: t.genderPricing ? (parseFloat(t.malePrice) || 0) : undefined,
              male_price: t.genderPricing ? (parseFloat(t.malePrice) || 0) : undefined,
              femalePrice: t.genderPricing ? (parseFloat(t.femalePrice) || 0) : undefined,
              female_price: t.genderPricing ? (parseFloat(t.femalePrice) || 0) : undefined,
              price: t.genderPricing ? (parseFloat(t.malePrice) || parseFloat(t.femalePrice) || 0) : (parseFloat(t.price) || 0),
              quantity: parseInt(t.quantity) || 100,
              admits: parseInt(t.admits) || 1,
              imageUrl: t.imagePreview || '',
              ticket_image_url: t.imagePreview || '',
            });
          } catch {}
        }
      }

      setSubmitted(true);
      showToast('Event submitted for approval!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Registration failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const addTicket = () => {
    setTickets(prev => [...prev, {
      id: 't_' + Date.now(),
      name: 'Regular',
      customName: '',
      genderPricing: false,
      price: '',
      malePrice: '',
      femalePrice: '',
      quantity: '',
      admits: '1',
      imageFile: null,
      imagePreview: null,
    }]);
  };

  const updateTicket = (id: string, updated: TicketTierEntry) => {
    setTickets(prev => prev.map(t => t.id === id ? updated : t));
  };

  const removeTicket = (id: string) => {
    setTickets(prev => prev.filter(t => t.id !== id));
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <div className="max-w-md w-full neu-card p-8 rounded-3xl text-center space-y-5" style={{ border: '1px solid var(--border)' }}>
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto" style={{ backgroundColor: 'rgba(0,229,255,0.1)' }}>
            <CheckCircle2 size={36} style={{ color: 'var(--accent)' }} />
          </div>

          <div>
            <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider mb-2" style={{ backgroundColor: 'rgba(234,179,8,0.15)', color: '#eab308' }}>
              Pending Admin Approval
            </span>
            <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
              Event Submitted Successfully!
            </h2>
            <p className="text-sm mt-2 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              Thank you, <strong>{organizerName}</strong>! Your event <strong>{eventName}</strong> has been submitted.
              Our administrators will review your event and configure your Paystack settlement subaccount.
            </p>
          </div>

          <div className="p-4 rounded-2xl text-left space-y-2" style={{ backgroundColor: 'var(--canvas)', border: '1px solid var(--border)' }}>
            <div className="flex items-center gap-2 text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
              <Info size={14} style={{ color: 'var(--accent)' }} />
              What happens next?
            </div>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              • Once approved, your tickets immediately become live for public checkout.<br />
              • Ticket payments split automatically, and your share settles directly into your <strong>{bankName}</strong> account.<br />
              • You can log into your organizer dashboard anytime using your email.
            </p>
          </div>

          <Button
            variant="primary"
            className="w-full py-3"
            onClick={() => navigate('/owner')}
          >
            Go to Organizer Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Header */}
      <header
        className="sticky top-0 z-50 backdrop-blur-xl border-b"
        style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--shadow-dark)' }}
      >
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: 'var(--accent)' }}
            >
              <TIcon size={16} color="white" />
            </div>
            <span
              className="text-lg font-bold"
              style={{ color: 'var(--text-primary)', fontFamily: "'Unlock', cursive", fontWeight: 400 }}
            >
              TiKeTi
            </span>
          </Link>
          <Link to="/login" className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
            Already registered? Sign in
          </Link>
        </div>
      </header>

      <div className="max-w-xl mx-auto px-4 py-6 pb-36">
        {/* Title */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Host Your Event on TiKeTi
          </h1>
          <p className="text-xs sm:text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Register as an event organizer and launch ticket sales
          </p>
        </div>

        <StepIndicator steps={STEPS} current={step} />

        {/* ───────────────── STEP 0: ACCOUNT SETUP ───────────────── */}
        {step === 0 && (
          <div className="space-y-5 animate-fade-up">
            {/* Multi-event notice */}
            <div className="p-3.5 rounded-2xl flex items-start gap-3" style={{ backgroundColor: 'rgba(0,229,255,0.08)', border: '1px solid rgba(0,229,255,0.25)' }}>
              <Info size={18} className="mt-0.5 shrink-0" style={{ color: 'var(--accent)' }} />
              <div>
                <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
                  Multi-Event Organizer Notice
                </p>
                <p className="text-[11px] mt-0.5 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  You can use the same email and account number to host multiple events.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Organizer / Brand Name *
              </label>
              <input
                type="text"
                placeholder="e.g. Eclipse Entertainment, Campus Vibes Ent"
                value={organizerName}
                onChange={(e) => setOrganizerName(e.target.value)}
                className="neu-input w-full"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Organizer Email Address *
              </label>
              <input
                type="email"
                placeholder="organizer@example.com"
                value={organizerEmail}
                onChange={(e) => setOrganizerEmail(e.target.value)}
                className="neu-input w-full"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  Password *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Min 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="neu-input w-full pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  Confirm Password *
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Re-enter password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="neu-input w-full pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ───────────────── STEP 1: EVENT DETAILS ───────────────── */}
        {step === 1 && (
          <div className="space-y-5 animate-fade-up">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Event Name *
              </label>
              <input
                type="text"
                placeholder="e.g. FUTO All White Party, Neon Fest Lagos"
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                className="neu-input w-full"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Event Category *
              </label>
              <select
                value={eventCategory}
                onChange={(e) => setEventCategory(e.target.value)}
                className="neu-input w-full"
              >
                {EVENT_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Venue / Location Address *
              </label>
              <input
                type="text"
                placeholder="e.g. FUTO Hall of Excellence, Owerri / The Palms Mall, Lekki"
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                className="neu-input w-full"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Event Description *
              </label>
              <textarea
                rows={3}
                placeholder="Describe your event, dress code, performers, and vibes..."
                value={eventDescription}
                onChange={(e) => setEventDescription(e.target.value)}
                className="neu-input w-full resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  Event Date &amp; Time *
                </label>
                <input
                  type="datetime-local"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="neu-input w-full"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  Sales Close Date *
                </label>
                <input
                  type="datetime-local"
                  value={salesEnd}
                  onChange={(e) => setSalesEnd(e.target.value)}
                  className="neu-input w-full"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Venue Capacity *
              </label>
              <input
                type="number"
                placeholder="e.g. 500"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                className="neu-input w-full"
              />
            </div>

            {/* Poster / Banner upload */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Event Poster / Banner (Optional)
              </label>
              <div
                onClick={() => posterRef.current?.click()}
                className="cursor-pointer rounded-2xl border-2 border-dashed p-4 transition-all hover:border-[#00e5ff] text-center"
                style={{ borderColor: posterPreview ? 'transparent' : 'var(--border)', backgroundColor: 'var(--canvas)' }}
              >
                {posterPreview ? (
                  <div className="relative">
                    <img src={posterPreview} alt="Poster preview" className="w-full max-h-48 object-cover rounded-xl" />
                    <span className="text-xs text-white bg-black/60 px-3 py-1 rounded-full absolute bottom-2 right-2">
                      Click to Change
                    </span>
                  </div>
                ) : (
                  <div className="py-4 flex flex-col items-center gap-1.5">
                    <Upload size={22} style={{ color: 'var(--accent)' }} />
                    <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                      Upload Event Flyer or Poster
                    </span>
                    <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                      JPG, PNG, WebP up to 5MB
                    </span>
                  </div>
                )}
              </div>
              <input
                ref={posterRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) setPosterPreview(URL.createObjectURL(f));
                }}
              />
            </div>
          </div>
        )}

        {/* ───────────────── STEP 2: TICKETS ───────────────── */}
        {step === 2 && (
          <div className="space-y-5 animate-fade-up">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                  Configure Ticket Tiers
                </h2>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  Set up prices, gender pricing, and admitted count for each pass
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={addTicket}
                className="flex items-center gap-1 text-xs"
              >
                <Plus size={14} /> Add Tier
              </Button>
            </div>

            <div className="space-y-4">
              {tickets.map((tier, idx) => (
                <TicketTierCard
                  key={tier.id}
                  tier={tier}
                  index={idx}
                  onChange={(updated) => updateTicket(tier.id, updated)}
                  onRemove={() => removeTicket(tier.id)}
                  isOnly={tickets.length === 1}
                />
              ))}
            </div>
          </div>
        )}

        {/* ───────────────── STEP 3: PAYOUT DETAILS ───────────────── */}
        {step === 3 && (
          <div className="space-y-5 animate-fade-up">
            <div className="p-3.5 rounded-2xl flex items-start gap-3" style={{ backgroundColor: 'rgba(0,229,255,0.08)', border: '1px solid rgba(0,229,255,0.25)' }}>
              <CreditCard size={18} className="mt-0.5 shrink-0" style={{ color: 'var(--accent)' }} />
              <div>
                <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
                  Automated Paystack Settlements
                </p>
                <p className="text-[11px] mt-0.5 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  Your ticket revenue settles automatically to this bank account via Paystack. Once the first ticket is sold, bank details lock for your security.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Select Bank *
              </label>
              <select
                value={selectedBankCode}
                onChange={(e) => handleBankChange(e.target.value)}
                className="neu-input w-full"
              >
                {banks.map((b) => (
                  <option key={b.code} value={b.code}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                NUBAN Account Number (10 digits) *
              </label>
              <input
                type="text"
                maxLength={10}
                placeholder="0123456789"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ''))}
                className="neu-input w-full font-mono text-base tracking-widest"
              />
            </div>

            {/* Account Name resolution card */}
            <div className="p-4 rounded-2xl" style={{ backgroundColor: 'var(--canvas)', border: '1px solid var(--border)' }}>
              <span className="text-[10px] font-semibold uppercase tracking-wider block mb-1" style={{ color: 'var(--text-secondary)' }}>
                Verified Account Name
              </span>
              {resolvingAccount ? (
                <div className="flex items-center gap-2 py-1 text-xs" style={{ color: 'var(--accent)' }}>
                  <Loader2 size={16} className="animate-spin" />
                  Verifying account details with Paystack...
                </div>
              ) : accountName ? (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold font-mono" style={{ color: 'var(--text-primary)' }}>
                    {accountName}
                  </span>
                  <span className="flex items-center gap-1 text-[11px] font-semibold text-green-400">
                    <CheckCircle2 size={14} /> Verified
                  </span>
                </div>
              ) : accountResolveError ? (
                <div className="flex items-center gap-1.5 text-xs text-red-400 py-1">
                  <AlertCircle size={14} />
                  {accountResolveError}
                </div>
              ) : (
                <span className="text-xs text-gray-500 italic">
                  Enter 10-digit account number to auto-verify with Paystack
                </span>
              )}
            </div>
          </div>
        )}

        {/* ───────────────── NAVIGATION BUTTONS ───────────────── */}
        <div
          className="fixed bottom-0 left-0 right-0 p-4 border-t backdrop-blur-xl z-40"
          style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border)' }}
        >
          <div className="max-w-xl mx-auto flex items-center gap-3">
            {step > 0 && (
              <Button
                variant="outline"
                onClick={handlePrev}
                disabled={loading}
                className="flex items-center gap-1.5"
              >
                <ArrowLeft size={16} /> Back
              </Button>
            )}

            {step < STEPS.length - 1 ? (
              <Button
                variant="primary"
                onClick={handleNext}
                className="flex-1 flex items-center justify-center gap-1.5"
              >
                Continue <ArrowRight size={16} />
              </Button>
            ) : (
              <Button
                variant="primary"
                onClick={handleSubmit}
                loading={loading}
                className="flex-1 flex items-center justify-center gap-1.5"
              >
                Submit Event for Approval <Check size={16} />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Backward-compat alias (file kept as EventPlannerRegistration for now)
export const EventPlannerRegistration = EventOrganizerRegistration;
export default EventOrganizerRegistration;
