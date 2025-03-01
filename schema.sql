-- Estensione per UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ENUM per tipi manutenzione
CREATE TYPE maintenance_type AS ENUM ('insurance', 'tax', 'revision', 'maintenance');

------------------------------
-- TABELLE PRINCIPALI
------------------------------

-- Utenti (con autenticazione 2FA)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    two_factor_secret VARCHAR(32),
    two_factor_enabled BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Tipologie veicolo (intervalli in mesi, non obbligatori)
CREATE TABLE vehicle_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) UNIQUE NOT NULL,
    required_license VARCHAR(20) NOT NULL,
    insurance_interval INT,
    tax_interval INT,
    revision_interval INT
);

-- Veicoli (con validazione targa italiana)
CREATE TABLE vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type_id UUID REFERENCES vehicle_types(id),
    license_plate VARCHAR(20) NOT NULL CHECK (
        license_plate ~ '^([A-Z]{2}[\s-]?[0-9]{3}[\s-]?[A-Z]{2}|[A-Z]{2}[\s-]?[0-9]{4}[A-Z]{2}|[A-Z]{2}[\s-]?[0-9]{1}[A-Z]{1}[\s-]?[0-9]{5})$'
    ),
    load_capacity NUMERIC(10,2), -- In quintali
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

------------------------------
-- LOGS & SCADENZE
------------------------------

-- Log manutenzioni/scadenze (timezone-aware)
CREATE TABLE maintenance_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
    type maintenance_type NOT NULL,
    description TEXT,
    performed_at TIMESTAMPTZ NOT NULL,
    due_at TIMESTAMPTZ, -- Calcolato se intervallo disponibile
    workshop VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Guasti
CREATE TABLE faults (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    resolved BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

------------------------------
-- SICUREZZA & CONDIVISIONE
------------------------------

-- Link condivisi (16 caratteri)
CREATE TABLE shared_links (
    token CHAR(16) PRIMARY KEY,
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Audit log
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
    action_type VARCHAR(50) NOT NULL,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

------------------------------
-- IMPOSTAZIONI & BACKUP
------------------------------

-- Impostazioni utente (soglie colori/notifiche)
CREATE TABLE user_settings (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    insurance_red INT DEFAULT 10,
    insurance_orange INT DEFAULT 25,
    tax_red INT DEFAULT 10,
    tax_orange INT DEFAULT 25,
    revision_red INT DEFAULT 10,
    revision_orange INT DEFAULT 25,
    email_notification_days INT DEFAULT 7
);

-- Log backup Backblaze B2
CREATE TABLE backup_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    b2_path VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

------------------------------
-- INDICI & FUNZIONI
------------------------------

-- Indici per performance
CREATE INDEX idx_vehicles_user ON vehicles(user_id);
CREATE INDEX idx_maintenance_due ON maintenance_logs(due_at);
CREATE INDEX idx_shared_links_expiry ON shared_links(expires_at);

-- Funzione calcolo scadenza con timezone Italia
CREATE OR REPLACE FUNCTION calculate_due_date_italy(
    performed_at TIMESTAMPTZ, 
    interval_months INTEGER
) RETURNS TIMESTAMPTZ AS $$
BEGIN
    RETURN (performed_at AT TIME ZONE 'Europe/Rome') + 
           (interval_months * INTERVAL '1 month');
END;
$$ LANGUAGE plpgsql;