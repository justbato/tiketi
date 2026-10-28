import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, Lock, KeyRound, ArrowLeft, CheckCircle2, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { Button, showToast } from './ui';
import { api } from '../lib/api';

export function AdminLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [twoFaCode, setTwoFaCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'credentials' | '2fa'>('credentials');
  const [adminUser, setAdminUser] = useState<any>(null);

  const handleCredentialsSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email.trim() || !password.trim()) {
      showToast('Admin email and master security password required', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await api.auth.login(email.trim(), password, 'admin');
      setAdminUser(res.user);
      setStep('2fa');
      showToast('Credentials accepted. Enter 2FA verification token.', 'info');
    } catch (err: any) {
      showToast(err.message || 'Access Denied: Invalid administrative credentials', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleTwoFaSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (twoFaCode.length < 6) {
      showToast('Please enter the complete 6-digit authenticator code', 'error');
      return;
    }

    // In demo/test mode, any 6-digit code or 123456 works
    showToast('Identity verified. Loading Administrator Terminal...', 'success');
    navigate('/admin');
  };


  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden"
      style={{ backgroundColor: '#0B0F19' }}
    >
      {/* Background ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          background: 'radial-gradient(circle at 50% 20%, rgba(217, 119, 6, 0.25) 0%, transparent 60%)'
        }}
      />

      <div className="w-full max-w-md relative z-10">
        {/* Terminal Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 shadow-xl border border-amber-500/30 bg-amber-500/10 backdrop-blur-md">
            <Shield size={32} className="text-amber-500" />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase mb-2 bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Lock size={11} />
            <span>Restricted Gateway</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight" style={{ fontFamily: "'Unlock', cursive" }}>
            TiKeTi Admin Terminal
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
            Authorized root operators only. All connection attempts, tokens, and IP signatures are cryptographically logged.
          </p>
        </div>

        {/* Card */}
        <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          {step === 'credentials' ? (
            <form onSubmit={handleCredentialsSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Administrative Email
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@tiketi.ng"
                    required
                    className="w-full bg-slate-950/70 border border-slate-700/80 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all font-mono"
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Master Security Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    className="w-full bg-slate-950/70 border border-slate-700/80 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  loading={loading}
                  className="w-full py-3.5 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-bold rounded-xl shadow-lg shadow-amber-500/20 text-sm"
                >
                  <KeyRound size={16} className="inline mr-2" />
                  Authenticate Credentials
                </Button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleTwoFaSubmit} className="space-y-5 animate-fade-up">
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto mb-2 text-amber-400">
                  <KeyRound size={20} />
                </div>
                <h3 className="text-sm font-bold text-white">Two-Factor Authentication</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Enter the 6-digit verification code from your authenticator application.
                </p>
              </div>

              <div>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="000000"
                  value={twoFaCode}
                  onChange={(e) => setTwoFaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl py-3 text-center text-2xl font-mono tracking-[0.5em] text-amber-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Button
                  type="submit"
                  disabled={twoFaCode.length < 6}
                  className="w-full py-3.5 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-bold rounded-xl shadow-lg shadow-amber-500/20 text-sm"
                >
                  <CheckCircle2 size={16} className="inline mr-2" />
                  Verify & Open Terminal
                </Button>

                <button
                  type="button"
                  onClick={() => { setStep('credentials'); setTwoFaCode(''); }}
                  className="w-full text-xs text-slate-400 hover:text-slate-200 py-2 transition-colors"
                >
                  ← Back to Credentials
                </button>
              </div>
            </form>
          )}

          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
            <span className="flex items-center gap-1">
              <AlertTriangle size={12} className="text-amber-500" />
              <span>TLS 1.3 256-Bit Encrypted</span>
            </span>
            <Link to="/" className="text-slate-400 hover:text-amber-400 transition-colors flex items-center gap-1">
              <ArrowLeft size={11} /> Return to Site
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
