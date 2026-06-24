-- Schema de base de datos para el microservicio de inversionistas
CREATE SCHEMA IF NOT EXISTS investor;

CREATE TABLE IF NOT EXISTS investor.funds (
    id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name     TEXT NOT NULL,
    exposure NUMERIC(16,2) NOT NULL DEFAULT 0.00
);

CREATE TABLE IF NOT EXISTS investor.portfolio_metrics (
    ts               TIMESTAMPTZ NOT NULL,
    segment          CHAR(1) NOT NULL,                 -- banda de riesgo (A, B, C, D)
    outstanding      NUMERIC(16,2) NOT NULL DEFAULT 0.00,
    irr              NUMERIC(6,4) NOT NULL DEFAULT 0.0000,
    par30            NUMERIC(6,4) NOT NULL DEFAULT 0.0000,
    par90            NUMERIC(6,4) NOT NULL DEFAULT 0.0000,
    delinquency_rate NUMERIC(6,4) NOT NULL DEFAULT 0.0000,
    active_credits   INT NOT NULL DEFAULT 0,
    PRIMARY KEY (ts, segment)
);

CREATE TABLE IF NOT EXISTS investor.cashflow_projection (
    fund_id UUID NOT NULL,
    month   DATE NOT NULL,
    inflow  NUMERIC(16,2) NOT NULL,
    outflow NUMERIC(16,2) NOT NULL,
    net     NUMERIC(16,2) NOT NULL,
    PRIMARY KEY (fund_id, month)
);

CREATE INDEX IF NOT EXISTS idx_metrics_ts ON investor.portfolio_metrics(ts DESC);

-- Seeding inicial de fondos e información básica
INSERT INTO investor.funds (id, name, exposure) VALUES
('84819280-9281-4281-8281-291039103910', 'Fondo Alpha', 1250000.00),
('19203910-3910-4910-8910-391039103910', 'Fondo Beta', 3500000.00),
('59103910-3910-4910-8910-491039103910', 'Fondo Omega', 8100000.00)
ON CONFLICT (id) DO NOTHING;

INSERT INTO investor.cashflow_projection (fund_id, month, inflow, outflow, net) VALUES
('84819280-9281-4281-8281-291039103910', '2026-07-01', 35000.00, 15000.00, 20000.00),
('84819280-9281-4281-8281-291039103910', '2026-08-01', 40000.00, 18000.00, 22000.00),
('19203910-3910-4910-8910-391039103910', '2026-07-01', 95000.00, 42000.00, 53000.00),
('59103910-3910-4910-8910-491039103910', '2026-07-01', 220000.00, 110000.00, 110000.00)
ON CONFLICT (fund_id, month) DO NOTHING;

INSERT INTO investor.portfolio_metrics (ts, segment, outstanding, irr, par30, par90, delinquency_rate, active_credits) VALUES
(now(), 'A', 250000.00, 0.1450, 0.0120, 0.0030, 0.0150, 12),
(now(), 'B', 450000.00, 0.1680, 0.0240, 0.0080, 0.0320, 25),
(now(), 'C', 180000.00, 0.1920, 0.0550, 0.0180, 0.0730, 9),
(now(), 'D', 70000.00, 0.2250, 0.0980, 0.0420, 0.1400, 3)
ON CONFLICT (ts, segment) DO NOTHING;
