# TiKiTI - Complete Project Structure

## 📁 Project Files Overview

### Frontend (React + Vite + TypeScript)
```
src/
├── App.tsx                    # All screens (1,324 lines)
│   ├── Landing Page           # Full marketing page with flow explanation
│   ├── Admin Dashboard        # Platform oversight
│   ├── Owner Dashboard        # Event management
│   ├── Model Dashboard        # Seller stats (masked leaderboard)
│   ├── Gate Verification      # QR scan + code input
│   ├── Buyer Flow             # Event → Cart → Payment → Success
│   ├── Admin Login            # 2FA authentication
│   └── All Forms              # Event, ticket, model, staff creation
│
├── components/
│   └── ui.tsx                 # Reusable components (mobile-optimized)
│       ├── BentoCard          # Dashboard cards
│       ├── StatCard           # Animated stat displays
│       ├── Button             # Touch-optimized buttons
│       ├── Input              # Mobile-friendly inputs
│       ├── Badge              # Status indicators
│       ├── Toast              # Notifications
│       ├── CountdownTimer     # Payment countdown
│       ├── ProgressBar        # Capacity tracking
│       ├── TabNav             # Responsive tabs
│       └── MobileBottomNav    # Mobile navigation
│
├── lib/
│   └── data.ts                # Mock data + utilities
│       ├── Events, Tickets, Orders, Models
│       ├── Direct sales handling (modelId = '')
│       └── Format helpers (Naira, dates)
│
├── index.css                  # Design system
│   ├── Tailwind v4 config
│   ├── Mobile bottom nav styles
│   ├── Animations (fade-up, count-up)
│   └── Responsive breakpoints
│
└── main.tsx                   # Entry point + service worker

public/
├── manifest.json              # PWA manifest
├── sw.js                      # Service worker
└── icon.svg                   # App icon
```

### Backend (Fastify + TypeScript)
```
server/
├── src/
│   ├── index.ts               # Main server (Fastify setup)
│   │
│   ├── routes/
│   │   ├── auth.ts            # Login, register, JWT
│   │   ├── events.ts          # Event CRUD + stats
│   │   ├── orders.ts          # Order creation + Monnify
│   │   ├── models.ts          # Model management + dashboard
│   │   ├── staff.ts           # Gate staff management
│   │   ├── verify.ts          # Ticket verification (QR + code)
│   │   ├── admin.ts           # Platform admin routes
│   │   └── webhooks.ts        # Monnify payment webhooks
│   │
│   ├── services/
│   │   └── monnify.ts         # Monnify API integration
│   │       ├── Auth token management
│   │       ├── Virtual account creation
│   │       ├── Fee calculation
│   │       └── Payment verification
│   │
│   └── utils/
│       ├── codes.ts           # Code generation (Crockford Base32)
│       └── tickets.ts         # QR generation + HMAC signing
│
├── tests/
│   ├── verify.test.ts         # Verification tests
│   └── orders.test.ts         # Order + overselling tests
│
├── package.json               # Backend dependencies
└── tsconfig.json              # TypeScript config
```

### Database (Supabase Postgres)
```
database/
└── schema.sql                 # Complete schema (500+ lines)
    ├── users                  # All roles (admin, owner, staff, buyer)
    ├── events                 # Event details
    ├── ticket_types           # Ticket categories
    ├── models                 # Sellers with referral codes
    ├── model_tokens           # Dashboard access tokens
    ├── orders                 # Purchase records
    ├── order_lines            # Individual ticket purchases
    ├── tickets                # Generated tickets with QR
    ├── staff_assignments      # Gate staff event access
    ├── payouts                # Settlement records
    ├── platform_settings      # Configurable fees
    ├── audit_logs             # Action history
    ├── Indexes                # Performance optimization
    └── RLS Policies           # Security (service role bypass)
```

### Configuration & Documentation
```
├── README.md                  # Complete documentation
├── .env.example               # Environment variables template
├── .gitignore                 # Git ignore rules
├── package.json               # Frontend dependencies
├── vite.config.js             # Vite configuration
├── tsconfig.json              # TypeScript config
└── index.html                 # HTML shell (mobile-optimized)
```

## 🎯 Key Features Implemented

### 1. **Mobile Responsiveness**
- ✅ Bottom navigation (screens < 1024px)
- ✅ Responsive sidebar (hamburger menu)
- ✅ Touch-optimized buttons (44px min)
- ✅ Card view for tables on mobile
- ✅ Safe area insets for iOS
- ✅ Prevents zoom on input focus

### 2. **Direct Sales Handling**
- ✅ Referral link detection (`?ref=TKT-AX7M`)
- ✅ Direct sales recording (`modelId = ''`)
- ✅ Visual indicators for direct vs model sales
- ✅ Sales source breakdown in dashboard
- ✅ Full tracking without attribution

### 3. **Landing Page**
- ✅ Hero section with CTA
- ✅ "How It Works" - 4 roles explained
- ✅ "Complete Flow" - 5-step process
- ✅ "Direct Sales" explanation
- ✅ Feature highlights
- ✅ Quick access grid

### 4. **Payment Integration**
- ✅ Monnify virtual accounts
- ✅ 20-minute payment window
- ✅ Webhook signature validation
- ✅ Fee calculation (1.5% capped at ₦2000 + 7.5% VAT + 5% platform)
- ✅ Order expiry handling
- ✅ Reconciliation endpoint

### 5. **Ticket Verification**
- ✅ QR code scanning
- ✅ Manual code entry
- ✅ HMAC-signed QR codes (forgery detection)
- ✅ Atomic check-in (prevent double-scan)
- ✅ Rate limiting (10 attempts/minute)
- ✅ Live counters

### 6. **Security**
- ✅ Service role key only on backend
- ✅ RLS enabled on all tables
- ✅ JWT authentication
- ✅ Rate limiting on all endpoints
- ✅ Input validation (Zod)
- ✅ Helmet.js security headers
- ✅ CORS strict policy
- ✅ Audit logging

### 7. **Performance**
- ✅ 74.49 KB gzipped JS (under 200KB budget)
- ✅ Lazy-loaded routes
- ✅ Self-hosted fonts
- ✅ CSS animations
- ✅ Service worker caching
- ✅ Mobile-first design

## 🚀 Build Output

```
dist/
├── index.html                 # 1.70 KB
├── assets/
│   ├── index-*.css            # 34.97 KB (7.32 KB gzipped)
│   └── index-*.js             # 261.99 KB (74.49 KB gzipped)
└── manifest.json              # PWA manifest
```

## 📊 Database Schema Highlights

### Key Tables
- **users**: All roles with status tracking
- **events**: Event details with capacity
- **ticket_types**: Categories with admits count
- **models**: Sellers with referral codes
- **orders**: Purchases with direct sales support
- **tickets**: Generated with HMAC-signed QR
- **audit_logs**: Complete action history

### Indexes
- 15+ performance indexes
- Optimized for common queries
- Foreign key relationships

### Security
- RLS enabled on all tables
- Service role bypass for backend
- No public policies

## 🧪 Test Coverage

### Verification Tests
- ✅ Ticket code generation (Crockford Base32)
- ✅ QR signature validation
- ✅ Tampered payload detection

### Order Tests
- ✅ Fee calculation (Monnify + VAT + platform)
- ✅ Overselling prevention
- ✅ Capacity validation (people count)
- ✅ Order expiry handling

## 📝 Environment Variables

```env
# Frontend
VITE_API_URL=http://localhost:3001

# Backend
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# Supabase
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...

# Monnify
MONNIFY_API_KEY=...
MONNIFY_SECRET_KEY=...
MONNIFY_CONTRACT_CODE=...
MONNIFY_WEBHOOK_SECRET=...

# Security
JWT_SECRET=...
QR_HMAC_SECRET=...
```

## 🎨 Design System

### Colors
- Canvas: `#F8F9FA`
- Navy (accent): `#1B2A4A`
- Border: `#E2E8F0`
- Success: `#059669`
- Warning: `#D97706`
- Error: `#DC2626`

### Typography
- Font: Inter (self-hosted)
- Scale: 24px headings, 14px body, 12px captions
- 4px grid system

### Components
- Cards: 14px radius, 1px border, soft shadow
- Buttons: 40px min-height, touch-optimized
- Inputs: 40px min-height, mobile-friendly
- Badges: Status indicators

## 📱 Mobile Features

### Bottom Navigation
- Shows first 5 menu items
- Active state highlighting
- Smooth transitions

### Responsive Layout
- Sidebar slides in on mobile
- Cards stack vertically
- Tables become scrollable cards
- Touch targets minimum 44px

### iOS Optimizations
- Safe area insets
- Prevents zoom on input focus
- 16px font size on inputs

## 🔐 Security Features

### Authentication
- JWT tokens with httpOnly cookies
- 2FA for admin login
- Model tokens (no login required)
- Rate limiting on all endpoints

### Data Protection
- Service role key never exposed
- RLS on all tables
- HMAC-signed QR codes
- Atomic operations (prevent race conditions)

### Audit Trail
- All sensitive actions logged
- User, action, entity, details
- IP address and user agent
- Timestamp tracking

## 🎯 Complete Feature List

### Platform Admin
- ✅ Dashboard with stats
- ✅ Event owner management
- ✅ All events view
- ✅ Orders tracking
- ✅ Payouts management
- ✅ Platform settings
- ✅ Audit log viewer
- ✅ 2FA login

### Event Owner
- ✅ Create/edit events
- ✅ Ticket type management
- ✅ Model invitation
- ✅ Gate staff management
- ✅ Sales dashboard
- ✅ Earnings tracking
- ✅ Check-in history
- ✅ Export to CSV

### Model (Seller)
- ✅ No login (token-based)
- ✅ Personal referral link
- ✅ Sales tracking
- ✅ Masked leaderboard
- ✅ Revenue stats
- ✅ Share buttons

### Gate Staff
- ✅ QR code scanning
- ✅ Manual code entry
- ✅ Real-time verification
- ✅ Live counters
- ✅ Check-in history
- ✅ Undo capability

### Buyer
- ✅ Public event pages
- ✅ Ticket selection
- ✅ Cart management
- ✅ Monnify payments
- ✅ Payment countdown
- ✅ QR-coded tickets
- ✅ Re-download capability

### Direct Sales
- ✅ No referral link detection
- ✅ Separate recording
- ✅ Dashboard breakdown
- ✅ Full tracking

## 📦 Dependencies

### Frontend
- React 18
- TypeScript
- Vite
- Tailwind CSS v4
- React Router v6
- Lucide React
- date-fns
- uuid

### Backend
- Fastify
- TypeScript
- Supabase JS
- Monnify API
- Zod (validation)
- JWT
- bcrypt
- QRCode
- Sharp (image processing)

## 🚀 Deployment

### Frontend
```bash
npm run build
# Deploy dist/ to Vercel/Netlify
```

### Backend
```bash
cd server
npm run build
# Deploy to Railway/Fly.io
```

### Database
- Already hosted on Supabase
- Run schema.sql in SQL editor
- Configure environment variables

## 📞 Support

For issues, questions, or contributions, contact the development team.

---

**TiKiTI** - Secure, fast, and built for Nigerian university events.
