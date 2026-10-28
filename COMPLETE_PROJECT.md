# TiKiTI - Complete Project Documentation

## 🎨 Design Update: Neumorphic (Soft UI)

The entire UI has been redesigned with a modern **Neumorphic design system** featuring:

### Design Features
- **Poppins Font** - Clean, modern typography
- **Light/Dark Mode** - Smooth toggle with localStorage persistence
- **Neumorphic Shadows** - Soft, extruded UI elements
- **Canvas Animations** - Dynamic ticket selling and verification visualization
- **Smooth Transitions** - All elements animate with 0.3s ease

### Color Schemes

**Light Mode (Default)**
- Background: `#E6E9EF` (Soft light gray-blue)
- Text: `#1E2530` (Deep charcoal)
- Accent: `#3A76F0` (Vibrant digital blue)
- Shadows: White highlight + `#C0C5D1` dark shadow

**Dark Mode**
- Background: `#1E222B` (Dark slate)
- Text: `#F3F4F6` (Crisp off-white)
- Accent: `#00E5FF` (Neon cyan)
- Shadows: `#2A303D` light + `#121419` dark

## 🔄 Navigation Restructure

### Public Navigation (Landing Page)
Only **2 public roles** are accessible from the landing page:

1. **Event Planner** (`/owner`) - Create and manage events
2. **Buy Tickets** (`/event/:id`) - Purchase tickets

**Removed from public view:**
- ❌ Admin Dashboard
- ❌ Model Dashboard
- ❌ Gate Verification

These are now **private routes** accessible only through:
- Event Planner invites models and creates gate staff
- Admin login page (linked in footer)
- Direct URL access (for testing)

### Terminology Update
- **"Event Owner"** → **"Event Planner"** (throughout the app)

## 📁 Complete File Structure

```
tikiti/
├── 📄 index.html                          # HTML shell with Poppins font
├── 📄 package.json                        # Frontend dependencies
├── 📄 vite.config.js                      # Vite configuration
├── 📄 tsconfig.json                       # TypeScript config
├── 📄 .env.example                        # Environment variables template
├── 📄 .gitignore                          # Git ignore rules
├── 📄 README.md                           # Main documentation
├── 📄 PROJECT.md                          # Project overview
│
├── 📂 src/                                # Frontend source
│   ├── 📄 App.tsx                         # All screens (1,347 lines)
│   │   ├── Landing Page                   # Neumorphic design + canvas animation
│   │   ├── Event Planner Dashboard        # Event management
│   │   ├── Model Dashboard                # Seller stats (private)
│   │   ├── Gate Verification              # QR + code verification (private)
│   │   ├── Buyer Flow                     # Event → Cart → Payment → Success
│   │   ├── Admin Dashboard                # Platform oversight (private)
│   │   └── Admin Login                    # 2FA authentication
│   │
│   ├── 📂 components/
│   │   ├── 📄 ui.tsx                      # Neumorphic UI components
│   │   │   ├── ThemeToggle                # Light/Dark mode switch
│   │   │   ├── NeuCard                    # Neumorphic card component
│   │   │   ├── StatCard                   # Animated stat displays
│   │   │   ├── Button                     # Neumorphic buttons
│   │   │   ├── Input                      # Neumorphic inputs
│   │   │   ├── Badge                      # Status indicators
│   │   │   ├── Toast                      # Notifications
│   │   │   ├── CountdownTimer             # Payment countdown
│   │   │   ├── ProgressBar                # Capacity tracking
│   │   │   ├── TabNav                     # Neumorphic tabs
│   │   │   └── SectionHeader              # Page headers
│   │   │
│   │   └── 📄 TicketAnimation.tsx         # Canvas animation component
│   │       ├── Ticket particles           # Falling ticket visualization
│   │       ├── Verification particles     # Success burst effects
│   │       └── Theme-aware colors         # Adapts to light/dark mode
│   │
│   ├── 📂 lib/
│   │   └── 📄 data.ts                     # Mock data + utilities
│   │       ├── Events, Tickets, Orders
│   │       ├── Direct sales handling
│   │       └── Format helpers
│   │
│   ├── 📄 index.css                       # Neumorphic design system
│   │   ├── CSS Variables                  # Light/Dark mode themes
│   │   ├── Neumorphic Components          # Cards, buttons, inputs
│   │   ├── Animations                     # Fade, slide, pulse, float
│   │   └── Mobile Styles                  # Bottom nav, responsive
│   │
│   └── 📄 main.tsx                        # Entry point + service worker
│
├── 📂 public/                             # Static assets
│   ├── 📄 manifest.json                   # PWA manifest
│   ├── 📄 sw.js                           # Service worker
│   └── 📄 icon.svg                        # App icon
│
├── 📂 server/                             # Backend (Fastify)
│   ├── 📄 package.json                    # Backend dependencies
│   ├── 📄 tsconfig.json                   # TypeScript config
│   │
│   ├── 📂 src/
│   │   ├── 📄 index.ts                    # Main server
│   │   │
│   │   ├── 📂 routes/
│   │   │   ├── 📄 auth.ts                 # Authentication
│   │   │   ├── 📄 events.ts               # Event management
│   │   │   ├── 📄 orders.ts               # Order processing
│   │   │   ├── 📄 models.ts               # Model management
│   │   │   ├── 📄 staff.ts                # Gate staff
│   │   │   ├── 📄 verify.ts               # Ticket verification
│   │   │   ├── 📄 admin.ts                # Platform admin
│   │   │   └── 📄 webhooks.ts             # Monnify webhooks
│   │   │
│   │   ├── 📂 services/
│   │   │   └── 📄 monnify.ts              # Monnify integration
│   │   │
│   │   └── 📂 utils/
│   │       ├── 📄 codes.ts                # Code generation
│   │       └── 📄 tickets.ts              # QR + HMAC signing
│   │
│   └── 📂 tests/
│       ├── 📄 verify.test.ts              # Verification tests
│       └── 📄 orders.test.ts              # Order tests
│
└── 📂 database/
    └── 📄 schema.sql                      # Complete database schema
```

## 🎯 Key Features

### 1. Neumorphic Design System
- ✅ Soft, extruded UI elements
- ✅ Light/Dark mode with smooth transitions
- ✅ Poppins typography
- ✅ Consistent shadow system
- ✅ Touch-optimized (44px min targets)

### 2. Canvas Animation
- ✅ Falling ticket particles
- ✅ Verification burst effects
- ✅ Theme-aware colors
- ✅ Smooth 60fps animation
- ✅ Responsive canvas sizing

### 3. Navigation Restructure
- ✅ Public: Event Planner + Buyer only
- ✅ Private: Admin, Model, Gate (via invites)
- ✅ "Event Owner" → "Event Planner"
- ✅ Clean, focused user experience

### 4. Direct Sales Handling
- ✅ No referral link detection
- ✅ `modelId = ''` for direct sales
- ✅ Dashboard breakdown (89% models, 11% direct)
- ✅ Full tracking without attribution

### 5. Mobile Responsiveness
- ✅ Bottom navigation (< 1024px)
- ✅ Responsive sidebar
- ✅ Touch-optimized buttons
- ✅ Safe area insets (iOS)
- ✅ Prevents zoom on input focus

### 6. Payment Integration
- ✅ Monnify virtual accounts
- ✅ 20-minute payment window
- ✅ Webhook signature validation
- ✅ Fee calculation (1.5% + VAT + platform)
- ✅ Order expiry handling

### 7. Ticket Verification
- ✅ QR code scanning
- ✅ Manual code entry
- ✅ HMAC-signed QR codes
- ✅ Atomic check-in (prevent double-scan)
- ✅ Rate limiting (10 attempts/minute)
- ✅ Live counters

### 8. Security
- ✅ Service role key only on backend
- ✅ RLS enabled on all tables
- ✅ JWT authentication
- ✅ Rate limiting
- ✅ Input validation (Zod)
- ✅ Audit logging

## 🚀 Build Output

```
dist/
├── index.html                 # 1.62 KB
├── assets/
│   ├── index-*.css            # 33.56 KB (6.92 KB gzipped)
│   └── index-*.js             # 266.60 KB (75.86 KB gzipped)
└── manifest.json              # PWA manifest
```

**Performance:**
- ✅ 75.86 KB gzipped JS (under 200KB budget)
- ✅ 6.92 KB gzipped CSS
- ✅ Fast load times
- ✅ Smooth animations

## 🎨 Design Tokens

### CSS Variables
```css
/* Light Mode */
--bg-primary: #E6E9EF;
--text-primary: #1E2530;
--accent: #3A76F0;
--shadow-light: #ffffff;
--shadow-dark: #C0C5D1;

/* Dark Mode */
--bg-primary: #1E222B;
--text-primary: #F3F4F6;
--accent: #00E5FF;
--shadow-light: #2A303D;
--shadow-dark: #121419;
```

### Typography
- **Font:** Poppins (Google Fonts)
- **Headings:** 600 weight (Semi-Bold)
- **Body:** 400 weight (Regular)
- **Buttons:** 600 weight, uppercase, 0.04em letter-spacing

### Shadows
```css
/* Protruding */
box-shadow: 
  -10px -10px 20px var(--shadow-light),
  10px 10px 20px var(--shadow-dark);

/* Inset (Pressed) */
box-shadow: 
  inset -6px -6px 12px var(--shadow-light-inset),
  inset 6px 6px 12px var(--shadow-dark-inset);
```

## 📱 Mobile Features

### Bottom Navigation
- Shows first 5 menu items
- Active state highlighting
- Smooth transitions
- Safe area padding

### Responsive Layout
- Sidebar slides in on mobile
- Cards stack vertically
- Tables become scrollable
- Touch targets 44px minimum

### iOS Optimizations
- Safe area insets
- Prevents zoom on input
- 16px font size on inputs

## 🔐 Security Features

### Authentication
- JWT tokens
- 2FA for admin
- Model tokens (no login)
- Rate limiting

### Data Protection
- Service role key (backend only)
- RLS on all tables
- HMAC-signed QR codes
- Atomic operations

### Audit Trail
- All actions logged
- User, action, entity, details
- IP address tracking
- Timestamp recording

## 🧪 Test Coverage

### Verification Tests
- ✅ Ticket code generation
- ✅ QR signature validation
- ✅ Tampered payload detection

### Order Tests
- ✅ Fee calculation
- ✅ Overselling prevention
- ✅ Capacity validation
- ✅ Order expiry handling

## 📦 Dependencies

### Frontend
- React 18
- TypeScript
- Vite
- Tailwind CSS v4
- React Router v6
- Lucide React
- Poppins Font

### Backend
- Fastify
- TypeScript
- Supabase JS
- Monnify API
- Zod
- JWT
- bcrypt
- QRCode

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
- Hosted on Supabase
- Run schema.sql in SQL editor
- Configure environment variables

## 📞 Support

For issues, questions, or contributions, contact the development team.

---

**TiKiTI** - Neumorphic design, secure, fast, and built for Nigerian university events.
