-- origination_db — esquema del servicio 1 (ver DISENO-BASES-DE-DATOS.md §2).
-- Idempotente: se ejecuta al arranque del servicio.
CREATE SCHEMA IF NOT EXISTS origination;

CREATE TABLE IF NOT EXISTS origination.applicants (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name            TEXT NOT NULL,
    document_number      BYTEA NOT NULL,            -- AES-256
    document_number_hash TEXT NOT NULL,             -- HMAC-SHA256 (búsqueda/unicidad)
    document_type        TEXT NOT NULL CHECK (document_type IN ('DNI','CI','PASSPORT')),
    dob                  DATE,
    phone                BYTEA,                      -- AES-256
    email                BYTEA,                      -- AES-256
    kyc_status           TEXT NOT NULL DEFAULT 'PENDING'
                          CHECK (kyc_status IN ('PENDING','VERIFIED','REJECTED')),
    ocr_payload          JSONB,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (document_number_hash, document_type)
);

CREATE TABLE IF NOT EXISTS origination.loan_applications (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),  -- = correlationId
    applicant_id     UUID NOT NULL REFERENCES origination.applicants(id),
    requested_amount NUMERIC(14,2) NOT NULL CHECK (requested_amount > 0),
    currency         CHAR(3) NOT NULL DEFAULT 'USD',
    term_months      INT NOT NULL CHECK (term_months BETWEEN 1 AND 36),
    status           TEXT NOT NULL DEFAULT 'PROCESSING'
                      CHECK (status IN ('PROCESSING','APPROVED','REJECTED','MANUAL_REVIEW','FAILED')),
    result           JSONB,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS origination.saga_state (
    application_id UUID PRIMARY KEY REFERENCES origination.loan_applications(id),
    current_step   TEXT NOT NULL,
    step_status    TEXT NOT NULL,
    payload        JSONB,
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS origination.application_timeline (
    id             BIGSERIAL PRIMARY KEY,
    application_id UUID NOT NULL,
    step           TEXT NOT NULL,
    status         TEXT NOT NULL,
    message        TEXT,
    occurred_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_app_applicant ON origination.loan_applications(applicant_id);
CREATE INDEX IF NOT EXISTS idx_timeline_app ON origination.application_timeline(application_id);
