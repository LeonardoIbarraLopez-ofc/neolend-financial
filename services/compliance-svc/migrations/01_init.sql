CREATE SCHEMA IF NOT EXISTS compliance;

-- Bitácora inmutable (hash chain + firma) — retención 10 años
CREATE TABLE IF NOT EXISTS compliance.audit_log (
    id             BIGSERIAL PRIMARY KEY,
    record_id      UUID NOT NULL UNIQUE,
    correlation_id UUID NOT NULL,               -- = applicationId
    event_type     TEXT NOT NULL,               -- SCORE_COMPUTED, DECISION_MADE, CREDIT_OPENED...
    actor          TEXT,                         -- servicio origen
    payload        JSONB NOT NULL,               -- inputs + pesos del modelo + decisión
    prev_hash      TEXT NOT NULL,
    hash           TEXT NOT NULL,                -- SHA256(prev_hash || canonical(payload))
    signature      TEXT NOT NULL,                -- JWS (clave local)
    worm_uri       TEXT,                         -- ruta a copia inmutable local (./worm/...)
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_corr ON compliance.audit_log(correlation_id);

-- Trigger de inmutabilidad (evita UPDATE o DELETE)
CREATE OR REPLACE FUNCTION compliance.block_mutation() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'compliance.audit_log es append-only';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_immutable ON compliance.audit_log;
CREATE TRIGGER trg_audit_immutable BEFORE UPDATE OR DELETE ON compliance.audit_log
    FOR EACH ROW EXECUTE FUNCTION compliance.block_mutation();

-- Reportes al regulador
CREATE TABLE IF NOT EXISTS compliance.report_jobs (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_type TEXT NOT NULL,                   -- SCORING_TRACEABILITY, BIAS_AUDIT
    period_from DATE NOT NULL,
    period_to   DATE NOT NULL,
    status      TEXT NOT NULL DEFAULT 'QUEUED',
    output_uri  TEXT,
    signature   TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auditoría de sesgo demográfico (mensual)
CREATE TABLE IF NOT EXISTS compliance.bias_audits (
    id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    period    DATE NOT NULL,
    cohort    TEXT NOT NULL,                      -- género, edad, región
    metric    TEXT NOT NULL,                      -- approval_rate, avg_score
    value     NUMERIC(8,4) NOT NULL,
    disparity NUMERIC(8,4),
    flagged   BOOLEAN NOT NULL DEFAULT false
);

-- Seed de auditorías de sesgo demográfico iniciales para demostración
INSERT INTO compliance.bias_audits (period, cohort, metric, value, disparity, flagged)
VALUES
  ('2026-05-01', 'Genero: Femenino', 'approval_rate', 0.8200, 1.0000, false),
  ('2026-05-01', 'Genero: Masculino', 'approval_rate', 0.8150, 0.9939, false),
  ('2026-05-01', 'Edad: < 25', 'approval_rate', 0.6500, 0.7926, true),
  ('2026-05-01', 'Edad: >= 25', 'approval_rate', 0.8400, 1.0243, false),
  ('2026-06-01', 'Genero: Femenino', 'approval_rate', 0.8350, 1.0000, false),
  ('2026-06-01', 'Genero: Masculino', 'approval_rate', 0.8400, 1.0059, false)
ON CONFLICT DO NOTHING;
