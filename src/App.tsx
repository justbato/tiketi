import { useState, useEffect, useCallback, useRef } from 'react';
import { BrowserRouter, Routes, Route, Link, useNavigate, useLocation, useParams, Navigate } from 'react-router-dom';
import {
  LayoutDashboard, Calendar, Users, Ticket as TicketIcon, Settings, LogOut,
  TrendingUp, DollarSign, ShoppingBag, UserCheck, BarChart3, Shield,
  Bell, Search, ChevronRight, Download, Plus, Eye, MoreVertical,
  ArrowLeft, Check, X, AlertTriangle, Camera, Keyboard, QrCode,
  Activity, Clock, FileText, Building2, Lock, Menu, Share2,
  Zap, Globe, CreditCard, Mail, Phone, ArrowRight, Link2,
  Edit2, Trash2, UserX, RefreshCw, Ban, ExternalLink, Upload,
  Printer, MapPin, CheckCircle2, Bookmark, Info, Home, CalendarDays,
  PlusCircle, ScanLine, User, ChevronDown, Compass
} from 'lucide-react';
import QRCode from 'qrcode';

const TIcon = TicketIcon;
import {
  NeuCard, StatCard, Button, Input, Badge, CopyButton, CountdownTimer,
  SuccessCheckmark, ProgressBar, TabNav, Skeleton, StatCardSkeleton,
  ToastContainer, showToast, SectionHeader, ThemeToggle
} from './components/ui';
import { TicketAnimation } from './components/TicketAnimation';
import {
  LiveEventsPage,
  PublicEventPage,
  CheckoutPage,
  PaymentSuccess,
  TicketQR
} from './components/LiveEvents';
import { EventPlannerRegistration } from './components/EventPlannerRegistration';
import { LoginPage, InviteConfirmPage } from './components/LoginPage';
import { AdminLoginPage } from './components/AdminLoginPage';
import { TicketPass } from './components/TicketPass';

// Alias for backward compatibility
const BentoCard = NeuCard;
import {
  mockEvents, mockTicketTypes, mockModels, mockOrders, mockTickets,
  mockGateStaff, mockPayouts, mockAuditLogs, mockSalesData,
  formatNaira, formatDate, formatDateTime, generateTicketCode,
  type Event, type TicketType, type Model, type GateStaff
} from './lib/data';
import { 
  api, 
  getStoredModels, 
  saveStoredModels, 
  getStoredStaff, 
  saveStoredStaff,
  getStoredEvents,
  saveStoredEvents,
  getStoredOrders,
  saveStoredOrders,
  getStoredTicketTypes,
  saveStoredTicketTypes,
  getStoredPlanners,
  saveStoredPlanners
} from './lib/api';

// ============ GLOBAL FLOATING FOOTER NAV ============
function GlobalFloatingNav() {
  const location = useLocation();
  const currentPath = location.pathname;

  const [authUser, setAuthUser] = useState<any>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isScrollingDown, setIsScrollingDown] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const lastScrollY = useRef(0);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('tiketi_auth_user');
      if (stored) {
        setAuthUser(JSON.parse(stored));
      } else {
        setAuthUser(null);
      }
    } catch {
      setAuthUser(null);
    }
  }, [location.pathname]);

  // Hide nav when typing in input, textarea, or select to prevent covering buttons/keyboards
  useEffect(() => {
    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')) {
        setIsInputFocused(true);
      }
    };
    const handleFocusOut = () => {
      setIsInputFocused(false);
    };

    window.addEventListener('focusin', handleFocusIn);
    window.addEventListener('focusout', handleFocusOut);
    return () => {
      window.removeEventListener('focusin', handleFocusIn);
      window.removeEventListener('focusout', handleFocusOut);
    };
  }, []);

  // Auto-hide when scrolling down, show when scrolling up
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY || document.documentElement.scrollTop;
      if (currentScrollY > lastScrollY.current && currentScrollY > 70) {
        setIsScrollingDown(true);
      } else {
        setIsScrollingDown(false);
      }
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // If user minimized the nav, show a discreet floating pill
  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-40 no-print animate-fade-in">
        <button
          type="button"
          onClick={() => setIsMinimized(false)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-full font-bold text-xs shadow-xl transition-all neu-card hover:scale-105"
          style={{
            backgroundColor: 'var(--card-bg)',
            color: 'var(--accent)',
            border: '1.5px solid var(--accent)'
          }}
          title="Open Navigation Menu"
          aria-label="Open Navigation Menu"
        >
          <Compass size={15} />
          <span>Menu</span>
        </button>
      </div>
    );
  }

  const isOwner = currentPath.startsWith('/owner');
  const isAdmin = currentPath.startsWith('/admin');
  const navVisibilityClass = (isScrollingDown || isInputFocused) ? 'nav-hidden' : '';

  // If on Owner dashboard:
  if (isOwner) {
    const ownerNavItems = [
      { label: 'Overview', path: '/owner', icon: LayoutDashboard, exact: true },
      { label: 'Events', path: '/owner/events', icon: Calendar },
      { label: 'Models', path: '/owner/models', icon: Users },
      { label: 'Gate Staff', path: '/owner/staff', icon: UserCheck },
      { label: 'Public Site', path: '/events', icon: Globe },
    ];
    return (
      <nav className={`floating-footer-nav no-print ${navVisibilityClass}`} aria-label="Dashboard Navigation">
        {ownerNavItems.map((item) => {
          const isActive = item.exact
            ? currentPath === item.path
            : currentPath.startsWith(item.path);
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={isActive ? 'active' : ''}
              title={item.label}
            >
              <Icon size={17} />
              <span>{item.label}</span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setIsMinimized(true)}
          className="p-1.5 rounded-full text-text-muted hover:text-text-primary transition-colors ml-1 hidden sm:flex items-center justify-center"
          title="Minimize navigation"
          aria-label="Minimize navigation"
        >
          <ChevronDown size={14} />
        </button>
      </nav>
    );
  }

  // If on Admin panel:
  if (isAdmin) {
    const adminNavItems = [
      { label: 'Overview', path: '/admin', icon: LayoutDashboard, exact: true },
      { label: 'Planners', path: '/admin/owners', icon: Users },
      { label: 'Events', path: '/admin/events', icon: Calendar },
      { label: 'Orders', path: '/admin/orders', icon: ShoppingBag },
      { label: 'Public Site', path: '/events', icon: Globe },
    ];
    return (
      <nav className={`floating-footer-nav no-print ${navVisibilityClass}`} aria-label="Admin Navigation">
        {adminNavItems.map((item) => {
          const isActive = item.exact
            ? currentPath === item.path
            : currentPath.startsWith(item.path);
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={isActive ? 'active' : ''}
              title={item.label}
            >
              <Icon size={17} />
              <span>{item.label}</span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setIsMinimized(true)}
          className="p-1.5 rounded-full text-text-muted hover:text-text-primary transition-colors ml-1 hidden sm:flex items-center justify-center"
          title="Minimize navigation"
          aria-label="Minimize navigation"
        >
          <ChevronDown size={14} />
        </button>
      </nav>
    );
  }

  // Public / Buyer / Gate / Planner Portal navigation:
  const portalPath = authUser?.role === 'admin'
    ? '/admin'
    : authUser?.role === 'planner'
    ? '/owner'
    : authUser?.role === 'model'
    ? '/model'
    : authUser?.role === 'gate'
    ? '/verify'
    : '/login';

  const portalLabel = authUser ? 'Dashboard' : 'Sign In';

  const publicNavItems = [
    { label: 'Home', path: '/', icon: Home, exact: true },
    { label: 'Events', path: '/events', icon: CalendarDays },
    { label: 'Host Party', path: '/register', icon: PlusCircle },
    { label: 'Gate Scan', path: '/verify', icon: ScanLine },
    { label: portalLabel, path: portalPath, icon: User },
  ];

  return (
    <nav className={`floating-footer-nav no-print ${navVisibilityClass}`} aria-label="Global Navigation">
      {publicNavItems.map((item) => {
        const isActive = item.exact
          ? currentPath === item.path
          : currentPath.startsWith(item.path);
        const Icon = item.icon;
        return (
          <Link
            key={item.path}
            to={item.path}
            className={isActive ? 'active' : ''}
            title={item.label}
          >
            <Icon size={17} />
            <span>{item.label}</span>
          </Link>
        );
      })}
      <button
        type="button"
        onClick={() => setIsMinimized(true)}
        className="p-1.5 rounded-full text-text-muted hover:text-text-primary transition-colors ml-1 hidden sm:flex items-center justify-center"
        title="Minimize navigation"
        aria-label="Minimize navigation"
      >
        <ChevronDown size={14} />
      </button>
    </nav>
  );
}

// ============ LAYOUT ============
function AppLayout({ children, role }: { children: React.ReactNode; role: string }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const [authUser, setAuthUser] = useState<any>(null);
  const [userEvents, setUserEvents] = useState<any[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('tiketi_auth_user');
      if (stored) {
        const parsed = JSON.parse(stored);
        setAuthUser(parsed);
        if (role === 'owner' && parsed?.email) {
          api.auth.getAccountsByEmail(parsed.email).then(accounts => {
            setUserEvents(accounts);
          }).catch(console.error);
        }
      }
    } catch {
      // ignore
    }
  }, [role, location.pathname]);

  const handleSwitchEvent = (targetAccountId: string) => {
    const selected = userEvents.find(acc => acc.id === targetAccountId);
    if (selected) {
      localStorage.setItem('tiketi_auth_user', JSON.stringify(selected));
      showToast(`Switched to "${selected.eventName}"`, 'info');
      setTimeout(() => {
        window.location.reload();
      }, 300);
    }
  };

  const navItems: Record<string, { icon: any; label: string; path: string }[]> = {
    admin: [
      { icon: LayoutDashboard, label: 'Overview', path: '/admin' },
      { icon: Users, label: 'Event Planners', path: '/admin/owners' },
      { icon: Calendar, label: 'Events', path: '/admin/events' },
      { icon: ShoppingBag, label: 'Orders', path: '/admin/orders' },
      { icon: DollarSign, label: 'Payouts', path: '/admin/payouts' },
      { icon: Settings, label: 'Settings', path: '/admin/settings' },
      { icon: FileText, label: 'Audit', path: '/admin/audit' },
    ],
    owner: [
      { icon: LayoutDashboard, label: 'Dashboard', path: '/owner' },
      { icon: Calendar, label: 'Events', path: '/owner/events' },
      { icon: Users, label: 'Models', path: '/owner/models' },
      { icon: UserCheck, label: 'Gate Staff', path: '/owner/staff' },
      { icon: DollarSign, label: 'Earnings', path: '/owner/earnings' },
      { icon: Settings, label: 'Settings', path: '/owner/settings' },
    ],
  };

  const items = navItems[role] || navItems.owner;

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Sidebar - Desktop */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-60 sm:w-64 neu-card transform transition-transform duration-200 lg:relative lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`} style={{ borderRadius: 0, borderRight: '1px solid var(--shadow-dark)' }}>
        <div className="flex items-center gap-2 px-4 sm:px-5 h-14 sm:h-16 border-b" style={{ borderColor: 'var(--shadow-dark)', backgroundColor: 'var(--card-bg)' }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--accent)' }}>
            <TIcon size={16} color="white" />
          </div>
          <span className="text-base" style={{ color: 'var(--text-primary)', fontFamily: "'Unlock', cursive", fontWeight: 400 }}>TiKeTi</span>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden ml-2 p-2 rounded-lg">
            <X size={18} style={{ color: 'var(--text-primary)' }} />
          </button>
        </div>

        {/* Active Event Banner in Sidebar for Planners */}
        {role === 'owner' && authUser?.eventName && (
          <div className="px-3 pt-3 pb-1">
            <div className="p-2.5 rounded-xl neu-card-inset text-xs border border-[var(--shadow-dark)]">
              <div className="flex items-center justify-between text-[10px] uppercase font-bold text-text-secondary tracking-wider">
                <span>Active Event</span>
                {userEvents.length > 1 && (
                  <span className="text-[10px] text-accent font-semibold">{userEvents.length} events</span>
                )}
              </div>
              <div className="font-semibold text-text-primary truncate mt-0.5">{authUser.eventName}</div>
              <div className="text-[10px] text-text-secondary truncate">{authUser.campus || 'Main Campus'}</div>
            </div>
          </div>
        )}

        <nav className="p-2 sm:p-3 space-y-2 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 170px)', backgroundColor: 'var(--card-bg)' }}>
          {items.map(item => {
            const isActive = location.pathname === item.path || (item.path !== '/admin' && item.path !== '/owner' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${isActive ? 'neu-card-inset' : 'hover:bg-opacity-50'
                  }`}
                style={{ color: isActive ? 'var(--accent)' : 'var(--text-primary)', opacity: isActive ? 1 : 0.7 }}
              >
                <item.icon size={18} className="shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 p-3 border-t" style={{ borderColor: 'var(--shadow-dark)', backgroundColor: 'var(--card-bg)' }}>
          <button
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm w-full transition-colors"
            style={{ color: 'var(--text-primary)', opacity: 0.75 }}
            onClick={() => {
              api.auth.logout();
              window.location.href = '/login';
            }}
          >
            <LogOut size={18} />
            <span className="truncate">Sign out</span>
          </button>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/30 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main */}
      <main className="flex-1 overflow-y-auto has-bottom-nav">
        <header className="sticky top-0 z-30 backdrop-blur-sm border-b h-12 sm:h-14 flex items-center px-3 sm:px-6 gap-3" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--shadow-dark)' }}>
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 -ml-2 rounded-lg">
            <Menu size={20} style={{ color: 'var(--text-primary)' }} />
          </button>

          {/* Multi-event switcher for Event Planners in top bar */}
          {role === 'owner' && userEvents.length > 1 && (
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl neu-card-inset text-xs border border-[var(--shadow-dark)] max-w-[220px] sm:max-w-xs">
              <Calendar size={13} className="text-accent shrink-0" />
              <span className="hidden sm:inline text-text-secondary text-[11px] font-semibold">Event:</span>
              <select
                value={authUser?.id || ''}
                onChange={(e) => handleSwitchEvent(e.target.value)}
                className="bg-transparent font-bold text-text-primary border-none outline-none cursor-pointer text-xs truncate w-full"
                title="Switch active event"
              >
                {userEvents.map(acc => (
                  <option key={acc.id} value={acc.id} style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-primary)' }}>
                    {acc.eventName} ({acc.campus || 'Main'})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex-1" />
          <button className="p-2 rounded-lg relative">
            <Bell size={18} style={{ color: 'var(--text-primary)' }} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--accent)' }} />
          </button>
          <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--accent)', opacity: 0.9 }}>
            <span className="text-xs font-bold" style={{ color: '#fff' }}>{role === 'admin' ? 'A' : 'O'}</span>
          </div>
        </header>
        <div className="p-3 sm:p-4 lg:p-6 max-w-7xl mx-auto pb-36">
          {children}
        </div>
      </main>
    </div>
  );
}

// ============ SALES CHART ============
function SalesChart() {
  const maxVal = Math.max(...mockSalesData.map(d => d.sales));
  const w = 500, h = 160, pad = 20;
  const points = mockSalesData.map((d, i) => {
    const x = pad + (i / (mockSalesData.length - 1)) * (w - 2 * pad);
    const y = h - pad - (d.sales / maxVal) * (h - 2 * pad);
    return `${x},${y}`;
  });
  const pathD = `M ${points.join(' L ')}`;
  const areaD = `${pathD} L ${w - pad},${h - pad} L ${pad},${h - pad} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-32 sm:h-40">
      <defs>
        <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1B2A4A" stopOpacity="0.1" />
          <stop offset="100%" stopColor="#1B2A4A" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill="url(#chartGrad)" />
      <path d={pathD} fill="none" stroke="#1B2A4A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {mockSalesData.map((d, i) => {
        const x = pad + (i / (mockSalesData.length - 1)) * (w - 2 * pad);
        const y = h - pad - (d.sales / maxVal) * (h - 2 * pad);
        return <circle key={i} cx={x} cy={y} r="3" fill="white" stroke="#1B2A4A" strokeWidth="2" />;
      })}
    </svg>
  );
}

// ============ ADMIN DASHBOARD ============
function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  useEffect(() => { setTimeout(() => setLoading(false), 600); }, []);
  if (loading) return <div><h1 className="text-xl sm:text-2xl font-semibold mb-4 sm:mb-6">Platform Overview</h1><div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">{[1, 2, 3, 4].map(i => <StatCardSkeleton key={i} />)}</div></div>;

  return (
    <div>
      <h1 className="text-xl sm:text-2xl font-semibold mb-4 sm:mb-6">Platform Overview</h1>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <StatCard label="Revenue" value={formatNaira(12847500)} icon={DollarSign} trend={{ value: 23, positive: true }} delay={0} />
        <StatCard label="Sales" value={4231} icon={ShoppingBag} trend={{ value: 18, positive: true }} delay={50} />
        <StatCard label="Fees Earned" value={formatNaira(642375)} icon={TrendingUp} delay={100} />
        <StatCard label="Active Events" value={12} icon={Calendar} delay={150} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 mb-4">
        <BentoCard className="lg:col-span-2" delay={200}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">Sales Trend</h3>
            <Badge variant="neutral">14 days</Badge>
          </div>
          <SalesChart />
        </BentoCard>
        <BentoCard delay={250}>
          <h3 className="text-sm font-semibold mb-3">Quick Stats</h3>
          <div className="space-y-3">
            {[['Event Owners', '8'], ['Active Models', '47'], ['Gate Staff', '23'], ['Pending Payouts', '3', 'text-warning'], ['Refund Requests', '1', 'text-error']].map(([label, val, cls]) => (
              <div key={label} className="flex justify-between items-center">
                <span className="text-xs text-text-secondary">{label}</span>
                <span className={`text-sm font-semibold ${cls || ''}`}>{val}</span>
              </div>
            ))}
          </div>
        </BentoCard>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        <BentoCard delay={300}>
          <h3 className="text-sm font-semibold mb-3">Recent Activity</h3>
          <div className="space-y-3">
            {mockAuditLogs.slice(0, 4).map(log => (
              <div key={log.id} className="flex items-start gap-3 text-xs">
                <div className="w-1.5 h-1.5 rounded-full bg-navy mt-1.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-text-primary truncate">{log.details}</p>
                  <p className="text-text-muted mt-0.5">{formatDateTime(log.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        </BentoCard>
        <BentoCard delay={350}>
          <h3 className="text-sm font-semibold mb-3">Top Events</h3>
          <div className="space-y-3">
            {mockEvents.filter(e => e.status === 'active').map(evt => {
              const tickets = mockTicketTypes.filter(t => t.eventId === evt.id);
              const totalSold = tickets.reduce((s, t) => s + t.sold, 0);
              return (
                <div key={evt.id} className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{evt.name}</p>
                    <p className="text-xs text-text-muted">{formatDate(evt.eventDate)}</p>
                  </div>
                  <span className="text-sm font-semibold shrink-0">{totalSold}</span>
                </div>
              );
            })}
          </div>
        </BentoCard>
      </div>
    </div>
  );
}

// ============ OWNER DASHBOARD ============
function OwnerDashboard() {
  const [loading, setLoading] = useState(true);
  useEffect(() => { setTimeout(() => setLoading(false), 500); }, []);
  if (loading) return <div><h1 className="text-xl sm:text-2xl font-semibold mb-6">Dashboard</h1><div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">{[1, 2, 3, 4].map(i => <StatCardSkeleton key={i} />)}</div></div>;

  const event = mockEvents[0];
  const tickets = mockTicketTypes.filter(t => t.eventId === event.id);
  const totalSold = tickets.reduce((s, t) => s + t.sold, 0);
  const totalRevenue = tickets.reduce((s, t) => s + (t.sold * t.price), 0);
  const totalCapacity = tickets.reduce((s, t) => s + (t.quantity * t.admits), 0);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold">Dashboard</h1>
          <p className="text-xs sm:text-sm text-text-secondary mt-1">{event.name}</p>
        </div>
        <Link to="/owner/events"><Button variant="secondary" icon={Calendar}>Events</Button></Link>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <StatCard label="Tickets Sold" value={totalSold} icon={TIcon} trend={{ value: 12, positive: true }} delay={0} />
        <StatCard label="Revenue" value={formatNaira(totalRevenue)} icon={DollarSign} delay={50} />
        <StatCard label="Capacity" value={`${Math.round((totalSold / totalCapacity) * 100)}%`} icon={BarChart3} delay={100} />
        <StatCard label="Models" value={mockModels.filter(m => m.status === 'active').length} icon={Users} delay={150} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 mb-4">
        <BentoCard className="lg:col-span-8" delay={200}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">Sales Trend</h3>
            <Badge variant="neutral">14 days</Badge>
          </div>
          <SalesChart />
        </BentoCard>
        <BentoCard className="lg:col-span-4" delay={250}>
          <h3 className="text-sm font-semibold mb-3">Capacity</h3>
          <ProgressBar value={totalSold} max={totalCapacity} label="People" />
          <div className="pt-3 mt-3 border-t border-border space-y-2">
            {tickets.map(t => (
              <div key={t.id} className="flex justify-between items-center">
                <span className="text-xs text-text-secondary truncate mr-2">{t.name}</span>
                <span className="text-xs font-medium shrink-0">{t.sold * t.admits}/{t.quantity * t.admits}</span>
              </div>
            ))}
          </div>
        </BentoCard>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 sm:gap-4">
        <BentoCard className="lg:col-span-5" delay={300}>
          <h3 className="text-sm font-semibold mb-3" style={{ fontFamily: "'Unlock', cursive" }}>By Ticket Type</h3>
          <div className="space-y-2">
            {tickets.map(t => (
              <div key={t.id} className="data-row flex items-center justify-between p-3 rounded-xl">
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{t.name}</p>
                  <p className="text-xs text-text-muted mt-0.5">{formatNaira(t.price)}{t.admits > 1 ? ` x${t.admits}` : ''}</p>
                </div>
                <div className="text-right shrink-0 ml-3">
                  <p className="text-sm font-bold">{formatNaira(t.sold * t.price)}</p>
                  <p className="text-xs text-text-muted mt-0.5">{t.sold} sold</p>
                </div>
              </div>
            ))}
          </div>
        </BentoCard>
        <BentoCard className="sm:col-span-1 lg:col-span-4" delay={350}>
          <h3 className="text-sm font-semibold mb-3" style={{ fontFamily: "'Unlock', cursive" }}>Model Leaderboard</h3>
          <div className="space-y-2">
            {mockModels.filter(m => m.status === 'active').sort((a, b) => b.totalSold - a.totalSold).map((m, i) => (
              <div key={m.id} className={`leaderboard-row ${i === 0 ? 'leaderboard-top' : ''}`}>
                <span className="leaderboard-rank shrink-0">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{m.name}</p>
                </div>
                <span className="text-sm font-bold shrink-0">{m.totalSold}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-text-muted mt-3 text-center">All model names visible to event planner</p>
        </BentoCard>
        <BentoCard className="sm:col-span-1 lg:col-span-3" delay={400}>
          <h3 className="text-sm font-semibold mb-3" style={{ fontFamily: "'Unlock', cursive" }}>Sales Source</h3>
          <div className="space-y-2">
            <div className="data-row flex justify-between items-center p-3 rounded-xl">
              <span className="text-xs font-semibold">Via Models</span>
              <span className="text-sm font-bold">89%</span>
            </div>
            <div className="data-row flex justify-between items-center p-3 rounded-xl">
              <span className="text-xs font-semibold">Direct (no link)</span>
              <span className="text-sm font-bold">11%</span>
            </div>
          </div>
          <p className="text-xs text-text-muted mt-3">Direct sales have no model attribution</p>
        </BentoCard>
      </div>
    </div>
  );
}

// ============ VERIFICATION PAGE ============
function VerificationPage() {
  const { eventId } = useParams<{ eventId?: string }>();
  const navigate = useNavigate();
  const currentUser = api.auth.getCurrentUser();
  const [events] = useState<Event[]>(() => getStoredEvents());
  const [currentEventId, setCurrentEventId] = useState<string>(eventId || events[0]?.id || 'evt_1');
  const activeEvent = events.find(e => e.id === currentEventId) || events[0] || mockEvents[0];

  const [code, setCode] = useState('');
  const [result, setResult] = useState<'valid' | 'used' | 'unknown' | null>(null);
  const [scanning, setScanning] = useState(false);
  const [ticketInfo, setTicketInfo] = useState<any>(null);
  const [ticketsList, setTicketsList] = useState(mockTickets);
  const [myVerifiedCount, setMyVerifiedCount] = useState<number>(0);
  const [history, setHistory] = useState<{ code: string; status: string; time: string; type: string }[]>([]);

  const checkedIn = ticketsList.filter(t => t.checkedIn).length;
  const totalTickets = ticketsList.length;
  const totalPeople = ticketsList.reduce((s, t) => s + (t.checkedIn ? t.admits : 0), 0);
  const totalCapacity = ticketsList.reduce((s, t) => s + t.admits, 0);

  const handleVerify = () => {
    const normalized = code.replace(/[\s-]/g, '').toUpperCase();
    if (!normalized) return;
    const ticket = ticketsList.find(t => t.code.replace(/[\s-]/g, '').toUpperCase() === normalized);
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    if (!ticket) {
      setResult('unknown');
      setTicketInfo(null);
      setHistory(prev => [{ code: normalized, status: 'Invalid / Not Recognized', time: nowTime, type: 'Unknown' }, ...prev.slice(0, 4)]);
    } else if (ticket.checkedIn) {
      setResult('used');
      setTicketInfo(ticket);
      setHistory(prev => [{ code: ticket.code, status: 'Already Checked In', time: nowTime, type: ticket.ticketTypeName }, ...prev.slice(0, 4)]);
    } else {
      setResult('valid');
      setTicketInfo(ticket);
      setTicketsList(prev => prev.map(t => t.id === ticket.id ? { ...t, checkedIn: true, checkInMethod: 'code', checkedInAt: new Date().toISOString() } : t));
      setMyVerifiedCount(prev => prev + 1);
      setHistory(prev => [{ code: ticket.code, status: 'Admitted (Valid)', time: nowTime, type: ticket.ticketTypeName }, ...prev.slice(0, 4)]);
      showToast('Ticket verified & checked in!', 'success');
    }
    setCode('');
  };

  const handleScan = () => {
    setScanning(true);
    setTimeout(() => {
      setScanning(false);
      const randomTicket = ticketsList[Math.floor(Math.random() * ticketsList.length)];
      const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      if (randomTicket.checkedIn) {
        setResult('used');
        setTicketInfo(randomTicket);
        setHistory(prev => [{ code: randomTicket.code, status: 'Already Checked In', time: nowTime, type: randomTicket.ticketTypeName }, ...prev.slice(0, 4)]);
      } else {
        setResult('valid');
        setTicketInfo(randomTicket);
        setTicketsList(prev => prev.map(t => t.id === randomTicket.id ? { ...t, checkedIn: true, checkInMethod: 'qr', checkedInAt: new Date().toISOString() } : t));
        setMyVerifiedCount(prev => prev + 1);
        setHistory(prev => [{ code: randomTicket.code, status: 'Admitted via QR', time: nowTime, type: randomTicket.ticketTypeName }, ...prev.slice(0, 4)]);
        showToast('QR Code Verified!', 'success');
      }
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-canvas flex flex-col" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <header className="border-b px-3 sm:px-6 py-3 flex items-center justify-between" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--shadow-dark)' }}>
        <div className="flex items-center gap-3">
          <Link to="/" className="p-1.5 rounded-lg" style={{ color: 'var(--text-secondary)' }}>
            <ArrowLeft size={18} />
          </Link>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--accent)' }}>
            <TIcon size={16} color="white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold" style={{ color: 'var(--text-primary)', fontFamily: "'Unlock', cursive" }}>TiKeTi</span>
              <Badge variant="neutral">Gate Scanner</Badge>
            </div>
            <p className="text-xs text-text-secondary">
              {currentUser?.role === 'gate' ? `Officer: ${currentUser.name}` : 'Security & Ticket Check-in'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={currentEventId}
            onChange={e => setCurrentEventId(e.target.value)}
            className="text-xs px-2.5 py-1.5 rounded-lg border hidden sm:block"
            style={{ background: 'var(--canvas)', color: 'var(--text-primary)', borderColor: 'var(--border)' }}
          >
            {events.map(ev => (
              <option key={ev.id} value={ev.id}>{ev.name}</option>
            ))}
          </select>
          <ThemeToggle />
          {currentUser ? (
            <button
              onClick={() => { api.auth.logout(); navigate('/login'); showToast('Signed out', 'info'); }}
              className="text-xs px-2.5 py-1.5 rounded-lg border flex items-center gap-1 hover:text-error transition-colors"
              style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
            >
              <LogOut size={13} />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          ) : (
            <Link to="/owner"><Button size="sm" variant="secondary">Planner</Button></Link>
          )}
        </div>
      </header>

      <div className="px-3 sm:px-6 py-2 flex items-center justify-between" style={{ backgroundColor: 'var(--success-bg)' }}>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full animate-pulse-soft" style={{ backgroundColor: 'var(--success)' }} />
          <span className="text-xs font-medium" style={{ color: 'var(--success)' }}>Gate Online & Connected • {activeEvent.name}</span>
        </div>
        <span className="text-xs font-mono text-text-muted hidden sm:inline">Venue: {activeEvent.venue}</span>
      </div>

      <div className="flex-1 p-3 sm:p-6 max-w-lg mx-auto w-full">
        {/* Input verification */}
        <div className="mb-4">
          <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
            <Keyboard size={14} className="inline mr-1" />Enter 8-Character Ticket Code
          </label>
          <div className="flex gap-2">
            <input
              type="text" value={code} onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
              placeholder="e.g. 7K4M 9XQ2"
              className="input text-base sm:text-lg font-mono tracking-wider text-center py-3 sm:py-3.5 w-full uppercase"
              autoFocus autoComplete="off"
            />
            <Button onClick={handleVerify} disabled={!code.trim()}>Verify</Button>
          </div>
          {/* Quick test code helpers */}
          <div className="mt-2 flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] text-text-muted">Test sample:</span>
            {mockTickets.slice(0, 3).map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => setCode(t.code)}
                className="text-[11px] font-mono px-2 py-0.5 rounded bg-canvas hover:text-accent border"
                style={{ borderColor: 'var(--border)' }}
              >
                {t.code}
              </button>
            ))}
          </div>
        </div>

        {/* Camera Scanner Simulation */}
        <button onClick={handleScan} disabled={scanning}
          className="w-full card p-4 sm:p-5 flex items-center justify-center gap-3 mb-4 sm:mb-6 hover:shadow-md transition-shadow active:scale-[0.99]"
          style={{ borderColor: 'var(--accent)' }}
        >
          {scanning ? (
            <><svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none" style={{ color: 'var(--accent)' }}><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg><span className="text-sm font-medium">Scanning ticket barcode / QR...</span></>
          ) : (
            <><Camera size={20} style={{ color: 'var(--accent)' }} /><span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Scan Ticket QR Code</span></>
          )}
        </button>

        {/* Verification Result Notification */}
        {result && (
          <div className="card p-4 sm:p-5 mb-4 sm:mb-6 animate-fade-up border-2" style={{
            borderColor: result === 'valid' ? 'var(--success)' : result === 'used' ? 'var(--warning)' : 'var(--error)',
            backgroundColor: result === 'valid' ? 'var(--success-bg)' : result === 'used' ? 'var(--warning-bg)' : 'var(--error-bg)'
          }}>
            <div className="flex items-center gap-3 mb-3">
              {result === 'valid' && <Check size={28} className="text-success" />}
              {result === 'used' && <AlertTriangle size={28} className="text-warning" />}
              {result === 'unknown' && <X size={28} className="text-error" />}
              <div>
                <span className={`text-base sm:text-lg font-bold ${result === 'valid' ? 'text-success' : result === 'used' ? 'text-warning' : 'text-error'}`}>
                  {result === 'valid' ? 'VALID TICKET - ADMIT ONE' : result === 'used' ? 'WARNING: ALREADY USED' : 'REJECTED - INVALID TICKET'}
                </span>
                <p className="text-xs text-text-muted">
                  {result === 'valid' ? 'Ticket cleared for entry. Live counter updated.' : result === 'used' ? 'This ticket was already checked in at the gate.' : 'Code does not exist in event ticket roster.'}
                </p>
              </div>
            </div>
            {ticketInfo && (
              <div className="space-y-2 text-sm pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
                <div className="flex justify-between"><span className="text-text-secondary">Ticket Tier</span><span className="font-semibold">{ticketInfo.ticketTypeName}</span></div>
                <div className="flex justify-between"><span className="text-text-secondary">Admits</span><span className="font-bold">{ticketInfo.admits} Person</span></div>
                <div className="flex justify-between"><span className="text-text-secondary">Code</span><span className="font-mono font-bold">{ticketInfo.code}</span></div>
                {ticketInfo.checkedInAt && (
                  <div className="flex justify-between"><span className="text-text-secondary">Checked In At</span><span className="text-xs text-text-muted">{formatDateTime(ticketInfo.checkedInAt)}</span></div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Gate Live Counters */}
        <div className="card p-4 sm:p-5 mb-4">
          <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Gate Attendance Counters</h3>
          <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4">
            <div className="text-center p-2.5 sm:p-3 rounded-lg" style={{ background: 'var(--canvas)' }}>
              <p className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--accent)' }}>{checkedIn}</p>
              <p className="text-[11px] sm:text-xs text-text-secondary">Scanned</p>
            </div>
            <div className="text-center p-2.5 sm:p-3 rounded-lg" style={{ background: 'var(--canvas)' }}>
              <p className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{totalPeople}</p>
              <p className="text-[11px] sm:text-xs text-text-secondary">Admitted</p>
            </div>
            <div className="text-center p-2.5 sm:p-3 rounded-lg" style={{ background: 'rgba(0, 229, 255, 0.08)', border: '1px solid rgba(0, 229, 255, 0.2)' }}>
              <p className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--accent)' }}>{myVerifiedCount}</p>
              <p className="text-[11px] sm:text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>By You</p>
            </div>
          </div>
          <ProgressBar value={checkedIn} max={totalTickets} label="Tickets Scanned" />
          <div className="mt-3"><ProgressBar value={totalPeople} max={totalCapacity} label="Venue Capacity" /></div>
        </div>

        {/* History of recent scans */}
        {history.length > 0 && (
          <div className="card p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider mb-2 text-text-secondary">Recent Scans</h3>
            <div className="space-y-2">
              {history.map((h, i) => (
                <div key={i} className="flex items-center justify-between text-xs py-1.5 border-b last:border-0" style={{ borderColor: 'var(--border)' }}>
                  <div>
                    <span className="font-mono font-bold mr-2">{h.code}</span>
                    <span className="text-text-muted">{h.type}</span>
                  </div>
                  <div className="text-right">
                    <span className={`font-semibold ${h.status.includes('Admitted') ? 'text-success' : h.status.includes('Already') ? 'text-warning' : 'text-error'}`}>{h.status}</span>
                    <span className="text-[10px] text-text-muted ml-2">{h.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============ BUYER PAGES — imported from LiveEvents.tsx ============
// PublicEventPage, CheckoutPage, PaymentSuccess are now in ./components/LiveEvents.tsx

// ============ MODEL DASHBOARD ============
function ModelDashboard() {
  const navigate = useNavigate();
  const currentUser = api.auth.getCurrentUser();
  const [models] = useState<Model[]>(() => getStoredModels());
  const initialModelId = (currentUser && (currentUser.role === 'model' || currentUser.role === 'staff') && models.some(m => m.id === currentUser.id || m.email === currentUser.email))
    ? (models.find(m => m.id === currentUser.id || m.email === currentUser.email)?.id || models[0]?.id || mockModels[0].id)
    : (models[0]?.id || mockModels[0].id);
  const [selectedModelId, setSelectedModelId] = useState<string>(initialModelId);
  const model = models.find(m => m.id === selectedModelId) || models[0] || mockModels[0];

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Top Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl border-b py-3 px-4 sm:px-6" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--shadow-dark)' }}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="p-2 -ml-2 rounded-lg" style={{ color: 'var(--text-secondary)' }}>
              <ArrowLeft size={18} />
            </Link>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--accent)' }}>
              <TIcon size={16} color="white" />
            </div>
            <span className="text-lg font-bold" style={{ color: 'var(--text-primary)', fontFamily: "'Unlock', cursive" }}>TiKeTi</span>
            <Badge variant="neutral">Model Ambassador</Badge>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={selectedModelId}
              onChange={e => setSelectedModelId(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded-lg border hidden sm:block"
              style={{ background: 'var(--canvas)', color: 'var(--text-primary)', borderColor: 'var(--border)' }}
            >
              {models.map(m => (
                <option key={m.id} value={m.id}>View as: {m.name}</option>
              ))}
            </select>
            <ThemeToggle />
            {currentUser ? (
              <button
                onClick={() => { api.auth.logout(); navigate('/login'); showToast('Signed out', 'info'); }}
                className="text-xs px-2.5 py-1.5 rounded-lg border flex items-center gap-1 hover:text-error transition-colors"
                style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
              >
                <LogOut size={13} />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            ) : (
              <Link to="/owner"><Button size="sm" variant="secondary">Planner View</Button></Link>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <div>
            <h1 className="text-lg sm:text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>My Ambassador Dashboard</h1>
            <p className="text-xs sm:text-sm" style={{ color: 'var(--text-secondary)' }}>{model.name} • {model.email}</p>
          </div>
          <Badge variant={model.status === 'active' ? 'success' : 'warning'}>{model.status}</Badge>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
          <StatCard label="Tickets Sold" value={model.totalSold} icon={TIcon} delay={0} />
          <StatCard label="Revenue Attributed" value={formatNaira(model.revenue || model.totalSold * 8000)} icon={DollarSign} delay={50} />
          <StatCard label="Leaderboard Rank" value={`#${mockModels.filter(m => m.status === 'active').sort((a, b) => b.totalSold - a.totalSold).findIndex(m => m.id === model.id) + 1 || 1}`} icon={TrendingUp} delay={100} />
        </div>
        <BentoCard className="mb-4" delay={150}>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Your Unique Referral Link</h3>
            <span className="text-xs text-text-muted">Buyers through this link get tracked to you</span>
          </div>
          <div className="flex items-center gap-2 p-3 bg-canvas rounded-lg">
            <code className="flex-1 text-xs sm:text-sm font-mono truncate" style={{ color: 'var(--accent)' }}>tikiti.ng/e/evt_1?ref={model.referralCode}</code>
            <CopyButton text={`https://tikiti.ng/e/evt_1?ref=${model.referralCode}`} />
          </div>
          <div className="flex gap-2 mt-3">
            <Button variant="secondary" size="sm" icon={Share2} onClick={() => {
              if (navigator.share) {
                navigator.share({ title: 'Buy Event Tickets', url: `https://tikiti.ng/e/evt_1?ref=${model.referralCode}` }).catch(() => {});
              } else {
                navigator.clipboard.writeText(`https://tikiti.ng/e/evt_1?ref=${model.referralCode}`);
                showToast('Referral link copied to clipboard!', 'success');
              }
            }}>Share Link</Button>
            <Link to={`/event/evt_1?ref=${model.referralCode}`}>
              <Button variant="secondary" size="sm" icon={ExternalLink}>Preview Buyer Page</Button>
            </Link>
          </div>
        </BentoCard>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <BentoCard delay={200}><h3 className="text-sm font-semibold mb-3">Sales Trend</h3><SalesChart /></BentoCard>
          <BentoCard delay={250}>
            <h3 className="text-sm font-semibold mb-3" style={{ fontFamily: "'Unlock', cursive" }}>By Ticket Type</h3>
            <div className="space-y-2">
              {mockTicketTypes.filter(t => t.eventId === 'evt_1').map(tt => {
                const mySold = Math.floor(tt.sold * 0.3);
                return (
                  <div key={tt.id} className="data-row flex items-center justify-between p-3 rounded-xl">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{tt.name}</p>
                      <p className="text-xs text-text-muted mt-0.5">{formatNaira(tt.price)}</p>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <p className="text-sm font-bold">{mySold}</p>
                      <p className="text-xs text-text-muted mt-0.5">{formatNaira(mySold * tt.price)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </BentoCard>
        </div>
        <BentoCard className="mt-4" delay={300}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold" style={{ fontFamily: "'Unlock', cursive" }}>Model Leaderboard</h3>
            <span className="text-xs text-text-muted">Competitor names masked for privacy</span>
          </div>
          <div className="space-y-2">
            {mockModels.filter(m => m.status === 'active').sort((a, b) => b.totalSold - a.totalSold).map((m, i) => (
              <div key={m.id} className={`leaderboard-row ${i === 0 ? 'leaderboard-top' : ''}`}>
                <span className="leaderboard-rank shrink-0">{i + 1}</span>
                {m.id === model.id ? (
                  <p className="text-sm font-semibold flex-1 truncate">{m.name} (You)</p>
                ) : (
                  <div className="flex-1 blur-sm select-none truncate">
                    <p className="text-sm font-semibold">Model Ambassador {i + 1}</p>
                  </div>
                )}
                <span className="text-sm font-bold shrink-0">{m.totalSold}</span>
              </div>
            ))}
          </div>
        </BentoCard>
      </div>
    </div>
  );
}

// ============ EVENTS MANAGEMENT (1 EVENT = 1 ACCOUNT) ============
function OwnerEvents() {
  const events = getStoredEvents();
  let user: any = null;
  try {
    const raw = localStorage.getItem('tiketi_user');
    if (raw) user = JSON.parse(raw);
  } catch (e) {}

  // Filter to planner's specific event in 1 Event = 1 Account architecture
  const myEvents = events.filter(e => {
    if (user?.event_id && e.id === user.event_id) return true;
    if (user?.id && (e.ownerId === user.id || (e as any).plannerId === user.id)) return true;
    return false;
  });

  const displayEvents = myEvents.length > 0 ? myEvents : [events[0]];

  return (
    <div>
      <SectionHeader title="My Event" />

      {/* 1 Event = 1 Account Notice Banner */}
      <div className="mb-5 p-4 rounded-2xl neu-card-inset border border-accent/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-accent/20 text-accent shrink-0 mt-0.5">
            <Calendar size={16} />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-text-primary">
              One Event = One Account Architecture
            </h3>
            <p className="text-xs text-text-secondary mt-0.5">
              Each planner account is strictly dedicated to a single event. To host another event, register a new event account with your email.
            </p>
          </div>
        </div>
        <Link to="/register" className="shrink-0 self-end sm:self-center">
          <Button size="sm" variant="secondary">Register New Event</Button>
        </Link>
      </div>

      <div className="space-y-3 sm:space-y-4">
        {displayEvents.map(evt => {
          const tickets = getStoredTicketTypes().filter(t => t.eventId === evt.id);
          const totalSold = tickets.reduce((s, t) => s + (t.sold || 0), 0);
          const totalCapacity = tickets.reduce((s, t) => s + ((t.quantity || 0) * (t.admits || 1)), 0);
          const revenue = tickets.reduce((s, t) => s + ((t.sold || 0) * (t.price || 0)), 0);
          return (
            <div key={evt.id} className="card p-4 sm:p-5">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="text-sm font-semibold truncate">{evt.name}</h3>
                    <Badge variant={evt.status === 'active' ? 'success' : 'neutral'}>{evt.status}</Badge>
                  </div>
                  <p className="text-xs text-text-secondary truncate">{evt.venue}</p>
                  <p className="text-xs text-text-muted mt-1">{formatDate(evt.eventDate)}</p>
                </div>
                <div className="text-left sm:text-right shrink-0">
                  <p className="text-sm font-semibold">{formatNaira(revenue)}</p>
                  <p className="text-xs text-text-muted">{totalSold} / {totalCapacity} sold</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mt-3 sm:mt-4">
                <Link to={`/owner/events/${evt.id}`}><Button variant="secondary" size="sm" icon={Eye}>View</Button></Link>
                <Link to={`/verify/${evt.id}`}><Button variant="secondary" size="sm" icon={QrCode}>Verify</Button></Link>
                <Link to={`/owner/events/${evt.id}/checkins`}><Button variant="secondary" size="sm" icon={Activity}>Check-ins</Button></Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============ EVENT DETAIL ============
function OwnerEventDetail() {
  const { eventId } = useParams();
  const event = getStoredEvents().find(e => e.id === eventId) || mockEvents[0];
  const tickets = getStoredTicketTypes().filter(t => t.eventId === event.id);
  const models = mockModels.filter(m => m.eventId === event.id);
  const [tab, setTab] = useState('overview');
  const totalSold = tickets.reduce((s, t) => s + (t.sold || 0), 0);
  const totalRevenue = tickets.reduce((s, t) => s + ((t.sold || 0) * (t.price || 0)), 0);
  const totalCapacity = tickets.reduce((s, t) => s + ((t.quantity || 0) * (t.admits || 1)), 0);

  return (
    <div>
      <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
        <Link to="/owner/events" className="p-2 rounded-lg hover:bg-gray-50 shrink-0"><ArrowLeft size={18} /></Link>
        <div className="min-w-0"><h1 className="text-lg sm:text-xl font-semibold truncate">{event.name}</h1><p className="text-xs text-text-secondary truncate">{event.venue}</p></div>
      </div>
      <TabNav tabs={[{ id: 'overview', label: 'Overview' }, { id: 'tickets', label: 'Tickets', count: tickets.length }, { id: 'models', label: 'Models', count: models.length }, { id: 'orders', label: 'Orders' }]} active={tab} onChange={setTab} />
      {tab === 'overview' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4">
          <StatCard label="Sold" value={totalSold} icon={TIcon} delay={0} />
          <StatCard label="Revenue" value={formatNaira(totalRevenue)} icon={DollarSign} delay={50} />
          <StatCard label="Capacity" value={totalCapacity > 0 ? `${Math.round((totalSold / totalCapacity) * 100)}%` : '0%'} icon={BarChart3} delay={100} />
        </div>
      )}
      {tab === 'tickets' && (
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <p className="text-xs sm:text-sm text-text-secondary">Capacity: {totalSold}/{totalCapacity} people</p>
            <Link to={`/owner/events/${event.id}/tickets/new`}><Button size="sm" icon={Plus}>Add Type</Button></Link>
          </div>
          <div className="table-wrapper hidden sm:block">
            <table><thead><tr><th>Name</th><th>Price</th><th>Admits</th><th>Qty</th><th>Sold</th><th>Design</th></tr></thead>
              <tbody>{tickets.map(tt => (
                <tr key={tt.id}>
                  <td className="font-medium">
                    <div className="flex items-center gap-1.5">
                      <span>{tt.name}</span>
                      {tt.genderPricing && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400">
                          Gender Pricing
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    {tt.genderPricing ? (
                      <span className="text-xs">
                        Male: {formatNaira(tt.malePrice || 0)} / Female: {formatNaira(tt.femalePrice || 0)}
                      </span>
                    ) : (
                      formatNaira(tt.price)
                    )}
                  </td>
                  <td>{tt.admits}</td>
                  <td>{tt.quantity}</td>
                  <td>{tt.sold || 0}</td>
                  <td>
                    {tt.imageUrl ? (
                      <span className="text-[11px] text-accent font-medium flex items-center gap-1">
                        ✓ Uploaded
                      </span>
                    ) : (
                      <span className="text-xs text-text-muted">Standard</span>
                    )}
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          {/* Mobile card view */}
          <div className="sm:hidden space-y-2">
            {tickets.map(tt => (
              <div key={tt.id} className="card p-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-semibold">{tt.name}</p>
                    {tt.genderPricing ? (
                      <p className="text-xs font-medium text-accent">
                        Male: {formatNaira(tt.malePrice || 0)} • Female: {formatNaira(tt.femalePrice || 0)}
                      </p>
                    ) : (
                      <p className="text-xs text-text-muted">{formatNaira(tt.price)} / admits {tt.admits}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{tt.sold || 0}/{tt.quantity}</p>
                    <p className="text-xs text-text-muted">admits {tt.admits}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {tab === 'models' && (
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <p className="text-xs sm:text-sm text-text-secondary">{models.filter(m => m.status === 'active').length} active</p>
            <Link to="/owner/models/invite"><Button size="sm" icon={Plus}>Invite</Button></Link>
          </div>
          <div className="table-wrapper hidden sm:block">
            <table><thead><tr><th>Name</th><th>Code</th><th>Sold</th><th>Revenue</th><th>Status</th></tr></thead>
              <tbody>{models.map(m => (<tr key={m.id}><td className="font-medium">{m.name}</td><td><code className="text-xs bg-canvas px-2 py-0.5 rounded">{m.referralCode}</code></td><td>{m.totalSold}</td><td>{formatNaira(m.revenue)}</td><td><Badge variant={m.status === 'active' ? 'success' : 'warning'}>{m.status}</Badge></td></tr>))}</tbody>
            </table>
          </div>
          <div className="sm:hidden space-y-2">
            {models.map(m => (
              <div key={m.id} className="card p-3">
                <div className="flex justify-between items-start">
                  <div><p className="text-sm font-semibold">{m.name}</p><p className="text-xs text-text-muted">{m.totalSold} sold / {formatNaira(m.revenue)}</p></div>
                  <Badge variant={m.status === 'active' ? 'success' : 'warning'}>{m.status}</Badge>
                </div>
                <div className="mt-2 flex items-center gap-2"><code className="text-xs bg-canvas px-2 py-0.5 rounded font-mono">{m.referralCode}</code><CopyButton text={m.referralCode} /></div>
              </div>
            ))}
          </div>
        </div>
      )}
      {tab === 'orders' && (
        <div className="table-wrapper">
          <table><thead><tr><th>Reference</th><th>Buyer</th><th>Tickets</th><th>Total</th><th>Status</th></tr></thead>
            <tbody>{mockOrders.filter(o => o.eventId === event.id).map(order => (
              <tr key={order.id}><td><code className="text-xs font-mono">{order.reference}</code></td><td>{order.buyerName}</td><td>{order.lines.map(l => `${l.ticketTypeName} x${l.quantity}`).join(', ')}</td><td className="font-medium">{formatNaira(order.total)}</td><td><Badge variant={order.status === 'paid' ? 'success' : 'warning'}>{order.status}</Badge></td></tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ============ MORE OWNER PAGES ============
// --------- MODEL STATUS BADGE HELPER ---------
function modelStatusBadge(status: Model['status']) {
  if (status === 'active') return <Badge variant="success">Active</Badge>;
  if (status === 'invited') return <Badge variant="warning">Invited</Badge>;
  if (status === 'suspended') return <Badge variant="warning">Suspended</Badge>;
  if (status === 'revoked') return <Badge variant="error">Revoked</Badge>;
  if (status === 'terminated') return <Badge variant="error">Terminated</Badge>;
  return <Badge variant="neutral">{status}</Badge>;
}
function staffStatusBadge(status: GateStaff['status']) {
  if (status === 'active') return <Badge variant="success">Active</Badge>;
  if (status === 'suspended') return <Badge variant="warning">Suspended</Badge>;
  if (status === 'revoked') return <Badge variant="error">Revoked</Badge>;
  if (status === 'terminated') return <Badge variant="error">Terminated</Badge>;
  return <Badge variant="neutral">{status}</Badge>;
}

// --------- EDIT MODEL MODAL ---------
function EditModelModal({ model, onClose, onSave }: { model: Model; onClose: () => void; onSave: (updated: Model) => void }) {
  const [name, setName] = useState(model.name);
  const [status, setStatus] = useState<Model['status']>(model.status);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await api.models.update(model.id, { name, status });
      onSave(updated);
      showToast('Model updated successfully', 'success');
      onClose();
    } catch (e: any) {
      showToast(e.message || 'Failed to update model', 'error');
    } finally {
      setSaving(false);
    }
  };

  const statusOptions: Model['status'][] = ['active', 'invited', 'suspended', 'revoked', 'terminated'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
      <div className="card w-full max-w-md p-6 space-y-4" style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Edit Model</h2>
          <button onClick={onClose} style={{ color: 'var(--text-muted)' }}><X size={20} /></button>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Name</label>
          <input
            className="w-full px-3 py-2 rounded-lg text-sm border"
            style={{ background: 'var(--canvas)', color: 'var(--text-primary)', borderColor: 'var(--border)' }}
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Status</label>
          <select
            className="w-full px-3 py-2 rounded-lg text-sm border"
            style={{ background: 'var(--canvas)', color: 'var(--text-primary)', borderColor: 'var(--border)' }}
            value={status}
            onChange={e => setStatus(e.target.value as Model['status'])}
          >
            {statusOptions.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
        </div>
        {(status === 'terminated' || status === 'revoked') && (
          <div className="rounded-lg p-3 text-xs" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
            <AlertTriangle size={12} className="inline mr-1" />
            {status === 'terminated'
              ? 'Terminating this model will permanently disable their referral link. Records will be kept but no purchases can be made.'
              : 'Revoking this model will disable their referral link until restored.'}
          </div>
        )}
        <div className="flex gap-3 pt-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button variant="primary" className="flex-1" onClick={handleSave} loading={saving}>Save Changes</Button>
        </div>
      </div>
    </div>
  );
}

// --------- EDIT STAFF MODAL ---------
function EditStaffModal({ staff, onClose, onSave }: { staff: GateStaff; onClose: () => void; onSave: (updated: GateStaff) => void }) {
  const [name, setName] = useState(staff.name);
  const [status, setStatus] = useState<GateStaff['status']>(staff.status);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await api.staff.update(staff.id, { name, status });
      onSave(updated);
      showToast('Gate staff updated successfully', 'success');
      onClose();
    } catch (e: any) {
      showToast(e.message || 'Failed to update staff', 'error');
    } finally {
      setSaving(false);
    }
  };

  const statusOptions: GateStaff['status'][] = ['active', 'suspended', 'revoked', 'terminated'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
      <div className="card w-full max-w-md p-6 space-y-4" style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Edit Gate Staff</h2>
          <button onClick={onClose} style={{ color: 'var(--text-muted)' }}><X size={20} /></button>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Name</label>
          <input
            className="w-full px-3 py-2 rounded-lg text-sm border"
            style={{ background: 'var(--canvas)', color: 'var(--text-primary)', borderColor: 'var(--border)' }}
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Status</label>
          <select
            className="w-full px-3 py-2 rounded-lg text-sm border"
            style={{ background: 'var(--canvas)', color: 'var(--text-primary)', borderColor: 'var(--border)' }}
            value={status}
            onChange={e => setStatus(e.target.value as GateStaff['status'])}
          >
            {statusOptions.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
        </div>
        {(status === 'terminated' || status === 'revoked') && (
          <div className="rounded-lg p-3 text-xs" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
            <AlertTriangle size={12} className="inline mr-1" />
            {status === 'terminated'
              ? 'Terminating this gate staff will permanently disable their access. Records will be kept.'
              : 'Revoking this gate staff will disable their gate access until restored.'}
          </div>
        )}
        <div className="flex gap-3 pt-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button variant="primary" className="flex-1" onClick={handleSave} loading={saving}>Save Changes</Button>
        </div>
      </div>
    </div>
  );
}

// --------- OWNER MODELS PAGE ---------
function OwnerModels() {
  const [models, setModels] = useState<Model[]>(() => getStoredModels());
  const [editTarget, setEditTarget] = useState<Model | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const list = await api.models.list();
      setModels(list);
      saveStoredModels(list);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const onSaved = (updated: Model) => {
    setModels(prev => prev.map(m => m.id === updated.id ? updated : m));
    saveStoredModels(models.map(m => m.id === updated.id ? updated : m));
  };

  const quickAction = async (model: Model, newStatus: Model['status']) => {
    try {
      const updated = await api.models.update(model.id, { status: newStatus });
      setModels(prev => prev.map(m => m.id === model.id ? { ...m, status: newStatus } : m));
      showToast(`Model ${newStatus}`, 'success');
    } catch (e: any) {
      showToast(e.message || 'Action failed', 'error');
    }
  };

  return (
    <div>
      {editTarget && <EditModelModal model={editTarget} onClose={() => setEditTarget(null)} onSave={onSaved} />}
      <SectionHeader
        title="Models"
        action={
          <div className="flex gap-2">
            <button onClick={refresh} style={{ color: 'var(--text-muted)' }} title="Refresh"><RefreshCw size={16} /></button>
            <Link to="/owner/models/invite"><Button icon={Plus}>Invite</Button></Link>
          </div>
        }
      />
      {loading && <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"><StatCardSkeleton /><StatCardSkeleton /><StatCardSkeleton /></div>}
      {!loading && models.length === 0 && (
        <div className="card p-10 text-center" style={{ color: 'var(--text-muted)' }}>
          <Users size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No models yet. Invite your first model.</p>
          <Link to="/owner/models/invite" className="mt-3 inline-block"><Button icon={Plus} size="sm">Invite Model</Button></Link>
        </div>
      )}
      {!loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {models.map((m, i) => (
            <BentoCard key={m.id} delay={i * 50}>
              <div className="flex items-start justify-between mb-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{m.name}</p>
                  <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{m.email}</p>
                </div>
                <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                  {modelStatusBadge(m.status)}
                  <button
                    onClick={() => setEditTarget(m)}
                    className="p-1 rounded-lg transition-colors"
                    style={{ color: 'var(--text-muted)' }}
                    title="Edit model"
                  >
                    <Edit2 size={14} />
                  </button>
                </div>
              </div>
              <div className="space-y-1.5 text-xs mb-3">
                <div className="flex justify-between">
                  <span style={{ color: 'var(--text-secondary)' }}>Code</span>
                  <code className="font-mono" style={{ color: 'var(--text-primary)' }}>{m.referralCode}</code>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: 'var(--text-secondary)' }}>Sold</span>
                  <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{m.totalSold}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: 'var(--text-secondary)' }}>Revenue</span>
                  <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{formatNaira(m.revenue)}</span>
                </div>
              </div>
              {m.status !== 'terminated' && (
                <div className="flex gap-1 flex-wrap">
                  {m.status !== 'active' && (
                    <button
                      onClick={() => quickAction(m, 'active')}
                      className="text-xs px-2 py-1 rounded-md font-medium flex items-center gap-1"
                      style={{ background: 'rgba(34,197,94,0.15)', color: '#16a34a' }}
                    >
                      <Check size={10} /> Activate
                    </button>
                  )}
                  {m.status === 'active' && (
                    <button
                      onClick={() => quickAction(m, 'suspended')}
                      className="text-xs px-2 py-1 rounded-md font-medium flex items-center gap-1"
                      style={{ background: 'rgba(234,179,8,0.15)', color: '#b45309' }}
                    >
                      <Ban size={10} /> Suspend
                    </button>
                  )}
                  {m.status !== 'revoked' && (
                    <button
                      onClick={() => quickAction(m, 'revoked')}
                      className="text-xs px-2 py-1 rounded-md font-medium flex items-center gap-1"
                      style={{ background: 'rgba(239,68,68,0.1)', color: '#dc2626' }}
                    >
                      <UserX size={10} /> Revoke
                    </button>
                  )}
                  <button
                    onClick={() => { if (confirm(`Terminate ${m.name}? Their referral link will stop working.`)) quickAction(m, 'terminated'); }}
                    className="text-xs px-2 py-1 rounded-md font-medium flex items-center gap-1"
                    style={{ background: 'rgba(239,68,68,0.1)', color: '#dc2626' }}
                  >
                    <Trash2 size={10} /> Terminate
                  </button>
                </div>
              )}
              {m.status === 'terminated' && (
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Record kept — referral link disabled permanently.</p>
              )}
            </BentoCard>
          ))}
        </div>
      )}
    </div>
  );
}

// --------- OWNER STAFF PAGE ---------
function OwnerStaff() {
  const [staffList, setStaffList] = useState<GateStaff[]>(() => getStoredStaff());
  const [editTarget, setEditTarget] = useState<GateStaff | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const list = await api.staff.list();
      setStaffList(list);
      saveStoredStaff(list);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const onSaved = (updated: GateStaff) => {
    setStaffList(prev => prev.map(s => s.id === updated.id ? updated : s));
    saveStoredStaff(staffList.map(s => s.id === updated.id ? updated : s));
  };

  const quickAction = async (staff: GateStaff, newStatus: GateStaff['status']) => {
    try {
      await api.staff.update(staff.id, { status: newStatus });
      setStaffList(prev => prev.map(s => s.id === staff.id ? { ...s, status: newStatus } : s));
      showToast(`Staff ${newStatus}`, 'success');
    } catch (e: any) {
      showToast(e.message || 'Action failed', 'error');
    }
  };

  return (
    <div>
      {editTarget && <EditStaffModal staff={editTarget} onClose={() => setEditTarget(null)} onSave={onSaved} />}
      <SectionHeader
        title="Gate Staff"
        action={
          <div className="flex gap-2">
            <button onClick={refresh} style={{ color: 'var(--text-muted)' }} title="Refresh"><RefreshCw size={16} /></button>
            <Link to="/owner/staff/new"><Button icon={Plus}>Add</Button></Link>
          </div>
        }
      />

      {/* Desktop Table */}
      <div className="table-wrapper hidden sm:block">
        <table>
          <thead>
            <tr>
              <th>Name</th><th>Email</th><th>Events</th><th>Status</th><th>Last Active</th><th style={{ width: 100 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {staffList.map(s => (
              <tr key={s.id}>
                <td className="font-medium" style={{ color: 'var(--text-primary)' }}>{s.name}</td>
                <td className="text-xs" style={{ color: 'var(--text-secondary)' }}>{s.email}</td>
                <td style={{ color: 'var(--text-secondary)' }}>{s.assignedEvents.length} events</td>
                <td>{staffStatusBadge(s.status)}</td>
                <td className="text-xs" style={{ color: 'var(--text-muted)' }}>{s.lastActivity ? formatDateTime(s.lastActivity) : 'Never'}</td>
                <td>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setEditTarget(s)}
                      className="p-1 rounded hover:bg-canvas"
                      style={{ color: 'var(--text-muted)' }}
                      title="Edit"
                    >
                      <Edit2 size={13} />
                    </button>
                    {s.status !== 'terminated' && (
                      <>
                        {s.status !== 'active' && (
                          <button
                            onClick={() => quickAction(s, 'active')}
                            className="p-1 rounded hover:bg-canvas"
                            style={{ color: '#16a34a' }}
                            title="Activate"
                          >
                            <Check size={13} />
                          </button>
                        )}
                        {s.status === 'active' && (
                          <button
                            onClick={() => quickAction(s, 'suspended')}
                            className="p-1 rounded hover:bg-canvas"
                            style={{ color: '#b45309' }}
                            title="Suspend"
                          >
                            <Ban size={13} />
                          </button>
                        )}
                        <button
                          onClick={() => { if (confirm(`Terminate ${s.name}?`)) quickAction(s, 'terminated'); }}
                          className="p-1 rounded hover:bg-canvas"
                          style={{ color: '#dc2626' }}
                          title="Terminate"
                        >
                          <Trash2 size={13} />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {staffList.length === 0 && !loading && (
          <div className="p-8 text-center" style={{ color: 'var(--text-muted)' }}>
            <p className="text-sm">No gate staff yet.</p>
            <Link to="/owner/staff/new" className="mt-2 inline-block"><Button size="sm" icon={Plus}>Add Staff</Button></Link>
          </div>
        )}
      </div>

      {/* Mobile Cards */}
      <div className="sm:hidden space-y-2">
        {staffList.map(s => (
          <div key={s.id} className="card p-3">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{s.name}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{s.assignedEvents.length} events</p>
              </div>
              <div className="flex items-center gap-2">
                {staffStatusBadge(s.status)}
                <button onClick={() => setEditTarget(s)} style={{ color: 'var(--text-muted)' }}><Edit2 size={14} /></button>
              </div>
            </div>
            {s.status !== 'terminated' && (
              <div className="flex gap-1 flex-wrap">
                {s.status !== 'active' && (
                  <button onClick={() => quickAction(s, 'active')} className="text-xs px-2 py-1 rounded-md font-medium" style={{ background: 'rgba(34,197,94,0.15)', color: '#16a34a' }}>Activate</button>
                )}
                {s.status === 'active' && (
                  <button onClick={() => quickAction(s, 'suspended')} className="text-xs px-2 py-1 rounded-md font-medium" style={{ background: 'rgba(234,179,8,0.15)', color: '#b45309' }}>Suspend</button>
                )}
                <button onClick={() => quickAction(s, 'revoked')} className="text-xs px-2 py-1 rounded-md font-medium" style={{ background: 'rgba(239,68,68,0.1)', color: '#dc2626' }}>Revoke</button>
                <button onClick={() => { if (confirm(`Terminate ${s.name}?`)) quickAction(s, 'terminated'); }} className="text-xs px-2 py-1 rounded-md font-medium" style={{ background: 'rgba(239,68,68,0.1)', color: '#dc2626' }}>Terminate</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function OwnerEarnings() {
  return (
    <div>
      <h1 className="text-xl sm:text-2xl font-semibold mb-4 sm:mb-6">Earnings</h1>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <StatCard label="Total" value={formatNaira(114375)} icon={DollarSign} delay={0} />
        <StatCard label="Pending" value={formatNaira(33250)} icon={Clock} delay={50} />
        <StatCard label="Settled" value={formatNaira(81125)} icon={Check} delay={100} />
      </div>
      <BentoCard>
        <h3 className="text-sm font-semibold mb-3" style={{ fontFamily: "'Unlock', cursive" }}>History</h3>
        <div className="space-y-2">
          {mockPayouts.map(p => (
            <div key={p.id} className="data-row flex items-center justify-between p-3.5 rounded-xl">
              <div>
                <p className="text-sm font-bold">{formatNaira(p.ownerAmount)}</p>
                <p className="text-xs text-text-muted mt-0.5">{formatDate(p.createdAt)}</p>
              </div>
              <Badge variant={p.status === 'settled' ? 'success' : 'warning'}>{p.status}</Badge>
            </div>
          ))}
        </div>
      </BentoCard>
    </div>
  );
}

// ============ ADMIN PAGES ============
// ============ ADMIN PAGES ============
function AdminOwners() {
  const [planners, setPlanners] = useState(() => getStoredPlanners());
  const [search, setSearch] = useState('');
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const events = getStoredEvents();

  const handleDeactivate = async (plannerId: string, eventName?: string) => {
    if (!window.confirm(`Are you sure you want to deactivate this event planner account? \n\nThe event "${eventName || 'Event'}" will remain in database history for financial audit and records, but will be closed from live sales. The planner will no longer be able to log in or access this event.`)) {
      return;
    }

    setLoadingId(plannerId);
    try {
      await api.admin.deactivatePlanner(plannerId);
      setPlanners(getStoredPlanners());
      showToast('Event planner account deactivated and closed. Event archived in history.', 'success');
    } catch (e: any) {
      showToast(e.message || 'Failed to deactivate planner', 'error');
    } finally {
      setLoadingId(null);
    }
  };

  const filtered = planners.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.email.toLowerCase().includes(search.toLowerCase()) ||
    (p.eventName && p.eventName.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div>
      <SectionHeader
        title="Event Planners & Accounts"
        action={
          <Input
            placeholder="Search planners, events or email..."
            icon={Search}
            value={search}
            onChange={setSearch}
            className="max-w-[200px] sm:max-w-xs"
          />
        }
      />

      {/* Info card */}
      <div className="mb-4 p-3.5 rounded-2xl neu-card-inset border border-accent/20 flex items-start gap-2.5 text-xs text-text-secondary">
        <Info size={16} className="text-accent shrink-0 mt-0.5" />
        <p>
          <strong>Account Lifecycle Control:</strong> Once an event concludes, site administrators can deactivate the planner’s account. The event and all historical ticket sales remain permanently preserved for financial auditing, but cannot sell tickets or be modified by the planner.
        </p>
      </div>

      <div className="table-wrapper hidden sm:block">
        <table>
          <thead>
            <tr>
              <th>Planner & Email</th>
              <th>Managed Event</th>
              <th>Status</th>
              <th>Created</th>
              <th className="text-right">Admin Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => {
              const isDeactivated = p.status === 'deactivated';
              const assignedEvent = events.find(e => e.id === p.eventId);
              const eventTitle = p.eventName || assignedEvent?.name || 'General Event';

              return (
                <tr key={p.id}>
                  <td>
                    <div>
                      <p className="font-semibold text-text-primary text-sm">{p.name}</p>
                      <p className="text-xs text-text-secondary font-mono">{p.email}</p>
                    </div>
                  </td>
                  <td>
                    <div className="max-w-[200px]">
                      <p className="font-medium text-xs truncate">{eventTitle}</p>
                      <span className="text-[10px] text-text-muted">1 Event = 1 Account</span>
                    </div>
                  </td>
                  <td>
                    {isDeactivated ? (
                      <Badge variant="neutral">Deactivated (Closed)</Badge>
                    ) : (
                      <Badge variant="success">Active</Badge>
                    )}
                  </td>
                  <td className="text-xs text-text-muted">
                    {formatDate(p.created_at)}
                  </td>
                  <td className="text-right">
                    {isDeactivated ? (
                      <span className="text-xs text-text-muted italic">Event Concluded • Closed</span>
                    ) : (
                      <Button
                        size="sm"
                        variant="secondary"
                        className="!text-red-500 hover:!bg-red-500/10 border-red-500/30"
                        disabled={loadingId === p.id}
                        onClick={() => handleDeactivate(p.id, eventTitle)}
                      >
                        {loadingId === p.id ? 'Closing...' : 'Deactivate & Close Event'}
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Card List */}
      <div className="sm:hidden space-y-3">
        {filtered.map(p => {
          const isDeactivated = p.status === 'deactivated';
          const assignedEvent = events.find(e => e.id === p.eventId);
          const eventTitle = p.eventName || assignedEvent?.name || 'General Event';

          return (
            <div key={p.id} className="card p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">{p.name}</p>
                  <p className="text-xs text-text-muted font-mono">{p.email}</p>
                </div>
                {isDeactivated ? (
                  <Badge variant="neutral">Closed</Badge>
                ) : (
                  <Badge variant="success">Active</Badge>
                )}
              </div>
              <div className="pt-2 border-t border-[var(--shadow-dark)] text-xs flex justify-between items-center">
                <span className="text-text-secondary truncate max-w-[180px]">{eventTitle}</span>
                <span className="text-text-muted">{formatDate(p.created_at)}</span>
              </div>
              {!isDeactivated && (
                <Button
                  size="sm"
                  variant="secondary"
                  className="w-full mt-2 !text-red-500 hover:!bg-red-500/10 border-red-500/30"
                  disabled={loadingId === p.id}
                  onClick={() => handleDeactivate(p.id, eventTitle)}
                >
                  {loadingId === p.id ? 'Closing Account...' : 'Deactivate & Close Event'}
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AdminEvents() {
  const [events, setEvents] = useState(() => getStoredEvents());

  const handleCloseEvent = async (evtId: string, evtName: string) => {
    if (!window.confirm(`Close event "${evtName}"? It will remain in system history for audit and financial records, but will no longer be live for ticket sales.`)) {
      return;
    }
    const updated = events.map(e => e.id === evtId ? { ...e, status: 'ended' as const } : e);
    saveStoredEvents(updated);
    setEvents(updated);
    showToast(`Event "${evtName}" closed from live sales. Preserved in history.`, 'success');
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold">All Platform Events</h1>
          <p className="text-xs text-text-secondary mt-0.5">
            Active and historical ended events permanently logged in the system.
          </p>
        </div>
      </div>
      <div className="space-y-3">
        {events.map(evt => {
          const isEnded = evt.status === 'ended' || evt.status === 'taken_down';

          return (
            <div key={evt.id} className="card p-4 sm:p-5">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="text-sm font-semibold truncate">{evt.name}</h3>
                    {isEnded ? (
                      <Badge variant="neutral">Ended (Historical Record)</Badge>
                    ) : (
                      <Badge variant="success">Live & Active</Badge>
                    )}
                  </div>
                  <p className="text-xs text-text-secondary truncate">{evt.venue}</p>
                  <p className="text-xs text-text-muted mt-1">Date: {formatDate(evt.eventDate)}</p>
                </div>

                <div className="flex items-center gap-2 mt-2 sm:mt-0">
                  <Link to={`/event/${evt.id}`}>
                    <Button variant="secondary" size="sm" icon={Eye}>View Page</Button>
                  </Link>
                  {!isEnded && (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="!text-red-500 hover:!bg-red-500/10 border-red-500/30"
                      onClick={() => handleCloseEvent(evt.id, evt.name)}
                    >
                      End & Archive
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AdminOrders() {
  return (
    <div>
      <SectionHeader title="Orders" action={<Input placeholder="Search..." icon={Search} className="max-w-[200px] sm:max-w-xs" />} />
      <div className="space-y-2 sm:hidden">
        {mockOrders.map(o => (
          <div key={o.id} className="card p-3">
            <div className="flex justify-between items-start"><div><p className="text-sm font-medium">{o.buyerName}</p><p className="text-xs text-text-muted">{o.buyerEmail}</p></div><Badge variant={o.status === 'paid' ? 'success' : 'warning'}>{o.status}</Badge></div>
            <div className="flex justify-between mt-2 text-xs"><span className="text-text-secondary">{o.lines.map(l => l.ticketTypeName).join(', ')}</span><span className="font-semibold">{formatNaira(o.total)}</span></div>
          </div>
        ))}
      </div>
      <div className="table-wrapper hidden sm:block">
        <table><thead><tr><th>Reference</th><th>Buyer</th><th>Total</th><th>Status</th><th>Date</th></tr></thead>
          <tbody>{mockOrders.map(o => (<tr key={o.id}><td><code className="text-xs font-mono">{o.reference}</code></td><td>{o.buyerName}</td><td className="font-medium">{formatNaira(o.total)}</td><td><Badge variant={o.status === 'paid' ? 'success' : 'warning'}>{o.status}</Badge></td><td className="text-xs">{formatDateTime(o.createdAt)}</td></tr>))}</tbody>
        </table>
      </div>
    </div>
  );
}

function AdminPayouts() {
  return (
    <div>
      <h1 className="text-xl sm:text-2xl font-semibold mb-4 sm:mb-6">Payouts</h1>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4">
        <StatCard label="Disbursed" value={formatNaira(81125)} icon={DollarSign} delay={0} />
        <StatCard label="Pending" value={formatNaira(33250)} icon={Clock} delay={50} />
        <StatCard label="Failed" value={formatNaira(0)} icon={AlertTriangle} delay={100} />
      </div>
    </div>
  );
}

function AdminSettings() {
  const [settings, setSettings] = useState({ platformFeePercent: 5, monnifyFeeRate: 1.5, monnifyFeeCap: 2000, vatRate: 7.5, paymentWindowMinutes: 20 });
  return (
    <div>
      <h1 className="text-xl sm:text-2xl font-semibold mb-4 sm:mb-6">Settings</h1>
      <div className="card p-4 sm:p-6 max-w-xl space-y-4">
        <Input label="Platform Fee (%)" type="number" value={settings.platformFeePercent.toString()} onChange={(v) => setSettings({ ...settings, platformFeePercent: Number(v) })} />
        <Input label="Monnify Fee Rate (%)" type="number" value={settings.monnifyFeeRate.toString()} onChange={(v) => setSettings({ ...settings, monnifyFeeRate: Number(v) })} />
        <Input label="Fee Cap (NGN)" type="number" value={settings.monnifyFeeCap.toString()} onChange={(v) => setSettings({ ...settings, monnifyFeeCap: Number(v) })} />
        <Input label="VAT Rate (%)" type="number" value={settings.vatRate.toString()} onChange={(v) => setSettings({ ...settings, vatRate: Number(v) })} />
        <Input label="Payment Window (min)" type="number" value={settings.paymentWindowMinutes.toString()} onChange={(v) => setSettings({ ...settings, paymentWindowMinutes: Number(v) })} />
        <Button onClick={() => showToast('Settings saved', 'success')}>Save Settings</Button>
      </div>
    </div>
  );
}

function AdminAudit() {
  return (
    <div>
      <h1 className="text-xl sm:text-2xl font-semibold mb-4 sm:mb-6">Audit Log</h1>
      <div className="space-y-2">
        {mockAuditLogs.map(log => (
          <div key={log.id} className="card p-3">
            <div className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-navy mt-1.5 shrink-0" />
              <div className="min-w-0"><p className="text-xs sm:text-sm text-text-primary">{log.details}</p><p className="text-xs text-text-muted mt-0.5">{log.userId} - {formatDateTime(log.createdAt)}</p></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function OwnerSettings() {
  return (
    <div>
      <h1 className="text-xl sm:text-2xl font-semibold mb-4 sm:mb-6">Settings</h1>
      <div className="card p-4 sm:p-6 max-w-xl space-y-4">
        <Input label="Organization" value="EventPro Nigeria" />
        <Input label="Email" value="events@eventpro.ng" type="email" />
        <Input label="Phone" value="08012345678" />
        <div className="pt-4 border-t border-border"><h3 className="text-sm font-semibold mb-3">Settlement Bank</h3></div>
        <Input label="Bank" value="GTBank" />
        <Input label="Account" value="0123456789" />
        <Button onClick={() => showToast('Saved', 'success')}>Save</Button>
      </div>
    </div>
  );
}

// ============ COMPREHENSIVE LANDING PAGE ============
function LandingPage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Navigation */}
      <header className="sticky top-0 z-50 backdrop-blur-xl" style={{ backgroundColor: 'var(--card-bg)', borderBottom: '1px solid var(--shadow-dark)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--accent)' }}>
              <TIcon size={18} color="white" />
            </div>
            <span className="text-xl" style={{ color: 'var(--text-primary)', fontFamily: "'Unlock', cursive", fontWeight: 400 }}>TiKeTi</span>
          </div>
          <div className="hidden sm:flex items-center gap-5">
            <a href="#features" className="text-sm font-semibold hover:text-accent transition-colors" style={{ color: 'var(--text-primary)' }}>Features</a>
            <a href="#how-it-works" className="text-sm font-semibold hover:text-accent transition-colors" style={{ color: 'var(--text-primary)' }}>How it Works</a>
            <Link to="/events" className="text-sm font-semibold hover:text-accent transition-colors" style={{ color: 'var(--text-primary)' }}>Live Events</Link>
            <Link to="/model" className="text-sm font-semibold hover:text-accent transition-colors" style={{ color: 'var(--text-primary)' }}>Model Portal</Link>
            <Link to="/verify" className="text-sm font-semibold hover:text-accent transition-colors" style={{ color: 'var(--text-primary)' }}>Gate Verify</Link>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link to="/owner"><Button size="sm" variant="primary">Dashboard</Button></Link>
          </div>
        </div>
      </header>

      {/* Hero Section - Dashboard Style */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-30">
          <TicketAnimation />
        </div>
        {/* Gradient overlay */}
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(0, 229, 255, 0.08) 0%, transparent 60%)' }} />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-16 sm:pt-24 pb-16 sm:pb-24 relative z-10">
          <div className="text-center max-w-3xl mx-auto">

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6" style={{ color: 'var(--text-primary)' }}>
              TiKeTi, best platform to sell your event tickets
            </h1>
            <p className="text-base sm:text-lg leading-relaxed mb-10 max-w-2xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
              TiKeTi automates ticket sales for campus &amp; city events. Each model gets a personal referral link. Buyers pay securely. Verify tickets at the gate with a scan or QR code.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/events"><Button size="lg" variant="primary" icon={ShoppingBag}>See Live Events & Buy Tickets</Button></Link>
              <Link to="/owner"><Button size="lg" variant="secondary" icon={Calendar}>Event Planner</Button></Link>
            </div>
          </div>

          {/* Dashboard Preview Stats */}
          <div className="mt-16 sm:mt-20 max-w-4xl mx-auto">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <div className="neu-card p-4 sm:p-5 text-center">
                <div className="flex items-center justify-center mb-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(0, 229, 255, 0.1)' }}>
                    <TrendingUp size={16} style={{ color: 'var(--accent)' }} />
                  </div>
                </div>
                <p className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>₦12.8M</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>Revenue Processed</p>
              </div>
              <div className="neu-card p-4 sm:p-5 text-center">
                <div className="flex items-center justify-center mb-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(0, 229, 255, 0.1)' }}>
                    <ShoppingBag size={16} style={{ color: 'var(--accent)' }} />
                  </div>
                </div>
                <p className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>4,231</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>Tickets Sold</p>
              </div>
              <div className="neu-card p-4 sm:p-5 text-center">
                <div className="flex items-center justify-center mb-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(0, 229, 255, 0.1)' }}>
                    <Calendar size={16} style={{ color: 'var(--accent)' }} />
                  </div>
                </div>
                <p className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>12</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>Active Events</p>
              </div>
              <div className="neu-card p-4 sm:p-5 text-center">
                <div className="flex items-center justify-center mb-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(0, 229, 255, 0.1)' }}>
                    <UserCheck size={16} style={{ color: 'var(--accent)' }} />
                  </div>
                </div>
                <p className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>99.9%</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>Uptime</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-16 sm:py-24" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold mb-3" style={{ color: 'var(--text-primary)' }}>How TiKeTi Works</h2>
            <p className="text-sm sm:text-base max-w-lg mx-auto" style={{ color: 'var(--text-secondary)' }}>Register as an event planner, set up your event &amp; tickets, invite models and gate verifiers.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {[
              { step: '01', title: 'Event Planner', desc: 'Register, set up your event and ticket types with gender pricing, invite models and gate verifiers.', icon: Calendar, link: '/register', linkLabel: 'Register Now' },
              { step: '02', title: 'Models & Gate Staff', desc: 'Get invited by the planner. Confirm via email link, create your password and access your dashboard.', icon: Users, link: '/login', linkLabel: 'Sign In' },
              { step: '03', title: 'Buyers', desc: 'Browse events, buy tickets via model links or directly. Get a QR ticket instantly after payment.', icon: ShoppingBag, link: '/events', linkLabel: 'Browse Events' },
            ].map((item, i) => (
              <NeuCard key={i} className="p-6 sm:p-8 animate-fade-up" delay={i * 100}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="neu-card-inset w-12 h-12 rounded-xl flex items-center justify-center">
                    <item.icon size={24} style={{ color: 'var(--accent)' }} />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider px-2 py-1 rounded" style={{ backgroundColor: 'rgba(0, 229, 255, 0.1)', color: 'var(--accent)' }}>{item.step}</span>
                </div>
                <h3 className="text-lg font-bold mb-3" style={{ color: 'var(--text-primary)' }}>{item.title}</h3>
                <p className="text-sm leading-relaxed mb-6" style={{ color: 'var(--text-secondary)' }}>{item.desc}</p>
                <Link to={item.link}>
                  <Button variant="primary" size="sm" icon={ArrowRight}>{item.linkLabel}</Button>
                </Link>
              </NeuCard>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-16 sm:py-24" style={{ borderTop: '1px solid var(--shadow-dark)', borderBottom: '1px solid var(--shadow-dark)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold mb-3" style={{ color: 'var(--text-primary)' }}>Platform Features</h2>
            <p className="text-sm sm:text-base max-w-lg mx-auto" style={{ color: 'var(--text-secondary)' }}>Everything you need to sell, manage, and verify event tickets securely.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {[
              { icon: QrCode, title: 'HMAC-Signed QR Tickets', desc: 'Forged QR codes are rejected before any database lookup.' },
              { icon: Shield, title: 'Atomic Check-ins', desc: 'Two devices scanning the same ticket at once cannot both succeed.' },
              { icon: Users, title: 'Masked Leaderboard', desc: 'Models see their rank. Others are blurred. Privacy by design.' },
              { icon: Clock, title: '20-Minute Payment Window', desc: 'Tickets reserved atomically. Released if payment expires.' },
              { icon: FileText, title: 'Full Audit Trail', desc: 'Every sensitive action is logged. Settings changes, check-ins, removals.' },
              { icon: Zap, title: 'Real-time Analytics', desc: 'Live sales tracking, capacity monitoring, and instant notifications.' },
            ].map((f, i) => (
              <div key={i} className="neu-card p-5 sm:p-6 animate-fade-up" style={{ animationDelay: `${i * 50}ms` }}>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-4" style={{ backgroundColor: 'rgba(0, 229, 255, 0.1)' }}>
                  <f.icon size={20} style={{ color: 'var(--accent)' }} />
                </div>
                <h3 className="text-sm font-bold mb-2" style={{ color: 'var(--text-primary)' }}>{f.title}</h3>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Quick Access */}
      <section className="py-16 sm:py-24" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold mb-3" style={{ color: 'var(--text-primary)' }}>Get Started</h2>
            <p className="text-sm sm:text-base" style={{ color: 'var(--text-secondary)' }}>Choose your platform role to begin</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-6xl mx-auto">
            <Link to="/owner">
              <NeuCard className="p-6 text-center hover:scale-[1.02] transition-transform cursor-pointer group h-full flex flex-col justify-between">
                <div>
                  <div className="neu-card-inset w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Calendar size={28} style={{ color: 'var(--accent)' }} />
                  </div>
                  <h3 className="text-base font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>Event Planner</h3>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Create & manage your events</p>
                </div>
                <div className="mt-4 flex items-center justify-center gap-1 text-xs font-semibold" style={{ color: 'var(--accent)' }}>
                  <span>Open Planner</span>
                  <ArrowRight size={12} />
                </div>
              </NeuCard>
            </Link>
            <Link to="/events">
              <NeuCard className="p-6 text-center hover:scale-[1.02] transition-transform cursor-pointer group h-full flex flex-col justify-between">
                <div>
                  <div className="neu-card-inset w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <ShoppingBag size={28} style={{ color: 'var(--accent)' }} />
                  </div>
                  <h3 className="text-base font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>Live Events</h3>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Browse tickets & pay online</p>
                </div>
                <div className="mt-4 flex items-center justify-center gap-1 text-xs font-semibold" style={{ color: 'var(--accent)' }}>
                  <span>Browse Events</span>
                  <ArrowRight size={12} />
                </div>
              </NeuCard>
            </Link>
            <Link to="/model">
              <NeuCard className="p-6 text-center hover:scale-[1.02] transition-transform cursor-pointer group h-full flex flex-col justify-between">
                <div>
                  <div className="neu-card-inset w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Users size={28} style={{ color: 'var(--accent)' }} />
                  </div>
                  <h3 className="text-base font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>Model Ambassador</h3>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Track referral sales & rank</p>
                </div>
                <div className="mt-4 flex items-center justify-center gap-1 text-xs font-semibold" style={{ color: 'var(--accent)' }}>
                  <span>Model Portal</span>
                  <ArrowRight size={12} />
                </div>
              </NeuCard>
            </Link>
            <Link to="/verify">
              <NeuCard className="p-6 text-center hover:scale-[1.02] transition-transform cursor-pointer group h-full flex flex-col justify-between">
                <div>
                  <div className="neu-card-inset w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <QrCode size={28} style={{ color: 'var(--accent)' }} />
                  </div>
                  <h3 className="text-base font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>Gate Scanner</h3>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Scan QR & verify entry</p>
                </div>
                <div className="mt-4 flex items-center justify-center gap-1 text-xs font-semibold" style={{ color: 'var(--accent)' }}>
                  <span>Verify Gate</span>
                  <ArrowRight size={12} />
                </div>
              </NeuCard>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--shadow-dark)', backgroundColor: 'var(--bg-primary)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--accent)' }}>
                <TIcon size={14} color="white" />
              </div>
              <div>
                <span className="text-base font-bold" style={{ color: 'var(--text-primary)', fontFamily: "'Unlock', cursive" }}>TiKeTi</span>
                <p className="text-[11px] text-text-muted">University & Event Ticketing Platform</p>
              </div>
            </div>
            
            <div className="flex items-center flex-wrap justify-center gap-5 text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
              <Link to="/owner" className="hover:text-accent">Event Planner</Link>
              <Link to="/events" className="hover:text-accent">Live Events</Link>
              <Link to="/model" className="hover:text-accent">Model Ambassador</Link>
              <Link to="/verify" className="hover:text-accent">Gate Verify</Link>
              <Link to="/tickets/TKT-ORD-7K4M9XQ2" className="hover:text-accent">Find Tickets</Link>
              <Link to="/login" className="hover:text-accent opacity-80">Sign In</Link>
            </div>

            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              © 2026 TiKeTi. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ============ ADMIN LOGIN ============
function AdminLogin() {
  const [step, setStep] = useState<'email' | '2fa'>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--accent)' }}><TIcon size={20} color="white" /></div>
          </div>
          <h1 className="text-lg sm:text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Platform Admin</h1>
          <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>Sign in with your admin credentials</p>
        </div>
        {step === 'email' ? (
          <div className="card p-5 sm:p-6 space-y-4">
            <Input label="Email" type="email" placeholder="admin@tikiti.ng" value={email} onChange={setEmail} autoFocus />
            <Input label="Password" type="password" placeholder="Enter password" value={password} onChange={setPassword} />
            <Button className="w-full" onClick={() => { if (email && password) setStep('2fa'); }}>Continue</Button>
            <p className="text-xs text-center" style={{ color: 'var(--text-muted, #6B7280)' }}><Lock size={12} className="inline mr-1" />Protected by 2FA</p>
          </div>
        ) : (
          <div className="card p-5 sm:p-6 space-y-4 animate-fade-up">
            <div className="text-center mb-2">
              <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: 'rgba(0, 229, 255, 0.1)' }}><Shield size={20} style={{ color: 'var(--accent)' }} /></div>
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Enter verification code</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>From your authenticator app</p>
            </div>
            <Input label="6-digit code" placeholder="000000" value={code} onChange={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))} autoFocus />
            <Button className="w-full" disabled={code.length < 6} onClick={() => navigate('/admin')}>Verify & Sign In</Button>
            <button onClick={() => setStep('email')} className="text-xs w-full text-center" style={{ color: 'var(--text-secondary)' }}>Back to login</button>
          </div>
        )}
        <div className="text-center mt-4"><Link to="/" className="text-xs" style={{ color: 'var(--text-secondary)' }}>Back to home</Link></div>
      </div>
    </div>
  );
}

// ============ STUB PAGES ============
function CreateEventForm() {
  const navigate = useNavigate();
  const events = getStoredEvents();
  let user: any = null;
  try {
    const raw = localStorage.getItem('tiketi_user');
    if (raw) user = JSON.parse(raw);
  } catch (e) {}

  const hasEvent = events.some(e => {
    if (user?.event_id && e.id === user.event_id) return true;
    if (user?.id && (e.ownerId === user.id || (e as any).plannerId === user.id)) return true;
    return false;
  });

  if (hasEvent) {
    return (
      <div className="p-4 sm:p-6 max-w-xl mx-auto text-center space-y-4">
        <div className="card p-6 sm:p-8 space-y-4 animate-fade-up">
          <div className="w-12 h-12 rounded-2xl bg-accent/20 text-accent flex items-center justify-center mx-auto mb-2">
            <Calendar size={24} />
          </div>
          <h1 className="text-xl font-bold text-text-primary" style={{ fontFamily: "'Unlock', cursive" }}>
            One Event = One Account
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
            In TiKeTi, each planner account manages exactly <strong>one event</strong> to ensure clean financial settlements, independent ticket tiers, model ambassador tracking, and gate staff verification.
          </p>
          <div className="p-3.5 rounded-xl neu-card-inset text-xs text-text-secondary text-left space-y-1 border border-accent/20">
            <p className="font-semibold text-text-primary">Want to host another event?</p>
            <p>You can create as many events as you like! Simply register a new event account using your same email address.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Link to="/register" className="flex-1">
              <Button variant="primary" className="w-full">
                Register New Event Account
              </Button>
            </Link>
            <button onClick={() => navigate('/owner')} className="flex-1">
              <Button variant="secondary" className="w-full">
                Back to My Event
              </Button>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [venue, setVenue] = useState('');
  const [date, setDate] = useState('');
  const [salesEnd, setSalesEnd] = useState('');
  const [capacity, setCapacity] = useState('');

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 rounded-lg" style={{ color: 'var(--text-secondary)' }}>
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Create Event</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>Fill in the details below to create your event listing.</p>
        </div>
      </div>

      <div className="card p-5 sm:p-6 space-y-5">
        <Input
          label="Event Name"
          placeholder="e.g. Faculty Night Out 2026"
          value={name}
          onChange={setName}
        />

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-secondary)' }}>Description</label>
          <textarea
            rows={4}
            placeholder="Describe your event — what to expect, dress code, performers, agenda, etc."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="neu-input resize-none"
            style={{ height: 'auto', minHeight: '100px', paddingTop: '12px', paddingBottom: '12px' }}
          />
          <p className="text-xs mt-1.5" style={{ color: 'var(--text-secondary)' }}>This appears on the public event page visible to buyers.</p>
        </div>

        <Input
          label="Venue"
          placeholder="e.g. Main Auditorium, University of Lagos"
          value={venue}
          onChange={setVenue}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-secondary)' }}>Event Date & Time</label>
            <input
              type="datetime-local"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="neu-input"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-secondary)' }}>Sales Close Date</label>
            <input
              type="datetime-local"
              value={salesEnd}
              onChange={(e) => setSalesEnd(e.target.value)}
              className="neu-input"
            />
            <p className="text-xs mt-1.5" style={{ color: 'var(--text-secondary)' }}>No ticket purchases after this time.</p>
          </div>
        </div>

        <Input
          label="Venue Capacity"
          placeholder="e.g. 500"
          type="number"
          value={capacity}
          onChange={setCapacity}
        />

        <div className="flex items-center gap-3 pt-2">
          <Button
            variant="primary"
            onClick={() => {
              if (!name.trim() || !description.trim() || !venue.trim() || !date || !salesEnd || !capacity) {
                showToast('Please fill in all required fields', 'error');
                return;
              }
              const newEvt: Event = {
                id: `evt_${Date.now()}`,
                ownerId: 'owner_1',
                name: name.trim(),
                description: description.trim(),
                venue: venue.trim(),
                eventDate: date,
                timezone: 'Africa/Lagos',
                salesEndDate: salesEnd,
                capacity: parseInt(capacity) || 500,
                status: 'active',
                bannerUrl: 'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?auto=format&fit=crop&w=1200&q=80',
                posterUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=600&q=80',
                createdAt: new Date().toISOString(),
              };
              const current = getStoredEvents();
              saveStoredEvents([newEvt, ...current]);
              showToast('Event created successfully!', 'success');
              navigate('/owner/events');
            }}
          >
            Create Event
          </Button>
          <Button variant="secondary" onClick={() => navigate(-1)}>Cancel</Button>
        </div>
      </div>
    </div>
  );
}

function TicketTypeForm() {
  const { eventId } = useParams<{ eventId?: string }>();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState('');
  const [genderPricing, setGenderPricing] = useState(false);
  const [price, setPrice] = useState('5000');
  const [malePrice, setMalePrice] = useState('20000');
  const [femalePrice, setFemalePrice] = useState('5000');
  const [quantity, setQuantity] = useState('100');
  const [admits, setAdmits] = useState('1');
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          setImagePreview(ev.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!name.trim() || !quantity) {
      showToast('Please provide a tier name and quantity', 'error');
      return;
    }
    if (!genderPricing && !price) {
      showToast('Please provide a ticket price', 'error');
      return;
    }
    if (genderPricing && (!malePrice || !femalePrice)) {
      showToast('Please provide both male and female prices', 'error');
      return;
    }

    try {
      await api.ticketTypes.create(eventId || 'evt_1', {
        name: name.trim(),
        genderPricing,
        gender_pricing: genderPricing,
        price: genderPricing ? (parseInt(malePrice) || parseInt(femalePrice) || 0) : (parseInt(price) || 0),
        malePrice: genderPricing ? parseInt(malePrice) : undefined,
        male_price: genderPricing ? parseInt(malePrice) : undefined,
        femalePrice: genderPricing ? parseInt(femalePrice) : undefined,
        female_price: genderPricing ? parseInt(femalePrice) : undefined,
        quantity: parseInt(quantity) || 100,
        admits: parseInt(admits) || 1,
        imageUrl: imagePreview || '',
        ticket_image_url: imagePreview || '',
      });
      showToast(`Ticket tier "${name.trim()}" added successfully!`, 'success');
      navigate(eventId ? `/owner/events/${eventId}` : '/owner/events');
    } catch {
      showToast('Failed to save ticket tier', 'error');
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 rounded-lg" style={{ color: 'var(--text-secondary)' }}>
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Add Ticket Tier</h1>
          <p className="text-xs mt-0.5 text-text-secondary">Set pricing, gender rates, design image, and quota</p>
        </div>
      </div>
      <div className="card p-5 space-y-4">
        <Input label="Tier Name" placeholder="e.g. VIP Single, Early Bird, Regular" value={name} onChange={setName} />

        {/* Ticket Design Image Upload */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-secondary)' }}>
            Ticket Design Image (any size)
          </label>
          <div
            className="relative rounded-xl overflow-hidden cursor-pointer border-2 border-dashed p-4 text-center transition-all hover:border-accent"
            onClick={() => fileRef.current?.click()}
            style={{ background: 'var(--canvas)', borderColor: 'var(--border)' }}
          >
            {imagePreview ? (
              <div className="relative">
                <img src={imagePreview} alt="Ticket" className="w-full object-cover max-h-36 rounded-lg" />
                <div className="absolute bottom-2 right-2 text-[10px] font-bold px-2 py-1 rounded bg-black/70 text-[#00e5ff]">
                  ✦ QR &amp; Code overlay enabled
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-4 gap-1.5">
                <Upload size={22} style={{ color: 'var(--accent)' }} />
                <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Upload custom ticket design
                </span>
                <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                  QR code &amp; verification code will be stamped automatically
                </span>
              </div>
            )}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImage} />
          </div>
        </div>

        {/* Gender-based pricing toggle */}
        <div className="flex items-center justify-between p-3 rounded-xl border" style={{ background: 'var(--canvas)', borderColor: 'var(--border)' }}>
          <div>
            <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>Separate Male &amp; Female Pricing</p>
            <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>e.g. Male ₦20,000 / Female ₦5,000</p>
          </div>
          <button
            type="button"
            onClick={() => setGenderPricing(!genderPricing)}
            className="w-10 h-5 rounded-full transition-all relative"
            style={{ backgroundColor: genderPricing ? 'var(--accent)' : 'var(--border)' }}
          >
            <span
              className="absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all"
              style={{ left: genderPricing ? '22px' : '2px' }}
            />
          </button>
        </div>

        {genderPricing ? (
          <div className="grid grid-cols-2 gap-3">
            <Input label="Male Price (NGN)" type="number" placeholder="20000" value={malePrice} onChange={setMalePrice} />
            <Input label="Female Price (NGN)" type="number" placeholder="5000" value={femalePrice} onChange={setFemalePrice} />
          </div>
        ) : (
          <Input label="Price (NGN)" type="number" placeholder="5000" value={price} onChange={setPrice} />
        )}

        <div className="grid grid-cols-2 gap-3">
          <Input label="Total Quantity" type="number" placeholder="100" value={quantity} onChange={setQuantity} />
          <Input label="Persons Admitted" type="number" placeholder="1" value={admits} onChange={setAdmits} />
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="primary" className="flex-1" onClick={handleSave}>Save Ticket Tier</Button>
          <Button variant="secondary" onClick={() => navigate(-1)}>Cancel</Button>
        </div>
      </div>
    </div>
  );
}

function ModelInviteForm() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [eventId, setEventId] = useState(mockEvents[0]?.id || 'evt_1');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState<{ code: string; name: string; inviteUrl: string } | null>(null);

  const handleSubmit = async () => {
    if (!name.trim() || !email.trim()) { showToast('Name and email are required', 'error'); return; }
    setLoading(true);
    try {
      const model = await api.models.invite({ event_id: eventId, name: name.trim(), email: email.trim() });
      const inviteUrl = (model as any).inviteUrl || `${window.location.origin}/invite?token=${(model as any).inviteToken || model.referralCode}`;
      setDone({ code: model.referralCode, name: model.name, inviteUrl });
      showToast('Model invited successfully!', 'success');
    } catch (e: any) {
      showToast(e.message || 'Failed to invite model', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="p-4 max-w-md mx-auto">
        <div className="card p-6 sm:p-8 text-center space-y-4">
          <SuccessCheckmark />
          <div>
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{done.name} Invited!</h2>
            <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>Send them their invitation link so they can set up their password and access their ambassador dashboard.</p>
          </div>

          <div className="text-left space-y-2 p-3 rounded-xl" style={{ background: 'var(--canvas)', border: '1px solid var(--border)' }}>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">Invitation & Password Setup Link</span>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs font-mono truncate" style={{ color: 'var(--accent)' }}>{done.inviteUrl}</code>
              <CopyButton text={done.inviteUrl} />
            </div>
          </div>

          <div className="text-left space-y-1 p-3 rounded-xl" style={{ background: 'var(--canvas)', border: '1px solid var(--border)' }}>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">Referral Code</span>
            <div className="font-mono text-base font-bold" style={{ color: 'var(--text-primary)' }}>{done.code}</div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button className="flex-1" variant="secondary" onClick={() => setDone(null)}>Invite Another</Button>
            <Button className="flex-1" variant="primary" onClick={() => navigate('/owner/models')}>View Models</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-md">
      <div className="flex items-center gap-3 mb-5">
        <Link to="/owner/models"><button style={{ color: 'var(--text-muted)' }}><ArrowLeft size={20} /></button></Link>
        <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Invite Model</h1>
      </div>
      <div className="card p-5 space-y-4">
        <div className="space-y-1">
          <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Event</label>
          <select
            className="w-full px-3 py-2 rounded-lg text-sm border"
            style={{ background: 'var(--canvas)', color: 'var(--text-primary)', borderColor: 'var(--border)' }}
            value={eventId}
            onChange={e => setEventId(e.target.value)}
          >
            {mockEvents.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
          </select>
        </div>
        <Input label="Model Name" placeholder="Full name" value={name} onChange={(e: any) => setName(e.target.value)} />
        <Input label="Email" type="email" placeholder="model@example.com" value={email} onChange={(e: any) => setEmail(e.target.value)} />
        <Button variant="primary" className="w-full" onClick={handleSubmit} loading={loading}>Send Invite &amp; Generate Link</Button>
      </div>
    </div>
  );
}

function StaffInviteForm() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [eventId, setEventId] = useState(mockEvents[0]?.id || 'evt_1');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState<{ name: string; inviteUrl: string } | null>(null);

  const handleSubmit = async () => {
    if (!name.trim() || !email.trim()) { showToast('Name and email are required', 'error'); return; }
    setLoading(true);
    try {
      const staff = await api.staff.add({ event_id: eventId, name: name.trim(), email: email.trim() });
      const inviteUrl = (staff as any).inviteUrl || `${window.location.origin}/invite?token=${(staff as any).inviteToken || staff.id}`;
      setDone({ name: staff.name, inviteUrl });
      showToast('Gate staff invited!', 'success');
    } catch (e: any) {
      showToast(e.message || 'Failed to add staff', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="p-4 max-w-md mx-auto">
        <div className="card p-6 sm:p-8 text-center space-y-4">
          <SuccessCheckmark />
          <div>
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Gate Staff Invited!</h2>
            <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>Send {done.name} their invitation link so they can create a password and access the Gate Scanner.</p>
          </div>

          <div className="text-left space-y-2 p-3 rounded-xl" style={{ background: 'var(--canvas)', border: '1px solid var(--border)' }}>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">Invitation & Password Setup Link</span>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs font-mono truncate" style={{ color: 'var(--accent)' }}>{done.inviteUrl}</code>
              <CopyButton text={done.inviteUrl} />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button className="flex-1" variant="secondary" onClick={() => { setDone(null); setName(''); setEmail(''); }}>Invite Another</Button>
            <Button className="flex-1" variant="primary" onClick={() => navigate('/owner/staff')}>View Staff</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-md">
      <div className="flex items-center gap-3 mb-5">
        <Link to="/owner/staff"><button style={{ color: 'var(--text-muted)' }}><ArrowLeft size={20} /></button></Link>
        <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Add Gate Staff</h1>
      </div>
      <div className="card p-5 space-y-4">
        <div className="space-y-1">
          <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Assign to Event</label>
          <select
            className="w-full px-3 py-2 rounded-lg text-sm border"
            style={{ background: 'var(--canvas)', color: 'var(--text-primary)', borderColor: 'var(--border)' }}
            value={eventId}
            onChange={e => setEventId(e.target.value)}
          >
            {mockEvents.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
          </select>
        </div>
        <Input label="Staff Name" placeholder="Full name" value={name} onChange={(e: any) => setName(e.target.value)} />
        <Input label="Email" type="email" placeholder="staff@example.com" value={email} onChange={(e: any) => setEmail(e.target.value)} />
        <Button variant="primary" className="w-full" onClick={handleSubmit} loading={loading}>Send Invite &amp; Generate Link</Button>
      </div>
    </div>
  );
}

function CheckInHistory() {
  const { eventId } = useParams<{ eventId?: string }>();
  const navigate = useNavigate();
  const checkedTickets = mockTickets.filter(t => t.checkedIn);

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-lg" style={{ color: 'var(--text-secondary)' }}>
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Check-in Log</h1>
            <p className="text-xs text-text-secondary">{checkedTickets.length} attendees admitted through gate</p>
          </div>
        </div>
        <Link to={eventId ? `/verify/${eventId}` : '/verify'}>
          <Button size="sm" icon={QrCode}>Open Scanner</Button>
        </Link>
      </div>

      <div className="space-y-2.5">
        {checkedTickets.length === 0 ? (
          <div className="card p-8 text-center text-text-muted">No check-ins recorded yet.</div>
        ) : (
          checkedTickets.map(t => (
            <div key={t.id} className="card p-3.5 flex items-center justify-between">
              <div>
                <p className="text-sm font-mono font-bold" style={{ color: 'var(--text-primary)' }}>{t.code}</p>
                <p className="text-xs text-text-muted">{t.ticketTypeName} • Admits: {t.admits} • Scanned: {t.checkedInAt ? formatDateTime(t.checkedInAt) : 'Recently'}</p>
              </div>
              <Badge variant={t.checkInMethod === 'qr' ? 'success' : 'neutral'}>
                {t.checkInMethod === 'qr' ? 'QR Code' : 'Manual Code'}
              </Badge>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function OrderRedownload() {
  const { orderRef } = useParams<{ orderRef?: string }>();
  const [ref, setRef] = useState(orderRef || '');
  const [email, setEmail] = useState('');
  const [orderData, setOrderData] = useState<{ order: any; tickets: any[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [showSearchForm, setShowSearchForm] = useState(!orderRef);

  const loadOrderByRef = useCallback(async (referenceToLoad: string, emailToUse: string) => {
    if (!referenceToLoad || !emailToUse.trim()) return;
    setLoading(true);
    try {
      const data = await api.orders.getOrderTickets(referenceToLoad.trim(), emailToUse.trim());
      if (data && data.order) {
        setOrderData(data);
        setShowSearchForm(false);
      } else {
        setOrderData(null);
      }
    } catch (e) {
      console.error(e);
      setOrderData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Don't auto-load from URL — email is required and must come from the form
    if (orderRef) {
      setRef(orderRef);
      // Intentionally NOT calling loadOrderByRef here: we need the user's email first
    }
  }, [orderRef]);

  const handleSearch = async () => {
    setSearched(true);
    const query = ref.trim().toUpperCase();
    if (!query || !email.trim()) {
      showToast('Please enter both your order reference and email', 'error');
      return;
    }

    setLoading(true);
    try {
      const data = await api.orders.getOrderTickets(query, email.trim());

      if (data && data.order) {
        setOrderData(data);
        setShowSearchForm(false);
        showToast('Order and tickets loaded successfully!', 'success');
      } else {
        setOrderData(null);
        showToast('Order not found. Please check your reference code and email.', 'error');
      }
    } catch (e) {
      showToast('Failed to retrieve order', 'error');
    } finally {
      setLoading(false);
    }
  };

  const downloadQR = (code: string) => {
    QRCode.toDataURL(`TIKITI:${code}`, {
      width: 400,
      margin: 2,
      color: { dark: '#000000', light: '#FFFFFF' }
    }).then(url => {
      const a = document.createElement('a');
      a.href = url;
      a.download = `QR_${code}.png`;
      a.click();
      showToast('QR code image saved', 'success');
    }).catch(console.error);
  };

  const currentUrl = orderData ? `${window.location.origin}/tickets/${orderData.order.reference}` : window.location.href;

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto min-h-screen print-page">
      {/* Header (hidden in print) */}
      <div className="no-print flex items-center justify-between pb-4 mb-6 border-b border-[var(--shadow-dark)]">
        <Link to="/" className="inline-flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-accent text-white shadow-sm">
            <TIcon size={16} color="white" />
          </div>
          <span className="text-xl font-bold text-text-primary" style={{ fontFamily: "'Unlock', cursive" }}>
            TiKeTi
          </span>
        </Link>
        <div className="flex items-center gap-3">
          {orderData && (
            <button
              onClick={() => setShowSearchForm(prev => !prev)}
              className="neu-button px-3 py-1.5 text-xs font-semibold text-text-secondary hover:text-accent"
            >
              {showSearchForm ? 'Close Search' : 'Lookup Another Order'}
            </button>
          )}
          <Link to="/events" className="text-xs font-semibold text-text-secondary hover:text-accent">
            Live Events
          </Link>
        </div>
      </div>

      {/* Optional Search Form */}
      {(showSearchForm || !orderData) && (
        <div className="no-print max-w-md mx-auto mb-8 card p-6 animate-fade-up">
          <div className="text-center mb-5">
            <h1 className="text-lg font-bold text-text-primary">Retrieve Your Tickets</h1>
            <p className="text-xs text-text-secondary mt-1">
              Enter your order reference (e.g. TKT-ORD-...) to open and download all bought tickets.
            </p>
          </div>
          <div className="space-y-4">
            <Input label="Order Reference" placeholder="e.g. TKT-ORD-7K4M9XQ2" value={ref} onChange={setRef} />
            <Input label="Or Buyer Email Address" type="email" placeholder="e.g. buyer@example.com" value={email} onChange={setEmail} />
            <Button className="w-full" onClick={handleSearch} disabled={loading}>
              {loading ? 'Finding Tickets...' : 'Find & Open Tickets'}
            </Button>
          </div>
          {searched && !orderData && !loading && (
            <div className="text-center p-3 mt-4 rounded-xl bg-red-500/10 text-xs text-red-500">
              No matching order found. Please verify your reference or email.
            </div>
          )}
        </div>
      )}

      {/* ORDER FOUND: FULL TICKET DISPLAY */}
      {orderData && (
        <div className="animate-fade-up space-y-6">
          {/* Permanent Retrieval Link Alert Banner */}
          <div className="no-print p-4 sm:p-5 rounded-2xl neu-card-inset border border-accent/40 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-accent text-white shrink-0 mt-0.5">
                  <Bookmark size={18} />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-text-primary">
                    Permanent Ticket Retrieval Link
                  </h2>
                  <p className="text-xs text-text-secondary mt-0.5">
                    Lost connection or closed the page? Save or bookmark this link to re-download your tickets anytime without logging in.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 self-end sm:self-center">
                <CopyButton text={currentUrl} label="Copy Link" />
                <button
                  onClick={() => window.print()}
                  className="neu-button neu-button-primary px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 text-white"
                >
                  <Printer size={14} /> Print / Save PDF
                </button>
              </div>
            </div>

            <div className="pt-2.5 border-t border-[var(--shadow-dark)] flex flex-wrap items-center justify-between text-xs text-text-secondary gap-2">
              <div className="flex items-center gap-2">
                <span>Order Reference:</span>
                <span className="font-mono font-bold text-accent px-2 py-0.5 rounded bg-black/5 dark:bg-white/10">
                  {orderData.order.reference}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="success">Paid & Confirmed</Badge>
                <span className="font-semibold text-text-primary">
                  {orderData.tickets.length} {orderData.tickets.length > 1 ? 'Tickets' : 'Ticket'}
                </span>
              </div>
            </div>
          </div>

          {/* List of Tickets: Vertical Full Party Flyer + Minimal Clean White Verification Stub */}
          <div className="space-y-8 flex flex-col items-center">
            {orderData.tickets.map((t: any, idx: number) => {
              return (
                <TicketPass
                  key={t.id || idx}
                  ticket={{
                    id: t.id || `tkt_${idx}`,
                    code: t.code,
                    type: t.type || 'Standard Pass',
                    eventName: t.eventName || orderData.order.eventName || 'Live Event',
                    eventVenue: t.eventVenue || orderData.order.event?.venue,
                    eventDate: t.eventDate || orderData.order.createdAt,
                    buyerName: t.buyerName || orderData.order.buyerName,
                    ticketImageUrl: t.ticketImageUrl || '/posters/unifest_concert.jpg',
                    admits: t.admits || 1,
                    gender: t.gender,
                    orderRef: orderData.order.reference,
                    index: idx,
                    totalTickets: orderData.tickets.length,
                  }}
                />
              );
            })}
          </div>

          {/* Footer Back/Explore Buttons */}
          <div className="no-print flex flex-col sm:flex-row gap-3 pt-4 border-t border-[var(--shadow-dark)]">
            <Link to="/events" className="flex-1">
              <Button variant="primary" className="w-full">
                Explore More Events
              </Button>
            </Link>
            <Link to="/" className="flex-1">
              <Button variant="secondary" className="w-full">
                Back to Home
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

// ============ ADMIN ROUTE GUARD ============
function AdminGuard({ children }: { children: React.ReactNode }) {
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('tiketi_auth_user');
      if (stored) {
        const u = JSON.parse(stored);
        if (u.role === 'admin') {
          setAuthorized(true);
          return;
        }
      }
    } catch {
      // ignore
    }
    setAuthorized(false);
  }, []);

  if (authorized === null) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white text-sm">Verifying Administrative Clearance...</div>;
  }

  if (!authorized) {
    return <Navigate to="/admin/login" replace />;
  }

  return <>{children}</>;
}

function RoleGuard({ roles, children }: { roles: string[]; children: React.ReactNode }) {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('tiketi_role') || '';
  const ok = token && !token.startsWith('demo-token') && roles.includes(role);
  return ok ? <>{children}</> : <Navigate to="/login" replace />;
}

// ============ MAIN APP ============
export default function App() {
  return (
    <BrowserRouter>
      <ToastContainer />
      <Routes>
        {/* Public */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/register" element={<EventPlannerRegistration />} />
        <Route path="/invite" element={<InviteConfirmPage />} />
        {/* Admin (Protected by AdminGuard) */}
        <Route path="/admin" element={<AdminGuard><AppLayout role="admin"><AdminDashboard /></AppLayout></AdminGuard>} />
        <Route path="/admin/owners" element={<AdminGuard><AppLayout role="admin"><AdminOwners /></AppLayout></AdminGuard>} />
        <Route path="/admin/events" element={<AdminGuard><AppLayout role="admin"><AdminEvents /></AppLayout></AdminGuard>} />
        <Route path="/admin/orders" element={<AdminGuard><AppLayout role="admin"><AdminOrders /></AppLayout></AdminGuard>} />
        <Route path="/admin/payouts" element={<AdminGuard><AppLayout role="admin"><AdminPayouts /></AppLayout></AdminGuard>} />
        <Route path="/admin/settings" element={<AdminGuard><AppLayout role="admin"><AdminSettings /></AppLayout></AdminGuard>} />
        <Route path="/admin/audit" element={<AdminGuard><AppLayout role="admin"><AdminAudit /></AppLayout></AdminGuard>} />
        {/* Event Planner */}
        <Route path="/owner" element={<RoleGuard roles={['planner','owner']}><AppLayout role="owner"><OwnerDashboard /></AppLayout></RoleGuard>} />
        <Route path="/owner/events" element={<RoleGuard roles={['planner','owner']}><AppLayout role="owner"><OwnerEvents /></AppLayout></RoleGuard>} />
        <Route path="/owner/events/new" element={<RoleGuard roles={['planner','owner']}><AppLayout role="owner"><CreateEventForm /></AppLayout></RoleGuard>} />
        <Route path="/owner/events/:eventId" element={<RoleGuard roles={['planner','owner']}><AppLayout role="owner"><OwnerEventDetail /></AppLayout></RoleGuard>} />
        <Route path="/owner/events/:eventId/tickets/new" element={<RoleGuard roles={['planner','owner']}><TicketTypeForm /></RoleGuard>} />
        <Route path="/owner/events/:eventId/checkins" element={<RoleGuard roles={['planner','owner']}><CheckInHistory /></RoleGuard>} />
        <Route path="/owner/models" element={<RoleGuard roles={['planner','owner']}><AppLayout role="owner"><OwnerModels /></AppLayout></RoleGuard>} />
        <Route path="/owner/models/invite" element={<RoleGuard roles={['planner','owner']}><ModelInviteForm /></RoleGuard>} />
        <Route path="/owner/staff" element={<RoleGuard roles={['planner','owner']}><AppLayout role="owner"><OwnerStaff /></AppLayout></RoleGuard>} />
        <Route path="/owner/staff/new" element={<RoleGuard roles={['planner','owner']}><StaffInviteForm /></RoleGuard>} />
        <Route path="/owner/earnings" element={<RoleGuard roles={['planner','owner']}><AppLayout role="owner"><OwnerEarnings /></AppLayout></RoleGuard>} />
        <Route path="/owner/settings" element={<RoleGuard roles={['planner','owner']}><AppLayout role="owner"><OwnerSettings /></AppLayout></RoleGuard>} />
        {/* Model & Gate */}
        <Route path="/model" element={<RoleGuard roles={['model']}><ModelDashboard /></RoleGuard>} />
        <Route path="/verify" element={<RoleGuard roles={['gate','planner','owner']}><VerificationPage /></RoleGuard>} />
        <Route path="/verify/:eventId" element={<RoleGuard roles={['gate','planner','owner']}><VerificationPage /></RoleGuard>} />
        {/* Buyer / Public */}
        <Route path="/events" element={<LiveEventsPage />} />
        <Route path="/event/:eventId" element={<PublicEventPage />} />
        <Route path="/tickets/:orderRef" element={<OrderRedownload />} />
      </Routes>
      <GlobalFloatingNav />
    </BrowserRouter>
  );
}
