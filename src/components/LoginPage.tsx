import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Ticket as TIcon, ChevronDown, Lock, Shield, Eye, EyeOff, CalendarDays, Sparkles, ShieldCheck, Sliders } from 'lucide-react';
import { Button, Input, showToast } from './ui';
import { api } from '../lib/api';

type Role = 'planner' | 'model' | 'gate';

interface RoleOption {
  value: Role;
  label: string;
  description: string;
  icon: any;
  color: string;
}

const ROLES: RoleOption[] = [
  {
    value: 'planner',
    label: 'Event Planner',
    description: 'Manage events, models & gate staff',
    icon: CalendarDays,
    color: '#2563EB',
  },
  {
    value: 'model',
    label: 'Model Ambassador',
    description: 'View your ticket sales & ranking',
    icon: Sparkles,
    color: '#8B5CF6',
  },
  {
    value: 'gate',
    label: 'Gate Verifier',
    description: 'Verify tickets at the gate',
    icon: ShieldCheck,
    color: '#059669',
  },
];

export function LoginPage() {
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState<Role>('planner');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [accountOptions, setAccountOptions] = useState<any[] | null>(null);
  const [detectedAccounts, setDetectedAccounts] = useState<any[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [checkingAccounts, setCheckingAccounts] = useState(false);

  const currentRole = ROLES.find(r => r.value === selectedRole)!;

  // Watch email and look up all associated event accounts for planner
  useEffect(() => {
    if (selectedRole !== 'planner') {
      setDetectedAccounts([]);
      setSelectedAccountId('');
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@') || cleanEmail.length < 5) {
      setDetectedAccounts([]);
      setSelectedAccountId('');
      return;
    }

    const timer = setTimeout(async () => {
      setCheckingAccounts(true);
      try {
        const accounts = await api.auth.getAccountsByEmail(cleanEmail);
        setDetectedAccounts(accounts);
        if (accounts.length > 0) {
          const firstActive = accounts.find(a => a.status !== 'deactivated') || accounts[0];
          setSelectedAccountId(firstActive.id);
        } else {
          setSelectedAccountId('');
        }
      } catch (e) {
        console.error(e);
      } finally {
        setCheckingAccounts(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [email, selectedRole]);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      showToast('Please fill in email and password', 'error');
      return;
    }
    setLoading(true);
    try {
      const result = await api.auth.login(email, password, selectedRole, selectedAccountId || undefined);

      if (result.multiple) {
        setAccountOptions(result.accounts);
        setLoading(false);
        return;
      }

      showToast(`Welcome back, ${result.user?.name || 'User'}!`, 'success');

      // Route by role
      if (selectedRole === 'planner') navigate('/owner');
      else if (selectedRole === 'model') navigate('/model');
      else if (selectedRole === 'gate') navigate('/verify');
    } catch (err: any) {
      showToast(err.message || 'Login failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAccount = async (account: any) => {
    if (account.status === 'deactivated') {
      showToast('This event account has ended and was closed by the administrator. Access to this dashboard is no longer available.', 'error');
      return;
    }
    setLoading(true);
    try {
      const result = await api.auth.login(email, password, 'planner', account.id);
      showToast(`Welcome to ${account.event_name || 'your dashboard'}!`, 'success');
      navigate('/owner');
    } catch (err: any) {
      showToast(err.message || 'Login failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-8"
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
      <div className="w-full max-w-sm pb-36">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2.5 mb-2">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg"
              style={{ backgroundColor: 'var(--accent)' }}
            >
              <TIcon size={24} color="white" />
            </div>
          </Link>
          <h1
            className="text-3xl mt-2"
            style={{ color: 'var(--text-primary)', fontFamily: "'Unlock', cursive", fontWeight: 400 }}
          >
            TiKeTi
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Sign in to your account
          </p>
        </div>

        {accountOptions ? (
          /* ── Multi-Event Account Selection ── */
          <div className="card p-6 space-y-4 animate-fade-up">
            <div className="text-center mb-3">
              <h2 className="text-base font-bold text-text-primary">
                Select Event Account
              </h2>
              <p className="text-xs text-text-secondary mt-1">
                Your email ({email}) manages multiple event accounts. Select an event to access:
              </p>
            </div>

            <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
              {accountOptions.map((acc) => {
                const isClosed = acc.status === 'deactivated';
                return (
                  <div
                    key={acc.id}
                    onClick={() => handleSelectAccount(acc)}
                    className={`p-3.5 rounded-xl border transition-all text-left ${
                      isClosed
                        ? 'opacity-70 bg-slate-500/5 border-slate-500/20 cursor-not-allowed'
                        : 'neu-card-inset border-accent/30 hover:border-accent cursor-pointer hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-text-primary truncate">
                          {acc.event_name || acc.name}
                        </p>
                        <p className="text-[11px] text-text-secondary mt-0.5 truncate">
                          Planner: {acc.name}
                        </p>
                      </div>
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded shrink-0 ${
                          isClosed
                            ? 'bg-red-500/10 text-red-500 border border-red-500/20'
                            : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                        }`}
                      >
                        {isClosed ? 'Closed / Ended' : 'Active'}
                      </span>
                    </div>

                    {isClosed ? (
                      <p className="text-[10px] text-red-500/90 mt-2 italic">
                        Event concluded. This account was closed by admin.
                      </p>
                    ) : (
                      <p className="text-[10px] text-accent mt-2 font-semibold flex items-center gap-1">
                        Open Event Dashboard →
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => setAccountOptions(null)}
              className="text-xs w-full text-center py-1 mt-2 text-text-secondary hover:text-accent"
            >
              ← Back to Sign In
            </button>
          </div>
        ) : (
          /* ── Main login form ── */
          <div className="card p-6 space-y-4">
            {/* Role selector */}
            <div>
              <label
                className="block text-xs font-semibold uppercase tracking-wider mb-2"
                style={{ color: 'var(--text-secondary)' }}
              >
                Signing in as
              </label>
              <div className="relative">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all"
                  style={{
                    background: 'var(--canvas)',
                    border: '1.5px solid var(--border)',
                    color: 'var(--text-primary)',
                  }}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${currentRole.color}20`, color: currentRole.color }}
                  >
                    <currentRole.icon size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">{currentRole.label}</p>
                    <p className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>
                      {currentRole.description}
                    </p>
                  </div>
                  <ChevronDown
                    size={16}
                    className={`transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
                    style={{ color: 'var(--text-muted)', flexShrink: 0 }}
                  />
                </button>

                {/* Dropdown */}
                {dropdownOpen && (
                  <div
                    className="absolute left-0 right-0 top-full mt-1 rounded-xl overflow-hidden shadow-xl z-50"
                    style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}
                  >
                    {ROLES.map((role) => (
                      <button
                        key={role.value}
                        onClick={() => { setSelectedRole(role.value); setDropdownOpen(false); }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-opacity-50 text-left transition-colors"
                        style={{
                          backgroundColor: selectedRole === role.value ? 'rgba(0,229,255,0.06)' : 'transparent',
                          borderBottom: '1px solid var(--border)',
                        }}
                      >
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                          style={{ backgroundColor: `${role.color}20`, color: role.color }}
                        >
                          <role.icon size={16} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                            {role.label}
                          </p>
                          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                            {role.description}
                          </p>
                        </div>
                        {selectedRole === role.value && (
                          <div
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: 'var(--accent)' }}
                          />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Email Address
              </label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                className="neu-input"
                autoFocus
              />
            </div>

            {/* If email has multiple accounts associated, show dropdown selector */}
            {selectedRole === 'planner' && detectedAccounts.length > 1 && (
              <div className="space-y-1.5 p-3 rounded-xl neu-card-inset border border-accent/40 animate-fade-up">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-accent flex items-center gap-1.5">
                    <CalendarDays size={13} />
                    Select Event Dashboard
                  </label>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-accent/15 text-accent">
                    {detectedAccounts.length} Events Linked
                  </span>
                </div>

                <select
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                  className="neu-input font-medium text-xs"
                  style={{ border: '1.5px solid var(--accent)' }}
                >
                  {detectedAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.event_name || acc.eventName || acc.name} {acc.status === 'deactivated' ? '(Ended)' : '(Active)'}
                    </option>
                  ))}
                </select>

                <p className="text-[10px] text-text-secondary leading-tight">
                  Multiple events are registered to this email. Pick which event dashboard to access.
                </p>
              </div>
            )}

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                  className="neu-input pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <Button className="w-full" onClick={handleLogin} loading={loading}>
              Sign In
            </Button>

            {/* Divider only for event planners */}
            {selectedRole === 'planner' && (
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t" style={{ borderColor: 'var(--border)' }} />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-2" style={{ background: 'var(--card-bg)', color: 'var(--text-muted)' }}>
                    or
                  </span>
                </div>
              </div>
            )}

            {selectedRole === 'planner' && (
              <Link to="/register">
                <Button variant="secondary" className="w-full">
                  Create Event Planner Account
                </Button>
              </Link>
            )}

            {(selectedRole === 'model' || selectedRole === 'gate') && (
              <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
                You were invited via email. Check your inbox for the invitation link to set up your password.
              </p>
            )}
          </div>
        )}

        <div className="text-center mt-4">
          <Link to="/" className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}

// =============================================
// INVITE CONFIRM PAGE (for models & gate staff)
// =============================================
export function InviteConfirmPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Get token from URL
  const token = new URLSearchParams(window.location.search).get('token') || '';
  const [inviteInfo, setInviteInfo] = useState<{ name: string; role: 'model' | 'gate'; email: string }>({
    name: 'Invited User',
    role: 'model',
    email: ''
  });

  useEffect(() => {
    if (token) {
      api.auth.getInviteInfo(token).then(info => {
        if (info) {
          setInviteInfo({
            name: info.name || 'Invited User',
            role: info.role,
            email: info.email || ''
          });
        }
      });
    }
  }, [token]);

  const handleConfirm = async () => {
    if (password.length < 8) { showToast('Password must be at least 8 characters', 'error'); return; }
    if (password !== confirmPassword) { showToast('Passwords do not match', 'error'); return; }
    if (!token) { showToast('Invalid invite link', 'error'); return; }

    setLoading(true);
    try {
      await api.auth.confirmInvite(token, password, inviteInfo.role as 'model' | 'gate');
      showToast('Account activated! Welcome', 'success');
      if (inviteInfo.role === 'model') navigate('/model');
      else navigate('/verify');
    } catch (err: any) {
      showToast(err.message || 'Failed to confirm invite', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg"
            style={{ backgroundColor: 'var(--accent)' }}
          >
            <TIcon size={24} color="white" />
          </div>
          <h1
            className="text-2xl"
            style={{ color: 'var(--text-primary)', fontFamily: "'Unlock', cursive", fontWeight: 400 }}
          >
            TiKeTi
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Confirm your invitation
          </p>
        </div>

        <div className="card p-6 space-y-4">
          <div
            className="p-3 rounded-xl text-center"
            style={{ background: 'rgba(0,229,255,0.06)', border: '1px solid rgba(0,229,255,0.15)' }}
          >
            <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
              Welcome, {inviteInfo.name}!
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
              You've been invited as a{' '}
              <strong style={{ color: 'var(--accent)' }}>
                {inviteInfo.role === 'model' ? 'Model Ambassador' : 'Gate Verifier'}
              </strong>
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              Set Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter password (min. 8 characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="neu-input pr-10"
                autoFocus
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

          <Button className="w-full" onClick={handleConfirm} loading={loading}>
            Activate Account &amp; Continue
          </Button>
        </div>
      </div>
    </div>
  );
}
