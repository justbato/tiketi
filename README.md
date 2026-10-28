# TiKiTI - Event Ticket Sales Platform

A production-grade PWA for automated event ticket sales in Nigerian universities.

## Architecture

```
tikiti/
├── src/                    # Frontend (React + Vite + Tailwind)
│   ├── App.tsx            # All screens and routing
│   ├── components/        # Reusable UI components
│   ├── lib/               # Mock data and utilities
│   ├── index.css          # Design system
│   └── main.tsx           # Entry point
├── server/                # Backend (Fastify + TypeScript)
│   ├── src/
│   │   ├── index.ts       # Main server
│   │   ├── routes/        # API routes
│   │   ├── middleware/    # Auth, rate limiting
│   │   ├── services/      # Business logic
│   │   └── utils/         # Helpers
│   ├── package.json
│   └── tsconfig.json
├── database/              # Supabase schema
│   └── schema.sql
├── tests/                 # Test suite
│   ├── api/
│   └── e2e/
├── public/                # Static assets
├── README.md
└── package.json
```

## Tech Stack

**Frontend:**
- React 18 + TypeScript
- Vite (build tool)
- Tailwind CSS v4
- React Router v6
- Lucide React (icons)
- PWA with service worker

**Backend:**
- Fastify (TypeScript)
- Supabase Postgres (database)
- Monnify (payments)
- Zod (validation)
- JWT (authentication)

**Design System:**
- Flat Design 2.0 + Bento Grid
- Inter font (self-hosted)
- Deep navy accent (#1B2A4A)
- WCAG AA compliant
- Mobile-first responsive

## Features

### Platform Admin
- Full platform oversight
- Event owner management (suspend/reactivate)
- All events view with take-down capability
- Orders and payments tracking
- Payouts and settlements
- Platform settings (fees, VAT, payment window)
- Audit log viewer
- Mandatory 2FA login

### Event Owner
- Create events with rich details
- Ticket type management (Regular, VIP, Tables)
- Model invitation and management
- Gate staff management
- Real-time sales dashboard
- Earnings and payout tracking
- Check-in history with undo

### Model (Seller)
- No login - token-based access
- Personal referral link
- Sales tracking and leaderboard
- Revenue generation stats
- Masked competitor names

### Gate Staff
- QR code scanning
- Manual code entry
- Real-time verification
- Live check-in counters
- Works offline-capable

### Buyer
- Public event pages
- Ticket selection with cart
- Monnify bank transfer payments
- 20-minute payment window
- QR-coded tickets
- Re-download capability

### Direct Sales
- Buyers can purchase without model referral
- Recorded as `modelId = ''`
- Owner sees sales source breakdown
- Full tracking without attribution

## Quick Start

### Prerequisites
- Node.js 18+
- Supabase account
- Monnify account (sandbox for testing)

### 1. Clone and Install

```bash
git clone <repo-url>
cd tikiti
npm install
```

### 2. Environment Setup

Copy `.env.example` to `.env` and fill in:

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Monnify
MONNIFY_API_KEY=your-api-key
MONNIFY_SECRET_KEY=your-secret-key
MONNIFY_CONTRACT_CODE=your-contract-code

# JWT
JWT_SECRET=your-jwt-secret-min-32-chars

# App
VITE_API_URL=http://localhost:3001
NODE_ENV=development
```

### 3. Database Setup

```bash
# Run schema in Supabase SQL editor
# See database/schema.sql
```

### 4. Start Development

**Frontend:**
```bash
npm run dev
# http://localhost:3000
```

**Backend:**
```bash
cd server
npm install
npm run dev
# http://localhost:3001
```

### 5. Build for Production

```bash
npm run build
# Output: dist/
```

## Monnify Setup (Manual Steps)

Before going live, complete these steps with Monnify:

1. **Request Sub-Account Activation**
   - Contact Monnify support
   - Request sub-account feature for split payments
   - Provide your business registration details

2. **Configure Webhooks**
   - Set webhook URL: `https://your-domain.com/api/webhooks/monnify`
   - Enable events: `SUCCESSFUL`, `FAILED`, `EXPIRED`

3. **Sandbox Testing**
   - Use sandbox credentials for testing
   - Test virtual account generation
   - Verify webhook signature validation
   - Test payment confirmation flow

4. **Go Live**
   - Switch to production credentials
   - Verify bank account for settlements
   - Test with small amounts first

## API Documentation

### Authentication

All protected routes require JWT token in `Authorization: Bearer <token>` header.

### Public Routes

```
GET  /api/events/:id          # Get event details
POST /api/orders              # Create order
GET  /api/orders/:ref/status  # Check payment status
POST /api/verify              # Verify ticket (gate)
```

### Protected Routes (Owner)

```
POST   /api/events                    # Create event
GET    /api/events                    # List events
PUT    /api/events/:id                # Update event
POST   /api/events/:id/models         # Invite model
DELETE /api/events/:id/models/:mid    # Remove model
POST   /api/events/:id/staff          # Add gate staff
GET    /api/events/:id/stats          # Get sales stats
```

### Protected Routes (Admin)

```
GET    /api/admin/overview            # Platform stats
GET    /api/admin/owners              # List owners
PUT    /api/admin/owners/:id/suspend  # Suspend owner
GET    /api/admin/events              # All events
PUT    /api/admin/events/:id/takedown # Take down event
GET    /api/admin/orders              # All orders
GET    /api/admin/payouts             # All payouts
GET    /api/admin/settings            # Platform settings
PUT    /api/admin/settings            # Update settings
GET    /api/admin/audit               # Audit log
```

### Protected Routes (Model)

```
GET  /api/model/dashboard             # Model stats
GET  /api/model/leaderboard           # Rankings
```

## Database Schema

Key tables:

- `users` - All user accounts with roles
- `events` - Event details
- `ticket_types` - Ticket categories per event
- `models` - Sellers with referral codes
- `orders` - Purchase records
- `order_lines` - Individual ticket purchases
- `tickets` - Generated tickets with QR codes
- `checkins` - Gate verification records
- `payouts` - Settlement records
- `audit_logs` - Action history
- `platform_settings` - Configurable fees

See `database/schema.sql` for complete schema.

## Security

- Service role key only on backend (never exposed to client)
- RLS enabled on all Supabase tables
- JWT with httpOnly secure cookies
- Rate limiting on all endpoints
- HMAC-signed QR codes (forgery detection)
- Atomic check-in operations (prevent double-scan)
- Input validation with Zod
- Helmet.js security headers
- CORS strict origin policy

## Performance

- Initial JS: ~74KB gzipped (under 200KB budget)
- Lazy-loaded routes
- Self-hosted fonts
- Optimized images (WebP/AVIF)
- CSS animations over JS libraries
- Service worker caching
- Mobile-first responsive

## Testing

```bash
# Run all tests
npm test

# API tests
npm run test:api

# E2E tests
npm run test:e2e
```

Test coverage:
- Payment webhook validation
- Overselling prevention
- Order expiry handling
- Verification (QR + code)
- Check-in atomicity
- Leaderboard masking
- Role-based access
- Cross-owner isolation

## Deployment

### Frontend (Vercel/Netlify)

```bash
npm run build
# Deploy dist/ folder
```

### Backend (Railway/Fly.io)

```bash
cd server
npm run build
# Deploy with environment variables
```

### Database (Supabase)

Already hosted. Just configure environment variables.

## License

Proprietary - All rights reserved.

## Support

For issues and questions, contact the development team.
