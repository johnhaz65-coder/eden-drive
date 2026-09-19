CREATE TABLE IF NOT EXISTS eden_bookings (
 id uuid PRIMARY KEY, ref text UNIQUE NOT NULL, token_hash text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 status text NOT NULL DEFAULT 'requested' CHECK(status IN ('requested','confirmed','completed','cancelled')),
 data jsonb NOT NULL, amount integer CHECK(amount>0), paid boolean NOT NULL DEFAULT false,
 checkout_id text UNIQUE, checkout_url text, payment_method text, paid_at timestamptz,
 invoice_no text UNIQUE, invoice_snapshot jsonb
);
CREATE TABLE IF NOT EXISTS eden_invoice_counter (id integer PRIMARY KEY, value integer NOT NULL);
INSERT INTO eden_invoice_counter VALUES (1,0) ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS eden_sessions (token_hash text PRIMARY KEY, expires_at timestamptz NOT NULL);
CREATE TABLE IF NOT EXISTS eden_rate_limits (key text PRIMARY KEY, hits integer NOT NULL, expires_at timestamptz NOT NULL);
CREATE TABLE IF NOT EXISTS eden_events (id bigserial PRIMARY KEY, booking_id uuid REFERENCES eden_bookings(id), created_at timestamptz DEFAULT now(), action text NOT NULL);
