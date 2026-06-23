# NeoLend Financial Corp. — Plataforma FinTech de Crédito Digital

Monorepo de la plataforma de crédito digital con scoring por fuentes alternativas.
Arquitectura de **6 microservicios** + frontend, **100% local y gratuita** (Docker Compose).

> Documentación completa en [`docs/`](docs/):
> [Propuesta Técnica](docs/PROPUESTA-TECNICA.md) · [Diseño de BD](docs/DISENO-BASES-DE-DATOS.md) · [Plan de Trabajo](docs/PLAN-DE-TRABAJO.md) · [Frontend](docs/FRONTEND.md) · [BASE-GUIDE](docs/BASE-GUIDE.MD)

---

## Arquitectura (6 microservicios)

| # | Servicio | Puerto | Stack | Responsabilidad | Incisos |
|---|---|---|---|---|---|
| 1 | `gateway-origination-svc` | 8101 (+gateway 8080) | NestJS | Gateway + Identidad/KYC + Saga | I |
| 2 | `scoring-svc` | 8102 | FastAPI | Scoring + buró(CB) + alt-data + fraude + SHAP | II, VII |
| 3 | `credit-svc` | 8103 | NestJS | Decisión + CQRS/ES + desembolso + ledger | III, IV |
| 4 | `servicing-svc` | 8104 | NestJS | Cobranza + notificaciones + gamificación | V, VIII |
| 5 | `investor-svc` | 8105 | NestJS | Portal inversionistas en tiempo real | VI |
| 6 | `compliance-svc` | 8106 | NestJS | Auditoría + firma + reportes regulador | MVP 4 |

Infraestructura local: **PostgreSQL** (5 BDs lógicas) · **Redis** · **Redpanda** (API Kafka) · 3 **mocks** (buró SOAP, billetera, WhatsApp) · **frontend** React+Vite (`:5173`).

---

## Requisitos

- Docker Desktop
- Node.js 20 + pnpm 9 (solo para desarrollo fuera de contenedor)
- Python 3.12 (solo para `scoring-svc` fuera de contenedor)

## Arranque rápido (entorno local completo)

```bash
cp .env.example .env
docker compose up -d --build
```

Verificar salud de los 6 servicios:

```bash
for p in 8101 8102 8103 8104 8105 8106; do curl -s localhost:$p/health; echo; done
```

- Frontend: http://localhost:5173
- OpenAPI por servicio: `services/<svc>/openapi.yaml`

## Desarrollo (sin Docker)

```bash
pnpm install
pnpm --filter @neolend/ts-common --filter @neolend/ts-events build
pnpm lint           # ESLint en todo el workspace
pnpm format         # Prettier
```

`scoring-svc` (Python):

```bash
cd services/scoring-svc
pip install -e ".[dev]"
uvicorn app.main:app --reload --port 8102
```

---

## Estructura

```
docs/        Documentación (propuesta, BD, plan, frontend, ADRs, C4, evidencia)
infra/       init.sql de Postgres (5 BDs lógicas)
libs/        Código compartido (ts-common, ts-events, proto) — fuente única, no duplicar
services/    Los 6 microservicios
clients/     Frontend (web-portal)
mocks/       Mocks locales de proveedores externos
```

## Convenciones (resumen)

- **Database per service**, sin FK entre servicios; integración por REST + eventos (Redpanda).
- Eventos con **envelope estándar** + `correlationId` (ver `docs/PLAN-DE-TRABAJO.md §4`).
- Errores en **RFC 7807**; dinero en `NUMERIC(14,2)`; fechas ISO-8601 UTC.
- Un dueño por servicio (`.github/CODEOWNERS`); PR + CI obligatorio; `main` siempre verde.

## Estado del proyecto

Baseline inicializado (Fase 0). Los servicios exponen `/health`; los endpoints de negocio
se implementan por fase según [`docs/PLAN-DE-TRABAJO.md`](docs/PLAN-DE-TRABAJO.md).
