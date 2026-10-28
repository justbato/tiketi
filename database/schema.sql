-- TiKeTi Database Schema
-- Last updated: 2026-10-28

-- =============================================
-- EVENTS
-- =============================================
CREATE TABLE IF NOT EXISTS events (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  planner_id    uuid REFERENCES users(id),
  owner_id      uuid REFERENCES users(id),
  name          text NOT NULL,
  description   text,
  venue         text NOT NULL,
  party_type    text NOT NULL DEFAULT 'campus',
  university    text,
  state         text,
  event_date    timestamptz NOT NULL,
  timezone      text NOT NULL DEFAULT 'Africa/Lagos',
  sales_end_date timestamptz NOT NULL,
  capacity      int NOT NULL DEFAULT 500,
  banner_url    text,
  logo_url      text,
  poster_url    text,           -- added: migration 001
  category      text,           -- added: migration 001 (free-form, e.g. 'Music', 'Gala', 'Conference')
  status        text NOT NULL DEFAULT 'draft',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Seed poster_url / category for existing demo events (run manually after migrating):
-- UPDATE events SET poster_url = '/posters/gala_night.jpg',        category = 'Gala'    WHERE name ILIKE '%Convocation Gala%';
-- UPDATE events SET poster_url = '/posters/afrobeats_carnival.jpg', category = 'Music'  WHERE name ILIKE '%AfroBeats%';
-- UPDATE events SET poster_url = '/posters/unifest_concert.jpg',    category = 'Music'  WHERE name ILIKE '%Freshers Night%';

-- =============================================
-- TICKET TYPES
-- =============================================
CREATE TABLE IF NOT EXISTS ticket_types (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id         uuid NOT NULL REFERENCES events(id),
  name             text NOT NULL,
  price            numeric(12,2),
  male_price       numeric(12,2),
  female_price     numeric(12,2),
  gender_pricing   boolean NOT NULL DEFAULT false,
  quantity         int NOT NULL,
  admits           int NOT NULL DEFAULT 1,
  ticket_image_url text,
  ticket_tier      text DEFAULT 'general',
  archived         boolean NOT NULL DEFAULT false,
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- =============================================
-- ORDERS
-- =============================================
CREATE TABLE IF NOT EXISTS orders (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference            text NOT NULL UNIQUE,
  event_id             uuid NOT NULL REFERENCES events(id),
  model_id             uuid,
  buyer_name           text NOT NULL,
  buyer_email          text NOT NULL,
  buyer_phone          text NOT NULL,
  subtotal             numeric(12,2) NOT NULL DEFAULT 0,
  fees                 numeric(12,2) NOT NULL DEFAULT 0,
  total                numeric(12,2) NOT NULL DEFAULT 0,
  status               text NOT NULL DEFAULT 'pending',
  payment_reference    text,
  monnify_response     jsonb,
  expires_at           timestamptz,
  access_attempts      int NOT NULL DEFAULT 0,      -- added: migration 002
  access_locked_until  timestamptz,                 -- added: migration 002
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

-- =============================================
-- ORDER LINES
-- =============================================
CREATE TABLE IF NOT EXISTS order_lines (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        uuid NOT NULL REFERENCES orders(id),
  ticket_type_id  uuid NOT NULL REFERENCES ticket_types(id),
  quantity        int NOT NULL,
  price           numeric(12,2) NOT NULL,
  total           numeric(12,2) NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- =============================================
-- TICKETS (individual, issued after payment)
-- =============================================
CREATE TABLE IF NOT EXISTS tickets (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id            uuid NOT NULL REFERENCES orders(id),
  ticket_type_id      uuid NOT NULL REFERENCES ticket_types(id),
  code                text NOT NULL UNIQUE,
  admits              int NOT NULL DEFAULT 1,
  used_at             timestamptz,
  used_by             uuid,
  verification_method text,
  created_at          timestamptz NOT NULL DEFAULT now()
);

-- =============================================
-- USERS (planners, owners, admins, gate, models)
-- =============================================
CREATE TABLE IF NOT EXISTS users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  name          text NOT NULL,
  role          text NOT NULL DEFAULT 'planner',
  status        text NOT NULL DEFAULT 'active',
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- =============================================
-- MODELS (referral ambassadors)
-- =============================================
CREATE TABLE IF NOT EXISTS models (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id       uuid NOT NULL REFERENCES events(id),
  name           text NOT NULL,
  email          text NOT NULL,
  referral_code  text NOT NULL UNIQUE,
  invite_token   text,
  status         text NOT NULL DEFAULT 'invited',
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- =============================================
-- GATE STAFF
-- =============================================
CREATE TABLE IF NOT EXISTS gate_staff (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    uuid REFERENCES events(id),
  name        text NOT NULL,
  email       text NOT NULL,
  invite_token text,
  status      text NOT NULL DEFAULT 'invited',
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- =============================================
-- AUDIT LOGS
-- =============================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    uuid,
  actor_role  text,
  action      text NOT NULL,
  entity_type text,
  entity_id   uuid,
  details     text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
