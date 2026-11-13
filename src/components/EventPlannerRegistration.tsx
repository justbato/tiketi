import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, Check, MapPin, Building2,
  Upload, ImageIcon, Plus, Trash2, X, User, Mail,
  Lock, CreditCard, ChevronDown, Info, Eye, EyeOff, CheckCircle2, AlertCircle, Loader2,
  GraduationCap, Compass, Search
} from 'lucide-react';
import { Ticket as TIcon } from 'lucide-react';
import { Button, Input, showToast } from './ui';
import { api } from '../lib/api';

// =============================================
// DATA
// =============================================
const POPULAR_CAMPUSES = [
  { short: 'FUTO', full: 'Federal University of Technology, Owerri (FUTO)' },
  { short: 'UNILAG', full: 'University of Lagos (UNILAG)' },
  { short: 'UNN', full: 'University of Nigeria, Nsukka (UNN)' },
  { short: 'UI', full: 'University of Ibadan (UI)' },
  { short: 'OAU', full: 'Obafemi Awolowo University (OAU)' },
  { short: 'UNIBEN', full: 'University of Benin (UNIBEN)' },
  { short: 'IMSU', full: 'Imo State University (IMSU)' },
  { short: 'FUTA', full: 'Federal University of Technology, Akure (FUTA)' },
  { short: 'Covenant', full: 'Covenant University' },
  { short: 'LASU', full: 'Lagos State University (LASU)' },
  { short: 'UNIPORT', full: 'University of Port Harcourt (UNIPORT)' },
  { short: 'UNILORIN', full: 'University of Ilorin (UNILORIN)' },
];

const NIGERIAN_UNIVERSITIES = [
  'Federal University of Technology, Owerri (FUTO)',
  'University of Lagos (UNILAG)',
  'University of Nigeria, Nsukka (UNN)',
  'University of Ibadan (UI)',
  'Obafemi Awolowo University (OAU)',
  'University of Benin (UNIBEN)',
  'University of Port Harcourt (UNIPORT)',
  'Imo State University (IMSU)',
  'Federal University of Technology, Akure (FUTA)',
  'Federal University of Technology, Minna (FUTMINNA)',
  'Covenant University',
  'Babcock University',
  'Lagos State University (LASU)',
  'Yaba College of Technology (YABATECH)',
  'Ahmadu Bello University (ABU)',
  'University of Ilorin (UNILORIN)',
  'Nnamdi Azikiwe University (NAU / UNIZIK)',
  'University of Calabar (UNICAL)',
  'Rivers State University (RSU)',
  'Delta State University (DELSU)',
  'Abia State University (ABSU)',
  'Enugu State University of Science and Technology (ESUT)',
  'Chukwuemeka Odumegwu Ojukwu University (COOU)',
  'Madonna University',
  'Bowen University',
  'Afe Babalola University (ABUAD)',
  'Landmark University',
  'Redeemer\'s University',
  'Nile University of Nigeria',
  'Baze University',
  'Other',
];

const NIGERIAN_STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi',
  'Bayelsa', 'Benue', 'Borno', 'Cross River', 'Delta',
  'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT - Abuja',
  'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano',
  'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Lagos',
  'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun',
  'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba',
  'Yobe', 'Zamfara',
];

const DEFAULT_NIGERIAN_BANKS = [
  { id: 1, name: 'Access Bank', code: '044' },
  { id: 2, name: 'Zenith Bank', code: '057' },
  { id: 3, name: 'Guaranty Trust Bank (GTBank)', code: '058' },
  { id: 4, name: 'First Bank of Nigeria', code: '011' },
  { id: 5, name: 'United Bank for Africa (UBA)', code: '033' },
  { id: 6, name: 'OPay (Paycom)', code: '999992' },
  { id: 7, name: 'PalmPay', code: '999991' },
  { id: 8, name: 'Moniepoint MFB', code: '50515' },
  { id: 9, name: 'Kuda Bank', code: '50211' },
  { id: 10, name: 'Fidelity Bank', code: '070' },
  { id: 11, name: 'Stanbic IBTC Bank', code: '221' },
  { id: 12, name: 'Sterling Bank', code: '232' },
  { id: 13, name: 'Union Bank of Nigeria', code: '032' },
  { id: 14, name: 'Polaris Bank', code: '076' },
  { id: 15, name: 'Wema Bank (ALAT)', code: '035' },
  { id: 16, name: 'Ecobank Nigeria', code: '050' },
  { id: 17, name: 'FCMB (First City Monument Bank)', code: '214' },
  { id: 18, name: 'Keystone Bank', code: '082' },
  { id: 19, name: 'Heritage Bank', code: '030' },
  { id: 20, name: 'Jaiz Bank', code: '301' },
  { id: 21, name: 'Taj Bank', code: '302' },
  { id: 22, name: 'Unity Bank', code: '215' },
  { id: 23, name: 'Providus Bank', code: '101' },
  { id: 24, name: 'VFD Microfinance Bank', code: '566' },
  { id: 25, name: 'Rubies MFB', code: '125' },
  { id: 26, name: 'Dot Microfinance Bank', code: '50163' },
  { id: 27, name: 'Fairmoney Microfinance Bank', code: '51318' },
];

const POPULAR_BANKS = [
  { name: 'OPay', code: '999992' },
  { name: 'PalmPay', code: '999991' },
  { name: 'Moniepoint', code: '50515' },
  { name: 'Kuda', code: '50211' },
  { name: 'GTBank', code: '058' },
  { name: 'Zenith', code: '057' },
  { name: 'Access', code: '044' },
  { name: 'First Bank', code: '011' },
  { name: 'UBA', code: '033' },
  { name: 'Wema/ALAT', code: '035' },
];

const TICKET_TIERS = [
  'VIP', 'Regular', 'Early Bird', 'Table', 'VVIP', 'Gold', 'Silver', 'Bronze', 'Couple'
];

const EVENT_CATEGORIES = [
  'Campus Party', 'Club & Nightlife', 'Concert & Music', 'Beach & Pool Party',
  'Festival', 'Fashion & Runway', 'Rave', 'Street Jam', 'Conference & Meetup', 'Other'
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
function StepIndicator({ steps, current, onStepClick }: { steps: string[]; current: number; onStepClick?: (idx: number) => void }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {steps.map((step, i) => (
        <div key={i} className="flex items-center">
          <div
            className={`flex flex-col items-center ${i < current ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
            onClick={() => {
              if (i < current && onStepClick) {
                onStepClick(i);
              }
            }}
          >
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
  const [formError, setFormError] = useState('');

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
  const [partyType, setPartyType] = useState<'campus' | 'off_campus'>('campus');
  const [university, setUniversity] = useState('Federal University of Technology, Owerri (FUTO)');
  const [universityCustom, setUniversityCustom] = useState('');
  const [state, setState] = useState('Lagos');
  const [locationCity, setLocationCity] = useState('');
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
  const [banks, setBanks] = useState<{ id: number; name: string; code: string }[]>(DEFAULT_NIGERIAN_BANKS);
  const [selectedBankCode, setSelectedBankCode] = useState('999992'); // default OPay
  const [bankName, setBankName] = useState('OPay (Paycom)');
  const [bankSearch, setBankSearch] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [isManualAccountName, setIsManualAccountName] = useState(false);
  const [resolvingAccount, setResolvingAccount] = useState(false);
  const [accountResolveError, setAccountResolveError] = useState('');

  // Fetch banks on mount
  useEffect(() => {
    async function loadBanks() {
      try {
        const list = await api.auth.getBanks();
        if (Array.isArray(list) && list.length > 0) {
          setBanks(list);
          const current = list.find((b: any) => b.code === selectedBankCode);
          if (current) {
            setBankName(current.name);
          } else if (!selectedBankCode) {
            setSelectedBankCode(list[0].code);
            setBankName(list[0].name);
          }
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
    if (!isManualAccountName) setAccountName('');
    setAccountResolveError('');
  };

  const handleSelectPopularBank = (bank: { name: string; code: string }) => {
    setSelectedBankCode(bank.code);
    const match = banks.find(b => b.code === bank.code);
    setBankName(match ? match.name : bank.name);
    if (!isManualAccountName) setAccountName('');
    setAccountResolveError('');
  };

  // Auto-resolve account name when 10 digits are typed
  useEffect(() => {
    const cleanNum = accountNumber.trim().replace(/\D/g, '');
    if (cleanNum.length === 10 && selectedBankCode && !isManualAccountName) {
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
    } else if (cleanNum.length < 10) {
      if (!isManualAccountName) {
        setAccountName('');
      }
      setAccountResolveError('');
    }
  }, [accountNumber, selectedBankCode, isManualAccountName]);

  const STEPS = ['Account', 'Event Details', 'Tickets', 'Payout'];

  // ── Validation ──
  const validateStep = (): boolean => {
    if (step === 0) {
      if (!organizerName.trim()) {
        const msg = 'Organizer / Brand name is required';
        setFormError(msg);
        showToast(msg, 'error');
        return false;
      }
      if (!organizerEmail.trim() || !organizerEmail.includes('@')) {
        const msg = 'Valid email is required (must include @)';
        setFormError(msg);
        showToast(msg, 'error');
        return false;
      }
      if (password.length < 8) {
        const msg = 'Password must be at least 8 characters';
        setFormError(msg);
        showToast(msg, 'error');
        return false;
      }
      if (password !== confirmPassword) {
        const msg = 'Passwords do not match';
        setFormError(msg);
        showToast(msg, 'error');
        return false;
      }
    }
    if (step === 1) {
      if (!partyType) {
        const msg = 'Please choose event type (Campus or Street / City Event)';
        setFormError(msg);
        showToast(msg, 'error');
        return false;
      }
      if (partyType === 'campus') {
        const effUni = university === 'Other' ? universityCustom.trim() : university.trim();
        if (!effUni) {
          const msg = 'Please select or enter the university / campus name';
          setFormError(msg);
          showToast(msg, 'error');
          return false;
        }
      }
      if (partyType === 'off_campus') {
        if (!state.trim()) {
          const msg = 'Please select a state for your event';
          setFormError(msg);
          showToast(msg, 'error');
          return false;
        }
      }
      if (!eventName.trim()) {
        const msg = 'Event name is required';
        setFormError(msg);
        showToast(msg, 'error');
        return false;
      }
      if (!eventDescription.trim()) {
        const msg = 'Event description is required';
        setFormError(msg);
        showToast(msg, 'error');
        return false;
      }
      if (!venue.trim()) {
        const msg = 'Venue / location is required';
        setFormError(msg);
        showToast(msg, 'error');
        return false;
      }
      if (!eventDate) {
        const msg = 'Event date and time is required';
        setFormError(msg);
        showToast(msg, 'error');
        return false;
      }
      if (!salesEnd) {
        const msg = 'Ticket sales closing date is required';
        setFormError(msg);
        showToast(msg, 'error');
        return false;
      }
    }
    if (step === 2) {
      for (const t of tickets) {
        const name = t.name === 'Custom' ? t.customName : t.name;
        if (!name.trim()) {
          const msg = 'Ticket tier name is required';
          setFormError(msg);
          showToast(msg, 'error');
          return false;
        }
        if (t.genderPricing) {
          if (!t.malePrice || !t.femalePrice) {
            const msg = 'Both male and female prices are required';
            setFormError(msg);
            showToast(msg, 'error');
            return false;
          }
        } else {
          if (!t.price) {
            const msg = 'Ticket price is required';
            setFormError(msg);
            showToast(msg, 'error');
            return false;
          }
        }
        if (!t.quantity) {
          const msg = 'Ticket quantity is required';
          setFormError(msg);
          showToast(msg, 'error');
          return false;
        }
      }
    }
    if (step === 3) {
      if (!selectedBankCode || !bankName) {
        const msg = 'Please select your bank';
        setFormError(msg);
        showToast(msg, 'error');
        return false;
      }
      if (accountNumber.trim().length !== 10) {
        const msg = 'Account number must be 10 digits';
        setFormError(msg);
        showToast(msg, 'error');
        return false;
      }
      if (!accountName.trim()) {
        const msg = 'Account name is required. Please verify with Paystack or enter it manually.';
        setFormError(msg);
        showToast(msg, 'error');
        return false;
      }
    }
    setFormError('');
    return true;
  };

  const handleNext = () => {
    if (!validateStep()) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setFormError('');
    if (step < STEPS.length - 1) {
      setStep(step + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrev = () => {
    setFormError('');
    if (step > 0) {
      setStep(step - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSubmit = async () => {
    setFormError('');
    if (!validateStep()) return;
    setLoading(true);

    try {
      const effectiveUniversity = partyType === 'campus'
        ? (university === 'Other' ? universityCustom.trim() : university.trim())
        : null;
      const effectiveState = partyType === 'off_campus' ? state.trim() : null;

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
        party_type: partyType,
        partyType: partyType,
        university: effectiveUniversity,
        state: effectiveState,
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
      const msg = err.message || 'Registration failed';
      setFormError(msg);
      showToast(msg, 'error');
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

        <StepIndicator
          steps={STEPS}
          current={step}
          onStepClick={(s) => {
            setFormError('');
            setStep(s);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />

        {formError && (
          <div className="mb-5 p-3.5 rounded-2xl bg-red-500/10 border border-red-500/25 flex items-start gap-2.5 animate-fade-up">
            <AlertCircle size={18} className="text-red-400 mt-0.5 shrink-0" />
            <p className="text-xs text-red-300 font-medium leading-relaxed">{formError}</p>
          </div>
        )}

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

            {/* Event Environment / Type */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-secondary)' }}>
                Event Type &amp; Setting *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Campus Event Card */}
                <div
                  onClick={() => {
                    setPartyType('campus');
                    if (eventCategory === 'Street / City Fest' || eventCategory === 'Club & Nightlife') {
                      setEventCategory('Campus Party');
                    }
                  }}
                  className={`p-4 rounded-2xl cursor-pointer border-2 transition-all flex flex-col gap-2 ${
                    partyType === 'campus'
                      ? 'border-[#00e5ff] bg-[#00e5ff]/10 shadow-lg'
                      : 'border-transparent neu-card hover:border-gray-600'
                  }`}
                  style={{
                    borderColor: partyType === 'campus' ? 'var(--accent)' : 'var(--border)',
                    backgroundColor: partyType === 'campus' ? 'rgba(0, 229, 255, 0.08)' : 'var(--card-bg)'
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{
                        backgroundColor: partyType === 'campus' ? 'var(--accent)' : 'var(--canvas)',
                        color: partyType === 'campus' ? '#000' : 'var(--text-primary)'
                      }}
                    >
                      <GraduationCap size={22} />
                    </div>
                    {partyType === 'campus' && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#00e5ff] text-black">
                        Selected
                      </span>
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                      Campus Event
                    </h3>
                    <p className="text-[11px] mt-0.5 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                      University / polytechnic parties, faculty dinners, student raves, or hostel events.
                    </p>
                  </div>
                </div>

                {/* Street / City Event Card */}
                <div
                  onClick={() => {
                    setPartyType('off_campus');
                    if (eventCategory === 'Campus Party') {
                      setEventCategory('Club & Nightlife');
                    }
                  }}
                  className={`p-4 rounded-2xl cursor-pointer border-2 transition-all flex flex-col gap-2 ${
                    partyType === 'off_campus'
                      ? 'border-[#00e5ff] bg-[#00e5ff]/10 shadow-lg'
                      : 'border-transparent neu-card hover:border-gray-600'
                  }`}
                  style={{
                    borderColor: partyType === 'off_campus' ? 'var(--accent)' : 'var(--border)',
                    backgroundColor: partyType === 'off_campus' ? 'rgba(0, 229, 255, 0.08)' : 'var(--card-bg)'
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{
                        backgroundColor: partyType === 'off_campus' ? 'var(--accent)' : 'var(--canvas)',
                        color: partyType === 'off_campus' ? '#000' : 'var(--text-primary)'
                      }}
                    >
                      <Compass size={22} />
                    </div>
                    {partyType === 'off_campus' && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#00e5ff] text-black">
                        Selected
                      </span>
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                      Street / City Event
                    </h3>
                    <p className="text-[11px] mt-0.5 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                      Off-campus clubs, city festivals, beach parties, rave concerts, or lounges.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Campus Options */}
            {partyType === 'campus' && (
              <div className="space-y-3 p-4 rounded-2xl border" style={{ backgroundColor: 'var(--canvas)', borderColor: 'var(--border)' }}>
                <div>
                  <span className="text-[11px] font-semibold block mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                    Popular Campuses:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {POPULAR_CAMPUSES.map((c) => {
                      const isSelected = university === c.full;
                      return (
                        <button
                          key={c.short}
                          type="button"
                          onClick={() => setUniversity(c.full)}
                          className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
                            isSelected
                              ? 'bg-[#00e5ff] text-black shadow-md scale-105'
                              : 'neu-button text-[var(--text-secondary)] hover:text-white'
                          }`}
                          style={isSelected ? { backgroundColor: 'var(--accent)', color: '#000' } : {}}
                        >
                          {c.short}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                    Select University / Institution *
                  </label>
                  <select
                    value={university}
                    onChange={(e) => setUniversity(e.target.value)}
                    className="neu-input w-full font-medium"
                    style={{ backgroundColor: 'var(--card-bg, #1a202c)', color: 'var(--text-primary, #ffffff)' }}
                  >
                    {NIGERIAN_UNIVERSITIES.map((u) => (
                      <option key={u} value={u} style={{ backgroundColor: '#181d28', color: '#ffffff' }}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>

                {university === 'Other' && (
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                      Custom University Name *
                    </label>
                    <input
                      type="text"
                      placeholder="Enter institution name"
                      value={universityCustom}
                      onChange={(e) => setUniversityCustom(e.target.value)}
                      className="neu-input w-full"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Off-Campus Options */}
            {partyType === 'off_campus' && (
              <div className="space-y-3 p-4 rounded-2xl border" style={{ backgroundColor: 'var(--canvas)', borderColor: 'var(--border)' }}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                      State *
                    </label>
                    <select
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      className="neu-input w-full font-medium"
                      style={{ backgroundColor: 'var(--card-bg, #1a202c)', color: 'var(--text-primary, #ffffff)' }}
                    >
                      {NIGERIAN_STATES.map((s) => (
                        <option key={s} value={s} style={{ backgroundColor: '#181d28', color: '#ffffff' }}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                      City / Area (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Lekki, Ikeja, Abuja Central"
                      value={locationCity}
                      onChange={(e) => setLocationCity(e.target.value)}
                      className="neu-input w-full"
                    />
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Event Category *
              </label>
              <select
                value={eventCategory}
                onChange={(e) => setEventCategory(e.target.value)}
                className="neu-input w-full"
                style={{ backgroundColor: 'var(--card-bg, #1a202c)', color: 'var(--text-primary, #ffffff)' }}
              >
                {EVENT_CATEGORIES.map(cat => (
                  <option key={cat} value={cat} style={{ backgroundColor: '#181d28', color: '#ffffff' }}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Venue / Location Address *
              </label>
              <input
                type="text"
                placeholder={
                  partyType === 'campus'
                    ? 'e.g. FUTO Hall of Excellence, Owerri / Unilag Sports Complex'
                    : 'e.g. Landmark Beach, Victoria Island, Lagos'
                }
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

            {/* Bank Selection */}
            <div className="space-y-3">
              <label className="block text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                Select Bank *
              </label>

              {/* Popular Banks Quick-Picks */}
              <div>
                <span className="text-[11px] font-semibold block mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  Popular Banks:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {POPULAR_BANKS.map((pb) => {
                    const isSelected = selectedBankCode === pb.code;
                    return (
                      <button
                        key={pb.code}
                        type="button"
                        onClick={() => handleSelectPopularBank(pb)}
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
                          isSelected
                            ? 'bg-[#00e5ff] text-black shadow-md scale-105'
                            : 'neu-button text-[var(--text-secondary)] hover:text-white'
                        }`}
                        style={isSelected ? { backgroundColor: 'var(--accent)', color: '#000' } : {}}
                      >
                        {pb.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Search filter for all Nigerian banks */}
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Filter bank by name (e.g. OPay, GTBank, Access, Zenith)..."
                  value={bankSearch}
                  onChange={(e) => setBankSearch(e.target.value)}
                  className="neu-input w-full pl-9 pr-14 text-xs py-2"
                />
                {bankSearch && (
                  <button
                    type="button"
                    onClick={() => setBankSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-gray-400 hover:text-white"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Styled Select Dropdown */}
              <div>
                <select
                  value={selectedBankCode}
                  onChange={(e) => handleBankChange(e.target.value)}
                  className="neu-input w-full font-medium"
                  style={{
                    backgroundColor: 'var(--card-bg, #1a202c)',
                    color: 'var(--text-primary, #ffffff)',
                  }}
                >
                  <option value="" disabled style={{ backgroundColor: '#181d28', color: '#888' }}>
                    -- Choose your bank ({banks.length} available) --
                  </option>
                  {(bankSearch.trim()
                    ? banks.filter(b => b.name.toLowerCase().includes(bankSearch.toLowerCase().trim()))
                    : banks
                  ).map((b) => (
                    <option
                      key={`${b.code}-${b.name}`}
                      value={b.code}
                      style={{
                        backgroundColor: '#181d28',
                        color: '#ffffff',
                        padding: '8px',
                      }}
                    >
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Selected Bank confirmation badge */}
              {selectedBankCode && (
                <div
                  className="p-3 rounded-xl flex items-center justify-between border"
                  style={{ backgroundColor: 'var(--canvas)', borderColor: 'var(--border)' }}
                >
                  <div className="flex items-center gap-2">
                    <Building2 size={16} style={{ color: 'var(--accent)' }} />
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-wider block" style={{ color: 'var(--text-muted)' }}>
                        Selected Bank
                      </span>
                      <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
                        {bankName || banks.find(b => b.code === selectedBankCode)?.name || 'Selected'}
                      </span>
                    </div>
                  </div>
                  <span
                    className="text-[11px] font-mono px-2 py-0.5 rounded font-semibold"
                    style={{ backgroundColor: 'rgba(0,229,255,0.1)', color: 'var(--accent)' }}
                  >
                    Code: {selectedBankCode}
                  </span>
                </div>
              )}
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

            {/* Account Name Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                  Account Name *
                </label>
                {accountName && !isManualAccountName && (
                  <button
                    type="button"
                    onClick={() => setIsManualAccountName(true)}
                    className="text-[11px] hover:underline"
                    style={{ color: 'var(--accent)' }}
                  >
                    Edit Name
                  </button>
                )}
              </div>

              {isManualAccountName ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="e.g. John Doe / Business Enterprise"
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    className="neu-input w-full font-medium"
                  />
                  <div className="flex items-center justify-between text-[11px] text-gray-400">
                    <span>Must match the name on your NUBAN bank account</span>
                    <button
                      type="button"
                      onClick={() => {
                        setIsManualAccountName(false);
                        const cleanNum = accountNumber.trim().replace(/\D/g, '');
                        if (cleanNum.length === 10 && selectedBankCode) {
                          setResolvingAccount(true);
                          setAccountResolveError('');
                          api.auth.resolveAccount(cleanNum, selectedBankCode)
                            .then((name) => {
                              setAccountName(name);
                              setResolvingAccount(false);
                            })
                            .catch((err) => {
                              setAccountResolveError(err.message || 'Could not verify account');
                              setResolvingAccount(false);
                            });
                        }
                      }}
                      className="hover:underline text-[var(--accent)] font-medium"
                    >
                      Re-verify with Paystack
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-2xl" style={{ backgroundColor: 'var(--canvas)', border: '1px solid var(--border)' }}>
                  <span className="text-[10px] font-semibold uppercase tracking-wider block mb-1" style={{ color: 'var(--text-secondary)' }}>
                    Bank Account Holder
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
                    <div className="space-y-2.5 py-1">
                      <div className="flex items-start gap-1.5 text-xs text-red-400">
                        <AlertCircle size={15} className="shrink-0 mt-0.5" />
                        <span className="leading-relaxed">{accountResolveError}</span>
                      </div>
                      <div className="flex items-center gap-2 pt-1 border-t border-red-500/20">
                        <button
                          type="button"
                          onClick={() => setIsManualAccountName(true)}
                          className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#00e5ff]/10 text-[#00e5ff] border border-[#00e5ff]/30 hover:bg-[#00e5ff]/20 transition-all flex items-center gap-1.5"
                        >
                          Enter Account Name Manually
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500 italic">
                        Enter 10-digit account number to auto-verify
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsManualAccountName(true)}
                        className="text-[11px] text-gray-400 hover:text-white hover:underline"
                      >
                        Enter manually
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ───────────────── NAVIGATION BUTTONS ───────────────── */}
        <div
          className="fixed bottom-0 left-0 right-0 p-4 border-t backdrop-blur-xl z-50"
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
