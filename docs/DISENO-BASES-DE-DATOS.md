# Diseño de Bases de Datos — NeoLend Financial Corp.

> **Documento de Diseño de Datos (DDD) — Arquitectura de 6 Microservicios (Local-First)**
> Complementa a [PROPUESTA-TECNICA.md](PROPUESTA-TECNICA.md)
> Versión 2.0 — Hackatón Final 16/06/2026
> **Entorno:** PostgreSQL 16 + Redis 7, **100% local y gratuito** (Docker Compose)

---

## 0. Principios de diseño de datos

| Principio | Aplicación |
|---|---|
| **Database per Service (lógico)** | 6 BDs lógicas, **una por microservicio**. En local viven en **una sola instancia PostgreSQL** (eficiencia de recursos); en producción se separan en instancias distintas. Ningún servicio accede a la BD de otro. |
| **Un solo motor relacional** | PostgreSQL 16 con `JSONB` cubre datos flexibles → **no necesitamos MongoDB/TimescaleDB** en el MVP. Menos piezas = desarrollo más rápido. |
| **Redis para velocidad** | Caché del buró, estado del circuit breaker y feature store del scoring. Volátil y reconstruible. |
| **Inmutabilidad regulatoria** | Event store de `credit-svc` y bitácora de `compliance-svc` son **append-only** (trigger que bloquea UPDATE/DELETE). |
| **Cifrado AES-256** | PII y datos financieros cifrados a nivel de aplicación con `node:crypto` (libre); clave local en `.env` (en prod → Vault/HSM). |
| **Sin FK entre servicios** | Los servicios se referencian por **ID lógico**; la sincronización es por eventos. |
| **Trazabilidad** | `correlation_id` (= applicationId) viaja por todas las tablas y eventos del flujo. |

### 0.1 Mapa de almacenes (6 BDs lógicas + Redis)

| # | Servicio | BD lógica | Motor | Inmutable | Cifrado PII |
|---|---|---|---|---|---|
| 1 | gateway-origination-svc | `origination_db` | PostgreSQL | No | Sí |
| 2 | scoring-svc | `scoring` | **Redis** (+ feature/score/cache) | No | No |
| 3 | credit-svc | `credit_db` (incluye event store + proyecciones) | PostgreSQL | **Sí (ES)** | No |
| 4 | servicing-svc | `servicing_db` | PostgreSQL | No | Sí (contacto) |
| 5 | investor-svc | `investor_db` | PostgreSQL | No | No |
| 6 | compliance-svc | `compliance_db` | PostgreSQL (append-only) | **Sí** | No |

> En `docker-compose`, un único contenedor `postgres` crea las 5 BDs (`origination_db`, `credit_db`, `servicing_db`, `investor_db`, `compliance_db`) vía script de init. Cada servicio se conecta **solo** a la suya con su propio usuario.

---

## 1. Modelo conceptual global (relaciones lógicas)

```
              ┌──────────────────────┐
              │ origination_db        │  (svc 1)
              │  applicants           │
              │  loan_applications    │── applicationId = correlationId
              │  saga_state, timeline │
              └───────────┬───────────┘
                          │ (evento: application.submitted)
                          ▼
              ┌──────────────────────┐
              │ scoring (Redis)       │  (svc 2)  features/score/bureau-cache
              └───────────┬───────────┘
                          │ (evento: scoring.score.completed)
                          ▼
              ┌──────────────────────┐
              │ credit_db             │  (svc 3)  decisions + EVENT STORE + proyecciones
              │  credit_events (ES)   │── creditId = aggregateId
              │  credit_view, ledger  │
              └───────┬───────┬───────┘
            (credit.events)   │ (disbursement.completed)
          ┌─────────▼───┐ ┌───▼────────────┐
          │ servicing_db│ │ investor_db     │  (svc 4 y 5)
          │ collections │ │ portfolio_metric│
          │ gamification│ │ cashflow        │
          └─────────────┘ └─────────────────┘
                          │
          (todos los eventos relevantes)
                          ▼
              ┌──────────────────────┐
              │ compliance_db         │  (svc 6)  audit_log (append-only + hash + firma)
              └──────────────────────┘
```
> **Sin FK físicas entre BDs.** La consistencia entre servicios es **eventual** vía eventos; fuerte **dentro** de cada agregado.

---

## 2. `origination_db` (PostgreSQL) — svc 1: Identidad + Solicitud

```sql
CREATE SCHEMA origination;

-- Solicitante / titular (KYC)
CREATE TABLE origination.applicants (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name            TEXT NOT NULL,
    document_number      BYTEA NOT NULL,            -- AES-256 (node:crypto)
    document_number_hash TEXT NOT NULL,             -- HMAC-SHA256 para búsqueda/unicidad
    document_type        TEXT NOT NULL CHECK (document_type IN ('DNI','CI','PASSPORT')),
    dob                  DATE,
    phone                BYTEA,                      -- AES-256
    email                BYTEA,                      -- AES-256
    kyc_status           TEXT NOT NULL DEFAULT 'PENDING'
                          CHECK (kyc_status IN ('PENDING','VERIFIED','REJECTED')),
    ocr_payload          JSONB,                      -- resultado OCR (JSONB, flexible)
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (document_number_hash, document_type)
);

-- Solicitud de crédito
CREATE TABLE origination.loan_applications (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),  -- = correlationId
    applicant_id     UUID NOT NULL REFERENCES origination.applicants(id),
    requested_amount NUMERIC(14,2) NOT NULL CHECK (requested_amount > 0),
    currency         CHAR(3) NOT NULL DEFAULT 'USD',
    term_months      INT NOT NULL CHECK (term_months BETWEEN 1 AND 36),
    status           TEXT NOT NULL DEFAULT 'PROCESSING'
                      CHECK (status IN ('PROCESSING','APPROVED','REJECTED','MANUAL_REVIEW','FAILED')),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Estado de la Saga + timeline para UI de progreso
CREATE TABLE origination.saga_state (
    application_id UUID PRIMARY KEY REFERENCES origination.loan_applications(id),
    current_step   TEXT NOT NULL,            -- SCORING, DECISION, OPEN_CREDIT
    step_status    TEXT NOT NULL,            -- STARTED, COMPLETED, FAILED
    payload        JSONB,
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE origination.application_timeline (
    id             BIGSERIAL PRIMARY KEY,
    application_id UUID NOT NULL,
    step           TEXT NOT NULL,
    status         TEXT NOT NULL,
    message        TEXT,
    occurred_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_app_applicant ON origination.loan_applications(applicant_id);
CREATE INDEX idx_timeline_app ON origination.application_timeline(application_id);
```

**Flujo**
```
POST /applicants → INSERT applicants(PENDING)
POST /document   → OCR (mock) → UPDATE ocr_payload, kyc_status
POST /loan-applications → INSERT loan_applications(PROCESSING) + saga_state
  Saga avanza → INSERT application_timeline por paso → UPDATE status final
  Cifrado: document_number/phone/email con AES-256-GCM; búsqueda por *_hash.
```

---

## 3. `scoring` (Redis) — svc 2: Feature store, score y caché de buró

> Redis no usa DDL; se define por convención de claves.

| Clave | Tipo | TTL | Contenido |
|---|---|---|---|
| `features:{applicantId}` | Hash | 1h | feature vector consolidado |
| `score:{scoreId}` | JSON string | 90d | score + SHAP + PD |
| `score:byapp:{applicationId}` | string | 90d | índice applicationId→scoreId |
| `bureau:{docHash}` | JSON string | 24h | reporte normalizado del buró |
| `bureau:breaker:state` | string | — | CLOSED / OPEN / HALF_OPEN |
| `bureau:rl:{epochSec}` | counter | 1s | rate limiter (8 rps) |
| `model:active` | JSON string | ∞ | `{ "slot":"BLUE", "version":"v3.2.1" }` |
| `fraud:{applicationId}` | JSON string | 30d | resultado de fraude |

**Ejemplo `score:{scoreId}`**
```json
{ "score":712, "riskBand":"B", "pd":0.083, "modelVersion":"v3.2.1",
  "partialData":false, "shap":[{"feature":"utilities.onTimeRatio","contribution":0.21}],
  "computedAt":"2026-06-16T19:00:12Z" }
```
**Flujo**
```
FeatureOrchestrator → HSET features:{applicantId}
bureau módulo → GET bureau:{docHash} (cache) | SOAP mock → SETEX 24h
ModelServer(model:active) → SET score:{scoreId} (TTL 90d)
La verdad AUDITABLE del score se emite en scoring.score.completed → compliance_db (inmutable).
```
> Redis es acelerador, **no** la fuente de verdad auditable: esa vive en `compliance_db`.

---

## 4. `credit_db` (PostgreSQL) — svc 3: Decisión + Event Sourcing + Ledger

Tres áreas en una BD lógica: **decisión**, **event store + proyecciones (CQRS)** y **contabilidad**.

### 4.1 Decisión (inciso III)
```sql
CREATE SCHEMA credit;

CREATE TABLE credit.decisions (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id   UUID NOT NULL,
    score_id         UUID NOT NULL,
    correlation_id   UUID NOT NULL,
    score            INT NOT NULL,
    risk_band        CHAR(1) NOT NULL,
    requested_amount NUMERIC(14,2) NOT NULL,
    approved_amount  NUMERIC(14,2),
    interest_rate    NUMERIC(6,4),
    term_months      INT,
    outcome          TEXT NOT NULL CHECK (outcome IN
                       ('AUTO_APPROVED','REJECTED','MANUAL_PENDING','MANUAL_APPROVED','MANUAL_REJECTED')),
    requires_manual  BOOLEAN NOT NULL DEFAULT false,
    reasons          JSONB NOT NULL,
    partial_data     BOOLEAN NOT NULL DEFAULT false,   -- buró en fallback
    evidence         JSONB,                            -- score+SHAP+buró precargados (revisión manual)
    decided_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_dec_manual ON credit.decisions(outcome) WHERE requires_manual;
```

### 4.2 Event Store (append-only) + Snapshots — CQRS write side
```sql
CREATE TABLE credit.credit_events (
    global_seq    BIGSERIAL PRIMARY KEY,
    event_id      UUID NOT NULL UNIQUE,
    aggregate_id  UUID NOT NULL,                       -- creditId
    aggregate_ver INT  NOT NULL,
    event_type    TEXT NOT NULL,                       -- CreditOpened, CreditDisbursed, ...
    payload       JSONB NOT NULL,
    metadata      JSONB NOT NULL,                      -- correlationId, causationId, signature(JWS)
    occurred_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (aggregate_id, aggregate_ver)               -- concurrencia optimista
);
CREATE TABLE credit.credit_snapshots (
    aggregate_id  UUID PRIMARY KEY,
    aggregate_ver INT NOT NULL,
    state         JSONB NOT NULL,
    taken_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Inmutabilidad
CREATE OR REPLACE FUNCTION credit.block_mutation() RETURNS trigger AS $$
BEGIN RAISE EXCEPTION 'credit_events es append-only'; END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_credit_immutable BEFORE UPDATE OR DELETE ON credit.credit_events
    FOR EACH ROW EXECUTE FUNCTION credit.block_mutation();
```
**Catálogo de eventos del agregado `Credit`**
| Evento | Payload clave |
|---|---|
| `CreditOpened` | applicantId, principal, rate, termMonths, decisionId, scoreId |
| `CreditDisbursed` | disbursementId, channel, amount, settledAt |
| `PaymentRegistered` | installmentNo, amount, paidAt |
| `CreditDelinquent` | daysPastDue, overdueAmount |
| `CreditRestructured` | newSchedule, reason |
| `CreditClosed` / `CreditWrittenOff` | closedAt / writeOffAmount |

### 4.3 Proyecciones (CQRS read side) + Ledger + Desembolso
```sql
CREATE TABLE credit.credit_view (
    credit_id      UUID PRIMARY KEY,
    applicant_id   UUID NOT NULL,
    principal      NUMERIC(14,2) NOT NULL,
    outstanding    NUMERIC(14,2) NOT NULL,
    rate           NUMERIC(6,4) NOT NULL,
    term_months    INT NOT NULL,
    status         TEXT NOT NULL,        -- OPENED,DISBURSED,ACTIVE,DELINQUENT,CLOSED,WRITTEN_OFF
    days_past_due  INT NOT NULL DEFAULT 0,
    last_event_seq BIGINT NOT NULL       -- checkpoint de proyección (idempotencia)
);

CREATE TABLE credit.installments (
    credit_id      UUID NOT NULL,
    number         INT NOT NULL,
    due_date       DATE NOT NULL,
    principal      NUMERIC(14,2) NOT NULL,
    interest       NUMERIC(14,2) NOT NULL,
    paid_amount    NUMERIC(14,2) NOT NULL DEFAULT 0,
    status         TEXT NOT NULL DEFAULT 'PENDING',  -- PENDING,PARTIAL,PAID,OVERDUE
    PRIMARY KEY (credit_id, number)
);

-- Contabilidad double-entry (simplificada para MVP)
CREATE TABLE credit.journal_entries (
    id          BIGSERIAL PRIMARY KEY,
    credit_id   UUID,
    txn_id      UUID NOT NULL,                     -- agrupa asiento balanceado
    account     TEXT NOT NULL,                     -- ASSET_LOAN, CASH, INTEREST_INCOME, PROVISION
    direction   CHAR(1) NOT NULL CHECK (direction IN ('D','C')),
    amount      NUMERIC(16,2) NOT NULL CHECK (amount > 0),
    entry_type  TEXT NOT NULL,                     -- DISBURSEMENT, ACCRUAL, PAYMENT, WRITE_OFF
    posted_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Desembolso (inciso IV) — idempotente
CREATE TABLE credit.disbursements (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    credit_id       UUID NOT NULL,
    idempotency_key TEXT NOT NULL UNIQUE,
    amount          NUMERIC(14,2) NOT NULL,
    channel         TEXT NOT NULL CHECK (channel IN ('WALLET','BANK','CORRESPONDENT')),
    destination     JSONB NOT NULL,                -- datos del canal
    status          TEXT NOT NULL DEFAULT 'PENDING'
                     CHECK (status IN ('PENDING','COMPLETED','FAILED','REVERSED')),
    provider_ref    TEXT,
    settled_at      TIMESTAMPTZ,
    requested_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_creditview_status ON credit.credit_view(status);
CREATE INDEX idx_journal_txn ON credit.journal_entries(txn_id);
CREATE INDEX idx_inst_due ON credit.installments(due_date, status);
```

**Flujo CQRS+ES**
```
COMANDO: POST /credits/decision → INSERT decisions
  AUTO_APPROVED → append CreditOpened (firmado por compliance-svc) → publica credit.events
PROYECCIÓN: consumer credit.events → UPSERT credit_view / installments (guarda last_event_seq)
DESEMBOLSO: POST /disbursements (idempotency-key) → mock proveedor → append CreditDisbursed
  → asiento: D ASSET_LOAN | C CASH
PAGO (de servicing): consume collections.payment.registered → append PaymentRegistered
  → asiento: D CASH | C ASSET_LOAN ; UPDATE installments
REPROYECCIÓN: TRUNCATE proyecciones → replay credit_events desde seq 0.
Invariante contable: por cada txn_id, SUM(D)=SUM(C).
```

---

## 5. `servicing_db` (PostgreSQL) — svc 4: Cobranza + Notificaciones + Gamificación

```sql
CREATE SCHEMA servicing;

-- Cobranza (inciso V)
CREATE TABLE servicing.collection_cases (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    credit_id      UUID NOT NULL,
    applicant_id   UUID NOT NULL,
    days_past_due  INT NOT NULL DEFAULT 0,
    overdue_amount NUMERIC(14,2) NOT NULL,
    stage          TEXT NOT NULL DEFAULT 'EARLY'
                    CHECK (stage IN ('EARLY','MID','LATE','LEGAL','RESOLVED')),
    opened_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    closed_at      TIMESTAMPTZ
);
CREATE TABLE servicing.agreements (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id      UUID NOT NULL REFERENCES servicing.collection_cases(id),
    type         TEXT NOT NULL,            -- PAYMENT_PLAN, RESTRUCTURE
    new_schedule JSONB NOT NULL,
    status       TEXT NOT NULL DEFAULT 'PROPOSED',
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Notificaciones omnicanal
CREATE TABLE servicing.notifications (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel       TEXT NOT NULL CHECK (channel IN ('WHATSAPP','SMS','EMAIL')),
    recipient     BYTEA NOT NULL,          -- AES-256 (teléfono/email)
    template      TEXT NOT NULL,
    data          JSONB,
    status        TEXT NOT NULL DEFAULT 'QUEUED',  -- QUEUED,SENT,DELIVERED,FAILED
    correlation_id UUID,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Gamificación (inciso VIII)
CREATE TABLE servicing.courses (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title       TEXT NOT NULL,
    points      INT NOT NULL,
    rate_bonus  NUMERIC(5,4) NOT NULL DEFAULT 0     -- bonificación de tasa al completar
);
CREATE TABLE servicing.user_progress (
    applicant_id UUID NOT NULL,
    course_id    UUID NOT NULL REFERENCES servicing.courses(id),
    status       TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    completed_at TIMESTAMPTZ,
    PRIMARY KEY (applicant_id, course_id)
);
CREATE TABLE servicing.rewards (
    applicant_id   UUID PRIMARY KEY,
    total_points   INT NOT NULL DEFAULT 0,
    rate_bonus_acc NUMERIC(5,4) NOT NULL DEFAULT 0,
    score_boost    INT NOT NULL DEFAULT 0,
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_cases_stage ON servicing.collection_cases(stage, days_past_due);
```

**Flujo**
```
Consume credit.events.CreditDelinquent → UPSERT collection_cases (stage por DPD)
  → programa notificaciones (WHATSAPP→SMS→EMAIL) → mock proveedor → status
  → acuerdo: INSERT agreements; si RESTRUCTURE → llama credit-svc.restructure
  → pago: publica collections.payment.registered (credit/investor consumen)
Gamificación: complete course → UPSERT rewards → publica gamification.rate.bonus.granted
```

---

## 6. `investor_db` (PostgreSQL) — svc 5: Métricas de cartera en tiempo real

> Sin TimescaleDB: PostgreSQL plano + índice por tiempo basta para el MVP. Las proyecciones se recalculan al consumir eventos.

```sql
CREATE SCHEMA investor;

CREATE TABLE investor.funds (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name       TEXT NOT NULL,
    committed  NUMERIC(16,2) NOT NULL,
    deployed   NUMERIC(16,2) NOT NULL DEFAULT 0,
    target_irr NUMERIC(6,4)
);

-- Snapshots de métricas (serie de tiempo simple)
CREATE TABLE investor.portfolio_metrics (
    ts               TIMESTAMPTZ NOT NULL,
    segment          CHAR(1),                 -- banda de riesgo
    outstanding      NUMERIC(16,2),
    irr              NUMERIC(6,4),
    par30            NUMERIC(6,4),
    par90            NUMERIC(6,4),
    delinquency_rate NUMERIC(6,4),
    active_credits   INT,
    PRIMARY KEY (ts, segment)
);

CREATE TABLE investor.cashflow_projection (
    fund_id UUID NOT NULL,
    month   DATE NOT NULL,
    inflow  NUMERIC(16,2) NOT NULL,
    outflow NUMERIC(16,2) NOT NULL,
    net     NUMERIC(16,2) NOT NULL,
    PRIMARY KEY (fund_id, month)
);

CREATE INDEX idx_metrics_ts ON investor.portfolio_metrics(ts DESC);
```
**Flujo**
```
Consume credit.events.*, disbursement.completed, collections.payment.registered
  → recalcula y hace INSERT en portfolio_metrics (append por ts)
GET /portfolio/metrics → último snapshot + agregados
WS /portfolio/stream → push de nuevos puntos a inversionistas conectados (read-only).
```

---

## 7. `compliance_db` (PostgreSQL append-only) — svc 6: Auditoría + Firma + Regulador

```sql
CREATE SCHEMA compliance;

-- Bitácora inmutable (hash chain + firma) — retención 10 años
CREATE TABLE compliance.audit_log (
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
CREATE INDEX idx_audit_corr ON compliance.audit_log(correlation_id);

-- Inmutabilidad
CREATE OR REPLACE FUNCTION compliance.block_mutation() RETURNS trigger AS $$
BEGIN RAISE EXCEPTION 'audit_log es append-only'; END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_audit_immutable BEFORE UPDATE OR DELETE ON compliance.audit_log
    FOR EACH ROW EXECUTE FUNCTION compliance.block_mutation();

-- Reportes al regulador
CREATE TABLE compliance.report_jobs (
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
CREATE TABLE compliance.bias_audits (
    id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    period    DATE NOT NULL,
    cohort    TEXT NOT NULL,                      -- género, edad, región
    metric    TEXT NOT NULL,                      -- approval_rate, avg_score
    value     NUMERIC(8,4) NOT NULL,
    disparity NUMERIC(8,4),
    flagged   BOOLEAN NOT NULL DEFAULT false
);
```
**Llaves de firma:** en local, par de claves generado con OpenSSL (`./keys/signing-priv.pem` / `signing-pub.pem`), nunca en git. La pública se expone para verificación. En producción → HSM.

**Flujo y verificación**
```
Consume scoring.score.completed, decision.made, credit.*, disbursement.completed
  → hash = SHA256(prev_hash || canonical(payload))
  → firma JWS (clave local) → INSERT audit_log + copia a ./worm (solo lectura)
GET /audit/verify/{recordId}: recorre la cadena (hash[i]==SHA256(hash[i-1]||payload[i]))
  y valida cada firma → detecta cualquier manipulación.
POST /reports/scoring-traceability: arma export (inputs+pesos+decisión) firmado → READY.
```

---

## 8. Estrategia transversal de datos (local)

### 8.1 Inicialización en Docker Compose
```
postgres (1 contenedor) → init.sql crea: origination_db, credit_db, servicing_db,
                          investor_db, compliance_db + un usuario por servicio.
redis    (1 contenedor) → namespaces por prefijo de clave (features:, score:, bureau:, model:).
redpanda (1 contenedor) → topics: origination.events, scoring.events, credit.events,
                          disbursement.events, collections.events, gamification.events.
```

### 8.2 Cifrado AES-256 (libre, local)
- **Columnas cifradas:** `document_number`, `phone`, `email`, `recipient`, `destination`.
- **Mecanismo:** `node:crypto` AES-256-GCM; clave maestra en `.env` (local) → Vault/HSM (prod).
- **Búsqueda:** por `*_hash` (HMAC-SHA256), nunca desencriptando en consultas.

### 8.3 Consistencia entre servicios (Saga + eventos)
```
Fuerte dentro del agregado (credit_events con versión optimista).
Eventual entre BDs: cada servicio reacciona a eventos y mantiene su propia copia/proyección.
Idempotencia: consumidores deduplican por eventId y guardan last_event_seq.
```

### 8.4 Retención y migraciones
| Dato | Retención | Estrategia local |
|---|---|---|
| `audit_log`, `credit_events` | 10 años (regulatorio) | append-only + copia WORM en `./worm` |
| OLTP general | — | volcado/backup manual del volumen de Postgres |
| Redis | TTL (1h–90d) | volátil, reconstruible |

- **Migraciones:** Prisma Migrate / TypeORM (TS) y Alembic (Python scoring) — carpeta `migrations/` por servicio.
- **Eventos:** JSON-Schema/Avro en `libs/proto`, compatibilidad **solo aditiva**.

---

## 9. Tabla maestra de entidades (6 BDs)

| BD | Entidades | Inmutable | Cifrado PII | Produce / Consume eventos |
|---|---|---|---|---|
| origination_db | applicants, loan_applications, saga_state, timeline | No | Sí | produce origination.*; consume scoring/decision |
| scoring (Redis) | features, score, bureau cache, model, fraud | No | No | produce scoring.* |
| credit_db | decisions, credit_events, snapshots, credit_view, installments, journal_entries, disbursements | **Sí (ES)** | No | produce decision/credit/disbursement.*; consume scoring, collections |
| servicing_db | collection_cases, agreements, notifications, courses, user_progress, rewards | No | Sí (contacto) | produce collections/gamification.*; consume credit.Delinquent |
| investor_db | funds, portfolio_metrics, cashflow_projection | No | No | consume credit/disbursement/collections |
| compliance_db | audit_log, report_jobs, bias_audits | **Sí (append-only)** | No | consume TODOS los .events |

---

_Fin — Diseño de Bases de Datos NeoLend v2.0 (6 microservicios, local-first)_
