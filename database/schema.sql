-- TiKeTi Database Schema
-- Last updated: 2026-11-01

-- =============================================
-- EVENT ORGANIZERS
-- =============================================
CREATE TABLE IF NOT EXISTS event_organizers (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email                     text NOT NULL,
  password_hash             text NOT NULL,
  name                      text NOT NULL,
  bank_name                 text,
  bank_code                 text,
  account_number            text,
  account_name              text,
  bank_locked               boolean NOT NULL DEFAULT false,
  first_paid_at             timestamptz,
  paystack_subaccount_code  text,
  status                    text NOT NULL DEFAULT 'active',
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_event_organizers_email ON event_organizers (email);

-- =============================================
-- EVENTS
-- =============================================
CREATE TABLE IF NOT EXISTS events (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id              uuid REFERENCES event_organizers(id) ON DELETE SET NULL,
  planner_id                uuid REFERENCES event_organizers(id) ON DELETE SET NULL,
  owner_id                  uuid,
  name                      text NOT NULL,
  description               text,
  venue                     text NOT NULL,
  party_type                text NOT NULL DEFAULT 'campus',
  university                text,
  state                     text,
  event_date                timestamptz NOT NULL,
  timezone                  text NOT NULL DEFAULT 'Africa/Lagos',
  sales_end_date            timestamptz NOT NULL,
  capacity                  int NOT NULL DEFAULT 500,
  banner_url                text,
  logo_url                  text,
  poster_url                text,
  category                  text,
  status                    text NOT NULL DEFAULT 'draft',
  approval_status           text NOT NULL DEFAULT 'pending', -- 'pending' | 'approved' | 'rejected'
  approval_note             text,
  approved_by               uuid,
  approved_at               timestamptz,
  paystack_subaccount_code  text,
  fee_percent_override      numeric(5,2),
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_events_approval_status ON events (approval_status);

-- =============================================
-- TICKET TYPES
-- =============================================
CREATE TABLE IF NOT EXISTS ticket_types (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id         uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
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
  gross                numeric(12,2),
  fee_percent_used     numeric(5,2),
  platform_fee         numeric(12,2),
  organizer_share      numeric(12,2),
  status               text NOT NULL DEFAULT 'pending',
  payment_reference    text,
  paystack_reference   text,
  expires_at           timestamptz,
  access_attempts      int NOT NULL DEFAULT 0,
  access_locked_until  timestamptz,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orders_paystack_reference ON orders (paystack_reference);

-- =============================================
-- ORDER LINES
-- =============================================
CREATE TABLE IF NOT EXISTS order_lines (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
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
  order_id            uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  ticket_type_id      uuid NOT NULL REFERENCES ticket_types(id),
  code                text NOT NULL UNIQUE,
  admits              int NOT NULL DEFAULT 1,
  used_at             timestamptz,
  used_by             uuid,
  verification_method text,
  created_at          timestamptz NOT NULL DEFAULT now()
);

-- =============================================
-- PLATFORM SETTINGS
-- =============================================
CREATE TABLE IF NOT EXISTS platform_settings (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fee_percent         numeric(5,2) NOT NULL DEFAULT 5.00,
  fee_bearer          text NOT NULL DEFAULT 'organizer',   -- 'organizer' | 'platform'
  paystack_fee_bearer text NOT NULL DEFAULT 'account',     -- 'account' | 'subaccount'
  updated_at          timestamptz NOT NULL DEFAULT now(),
  updated_by          uuid
);

-- =============================================
-- FEE PERCENT LOG
-- =============================================
CREATE TABLE IF NOT EXISTS fee_percent_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  old_percent numeric(5,2),
  new_percent numeric(5,2) NOT NULL,
  changed_by  uuid NOT NULL,
  event_id    uuid,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- =============================================
-- BANK CHANGE LOG
-- =============================================
CREATE TABLE IF NOT EXISTS bank_change_log (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id           uuid NOT NULL REFERENCES events(id),
  old_bank_name      text,
  old_account_number text,
  old_account_name   text,
  new_bank_name      text NOT NULL,
  new_account_number text NOT NULL,
  new_account_name   text NOT NULL,
  changed_by         uuid NOT NULL,
  created_at         timestamptz NOT NULL DEFAULT now()
);

-- =============================================
-- USERS (admins, gate staff, models, organizers)
-- =============================================
CREATE TABLE IF NOT EXISTS users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  name          text NOT NULL,
  role          text NOT NULL DEFAULT 'organizer',
  status        text NOT NULL DEFAULT 'active',
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- =============================================
-- MODELS (referral ambassadors)
-- =============================================
CREATE TABLE IF NOT EXISTS models (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id       uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
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
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id     uuid REFERENCES events(id) ON DELETE CASCADE,
  name         text NOT NULL,
  email        text NOT NULL,
  invite_token text,
  status       text NOT NULL DEFAULT 'invited',
  created_at   timestamptz NOT NULL DEFAULT now()
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
