import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, Check, MapPin, Building2,
  Upload, ImageIcon, Plus, Trash2, X, User, Mail,
  Phone, Lock, CreditCard, ChevronDown, Info, GraduationCap, Compass,
  Eye, EyeOff
} from 'lucide-react';
import { Ticket as TIcon } from 'lucide-react';
import { Button, Input, showToast } from './ui';
import { api } from '../lib/api';

// =============================================
// DATA
// =============================================
const NIGERIAN_UNIVERSITIES = [
  'Federal University of Technology, Owerri (FUTO)',
  'University of Lagos (UNILAG)',
  'University of Ibadan (UI)',
  'Obafemi Awolowo University (OAU)',
  'University of Nigeria, Nsukka (UNN)',
  'Ahmadu Bello University (ABU)',
  'University of Benin (UNIBEN)',
  'University of Port Harcourt (UNIPORT)',
  'Covenant University',
  'Babcock University',
  'Lagos State University (LASU)',
  'Yaba College of Technology (YABATECH)',
  'Lagos State Polytechnic',
  'Federal University of Technology, Akure (FUTA)',
  'Federal University of Technology, Minna (FUTMINNA)',
  'University of Calabar (UNICAL)',
  'University of Ilorin (UNILORIN)',
  'Nnamdi Azikiwe University (NAU)',
  'University of Maiduguri (UNIMAID)',
  'Bayero University Kano (BUK)',
  'Rivers State University (RSU)',
  'Delta State University (DELSU)',
  'Imo State University (IMSU)',
].sort();

const NIGERIAN_STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi',
  'Bayelsa', 'Benue', 'Borno', 'Cross River', 'Delta',
  'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT (Abuja)',
  'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano',
  'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Lagos',
  'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun',
  'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba',
  'Yobe', 'Zamfara',
];

const TICKET_TIERS = [
  'VIP', 'Regular', 'Early Bird', 'Table', 'VVIP', 'Gold', 'Silver', 'Bronze', 'Couple'
];

const BANKS = [
  'Access Bank', 'Zenith Bank', 'GTBank', 'First Bank', 'UBA',
  'Fidelity Bank', 'Union Bank', 'Stanbic IBTC', 'Sterling Bank',
  'Polaris Bank', 'Kuda Bank', 'Opay', 'PalmPay', 'Moniepoint',
];

// =============================================
// TYPES
// =============================================
interface TicketTierEntry {
  id: string;
  name: string;
  customName: string;
  genderPricing: boolean;
  price: string;         // unified price
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
              className="text-[9px] mt-1 font-medium text-center max-w-[60px] leading-tight"
              style={{ color: i === current ? 'var(--accent)' : 'var(--text-muted)' }}
            >
              {step}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              className="w-8 sm:w-12 h-0.5 mx-1 mt-[-10px]"
              style={{ backgroundColor: i < current ? 'var(--success)' : 'var(--border)' }}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// =============================================
// TICKET TIER BUILDER
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
      className="card p-4 space-y-3 relative"
      style={{ borderLeft: '3px solid var(--accent)' }}
    >
      {!isOnly && (
        <button
          onClick={onRemove}
          className="absolute top-3 right-3 p-1 rounded-lg"
          style={{ color: 'var(--text-muted)' }}
        >
          <X size={14} />
        </button>
      )}
      <div className="flex items-center gap-2 mb-1">
        <span
          className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded"
          style={{ backgroundColor: 'rgba(0,229,255,0.1)', color: 'var(--accent)' }}
        >
          Ticket {index + 1}
        </span>
      </div>

      {/* Tier type selection */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-secondary)' }}>
          Ticket Tier
        </label>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {TICKET_TIERS.map((t) => (
            <button
              key={t}
              onClick={() => onChange({ ...tier, name: t, customName: '' })}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                tier.name === t ? 'text-white' : ''
              }`}
              style={{
                backgroundColor: tier.name === t ? 'var(--accent)' : 'var(--canvas)',
                color: tier.name === t ? 'white' : 'var(--text-secondary)',
                border: '1px solid var(--border)'
              }}
            >
              {t}
            </button>
          ))}
          <button
            onClick={() => onChange({ ...tier, name: 'Custom' })}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all`}
            style={{
              backgroundColor: tier.name === 'Custom' ? 'var(--accent)' : 'var(--canvas)',
              color: tier.name === 'Custom' ? 'white' : 'var(--text-secondary)',
              border: '1px solid var(--border)'
            }}
          >
            Custom
          </button>
        </div>
        {tier.name === 'Custom' && (
          <input
            type="text"
            placeholder="Enter custom tier name"
            value={tier.customName}
            onChange={(e) => onChange({ ...tier, customName: e.target.value })}
            className="neu-input"
          />
        )}
      </div>

      {/* Ticket image upload */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-secondary)' }}>
          Ticket Design Image
        </label>
        <div
          className="relative rounded-xl overflow-hidden cursor-pointer"
          onClick={() => fileRef.current?.click()}
          style={{
            background: 'var(--canvas)',
            border: '2px dashed var(--border)',
            minHeight: '80px',
          }}
        >
          {tier.imagePreview ? (
            <div className="relative rounded-xl overflow-hidden group">
              <img src={tier.imagePreview} alt="Ticket Design" className="w-full object-cover max-h-48 rounded-xl" />
              
              {/* Live Ticket Overlay Simulation */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/60 p-3 flex flex-col justify-between pointer-events-none">
                {/* Top row: Tier name & Gender badge */}
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded bg-black/60 backdrop-blur-sm text-[10px] font-bold text-white uppercase tracking-wider border border-white/20">
                    {tier.name === 'Custom' ? (tier.customName || 'Custom Tier') : tier.name}
                  </span>
                  {tier.genderPricing && (
                    <div className="flex items-center gap-1">
                      <span className="px-1.5 py-0.5 rounded bg-blue-600/90 text-[9px] font-bold text-white tracking-wide">
                        Male: ₦{tier.malePrice ? Number(tier.malePrice).toLocaleString() : '0'}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-pink-600/90 text-[9px] font-bold text-white tracking-wide">
                        Female: ₦{tier.femalePrice ? Number(tier.femalePrice).toLocaleString() : '0'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Bottom row: QR code + Verification code */}
                <div className="flex items-end justify-between">
                  <div className="bg-black/75 backdrop-blur-md px-2 py-1 rounded border border-white/10">
                    <span className="text-[8px] uppercase tracking-wider block text-gray-400 font-mono">Verification Code</span>
                    <span className="font-mono text-[11px] font-bold text-[#00e5ff] tracking-widest">
                      TKT-XXXX-2026
                    </span>
                  </div>

                  {/* Simulated QR Code box */}
                  <div className="w-12 h-12 bg-white p-1 rounded-md shadow-lg flex flex-col items-center justify-center">
                    <div className="w-full h-full border border-black/20 flex flex-wrap p-0.5 gap-0.5 bg-gray-900 rounded-[2px]">
                      <div className="w-3 h-3 bg-white border border-gray-900" />
                      <div className="w-2 h-2 bg-white ml-auto" />
                      <div className="w-3 h-3 bg-white mt-auto" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Hover to change image overlay */}
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-xl cursor-pointer">
                <Upload size={20} color="white" />
                <span className="text-white text-xs ml-2 font-semibold">Click to Change Ticket Image</span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-6 gap-2">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(0,229,255,0.1)' }}>
                <ImageIcon size={22} style={{ color: 'var(--accent)' }} />
              </div>
              <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                Upload ticket image <span style={{ color: 'var(--accent)' }}>(any size allowed)</span>
              </span>
              <span className="text-[11px] text-center max-w-xs" style={{ color: 'var(--text-muted)' }}>
                TiKeTi automatically stamps unique QR code &amp; verification code onto each ticket for event entry
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

      {/* Quantity and admits */}
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
export function EventPlannerRegistration() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  // Step 1 – Party Type
  const [partyType, setPartyType] = useState<'campus' | 'off_campus' | ''>('');
  const [university, setUniversity] = useState('');
  const [universityCustom, setUniversityCustom] = useState('');
  const [state, setState] = useState('');
  const [location, setLocation] = useState('');

  // Step 2 – Event Info (for the first event)
  const [eventName, setEventName] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [salesEnd, setSalesEnd] = useState('');
  const [capacity, setCapacity] = useState('');
  const [eventCategory, setEventCategory] = useState('');
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const bannerRef = useRef<HTMLInputElement>(null);
  const logoRef = useRef<HTMLInputElement>(null);

  // Step 3 – Tickets
  const [tickets, setTickets] = useState<TicketTierEntry[]>([{
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

  // Step 4 – Account Setup
  const [plannerName, setPlannerName] = useState('');
  const [plannerEmail, setPlannerEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [existingPlannerEvents, setExistingPlannerEvents] = useState<any[]>([]);

  // Step 5 – Payment Account
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');

  // Check if planner email already has events registered
  useEffect(() => {
    const clean = plannerEmail.trim().toLowerCase();
    if (!clean || !clean.includes('@') || clean.length < 5) {
      setExistingPlannerEvents([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const found = await api.auth.getAccountsByEmail(clean);
        setExistingPlannerEvents(found);
        if (found.length > 0) {
          const profile = found[0];
          if (!plannerName && profile.name) setPlannerName(profile.name);
          if (!whatsapp && profile.whatsapp_number) setWhatsapp(profile.whatsapp_number);
          if (!bankName && profile.bank_name) setBankName(profile.bank_name);
          if (!accountNumber && profile.account_number) setAccountNumber(profile.account_number);
          if (!accountName && profile.account_name) setAccountName(profile.account_name);
        }
      } catch {}
    }, 300);
    return () => clearTimeout(t);
  }, [plannerEmail]);

  const STEPS = ['Party Type', 'Event Info', 'Tickets', 'Account', 'Payment'];

  // ── Validation per step ──
  const validateStep = (): boolean => {
    if (step === 0) {
      if (!partyType) { showToast('Please select party type', 'error'); return false; }
      if (partyType === 'campus' && !university && !universityCustom) {
        showToast('Please select or type your university', 'error'); return false;
      }
      if (partyType === 'off_campus' && (!state || !location)) {
        showToast('Please select state and enter location', 'error'); return false;
      }
    }
    if (step === 1) {
      if (!eventName.trim()) { showToast('Event name is required', 'error'); return false; }
      if (!eventDescription.trim()) { showToast('Event description is required', 'error'); return false; }
      if (!eventDate) { showToast('Event date is required', 'error'); return false; }
      if (!salesEnd) { showToast('Sales close date is required', 'error'); return false; }
      if (!capacity) { showToast('Capacity is required', 'error'); return false; }
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
      if (!plannerName.trim()) { showToast('Name is required', 'error'); return false; }
      if (!plannerEmail.trim()) { showToast('Email is required', 'error'); return false; }
      if (!whatsapp.trim()) { showToast('WhatsApp number is required', 'error'); return false; }
      if (password.length < 8) { showToast('Password must be at least 8 characters', 'error'); return false; }
      if (password !== confirmPassword) { showToast('Passwords do not match', 'error'); return false; }
    }
    if (step === 4) {
      if (!bankName) { showToast('Bank name is required', 'error'); return false; }
      if (!accountNumber.trim()) { showToast('Account number is required', 'error'); return false; }
      if (!accountName.trim()) { showToast('Account name is required', 'error'); return false; }
    }
    return true;
  };

  const handleNext = () => {
    if (!validateStep()) return;
    if (step < STEPS.length - 1) setStep(step + 1);
  };

  const handleSubmit = async () => {
    if (!validateStep()) return;
    setLoading(true);

    try {
      // ── Step A: Register the planner account ──
      const regResult = await api.auth.registerPlanner({
        party_type: partyType as 'campus' | 'off_campus',
        university: partyType === 'campus' ? (university || universityCustom) : undefined,
        state: partyType === 'off_campus' ? state : undefined,
        location: partyType === 'off_campus' ? location : undefined,
        name: plannerName.trim(),
        email: plannerEmail.trim(),
        whatsapp_number: whatsapp.trim(),
        password,
        bank_name: bankName,
        account_number: accountNumber.trim(),
        account_name: accountName.trim(),
        eventName: eventName.trim(),
      });

      const token: string = regResult?.token || '';

      // ── Step B: Create the first event ──
      let eventId: string | null = null;
      if (eventName.trim()) {
        try {
          const venueStr = partyType === 'campus'
            ? (university === 'Other' ? universityCustom : (university || 'University Venue'))
            : `${location}, ${state}`;

          const createdEvent = await api.events.create({
            name: eventName.trim(),
            description: eventDescription.trim() || 'Event details coming soon.',
            venue: venueStr,
            eventDate: eventDate || new Date(Date.now() + 86400000 * 7).toISOString(),
            salesEndDate: salesEnd || new Date(Date.now() + 86400000 * 6).toISOString(),
            capacity: parseInt(capacity) || 500,
            bannerUrl: bannerPreview || '',
            posterUrl: logoPreview || bannerPreview || '',
            category: eventCategory.trim() || undefined,
          });
          eventId = createdEvent?.id || null;
        } catch {
          // Silently continue
        }
      }

      // ── Step C: Create ticket types (with gender pricing) ──
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
          } catch {
            // continue with next ticket
          }
        }
      }

      showToast('Registration complete! Welcome to TiKeTi', 'success');
      navigate('/owner');
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
            Create Event Planner Account
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Set up your account and first event in minutes
          </p>
        </div>

        <StepIndicator steps={STEPS} current={step} />

        {/* ───────────────── STEP 1: PARTY TYPE ───────────────── */}
        {step === 0 && (
          <div className="space-y-6 animate-fade-up">
            <div>
              <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                Select Event Category
              </h2>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                Choose whether your party is targeted at a university campus or an off-campus city venue.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setPartyType('campus')}
                className="neu-card p-5 rounded-2xl flex flex-col items-start gap-3 transition-all text-left relative overflow-hidden"
                style={{
                  border: partyType === 'campus' ? '2px solid var(--accent)' : '1px solid var(--shadow-dark)',
                  backgroundColor: partyType === 'campus' ? 'rgba(37,99,235,0.06)' : 'var(--card-bg)',
                }}
              >
                <div className="flex items-center justify-between w-full">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center transition-all"
                    style={{
                      backgroundColor: partyType === 'campus' ? 'var(--accent)' : 'rgba(0,0,0,0.05)',
                      color: partyType === 'campus' ? '#FFFFFF' : 'var(--text-primary)'
                    }}
                  >
                    <GraduationCap size={24} />
                  </div>
                  {partyType === 'campus' && (
                    <span className="w-6 h-6 rounded-full flex items-center justify-center bg-accent text-white shadow-sm">
                      <Check size={14} />
                    </span>
                  )}
                </div>
                <div>
                  <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Campus Party</p>
                  <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    University, polytechnic or student faculty gathering
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPartyType('off_campus')}
                className="neu-card p-5 rounded-2xl flex flex-col items-start gap-3 transition-all text-left relative overflow-hidden"
                style={{
                  border: partyType === 'off_campus' ? '2px solid var(--accent)' : '1px solid var(--shadow-dark)',
                  backgroundColor: partyType === 'off_campus' ? 'rgba(37,99,235,0.06)' : 'var(--card-bg)',
                }}
              >
                <div className="flex items-center justify-between w-full">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center transition-all"
                    style={{
                      backgroundColor: partyType === 'off_campus' ? 'var(--accent)' : 'rgba(0,0,0,0.05)',
                      color: partyType === 'off_campus' ? '#FFFFFF' : 'var(--text-primary)'
                    }}
                  >
                    <Compass size={24} />
                  </div>
                  {partyType === 'off_campus' && (
                    <span className="w-6 h-6 rounded-full flex items-center justify-center bg-accent text-white shadow-sm">
                      <Check size={14} />
                    </span>
                  )}
                </div>
                <div>
                  <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Off-Campus Event</p>
                  <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    City lounge, club, beach festival, concert or external venue
                  </p>
                </div>
              </button>
            </div>

            {/* Campus: select/type university */}
            {partyType === 'campus' && (
              <div className="space-y-4 pt-2 animate-fade-up">
                {/* Popular Universities quick selector chips */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-secondary)' }}>
                    Popular Campuses (Quick Select)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      'Federal University of Technology, Owerri (FUTO)',
                      'University of Lagos (UNILAG)',
                      'University of Nigeria, Nsukka (UNN)',
                      'University of Ibadan (UI)',
                      'Obafemi Awolowo University (OAU)',
                      'University of Benin (UNIBEN)',
                      'Imo State University (IMSU)',
                      'Federal University of Technology, Akure (FUTA)',
                      'Covenant University',
                    ].map(u => {
                      const isSelected = university === u;
                      return (
                        <button
                          key={u}
                          type="button"
                          onClick={() => {
                            setUniversity(u);
                            setUniversityCustom('');
                          }}
                          className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                            isSelected
                              ? 'bg-accent text-white border-accent font-bold shadow-sm'
                              : 'bg-card-bg text-text-secondary border-[var(--shadow-dark)] hover:border-accent/50'
                          }`}
                        >
                          {u.includes('(') ? u.split('(')[1].replace(')', '') : u}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                    Select University / Institution
                  </label>
                  <select
                    value={university}
                    onChange={(e) => {
                      setUniversity(e.target.value);
                      if (e.target.value !== 'other') {
                        setUniversityCustom('');
                      }
                    }}
                    className="neu-input"
                  >
                    <option value="">-- Choose your university from list --</option>
                    {NIGERIAN_UNIVERSITIES.map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                    <option value="other">Other Institution (Type below)</option>
                  </select>
                </div>

                {/* Only display the custom university input if "other" is explicitly selected */}
                {university === 'other' && (
                  <div className="animate-fade-up">
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                      Specify University Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Federal University of Technology, Owerri (FUTO)"
                      value={universityCustom}
                      onChange={(e) => setUniversityCustom(e.target.value)}
                      className="neu-input"
                      autoFocus
                    />
                  </div>
                )}
              </div>
            )}

            {/* Off campus: state + location */}
            {partyType === 'off_campus' && (
              <div className="space-y-4 pt-2 animate-fade-up">
                {/* Popular States quick chips */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-secondary)' }}>
                    Popular States
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {['Lagos', 'FCT (Abuja)', 'Imo', 'Rivers', 'Oyo', 'Enugu', 'Delta', 'Edo', 'Ogun'].map(st => {
                      const isSelected = state === st;
                      return (
                        <button
                          key={st}
                          type="button"
                          onClick={() => setState(st)}
                          className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                            isSelected
                              ? 'bg-accent text-white border-accent font-bold shadow-sm'
                              : 'bg-card-bg text-text-secondary border-[var(--shadow-dark)] hover:border-accent/50'
                          }`}
                        >
                          {st}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                    State
                  </label>
                  <select
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="neu-input"
                  >
                    <option value="">-- Select State --</option>
                    {NIGERIAN_STATES.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                    Location / Venue Area
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Victoria Island, Lagos or New Owerri, Imo"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="neu-input"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* ───────────────── STEP 2: EVENT INFO ───────────────── */}
        {step === 1 && (
          <div className="space-y-4 animate-fade-up">
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Event Information</h2>

            {/* Banner */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Event Banner / Flyer
              </label>
              <div
                onClick={() => bannerRef.current?.click()}
                className="rounded-xl overflow-hidden cursor-pointer"
                style={{ border: '2px dashed var(--border)', minHeight: 100, background: 'var(--canvas)' }}
              >
                {bannerPreview ? (
                  <img src={bannerPreview} alt="Banner" className="w-full max-h-48 object-cover" />
                ) : (
                  <div className="flex flex-col items-center justify-center h-24 gap-2">
                    <Upload size={22} style={{ color: 'var(--text-muted)' }} />
                    <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Click to upload banner image</span>
                  </div>
                )}
              </div>
              <input
                ref={bannerRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) { setBannerFile(f); setBannerPreview(URL.createObjectURL(f)); }
                }}
              />
            </div>

            {/* Logo */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Event Logo (Optional)
              </label>
              <div
                onClick={() => logoRef.current?.click()}
                className="rounded-xl overflow-hidden cursor-pointer flex items-center justify-center"
                style={{ border: '2px dashed var(--border)', minHeight: 72, background: 'var(--canvas)' }}
              >
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo" className="h-16 w-16 object-contain rounded-lg" />
                ) : (
                  <div className="flex flex-col items-center gap-1.5 py-3">
                    <ImageIcon size={20} style={{ color: 'var(--text-muted)' }} />
                    <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Upload logo</span>
                  </div>
                )}
              </div>
              <input
                ref={logoRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) { setLogoFile(f); setLogoPreview(URL.createObjectURL(f)); }
                }}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-secondary)' }}>Event Name</label>
              <input type="text" placeholder="e.g. Faculty Night Out 2026" value={eventName} onChange={(e) => setEventName(e.target.value)} className="neu-input" />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-secondary)' }}>Description</label>
              <textarea
                rows={3}
                placeholder="Describe your event — dress code, performers, what to expect..."
                value={eventDescription}
                onChange={(e) => setEventDescription(e.target.value)}
                className="neu-input resize-none"
                style={{ minHeight: 80 }}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-secondary)' }}>Event Date &amp; Time</label>
                <input type="datetime-local" value={eventDate} onChange={(e) => setEventDate(e.target.value)} className="neu-input" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-secondary)' }}>Sales Close Date</label>
                <input type="datetime-local" value={salesEnd} onChange={(e) => setSalesEnd(e.target.value)} className="neu-input" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-secondary)' }}>Venue Capacity</label>
              <input type="number" placeholder="e.g. 500" value={capacity} onChange={(e) => setCapacity(e.target.value)} className="neu-input" />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Event Category <span className="font-normal normal-case opacity-60">(max 40 characters)</span>
              </label>
              <input
                type="text"
                id="event-category-input"
                list="category-suggestions"
                placeholder="e.g. Music, Conference, Sports…"
                value={eventCategory}
                maxLength={40}
                onChange={(e) => setEventCategory(e.target.value)}
                className="neu-input"
                required
              />
              <datalist id="category-suggestions">
                <option value="Music" />
                <option value="Nightlife" />
                <option value="Conference" />
                <option value="Sports" />
                <option value="Arts" />
                <option value="Food" />
              </datalist>
              <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>
                Pick a suggestion or type your own. Shown as a filter chip on the events page.
              </p>
            </div>
          </div>
        )}

        {/* ───────────────── STEP 3: TICKETS ───────────────── */}
        {step === 2 && (
          <div className="space-y-4 animate-fade-up">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Ticket Setup</h2>
              <button
                onClick={addTicket}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg"
                style={{ backgroundColor: 'rgba(0,229,255,0.1)', color: 'var(--accent)' }}
              >
                <Plus size={13} /> Add Tier
              </button>
            </div>

            <div
              className="flex items-start gap-2 p-3 rounded-xl text-xs"
              style={{ background: 'rgba(0,229,255,0.05)', border: '1px solid rgba(0,229,255,0.2)' }}
            >
              <Info size={14} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 1 }} />
              <span style={{ color: 'var(--text-secondary)' }}>
                Upload your ticket design image. TiKeTi will automatically overlay the QR code and verification code on each ticket before sending to buyers.
              </span>
            </div>

            <div className="space-y-4">
              {tickets.map((t, i) => (
                <TicketTierCard
                  key={t.id}
                  tier={t}
                  index={i}
                  onChange={(updated) => updateTicket(t.id, updated)}
                  onRemove={() => removeTicket(t.id)}
                  isOnly={tickets.length === 1}
                />
              ))}
            </div>
          </div>
        )}

        {/* ───────────────── STEP 4: ACCOUNT ───────────────── */}
        {step === 3 && (
          <div className="space-y-4 animate-fade-up">
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Set Up Your Account</h2>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Full Name / Organization Name
              </label>
              <input
                type="text"
                placeholder="e.g. John Doe or EventPro Nigeria"
                value={plannerName}
                onChange={(e) => setPlannerName(e.target.value)}
                className="neu-input"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Email Address
              </label>
              <input type="email" placeholder="you@example.com" value={plannerEmail} onChange={(e) => setPlannerEmail(e.target.value)} className="neu-input" />
            </div>

            {existingPlannerEvents.length > 0 && (
              <div className="p-3 rounded-xl bg-accent/10 border border-accent/30 text-xs animate-fade-up space-y-1">
                <p className="font-bold text-accent flex items-center gap-1.5">
                  <Check size={14} /> Existing Planner Profile Detected ({existingPlannerEvents.length} events)
                </p>
                <p className="text-text-secondary leading-relaxed">
                  This new event will be added to your account ({plannerEmail}). You can manage all your events under one login!
                </p>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                WhatsApp Number (for contact)
              </label>
              <input
                type="tel"
                placeholder="e.g. 08012345678"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                className="neu-input"
              />
              <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>
                Buyers &amp; buyers can reach you on WhatsApp for support
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter password (min. 8 characters)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="neu-input pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--text-muted)' }}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Confirm Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirm password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="neu-input pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--text-muted)' }}
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ───────────────── STEP 5: PAYMENT ACCOUNT ───────────────── */}
        {step === 4 && (
          <div className="space-y-4 animate-fade-up">
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Payment / Settlement Account</h2>

            <div
              className="p-3 rounded-xl text-xs"
              style={{ background: 'rgba(0,229,255,0.06)', border: '1px solid rgba(0,229,255,0.2)' }}
            >
              <p className="font-semibold mb-1" style={{ color: 'var(--accent)' }}>How Payments Work</p>
              <p style={{ color: 'var(--text-secondary)' }}>
                All ticket payments go to TiKeTi first. After your event, the platform fee is deducted and the rest is sent to your account below. You can track all sales in your dashboard.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Bank Name
              </label>
              <select value={bankName} onChange={(e) => setBankName(e.target.value)} className="neu-input">
                <option value="">-- Select Bank --</option>
                {BANKS.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Account Number
              </label>
              <input
                type="text"
                placeholder="10-digit account number"
                maxLength={10}
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                className="neu-input font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Account Name
              </label>
              <input
                type="text"
                placeholder="Name on account"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                className="neu-input"
              />
            </div>

            <div
              className="p-4 rounded-xl space-y-1.5 text-xs"
              style={{ background: 'var(--canvas)', border: '1px solid var(--border)' }}
            >
              <p className="font-semibold text-sm mb-2" style={{ color: 'var(--text-primary)' }}>Registration Summary</p>
              <div className="flex justify-between">
                <span style={{ color: 'var(--text-secondary)' }}>Party Type</span>
                <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                  {partyType === 'campus' ? 'Campus Party' : 'Off-Campus Event'}
                </span>
              </div>
              {partyType === 'campus' && (
                <div className="flex justify-between">
                  <span style={{ color: 'var(--text-secondary)' }}>University</span>
                  <span className="font-medium truncate ml-4 text-right" style={{ color: 'var(--text-primary)' }}>
                    {university || universityCustom}
                  </span>
                </div>
              )}
              {partyType === 'off_campus' && (
                <div className="flex justify-between">
                  <span style={{ color: 'var(--text-secondary)' }}>Location</span>
                  <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{state}, {location}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span style={{ color: 'var(--text-secondary)' }}>Event</span>
                <span className="font-medium truncate ml-4 text-right" style={{ color: 'var(--text-primary)' }}>{eventName}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: 'var(--text-secondary)' }}>Tickets</span>
                <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{tickets.length} tier(s)</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: 'var(--text-secondary)' }}>Name</span>
                <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{plannerName}</span>
              </div>
            </div>
          </div>
        )}

        {/* ── Navigation buttons ── */}
        <div className="flex gap-3 mt-6">
          {step > 0 && (
            <Button variant="secondary" onClick={() => setStep(step - 1)} icon={ArrowLeft}>
              Back
            </Button>
          )}
          {step < STEPS.length - 1 ? (
            <Button variant="primary" className="flex-1" onClick={handleNext} icon={ArrowRight}>
              Continue
            </Button>
          ) : (
            <Button variant="primary" className="flex-1" onClick={handleSubmit} loading={loading}>
              Complete Registration
            </Button>
          )}
        </div>

        <p className="text-center text-xs mt-4" style={{ color: 'var(--text-muted)' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--accent)' }} className="font-semibold">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
