import React, { useState, useEffect, useMemo } from 'react';
import { Link, useParams, useLocation, useNavigate } from 'react-router-dom';
import {
  Calendar, MapPin, Ticket as TicketIcon, Clock, Users, ArrowLeft,
  Search, Shield, Check, Plus, Minus, X, ArrowRight, Ban,
  Share2, Sparkles, Building2, Download, Copy, ExternalLink,
  CheckCircle2, AlertCircle, Printer, Bookmark
} from 'lucide-react';
import QRCode from 'qrcode';
import {
  NeuCard, Button, Input, Badge, CopyButton, CountdownTimer,
  SuccessCheckmark, ProgressBar, ThemeToggle, showToast
} from './ui';
import {
  mockEvents, mockTicketTypes, mockModels, formatNaira, formatDate,
  generateTicketCode, type Event, type TicketType, type Model
} from '../lib/data';
import { api, getStoredEvents, getStoredTicketTypes, getStoredOrders, saveStoredOrders } from '../lib/api';
import { TicketPass } from './TicketPass';

const TIcon = TicketIcon;

// ========================================
// QR CODE COMPONENT FOR TICKETS
// ========================================
export function TicketQR({ code, size = 160 }: { code: string; size?: number }) {
  const [qrUrl, setQrUrl] = useState<string>('');

  useEffect(() => {
    QRCode.toDataURL(`TIKITI:${code}`, {
      width: size,
      margin: 1,
      color: { dark: '#0F172A', light: '#FFFFFF' }
    }).then(setQrUrl).catch(console.error);
  }, [code, size]);

  if (!qrUrl) {
    return (
      <div
        className="flex items-center justify-center rounded-xl bg-white/10 animate-pulse"
        style={{ width: size, height: size }}
      >
        <span className="text-xs text-text-muted">Loading QR...</span>
      </div>
    );
  }

  return (
    <div className="p-2 bg-white rounded-xl inline-block shadow-md">
      <img src={qrUrl} alt={`QR Code for ${code}`} className="rounded-lg" width={size} height={size} />
    </div>
  );
}

// ========================================
// PUBLIC NAVIGATION HEADER (CONSISTENT WITH ALL PAGES)
// ========================================
export function PublicNavHeader({ activeTab = 'events' }: { activeTab?: 'events' | 'detail' }) {
  return (
    <header
      className="sticky top-0 z-50 backdrop-blur-xl"
      style={{
        backgroundColor: 'var(--card-bg)',
        borderBottom: '1px solid var(--shadow-dark)'
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 group">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 shadow-sm"
            style={{ backgroundColor: 'var(--accent)' }}
          >
            <TIcon size={18} color="white" />
          </div>
          <span
            className="text-xl"
            style={{ color: 'var(--text-primary)', fontFamily: "'Unlock', cursive", fontWeight: 400 }}
          >
            TiKeTi
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-6">
          <Link
            to="/events"
            className="text-sm font-semibold transition-colors hover:text-accent"
            style={{ color: activeTab === 'events' ? 'var(--accent)' : 'var(--text-primary)' }}
          >
            Live Events
          </Link>
          <a
            href="/#how-it-works"
            className="text-sm font-semibold transition-colors hover:text-accent"
            style={{ color: 'var(--text-secondary)' }}
          >
            How it Works
          </a>
          <Link
            to="/tickets/TKT-ORD-7K4M9XQ2"
            className="text-sm font-semibold transition-colors hover:text-accent"
            style={{ color: 'var(--text-secondary)' }}
          >
            Re-download Tickets
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link to="/owner">
            <Button size="sm" variant="secondary" className="hidden sm:inline-flex">
              Planner Login
            </Button>
          </Link>
          <Link to="/events">
            <Button size="sm" variant="primary">
              Buy Tickets
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}

// ========================================
// LIVE EVENTS & BUY TICKETS CATALOG PAGE
// ========================================
export function LiveEventsPage() {
  const [events, setEvents] = useState<Event[]>(() => {
    return getStoredEvents().filter(e => e.status === 'active');
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    api.events.list().then(list => {
      const active = list.filter(e => e.status === 'active');
      if (active.length > 0) setEvents(active);
    }).catch(() => {});
  }, []);

  // Build category chips dynamically from loaded events.
  // Trim, dedupe case-insensitively (keep first-seen casing), sort alphabetically.
  const categories = useMemo(() => {
    const seen = new Map<string, string>(); // lower -> original casing
    for (const evt of events) {
      const raw: string | undefined = (evt as any).category;
      if (!raw) continue;
      const trimmed = raw.trim();
      if (!trimmed) continue;
      const lower = trimmed.toLowerCase();
      if (!seen.has(lower)) seen.set(lower, trimmed);
    }
    const sorted = Array.from(seen.values()).sort((a, b) => a.localeCompare(b));
    return ['All', ...sorted];
  }, [events]);

  const filteredEvents = events.filter(evt => {
    const matchesSearch =
      evt.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      evt.venue.toLowerCase().includes(searchQuery.toLowerCase()) ||
      evt.description.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (selectedCategory === 'all') return true;

    // Case-insensitive match against event's category field
    const evtCategory = ((evt as any).category || '').trim().toLowerCase();
    return evtCategory === selectedCategory.toLowerCase();
  });

  return (
    <div className="min-h-screen pb-36" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <PublicNavHeader activeTab="events" />

      {/* Hero Section */}
      <section className="relative overflow-hidden py-10 sm:py-16 border-b" style={{ borderColor: 'var(--shadow-dark)' }}>
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(circle at 50% 0%, rgba(0, 229, 255, 0.08) 0%, transparent 70%)'
          }}
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full mb-4 neu-card-inset text-xs font-semibold uppercase tracking-wider text-accent">
              <span className="w-2 h-2 rounded-full animate-ping" style={{ backgroundColor: 'var(--accent)' }} />
              Live Ticket Box Office
            </div>

            <h1
              className="text-3xl sm:text-5xl font-bold leading-tight mb-4"
              style={{ color: 'var(--text-primary)', fontFamily: "'Unlock', cursive" }}
            >
              Live & Upcoming Events
            </h1>
            <p className="text-sm sm:text-base leading-relaxed mb-8" style={{ color: 'var(--text-secondary)' }}>
              Browse verified university events, parties, and galas. Select any event below to view its thumbnail poster, full event details, available ticket tiers, and proceed to instant bank transfer checkout.
            </p>

            {/* Search Bar */}
            <div className="max-w-xl mx-auto">
              <div className="relative flex items-center">
                <div className="absolute left-4.5 pointer-events-none z-10 flex items-center justify-center text-text-secondary">
                  <Search size={18} />
                </div>
                <input
                  type="text"
                  placeholder="Search events by name, campus, or venue..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="neu-input w-full text-sm font-medium transition-all"
                  style={{
                    borderRadius: '16px',
                    paddingLeft: '3.5rem',
                    paddingRight: searchQuery ? '2.75rem' : '1.25rem',
                    paddingTop: '0.875rem',
                    paddingBottom: '0.875rem'
                  }}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1.5 rounded-full text-text-secondary hover:text-text-primary transition-colors"
                    title="Clear search"
                  >
                    <X size={15} />
                  </button>
                )}
              </div>
            </div>

            {/* Category Filter Pills — built dynamically from loaded events */}
            <div className="flex items-center justify-center gap-2 mt-6 flex-wrap">
              {categories.map(cat => {
                const catId = cat === 'All' ? 'all' : cat;
                const isSelected = selectedCategory === catId;
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(catId)}
                    className={`neu-button px-4 py-2 text-xs font-semibold flex items-center gap-1.5 transition-all ${
                      isSelected ? 'active text-accent' : ''
                    }`}
                  >
                    {cat === 'All' && <Sparkles size={14} />}
                    <span>{cat}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Scrollable Events List / Grid */}
      <section className="py-10 sm:py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2
                className="text-xl sm:text-2xl font-bold"
                style={{ color: 'var(--text-primary)', fontFamily: "'Unlock', cursive" }}
              >
                Available Events ({filteredEvents.length})
              </h2>
              <p className="text-xs sm:text-sm text-text-secondary mt-0.5">
                Click any event to view full details, ticket types, and buy tickets.
              </p>
            </div>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-xs font-semibold text-accent hover:underline"
              >
                Clear filter
              </button>
            )}
          </div>

          {filteredEvents.length === 0 ? (
            <NeuCard className="text-center py-16">
              <Calendar size={48} className="mx-auto mb-3 opacity-30 text-accent" />
              <h3 className="text-lg font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
                No events found
              </h3>
              <p className="text-sm text-text-secondary max-w-sm mx-auto mb-6">
                We couldn't find any events matching "{searchQuery}". Try a different keyword or reset filters.
              </p>
              <Button onClick={() => { setSearchQuery(''); setSelectedCategory('all'); }} variant="primary" size="sm">
                View All Events
              </Button>
            </NeuCard>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredEvents.map((evt, idx) => {
                const tickets = mockTicketTypes.filter(t => t.eventId === evt.id && !t.archived);
                const minPrice = tickets.length > 0 ? Math.min(...tickets.map(t => t.price)) : 3000;
                const totalSold = tickets.reduce((s, t) => s + t.sold, 0);
                const posterImg = evt.posterUrl || evt.bannerUrl || '/posters/unifest_concert.jpg';

                return (
                  <Link
                    key={evt.id}
                    to={`/event/${evt.id}`}
                    className="block group focus:outline-none"
                  >
                    <NeuCard
                      delay={idx * 60}
                      className="p-0 overflow-hidden flex flex-col h-full hover:scale-[1.015] transition-all duration-300"
                    >
                      {/* Event Poster / Thumbnail */}
                      <div className="relative w-full aspect-[16/10] overflow-hidden bg-slate-900">
                        <img
                          src={posterImg}
                          alt={`${evt.name} Poster`}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          onError={(e) => {
                            // Fallback to unifest concert if local fails
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                        {/* Gradient shade */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                        {/* Date badge on top-left of poster */}
                        <div className="absolute top-3 left-3 px-3 py-1.5 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 text-white text-center">
                          <span className="block text-[10px] font-bold tracking-wider uppercase text-cyan-400">
                            {new Date(evt.eventDate).toLocaleDateString('en-NG', { month: 'short' })}
                          </span>
                          <span className="block text-base font-extrabold leading-none">
                            {new Date(evt.eventDate).toLocaleDateString('en-NG', { day: 'numeric' })}
                          </span>
                        </div>

                        {/* Status pill on top-right of poster */}
                        <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-emerald-500/90 text-white text-[11px] font-bold flex items-center gap-1 shadow-md">
                          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                          <span>Tickets Available</span>
                        </div>

                        {/* Starting price tag on poster bottom */}
                        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white">
                          <span className="text-xs bg-black/50 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/10">
                            From <span className="font-bold text-cyan-300">{formatNaira(minPrice)}</span>
                          </span>
                          <span className="text-xs text-white/80 flex items-center gap-1 bg-black/40 px-2 py-1 rounded-lg">
                            <Users size={12} />
                            <span>{evt.capacity} Capacity</span>
                          </span>
                        </div>
                      </div>

                      {/* Event Content & Brief Description */}
                      <div className="p-5 flex-1 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center gap-2 text-xs text-text-secondary mb-2">
                            <Calendar size={13} className="text-accent shrink-0" />
                            <span>{formatDate(evt.eventDate)}</span>
                            <span>•</span>
                            <Clock size={13} className="text-accent shrink-0" />
                            <span>
                              {new Date(evt.eventDate).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>

                          <h3
                            className="text-lg font-bold mb-2 group-hover:text-accent transition-colors line-clamp-1"
                            style={{ color: 'var(--text-primary)', fontFamily: "'Unlock', cursive" }}
                          >
                            {evt.name}
                          </h3>

                          {/* Brief Description */}
                          <p
                            className="text-xs leading-relaxed line-clamp-2 mb-4"
                            style={{ color: 'var(--text-secondary)' }}
                          >
                            {evt.description}
                          </p>

                          {/* Venue */}
                          <div className="flex items-start gap-2 text-xs text-text-secondary mb-4 bg-black/5 dark:bg-white/5 p-2 rounded-xl">
                            <MapPin size={14} className="text-accent shrink-0 mt-0.5" />
                            <span className="truncate">{evt.venue}</span>
                          </div>

                          {/* Ticket Types Chips */}
                          <div className="mb-4">
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary mb-1.5">
                              Available Ticket Types
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {tickets.slice(0, 3).map(tt => (
                                <span
                                  key={tt.id}
                                  className="text-[11px] px-2 py-0.5 rounded-md neu-card-inset text-text-primary font-medium"
                                >
                                  {tt.name} ({formatNaira(tt.price)})
                                </span>
                              ))}
                              {tickets.length > 3 && (
                                <span className="text-[11px] px-2 py-0.5 rounded-md bg-accent/10 text-accent font-medium">
                                  +{tickets.length - 3} more
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Bottom Action Area */}
                        <div className="pt-3 border-t border-[var(--shadow-dark)] flex items-center justify-between mt-auto">
                          <div>
                            <span className="text-[11px] text-text-muted block">Direct Transfer</span>
                            <span className="text-xs font-semibold text-emerald-500 flex items-center gap-1">
                              <Shield size={12} /> Instant QR
                            </span>
                          </div>

                          <span className="neu-button neu-button-primary px-3.5 py-1.5 text-xs font-semibold flex items-center gap-1.5 rounded-xl group-hover:opacity-90">
                            <span>Get Tickets</span>
                            <ArrowRight size={13} className="transition-transform group-hover:translate-x-1" />
                          </span>
                        </div>
                      </div>
                    </NeuCard>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Security & Verification Banner */}
      <section className="py-12 border-t" style={{ borderColor: 'var(--shadow-dark)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <NeuCard className="p-5 flex items-start gap-4">
              <div className="neu-card-inset w-12 h-12 rounded-2xl flex items-center justify-center shrink-0">
                <Shield size={22} className="text-accent" />
              </div>
              <div>
                <h4 className="text-sm font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
                  Cryptographic HMAC Gate Tickets
                </h4>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  Every ticket has a tamper-proof digital signature. Duplicate screenshots cannot pass the gate scanner.
                </p>
              </div>
            </NeuCard>

            <NeuCard className="p-5 flex items-start gap-4">
              <div className="neu-card-inset w-12 h-12 rounded-2xl flex items-center justify-center shrink-0">
                <Clock size={22} className="text-accent" />
              </div>
              <div>
                <h4 className="text-sm font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
                  Instant Virtual Account Transfer
                </h4>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  Pay via any Nigerian banking app to your dedicated virtual Providus account with 20-minute reservation.
                </p>
              </div>
            </NeuCard>

            <NeuCard className="p-5 flex items-start gap-4">
              <div className="neu-card-inset w-12 h-12 rounded-2xl flex items-center justify-center shrink-0">
                <Users size={22} className="text-accent" />
              </div>
              <div>
                <h4 className="text-sm font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
                  Model Referral Attribution
                </h4>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  Support your favorite campus ambassador by purchasing with their unique link or buy directly.
                </p>
              </div>
            </NeuCard>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--shadow-dark)' }} className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--accent)' }}>
              <TIcon size={14} color="white" />
            </div>
            <span className="text-sm font-bold" style={{ color: 'var(--text-primary)', fontFamily: "'Unlock', cursive" }}>
              TiKeTi
            </span>
            <span className="text-xs text-text-muted ml-2">© 2026 Nigerian Campus Ticketing</span>
          </div>

          <div className="flex items-center gap-4 text-xs font-medium text-text-secondary">
            <Link to="/tickets/TKT-ORD-7K4M9XQ2" className="hover:text-accent">Re-download Tickets</Link>
            <span>•</span>
            <Link to="/owner" className="hover:text-accent">Event Planner Dashboard</Link>
            <span>•</span>
            <Link to="/model" className="hover:text-accent">Model Ambassador View</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ========================================
// EVENT DETAILS & TICKET PURCHASE PAGE
// ========================================
export function PublicEventPage() {
  const { eventId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  // Load event by ID from storage or mock
  const [event, setEvent] = useState<Event>(() => {
    const list = getStoredEvents();
    return list.find(e => e.id === eventId) || mockEvents.find(e => e.id === eventId) || mockEvents[0];
  });

  const [cart, setCart] = useState<{ [key: string]: number }>({});
  const [showCheckout, setShowCheckout] = useState(false);

  // Referral link support: ?ref=CODE
  const refParam = new URLSearchParams(location.search).get('ref');
  const [refModel, setRefModel] = useState<Model | null>(null);
  const [refError, setRefError] = useState<string | null>(null);
  const isDirectSale = !refParam;

  useEffect(() => {
    const list = getStoredEvents();
    const found = list.find(e => e.id === eventId) || mockEvents.find(e => e.id === eventId);
    if (found) setEvent(found);
  }, [eventId]);

  useEffect(() => {
    if (!refParam) return;
    api.models.getByRef(refParam).then(result => {
      if (result.model && !result.inactive) {
        setRefModel(result.model);
      } else if (result.inactive) {
        setRefError(result.error || 'This ambassador referral link is no longer active.');
      } else {
        setRefError(result.error || 'Invalid referral code.');
      }
    });
  }, [refParam]);

  // Ticket types available for this event (from storage or mock)
  const baseTickets = (getStoredTicketTypes().filter(t => t.eventId === event.id && !t.archived).length > 0
    ? getStoredTicketTypes().filter(t => t.eventId === event.id && !t.archived)
    : mockTicketTypes.filter(t => t.eventId === event.id && !t.archived));

  // Expand gender-priced tickets into distinct male and female selections
  const availableTickets: TicketType[] = baseTickets.flatMap(t => {
    if (t.genderPricing) {
      return [
        {
          ...t,
          id: `${t.id}_male`,
          name: `${t.name} (Male)`,
          price: t.malePrice ?? t.price,
          gender: 'male' as const,
        },
        {
          ...t,
          id: `${t.id}_female`,
          name: `${t.name} (Female)`,
          price: t.femalePrice ?? t.price,
          gender: 'female' as const,
        },
      ];
    }
    return [t];
  });

  const addToCart = (ticketId: string) => {
    setCart(prev => ({ ...prev, [ticketId]: (prev[ticketId] || 0) + 1 }));
  };

  const removeFromCart = (ticketId: string) => {
    setCart(prev => {
      const n = { ...prev };
      if (n[ticketId] <= 1) delete n[ticketId];
      else n[ticketId]--;
      return n;
    });
  };

  const cartItems = Object.entries(cart).map(([id, qty]) => ({
    ...availableTickets.find(t => t.id === id)!,
    qty
  })).filter(i => i.id);

  const totalTicketsCount = cartItems.reduce((s, item) => s + item.qty, 0);
  const subtotal = cartItems.reduce((s, item) => s + (item.price * item.qty), 0);
  const fee = Math.min(subtotal * 0.015, 2000);
  const vat = fee * 0.075;
  const total = subtotal + fee + vat;

  const posterImg = event.posterUrl || event.bannerUrl || '/posters/unifest_concert.jpg';

  if (refError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <NeuCard className="max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 bg-red-500/10">
            <Ban size={32} className="text-red-500" />
          </div>
          <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
            Referral Link Inactive
          </h2>
          <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
            {refError}
          </p>
          <Link to={`/event/${event.id}`}>
            <Button variant="primary" className="w-full">
              Proceed Directly Without Referral
            </Button>
          </Link>
        </NeuCard>
      </div>
    );
  }

  if (showCheckout) {
    return (
      <CheckoutPage
        event={event}
        cartItems={cartItems}
        total={total}
        subtotal={subtotal}
        fee={fee + vat}
        isDirect={isDirectSale}
        model={refModel}
        onBack={() => setShowCheckout(false)}
      />
    );
  }

  return (
    <div className="min-h-screen pb-36" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <PublicNavHeader activeTab="detail" />

      {/* Back button and quick breadcrumb */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-5 pb-2">
        <Link
          to="/events"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-secondary hover:text-accent transition-colors"
        >
          <ArrowLeft size={14} />
          <span>Back to All Events</span>
        </Link>
      </div>

      {/* Hero Banner Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        <div className="relative rounded-3xl overflow-hidden neu-card p-0 border border-[var(--shadow-dark)]">
          {/* Background image & gradient overlay */}
          <div className="relative h-64 sm:h-80 md:h-96 w-full overflow-hidden bg-slate-900">
            <img
              src={posterImg}
              alt={event.name}
              className="w-full h-full object-cover opacity-80"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--card-bg)] via-black/60 to-black/30" />

            {/* Floating Top Pills */}
            <div className="absolute top-4 left-4 right-4 flex items-center justify-between flex-wrap gap-2">
              <span className="px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-xs font-semibold border border-white/10 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Live Ticket Sales
              </span>

              {/* Referral badge */}
              {refModel && (
                <span className="px-3.5 py-1.5 rounded-full bg-accent/90 text-white text-xs font-bold shadow-lg flex items-center gap-1.5">
                  <Sparkles size={13} />
                  <span>Ambassador Link: {refModel.name}</span>
                </span>
              )}
              {isDirectSale && (
                <span className="px-3 py-1 rounded-full bg-black/50 backdrop-blur-md text-white/90 text-xs font-medium border border-white/10">
                  Direct Ticket Purchase
                </span>
              )}
            </div>

            {/* Event Header Content Overlay */}
            <div className="absolute bottom-6 left-6 right-6 text-white">
              <h1
                className="text-2xl sm:text-4xl md:text-5xl font-bold leading-tight mb-3 drop-shadow-md"
                style={{ fontFamily: "'Unlock', cursive" }}
              >
                {event.name}
              </h1>

              <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-xs sm:text-sm text-white/90">
                <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10">
                  <Calendar size={15} className="text-cyan-400" />
                  <span>{formatDate(event.eventDate)}</span>
                </div>
                <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10">
                  <Clock size={15} className="text-cyan-400" />
                  <span>{new Date(event.eventDate).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 max-w-sm truncate">
                  <MapPin size={15} className="text-cyan-400 shrink-0" />
                  <span className="truncate">{event.venue}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main 2-Column Content */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
          {/* Left Column: Full Event Information & Guidelines */}
          <div className="lg:col-span-7 space-y-6">
            {/* Event Description Card */}
            <NeuCard className="p-6">
              <h2
                className="text-lg font-bold mb-3 flex items-center gap-2"
                style={{ color: 'var(--text-primary)', fontFamily: "'Unlock', cursive" }}
              >
                <Sparkles size={18} className="text-accent" />
                About This Event
              </h2>
              <p className="text-sm leading-relaxed whitespace-pre-line mb-6" style={{ color: 'var(--text-secondary)' }}>
                {event.description}
              </p>

              {/* Event Attributes Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 border-t border-[var(--shadow-dark)]">
                <div className="neu-card-inset p-3.5 rounded-xl">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary block mb-1">
                    Venue Location
                  </span>
                  <span className="text-xs font-semibold text-text-primary flex items-center gap-1">
                    <Building2 size={14} className="text-accent shrink-0" />
                    <span className="truncate">{event.venue}</span>
                  </span>
                </div>

                <div className="neu-card-inset p-3.5 rounded-xl">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary block mb-1">
                    Venue Capacity
                  </span>
                  <span className="text-xs font-semibold text-text-primary flex items-center gap-1">
                    <Users size={14} className="text-accent shrink-0" />
                    <span>{event.capacity.toLocaleString()} Attendees</span>
                  </span>
                </div>
              </div>
            </NeuCard>

            {/* Gate Verification & Security Guarantee */}
            <NeuCard className="p-6">
              <h3
                className="text-sm font-bold mb-3 flex items-center gap-2 text-accent"
                style={{ fontFamily: "'Unlock', cursive" }}
              >
                <Shield size={16} />
                Gate Verification & Anti-Fraud Guarantee
              </h3>
              <div className="space-y-3 text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                  <p>
                    <strong>HMAC Digital QR Code:</strong> Each ticket is digitally signed. Staff scanners at the gate verify authenticity in under 0.2s.
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                  <p>
                    <strong>Atomic Check-in:</strong> Tickets are single-use only. Duplicate copies or shared screenshots are instantly flagged at the turnstile.
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                  <p>
                    <strong>Instant Virtual Account:</strong> Powered by Monnify/Providus virtual accounts. Bank transfers are detected and verified automatically.
                  </p>
                </div>
              </div>
            </NeuCard>

            {/* Ambassador Referral Card if present */}
            {refModel && (
              <NeuCard className="p-5 neu-card-inset">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center bg-accent/20 text-accent font-bold">
                    {refModel.name.charAt(0)}
                  </div>
                  <div>
                    <span className="text-[11px] uppercase tracking-wider font-semibold text-text-secondary block">
                      Referred by Model Ambassador
                    </span>
                    <span className="text-sm font-bold text-text-primary">
                      {refModel.name} <code className="text-xs font-mono text-accent">({refModel.referralCode})</code>
                    </span>
                  </div>
                </div>
              </NeuCard>
            )}
          </div>

          {/* Right Column: Available Ticket Types & Order Flow */}
          <div className="lg:col-span-5 space-y-6">
            <NeuCard className="p-5 sm:p-6 sticky top-20">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-[var(--shadow-dark)]">
                <div>
                  <h2
                    className="text-base font-bold"
                    style={{ color: 'var(--text-primary)', fontFamily: "'Unlock', cursive" }}
                  >
                    Select Available Tickets
                  </h2>
                  <p className="text-xs text-text-secondary">
                    Choose quantity for each ticket type
                  </p>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-full neu-card-inset font-semibold text-accent">
                  {availableTickets.length} Types
                </span>
              </div>

              {/* Scrollable list of available ticket types */}
              <div className="space-y-3 mb-6">
                {availableTickets.map(tt => {
                  const remaining = Math.max(tt.quantity - tt.sold, 0);
                  const inCart = cart[tt.id] || 0;

                  return (
                    <div
                      key={tt.id}
                      className={`p-4 rounded-2xl transition-all border ${
                        inCart > 0
                          ? 'neu-card-inset border-accent/40'
                          : 'neu-card border-[var(--shadow-dark)]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                            {tt.name}
                          </h3>
                          <div className="flex items-center gap-2 mt-0.5 text-xs text-text-secondary">
                            <span className="font-extrabold text-accent text-sm">
                              {formatNaira(tt.price)}
                            </span>
                            <span>•</span>
                            <span className="px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10 text-[10px] font-semibold">
                              Admits {tt.admits} {tt.admits > 1 ? 'people' : 'person'}
                            </span>
                          </div>
                        </div>

                        {/* Remaining Quota */}
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold text-text-muted bg-black/5 dark:bg-white/5">
                          {remaining} left
                        </span>
                      </div>

                      {/* Quantity Controls - Always Visible High-Contrast Stepper */}
                      <div className="flex items-center justify-between pt-3 mt-3 border-t border-[var(--shadow-dark)]">
                        <div>
                          <span className="text-xs block" style={{ color: inCart > 0 ? 'var(--accent)' : 'var(--text-secondary)' }}>
                            {inCart > 0 ? (
                              <span className="font-bold">
                                Subtotal: {formatNaira(tt.price * inCart)}
                              </span>
                            ) : (
                              <span className="font-medium text-xs">Quantity</span>
                            )}
                          </span>
                          {inCart > 0 && (
                            <span className="text-[10px] text-text-muted">
                              {inCart} × {formatNaira(tt.price)}
                            </span>
                          )}
                        </div>

                        {/* Always visible, high-contrast tactile quantity stepper */}
                        <div
                          className="flex items-center gap-1.5 p-1 rounded-xl"
                          style={{
                            backgroundColor: 'rgba(0, 0, 0, 0.04)',
                            border: '1.5px solid var(--shadow-dark)',
                          }}
                        >
                          {/* Minus Button - ALWAYS VISIBLE */}
                          <button
                            type="button"
                            onClick={() => removeFromCart(tt.id)}
                            disabled={inCart === 0}
                            className={`rounded-lg flex items-center justify-center transition-all ${
                              inCart > 0
                                ? 'text-red-500 hover:bg-red-500/10 cursor-pointer shadow-sm active:scale-95'
                                : 'text-gray-400 opacity-25 cursor-not-allowed'
                            }`}
                            style={{
                              minHeight: '34px',
                              height: '34px',
                              width: '34px',
                              backgroundColor: inCart > 0 ? 'var(--card-bg)' : 'transparent',
                              border: inCart > 0 ? '1px solid var(--shadow-dark)' : '1px solid transparent',
                            }}
                            aria-label="Decrease quantity"
                            title="Decrease quantity"
                          >
                            <Minus size={16} strokeWidth={2.5} />
                          </button>

                          {/* Selected Quantity Display */}
                          <div
                            className="w-7 text-center font-extrabold text-sm select-none"
                            style={{ color: inCart > 0 ? 'var(--accent)' : 'var(--text-primary)' }}
                          >
                            {inCart}
                          </div>

                          {/* Plus Button - ALWAYS VISIBLE with high-contrast accent */}
                          <button
                            type="button"
                            onClick={() => addToCart(tt.id)}
                            disabled={remaining <= 0 || inCart >= remaining}
                            className="rounded-lg flex items-center justify-center transition-all shadow-md hover:brightness-110 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                            style={{
                              minHeight: '34px',
                              height: '34px',
                              width: '34px',
                              backgroundColor: 'var(--accent)',
                              color: '#FFFFFF',
                            }}
                            aria-label="Increase quantity"
                            title="Increase quantity"
                          >
                            <Plus size={16} strokeWidth={2.5} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Order Summary Box */}
              {cartItems.length > 0 ? (
                <div className="neu-card-inset p-4 rounded-2xl space-y-3 animate-fade-up">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-text-secondary">
                    Order Summary ({totalTicketsCount} tickets)
                  </h4>

                  <div className="space-y-1.5 text-xs">
                    {cartItems.map(item => (
                      <div key={item.id} className="flex justify-between items-center text-text-primary">
                        <span>
                          {item.name} × {item.qty}
                        </span>
                        <span className="font-semibold">
                          {formatNaira(item.price * item.qty)}
                        </span>
                      </div>
                    ))}

                    <div className="pt-2 border-t border-[var(--shadow-dark)] flex justify-between text-text-secondary text-[11px]">
                      <span>Platform & Monnify Fee</span>
                      <span>{formatNaira(fee + vat)}</span>
                    </div>

                    <div className="pt-2 border-t border-[var(--shadow-dark)] flex justify-between items-center text-sm font-bold text-text-primary">
                      <span>Total Amount</span>
                      <span className="text-base text-accent font-extrabold">
                        {formatNaira(total)}
                      </span>
                    </div>
                  </div>

                  <Button
                    variant="primary"
                    className="w-full mt-3 py-3.5 text-sm font-bold flex items-center justify-center gap-2"
                    onClick={() => setShowCheckout(true)}
                  >
                    <span>Proceed to Buy</span>
                    <ArrowRight size={16} />
                  </Button>
                  <p className="text-[10px] text-center text-text-muted mt-1">
                    Instant Bank Transfer • 20-min Reservation Guarantee
                  </p>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-black/5 dark:bg-white/5 text-center text-xs text-text-secondary">
                  <TicketIcon size={24} className="mx-auto mb-2 text-accent opacity-50" />
                  Select at least 1 ticket to proceed to payment.
                </div>
              )}
            </NeuCard>
          </div>
        </div>
      </section>
    </div>
  );
}

// ========================================
// CHECKOUT PAGE & PAYMENT STEP
// ========================================
export function CheckoutPage({
  event,
  cartItems,
  total,
  subtotal,
  fee,
  isDirect,
  model,
  onBack
}: {
  event: Event;
  cartItems: any[];
  total: number;
  subtotal: number;
  fee: number;
  isDirect: boolean;
  model: any;
  onBack: () => void;
}) {
  const navigate = useNavigate();
  const [step, setStep] = useState<'details' | 'payment'>('details');
  const [buyerName, setBuyerName] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [orderRef] = useState('TKT-ORD-' + generateTicketCode().replace(' ', ''));
  const expiresAt = new Date(Date.now() + 20 * 60000).toISOString();

  const handleConfirmTransfer = () => {
    // Generate individual tickets for each cart item
    const generatedTickets = cartItems.flatMap((item, idx) =>
      Array.from({ length: item.qty }, (_, i) => ({
        id: `tkt_${orderRef.replace(/[^a-zA-Z0-9]/g, '')}_${idx}_${i}`,
        orderRef,
        code: generateTicketCode(),
        type: item.name,
        admits: item.admits || 1,
        gender: item.gender,
        ticketImageUrl: item.imageUrl || item.ticket_image_url || event.posterUrl || event.bannerUrl || '/posters/unifest_concert.jpg',
        eventName: event.name,
        eventVenue: event.venue,
        eventDate: event.eventDate,
        buyerName: buyerName.trim(),
        buyerEmail: buyerEmail.trim(),
        createdAt: new Date().toISOString()
      }))
    );

    const orderId = 'ord_' + Date.now();
    const orderRecord = {
      id: orderId,
      reference: orderRef,
      eventId: event.id,
      eventName: event.name,
      modelId: model?.id || '',
      buyerName: buyerName.trim(),
      buyerEmail: buyerEmail.trim(),
      buyerPhone: buyerPhone.trim(),
      subtotal,
      fee,
      total,
      ticketPrice: subtotal,
      serviceFee: fee,
      paymentReference: 'MNF-' + orderRef,
      expiresAt: expiresAt,
      status: 'paid' as const,
      createdAt: new Date().toISOString(),
      event,
      lines: cartItems.map((item, idx) => ({
        id: `line_${orderId}_${idx}`,
        orderId,
        ticketTypeId: item.id,
        ticketTypeName: item.name,
        quantity: item.qty,
        price: item.price,
        total: item.price * item.qty,
        admits: item.admits || 1,
        gender: item.gender,
        imageUrl: item.imageUrl || item.ticket_image_url || event.posterUrl || event.bannerUrl || ''
      })),
      tickets: generatedTickets
    };

    // Cache order under dedicated key for direct instant retrieval on reload/lost connection
    try {
      localStorage.setItem('tikiti_order_' + orderRef, JSON.stringify({ order: orderRecord, tickets: generatedTickets }));
    } catch (e) {
      console.error(e);
    }

    // Add to stored orders list
    const stored = getStoredOrders();
    saveStoredOrders([orderRecord, ...stored.filter(o => o.reference !== orderRef)]);

    showToast('Payment confirmed! Opening your tickets...', 'success');
    navigate('/tickets/' + orderRef);
  };

  if (step === 'payment') {
    return (
      <div className="min-h-screen py-8 px-4 pb-36" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <div className="max-w-lg mx-auto">
          <button
            onClick={() => setStep('details')}
            className="flex items-center gap-1.5 text-xs font-semibold text-text-secondary hover:text-accent mb-6"
          >
            <ArrowLeft size={16} /> Back to details
          </button>

          <NeuCard className="p-6 sm:p-7 mb-6">
            <div className="text-center mb-6">
              <span className="text-xs px-3 py-1 rounded-full neu-card-inset font-semibold text-accent">
                Step 2: Bank Transfer
              </span>
              <h2
                className="text-xl sm:text-2xl font-bold mt-2"
                style={{ color: 'var(--text-primary)', fontFamily: "'Unlock', cursive" }}
              >
                Pay via Bank Transfer
              </h2>
              <p className="text-xs text-text-secondary mt-1">
                Transfer the exact amount to your assigned Providus virtual account.
              </p>
            </div>

            {/* Virtual Account Box */}
            <div className="neu-card-inset p-5 rounded-2xl mb-5 space-y-4">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary block mb-1">
                  Bank Name
                </span>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-text-primary">Providus Bank</span>
                  <CopyButton text="Providus Bank" label="Copy" />
                </div>
              </div>

              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary block mb-1">
                  Virtual Account Number
                </span>
                <div className="flex items-center justify-between">
                  <span className="text-xl font-mono font-bold tracking-wider text-accent">
                    7294018563
                  </span>
                  <CopyButton text="7294018563" label="Copy Account" />
                </div>
              </div>

              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary block mb-1">
                  Exact Amount to Pay
                </span>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-emerald-500">
                    {formatNaira(total)}
                  </span>
                  <CopyButton text={total.toString()} label="Copy Amount" />
                </div>
              </div>

              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary block mb-1">
                  Account Name
                </span>
                <span className="text-xs font-semibold text-text-primary">
                  TiKeTi Events Ltd / Monnify
                </span>
              </div>
            </div>

            {/* Countdown Reservation Notice */}
            <div className="flex items-center justify-between p-3.5 rounded-xl neu-card-inset mb-5">
              <div>
                <span className="text-xs font-semibold text-text-primary block">
                  Time Remaining
                </span>
                <span className="text-[10px] text-text-secondary">
                  Tickets held until timer expires
                </span>
              </div>
              <CountdownTimer expiresAt={expiresAt} />
            </div>

            {/* Order Recap */}
            <div className="neu-card-inset p-3.5 rounded-xl text-xs space-y-1.5 mb-5">
              <div className="flex justify-between text-text-secondary">
                <span>Reference:</span>
                <span className="font-mono font-bold text-text-primary">{orderRef}</span>
              </div>
              <div className="flex justify-between text-text-secondary">
                <span>Event:</span>
                <span className="font-semibold text-text-primary truncate ml-2">{event.name}</span>
              </div>
              <div className="flex justify-between text-text-secondary">
                <span>Buyer:</span>
                <span className="text-text-primary">{buyerName}</span>
              </div>
              <div className="flex justify-between text-text-secondary">
                <span>Ambassador Attribution:</span>
                <span className="text-accent font-semibold">{isDirect ? 'Direct (None)' : model?.name || 'Ambassador'}</span>
              </div>
            </div>

            <Button
              variant="primary"
              className="w-full py-3.5 font-bold text-sm"
              onClick={handleConfirmTransfer}
            >
              I Have Sent The Transfer — View Tickets
            </Button>
          </NeuCard>
        </div>
      </div>
    );
  }

  // Step 1: Buyer Information Form
  return (
    <div className="min-h-screen py-8 px-4 pb-36" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <div className="max-w-lg mx-auto">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-semibold text-text-secondary hover:text-accent mb-6"
        >
          <ArrowLeft size={16} /> Back to tickets
        </button>

        <NeuCard className="p-6 sm:p-7">
          <div className="text-center mb-6">
            <span className="text-xs px-3 py-1 rounded-full neu-card-inset font-semibold text-accent">
              Step 1: Contact Details
            </span>
            <h2
              className="text-xl sm:text-2xl font-bold mt-2"
              style={{ color: 'var(--text-primary)', fontFamily: "'Unlock', cursive" }}
            >
              Buyer Information
            </h2>
            <p className="text-xs text-text-secondary mt-1">
              Your tickets will open on-screen immediately upon payment for download. Save the order link to reopen them anytime.
            </p>
          </div>

          <div className="space-y-4 mb-6">
            <Input
              label="Full Name"
              placeholder="e.g. Oluwaseun Adeleke"
              value={buyerName}
              onChange={setBuyerName}
            />

            <Input
              label="Email Address"
              type="email"
              placeholder="e.g. seun@example.com"
              value={buyerEmail}
              onChange={setBuyerEmail}
              hint="For receipt and lookup. (Tickets will open on-screen immediately for instant download; no email sent)."
            />

            <Input
              label="Phone Number"
              placeholder="e.g. 08012345678"
              value={buyerPhone}
              onChange={setBuyerPhone}
            />
          </div>

          {/* Cart Breakdown */}
          <div className="neu-card-inset p-4 rounded-2xl space-y-2 text-xs mb-6">
            <h4 className="font-bold uppercase tracking-wider text-text-secondary">
              Tickets in Cart
            </h4>
            {cartItems.map(item => (
              <div key={item.id} className="flex justify-between items-center text-text-primary">
                <span>{item.name} × {item.qty}</span>
                <span className="font-semibold">{formatNaira(item.price * item.qty)}</span>
              </div>
            ))}
            <div className="pt-2 border-t border-[var(--shadow-dark)] flex justify-between text-text-secondary">
              <span>Service Fee</span>
              <span>{formatNaira(fee)}</span>
            </div>
            <div className="pt-1 flex justify-between text-sm font-bold text-text-primary">
              <span>Total to Pay</span>
              <span className="text-accent text-base">{formatNaira(total)}</span>
            </div>
          </div>

          {/* Referral disclosure */}
          {isDirect ? (
            <div className="p-3 rounded-xl bg-black/5 dark:bg-white/5 text-xs text-text-secondary mb-6">
              Direct purchase: No model referral code was applied.
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-accent/10 text-xs text-accent font-medium mb-6 flex items-center gap-2">
              <Sparkles size={14} />
              <span>Attributed to ambassador: <strong>{model?.name}</strong></span>
            </div>
          )}

          <Button
            variant="primary"
            className="w-full py-3.5 font-bold text-sm"
            disabled={!buyerName || !buyerEmail || !buyerPhone}
            onClick={() => setStep('payment')}
          >
            Continue to Bank Transfer — {formatNaira(total)}
          </Button>
        </NeuCard>
      </div>
    </div>
  );
}

// ========================================
// PAYMENT SUCCESS & TICKET DELIVERY
// ========================================
export function PaymentSuccess({
  event,
  cartItems,
  orderRef
}: {
  event: Event;
  cartItems: any[];
  orderRef: string;
}) {
  const tickets = cartItems.flatMap((item, idx) =>
    Array.from({ length: item.qty }, (_, i) => ({
      id: `${item.id}_${i}`,
      code: generateTicketCode(),
      type: item.name,
      admits: item.admits || 1,
      gender: item.gender,
      ticketImageUrl: item.imageUrl || item.ticket_image_url || event.posterUrl || event.bannerUrl || '/posters/unifest_concert.jpg',
      eventName: event.name,
      eventVenue: event.venue,
      eventDate: event.eventDate
    }))
  );

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
      showToast('QR code downloaded', 'success');
    }).catch(console.error);
  };

  const retrievalUrl = `${window.location.origin}/tickets/${orderRef}`;

  return (
    <div className="min-h-screen py-10 px-4 pb-36 print-page" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <div className="max-w-3xl mx-auto">
        <div className="no-print text-center mb-8">
          <SuccessCheckmark />
          <h1
            className="text-2xl sm:text-3xl font-bold mt-4"
            style={{ color: 'var(--text-primary)', fontFamily: "'Unlock', cursive" }}
          >
            Payment Confirmed!
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Your tickets for <strong>{event.name}</strong> are generated and ready for gate check-in.
          </p>
        </div>

        {/* Persistent Retrieval Link Alert Banner */}
        <div className="no-print mb-6 p-4 rounded-2xl neu-card-inset border border-accent/40 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-accent text-white shrink-0 mt-0.5">
                <Bookmark size={16} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-text-primary">
                  Permanent Ticket Retrieval Link
                </h3>
                <p className="text-xs text-text-secondary">
                  Lost connection or closed the page? Save or bookmark this link to re-download your tickets anytime.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-center">
              <CopyButton text={retrievalUrl} label="Copy Link" />
              <button
                onClick={() => window.print()}
                className="neu-button neu-button-primary px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 text-white"
              >
                <Printer size={14} /> Print / Save PDF
              </button>
            </div>
          </div>
          <div className="pt-2 border-t border-[var(--shadow-dark)] flex items-center justify-between text-xs text-text-secondary">
            <span>Order Reference: <strong className="font-mono text-accent">{orderRef}</strong></span>
            <span>{tickets.length} {tickets.length > 1 ? 'Tickets' : 'Ticket'} Ready</span>
          </div>
        </div>

        {/* Printable Ticket Passes: Vertical Full Original Party Artwork + Minimal White Stub */}
        <div className="space-y-8 mb-8 flex flex-col items-center">
          {tickets.map((t, idx) => (
            <TicketPass
              key={t.id}
              ticket={{
                ...t,
                index: idx,
                totalTickets: tickets.length,
                orderRef,
              }}
            />
          ))}
        </div>

        <div className="no-print flex flex-col sm:flex-row gap-3">
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
    </div>
  );
}
