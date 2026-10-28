import { ReactNode, useEffect, useState, useRef } from 'react';
import { LucideIcon, Sun, Moon } from 'lucide-react';

// ========================================
// THEME TOGGLE
// ========================================
export function ThemeToggle() {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('theme');
      return stored === 'dark'; // Default to LIGHT
    }
    return false;
  });

  useEffect(() => {
    if (isDark) {
      document.body.classList.remove('light-mode');
      document.body.classList.add('dark-mode');
      localStorage.setItem('theme', 'dark');
    } else {
      document.body.classList.remove('dark-mode');
      document.body.classList.add('light-mode');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  return (
    <button
      onClick={() => setIsDark(!isDark)}
      className="theme-toggle"
      aria-label="Toggle theme"
    >
      <div className="theme-toggle-circle">
        {isDark ? (
          <Moon size={14} color="white" />
        ) : (
          <Sun size={14} color="#1E222B" />
        )}
      </div>
    </button>
  );
}

// ========================================
// NEUMORPHIC CARD
// ========================================
interface NeuCardProps {
  children: ReactNode;
  className?: string;
  inset?: boolean;
  delay?: number;
  onClick?: () => void;
}

export function NeuCard({ children, className = '', inset = false, delay = 0, onClick }: NeuCardProps) {
  return (
    <div
      className={`${inset ? 'neu-card-inset' : 'neu-card'} p-6 animate-fade-up ${onClick ? 'cursor-pointer' : ''} ${className}`}
      style={{ animationDelay: `${delay}ms` }}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
    >
      {children}
    </div>
  );
}

// ========================================
// STAT CARD
// ========================================
interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: { value: number; positive: boolean };
  delay?: number;
}

export function StatCard({ label, value, icon: Icon, trend, delay = 0 }: StatCardProps) {
  const [displayValue, setDisplayValue] = useState(typeof value === 'number' ? 0 : value);

  useEffect(() => {
    if (typeof value === 'number') {
      let start = 0;
      const end = value;
      const duration = 600;
      const startTime = Date.now();
      const timer = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        start = Math.floor(eased * end);
        setDisplayValue(start);
        if (progress >= 1) clearInterval(timer);
      }, 16);
      return () => clearInterval(timer);
    } else {
      setDisplayValue(value);
    }
  }, [value]);

  return (
    <NeuCard delay={delay}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary mb-2">{label}</p>
          <p className="text-2xl font-semibold text-text-primary truncate">
            {typeof value === 'number' ? displayValue.toLocaleString() : displayValue}
          </p>
          {trend && (
            <p className={`text-xs mt-2 font-semibold ${trend.positive ? 'text-success' : 'text-error'}`}>
              {trend.positive ? '↑' : '↓'} {Math.abs(trend.value)}%
            </p>
          )}
        </div>
        <div className="neu-card-inset p-3 rounded-2xl shrink-0">
          <Icon size={24} className="text-accent" />
        </div>
      </div>
    </NeuCard>
  );
}

// ========================================
// BUTTON
// ========================================
interface ButtonProps {
  children?: ReactNode;
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  icon?: LucideIcon;
  loading?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
  type?: 'button' | 'submit';
}

export function Button({ children, variant = 'secondary', size = 'md', icon: Icon, loading, disabled, onClick, className = '', type = 'button' }: ButtonProps) {
  const sizeClasses = {
    sm: 'px-4 py-2 text-xs',
    md: 'px-6 py-3 text-sm',
    lg: 'px-8 py-4 text-base'
  };

  return (
    <button
      type={type}
      className={`neu-button ${variant === 'primary' ? 'neu-button-primary' : ''} ${sizeClasses[size]} ${loading ? 'opacity-70 pointer-events-none' : ''} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
      onClick={onClick}
      disabled={disabled || loading}
    >
      {loading ? (
        <svg className="animate-spin h-4 w-4 inline-block" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : Icon ? <Icon size={size === 'sm' ? 14 : 16} className="inline-block mr-2" /> : null}
      {children && <span className="inline-block">{children}</span>}
    </button>
  );
}

// ========================================
// INPUT
// ========================================
interface InputProps {
  label?: string;
  placeholder?: string;
  value?: string;
  onChange?: (val: string) => void;
  type?: string;
  error?: string;
  hint?: string;
  icon?: LucideIcon;
  className?: string;
  autoFocus?: boolean;
  onKeyDown?: (e: React.KeyboardEvent) => void;
}

export function Input({ label, placeholder, value, onChange, type = 'text', error, hint, icon: Icon, className = '', autoFocus, onKeyDown }: InputProps) {
  return (
    <div className={className}>
      {label && <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-2">{label}</label>}
      <div className="relative">
        {Icon && <Icon size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary shrink-0" />}
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          autoFocus={autoFocus}
          onKeyDown={onKeyDown}
          style={Icon ? { paddingLeft: '2.85rem' } : undefined}
          className={`neu-input ${Icon ? 'pl-11' : ''} ${error ? 'ring-2 ring-error' : ''}`}
        />
      </div>
      {error && <p className="text-xs text-error mt-2 font-semibold">{error}</p>}
      {hint && !error && <p className="text-xs text-text-secondary mt-2">{hint}</p>}
    </div>
  );
}

// ========================================
// BADGE
// ========================================
export function Badge({ children, variant = 'neutral' }: { children: ReactNode; variant?: 'success' | 'warning' | 'error' | 'neutral' }) {
  return <span className={`badge badge-${variant}`}>{children}</span>;
}

// ========================================
// TOAST
// ========================================
interface ToastData { id: string; message: string; type: 'success' | 'error' | 'info'; }
let toastListeners: ((toasts: ToastData[]) => void)[] = [];
let toasts: ToastData[] = [];

export function showToast(message: string, type: 'success' | 'error' | 'info' = 'info') {
  const id = Math.random().toString(36).slice(2);
  toasts = [...toasts, { id, message, type }];
  toastListeners.forEach(l => l(toasts));
  setTimeout(() => {
    toasts = toasts.filter(t => t.id !== id);
    toastListeners.forEach(l => l(toasts));
  }, 4000);
}

export function ToastContainer() {
  const [items, setItems] = useState<ToastData[]>([]);
  useEffect(() => {
    toastListeners.push(setItems);
    return () => { toastListeners = toastListeners.filter(l => l !== setItems); };
  }, []);
  if (items.length === 0) return null;
  return (
    <div className="fixed bottom-24 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {items.map(t => (
        <NeuCard key={t.id} className="p-4 animate-slide-in">
          <p className={`text-sm font-semibold ${t.type === 'success' ? 'text-success' : t.type === 'error' ? 'text-error' : 'text-text-primary'}`}>
            {t.message}
          </p>
        </NeuCard>
      ))}
    </div>
  );
}

// ========================================
// COPY BUTTON
// ========================================
export function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    showToast('Copied to clipboard', 'success');
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={handleCopy} className="neu-button px-3 py-1 text-xs">
      {copied ? 'Copied' : label}
    </button>
  );
}

// ========================================
// COUNTDOWN TIMER
// ========================================
export function CountdownTimer({ expiresAt }: { expiresAt: string }) {
  const [timeLeft, setTimeLeft] = useState('');
  const [urgent, setUrgent] = useState(false);
  const intervalRef = useRef<number>();

  useEffect(() => {
    const update = () => {
      const diff = new Date(expiresAt).getTime() - Date.now();
      if (diff <= 0) { setTimeLeft('00:00'); setUrgent(true); clearInterval(intervalRef.current); return; }
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
      setUrgent(mins < 5);
    };
    update();
    intervalRef.current = window.setInterval(update, 1000);
    return () => clearInterval(intervalRef.current);
  }, [expiresAt]);

  return (
    <span className={`font-mono text-xl font-semibold ${urgent ? 'text-error' : 'text-accent'}`}>
      {timeLeft}
    </span>
  );
}

// ========================================
// PROGRESS BAR
// ========================================
export function ProgressBar({ value, max, label }: { value: number; max: number; label?: string }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div>
      {label && (
        <div className="flex justify-between text-xs mb-2">
          <span className="font-semibold text-text-secondary">{label}</span>
          <span className="font-semibold">{value.toLocaleString()} / {max.toLocaleString()}</span>
        </div>
      )}
      <div className="progress-bar">
        <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ========================================
// SKELETON
// ========================================
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

export function StatCardSkeleton() {
  return (
    <NeuCard>
      <Skeleton className="h-3 w-20 mb-3" />
      <Skeleton className="h-7 w-28 mb-2" />
      <Skeleton className="h-3 w-16" />
    </NeuCard>
  );
}

// ========================================
// SUCCESS CHECKMARK
// ========================================
export function SuccessCheckmark() {
  return (
    <svg width="80" height="80" viewBox="0 0 80 80" className="mx-auto">
      <circle cx="40" cy="40" r="38" fill="none" stroke="var(--success)" strokeWidth="2" />
      <path
        d="M25 40 L35 50 L55 30"
        fill="none"
        stroke="var(--success)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ strokeDasharray: 50, strokeDashoffset: 50, animation: 'checkmark 0.5s ease-out 0.2s forwards' }}
      />
    </svg>
  );
}

// ========================================
// SECTION HEADER
// ========================================
export function SectionHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-semibold text-text-primary" style={{ fontFamily: "'Unlock', cursive", fontWeight: 400 }}>{title}</h1>
        {subtitle && <p className="text-sm text-text-secondary mt-1">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

// ========================================
// TAB NAV
// ========================================
interface Tab { id: string; label: string; count?: number; }

export function TabNav({ tabs, active, onChange }: { tabs: Tab[]; active: string; onChange: (id: string) => void }) {
  return (
    <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`neu-button px-4 py-2 text-xs whitespace-nowrap shrink-0 ${active === tab.id ? 'active' : ''}`}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] bg-accent text-white">{tab.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}
