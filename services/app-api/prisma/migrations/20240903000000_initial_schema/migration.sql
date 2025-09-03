-- MoMo Merchant Companion App - Initial Database Schema
-- Migration: 20240903000000_initial_schema

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- UUID v7 Generation Function
-- ============================================================================

-- Function to generate UUID v7 (time-ordered UUIDs)
-- Based on RFC 9562 UUID v7 specification
CREATE OR REPLACE FUNCTION uuid7() RETURNS uuid
    LANGUAGE plpgsql
    AS $$
DECLARE
    -- Get current timestamp in milliseconds since Unix epoch
    unix_ts_ms bigint := (extract(epoch from clock_timestamp()) * 1000)::bigint;
    -- Convert to UUID v7 format
    uuid_bytes bytea;
BEGIN
    -- Generate random bytes for the UUID
    uuid_bytes := gen_random_bytes(16);

    -- Set timestamp bytes (big-endian)
    uuid_bytes := set_byte(uuid_bytes, 0, ((unix_ts_ms >> 40) & 255)::int);
    uuid_bytes := set_byte(uuid_bytes, 1, ((unix_ts_ms >> 32) & 255)::int);
    uuid_bytes := set_byte(uuid_bytes, 2, ((unix_ts_ms >> 24) & 255)::int);
    uuid_bytes := set_byte(uuid_bytes, 3, ((unix_ts_ms >> 16) & 255)::int);
    uuid_bytes := set_byte(uuid_bytes, 4, ((unix_ts_ms >> 8) & 255)::int);
    uuid_bytes := set_byte(uuid_bytes, 5, (unix_ts_ms & 255)::int);

    -- Set version (7) and variant (RFC 4122)
    uuid_bytes := set_byte(uuid_bytes, 6, (get_byte(uuid_bytes, 6) & 15) | 112); -- Version 7
    uuid_bytes := set_byte(uuid_bytes, 8, (get_byte(uuid_bytes, 8) & 63) | 128); -- Variant 10

    RETURN encode(uuid_bytes, 'hex')::uuid;
END;
$$;

-- ============================================================================
-- Core Tables
-- ============================================================================

-- Users table
CREATE TABLE users (
    id uuid PRIMARY KEY DEFAULT uuid7(),
    email varchar(255) UNIQUE NOT NULL,
    phone varchar(20) UNIQUE,
    password_hash varchar(255) NOT NULL,
    first_name varchar(100) NOT NULL,
    last_name varchar(100) NOT NULL,
    is_active boolean DEFAULT true,
    is_email_verified boolean DEFAULT false,
    is_phone_verified boolean DEFAULT false,
    last_login_at timestamp(6),
    created_at timestamp(6) DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp(6) DEFAULT CURRENT_TIMESTAMP
);

-- Merchants table
CREATE TABLE merchants (
    id uuid PRIMARY KEY DEFAULT uuid7(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    business_name varchar(255) NOT NULL,
    business_type varchar(100) NOT NULL,
    registration_number varchar(100) UNIQUE,
    tax_id varchar(50) UNIQUE,
    address jsonb,
    contact_info jsonb,
    is_verified boolean DEFAULT false,
    verification_status varchar(50) DEFAULT 'pending',
    created_at timestamp(6) DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp(6) DEFAULT CURRENT_TIMESTAMP
);

-- Transactions table
CREATE TABLE transactions (
    id uuid PRIMARY KEY DEFAULT uuid7(),
    merchant_id uuid NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    transaction_id varchar(100) UNIQUE NOT NULL,
    transaction_type varchar(50) NOT NULL,
    amount decimal(15,2) NOT NULL,
    currency varchar(3) DEFAULT 'GHS',
    status varchar(50) DEFAULT 'pending',
    description text,
    metadata jsonb,
    processed_at timestamp(6),
    created_at timestamp(6) DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp(6) DEFAULT CURRENT_TIMESTAMP
);

-- Sessions table
CREATE TABLE sessions (
    id uuid PRIMARY KEY DEFAULT uuid7(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token text UNIQUE NOT NULL,
    device_info jsonb,
    ip_address varchar(45),
    expires_at timestamp(6) NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp(6) DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- Audit & Compliance Tables
-- ============================================================================

-- Audit logs table
CREATE TABLE audit_logs (
    id uuid PRIMARY KEY DEFAULT uuid7(),
    user_id uuid REFERENCES users(id),
    merchant_id uuid REFERENCES merchants(id),
    transaction_id uuid REFERENCES transactions(id),
    action varchar(100) NOT NULL,
    entity_type varchar(50) NOT NULL,
    entity_id uuid NOT NULL,
    old_values jsonb,
    new_values jsonb,
    metadata jsonb,
    ip_address varchar(45),
    user_agent text,
    created_at timestamp(6) DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- System Tables
-- ============================================================================

-- Rate limiting table
CREATE TABLE rate_limits (
    id uuid PRIMARY KEY DEFAULT uuid7(),
    identifier varchar(255) NOT NULL,
    endpoint varchar(500) NOT NULL,
    hits integer DEFAULT 0,
    window_start timestamp(6) NOT NULL,
    window_end timestamp(6) NOT NULL,
    created_at timestamp(6) DEFAULT CURRENT_TIMESTAMP
);

-- System configuration table
CREATE TABLE system_config (
    id uuid PRIMARY KEY DEFAULT uuid7(),
    key varchar(255) UNIQUE NOT NULL,
    value jsonb NOT NULL,
    description text,
    is_public boolean DEFAULT false,
    updated_at timestamp(6) DEFAULT CURRENT_TIMESTAMP,
    created_at timestamp(6) DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- Indexes
-- ============================================================================

-- Users indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_is_active ON users(is_active);
CREATE INDEX idx_users_created_at ON users(created_at);

-- Merchants indexes
CREATE INDEX idx_merchants_user_id ON merchants(user_id);
CREATE INDEX idx_merchants_is_verified ON merchants(is_verified);
CREATE INDEX idx_merchants_verification_status ON merchants(verification_status);
CREATE INDEX idx_merchants_business_name ON merchants(business_name);

-- Transactions indexes
CREATE INDEX idx_transactions_merchant_id ON transactions(merchant_id);
CREATE INDEX idx_transactions_transaction_id ON transactions(transaction_id);
CREATE INDEX idx_transactions_transaction_type ON transactions(transaction_type);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_created_at ON transactions(created_at);
CREATE INDEX idx_transactions_processed_at ON transactions(processed_at);

-- Sessions indexes
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX idx_sessions_is_active ON sessions(is_active);

-- Audit logs indexes
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_merchant_id ON audit_logs(merchant_id);
CREATE INDEX idx_audit_logs_transaction_id ON audit_logs(transaction_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_entity_type ON audit_logs(entity_type);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- Rate limits indexes
CREATE INDEX idx_rate_limits_identifier ON rate_limits(identifier);
CREATE INDEX idx_rate_limits_endpoint ON rate_limits(endpoint);
CREATE INDEX idx_rate_limits_window_start ON rate_limits(window_start);
CREATE INDEX idx_rate_limits_window_end ON rate_limits(window_end);

-- System config indexes
CREATE INDEX idx_system_config_key ON system_config(key);
CREATE INDEX idx_system_config_is_public ON system_config(is_public);

-- ============================================================================
-- Triggers
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers to relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_merchants_updated_at BEFORE UPDATE ON merchants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_system_config_updated_at BEFORE UPDATE ON system_config FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Audit Trigger Function
-- ============================================================================

-- Function to create audit log entries
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
    old_row jsonb;
    new_row jsonb;
    audit_action varchar(100);
BEGIN
    -- Determine action type
    IF TG_OP = 'INSERT' THEN
        audit_action := 'INSERT';
        old_row := null;
        new_row := to_jsonb(NEW);
    ELSIF TG_OP = 'UPDATE' THEN
        audit_action := 'UPDATE';
        old_row := to_jsonb(OLD);
        new_row := to_jsonb(NEW);
    ELSIF TG_OP = 'DELETE' THEN
        audit_action := 'DELETE';
        old_row := to_jsonb(OLD);
        new_row := null;
    END IF;

    -- Insert audit log entry
    INSERT INTO audit_logs (
        entity_type,
        entity_id,
        action,
        old_values,
        new_values,
        metadata
    ) VALUES (
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        audit_action,
        old_row,
        new_row,
        jsonb_build_object('timestamp', CURRENT_TIMESTAMP)
    );

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Apply audit triggers to core tables
CREATE TRIGGER audit_users_trigger AFTER INSERT OR UPDATE OR DELETE ON users FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
CREATE TRIGGER audit_merchants_trigger AFTER INSERT OR UPDATE OR DELETE ON merchants FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
CREATE TRIGGER audit_transactions_trigger AFTER INSERT OR UPDATE OR DELETE ON transactions FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- ============================================================================
-- Views
-- ============================================================================

-- Monthly transaction summary view
CREATE VIEW monthly_transaction_summary AS
SELECT
    merchant_id,
    EXTRACT(YEAR FROM created_at) as year,
    EXTRACT(MONTH FROM created_at) as month,
    COUNT(*) as total_transactions,
    SUM(amount) as total_amount,
    COUNT(CASE WHEN transaction_type = 'deposit' THEN 1 END) as deposits,
    COUNT(CASE WHEN transaction_type = 'withdrawal' THEN 1 END) as withdrawals,
    COUNT(CASE WHEN transaction_type = 'transfer' THEN 1 END) as transfers
FROM transactions
WHERE status = 'completed'
GROUP BY merchant_id, EXTRACT(YEAR FROM created_at), EXTRACT(MONTH FROM created_at);

-- Daily active users view
CREATE VIEW daily_active_users AS
SELECT
    DATE(created_at) as date,
    COUNT(DISTINCT user_id) as active_users,
    COUNT(DISTINCT CASE WHEN DATE(created_at) = DATE(users.created_at) THEN user_id END) as new_users,
    COUNT(DISTINCT CASE WHEN DATE(created_at) > DATE(users.created_at) THEN user_id END) as returning_users
FROM sessions s
JOIN users ON s.user_id = users.id
WHERE s.is_active = true
GROUP BY DATE(created_at);

-- ============================================================================
-- Initial Data
-- ============================================================================

-- Insert default system configuration
INSERT INTO system_config (key, value, description, is_public) VALUES
('app.version', '"1.0.0"', 'Application version', true),
('app.name', '"MoMo Merchant Companion"', 'Application name', true),
('features.biometric_auth', 'true', 'Biometric authentication enabled', false),
('features.offline_mode', 'true', 'Offline mode enabled', false),
('limits.max_transactions_per_day', '1000', 'Maximum transactions per day per merchant', false),
('security.session_timeout', '3600', 'Session timeout in seconds', false);