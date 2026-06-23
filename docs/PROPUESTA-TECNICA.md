# Propuesta Técnica de Desarrollo — NeoLend Financial Corp.

> **Plataforma FinTech de Crédito Digital — Arquitectura de 6 Microservicios (MVP Local-First)**
> Documento de Arquitectura y Diseño Técnico (SAD)
> Versión 2.0 — Hackatón Final 16/06/2026
> **Restricción de diseño:** máximo **6 microservicios** · **100% local y gratuito** (localhost) · desarrollo rápido
> **Requerimientos fuente (intocables):** [BASE-GUIDE.MD](BASE-GUIDE.MD)

---

## 0. Carátula

| Campo | Detalle |
|---|---|
| **Proyecto** | NeoLend Financial Corp. — Plataforma de Crédito Digital |
| **Documento** | Software Architecture Document (SAD) — versión consolidada de 6 servicios |
| **Arquitectura** | Microservicios (6 bounded contexts) + Event-Driven + CQRS/Event Sourcing en `credit-svc` |
| **Entorno objetivo de esta versión** | **Localhost / Docker Compose** — herramientas libres y gratuitas |
| **Equipo** | _NeoLend Engineering Team_ (6 developers) |
| **Integrantes** | _(completar: Nombre y Apellido de cada asistente)_ |
| **Repositorios GitHub** | _(enlazar mono-repo del grupo)_ |
| **Fecha** | 16/06/2026 |

---

## 1. Decisión arquitectónica central: de 20 capacidades a 6 microservicios

La versión 1.0 modelaba ~20 servicios (granularidad de producción a gran escala). Para un **MVP de desarrollo rápido y ejecución local**, esa granularidad introduce sobrecosto operativo (20 contenedores, 20 pipelines, latencia de red interna, complejidad de orquestación) **sin aportar valor al MVP**. Aplicamos un principio profesional de diseño:

> **"Empieza con servicios del tamaño de un equipo (bounded context), no del tamaño de una función. Divide más tarde, cuando el dominio y la carga lo justifiquen."** (Monolito modular interno → microservicio cohesionado.)

Consolidamos por **Bounded Context (DDD)** y por **cohesión de datos y ciclo de vida**, respetando las restricciones **no negociables** de BASE-GUIDE:
- El **motor de scoring es un microservicio independiente** (exigido explícitamente).
- El **servicio de créditos usa CQRS + Event Sourcing** (recomendado y adoptado para trazabilidad).
- **Cada microservicio gestiona su propia base de datos** (lógicamente; ver §6 del diseño de datos).

### 1.1 Mapa de consolidación (qué capacidad vive en qué servicio)

| Capacidad original (v1.0) | Servicio consolidado (v2.0) | Justificación |
|---|---|---|
| identity, origination (Saga), BFF | **1. `gateway-origination-svc`** | Entrada del sistema + orquestación de la solicitud: mismo ciclo de vida (la solicitud) |
| scoring, bureau-gateway, alt-data, fraud | **2. `scoring-svc`** | Todo el cálculo de riesgo en tiempo real; el fraude y el buró son **insumos del score** |
| decision, credit (CQRS+ES), disbursement, ledger | **3. `credit-svc`** | Núcleo financiero transaccional: decidir → abrir crédito → desembolsar → contabilizar |
| collections, notification, gamification | **4. `servicing-svc`** | Ciclo de vida **post-desembolso** del cliente: cobranza, comunicación y fidelización/educación |
| investor-portal | **5. `investor-svc`** | Vista analítica en tiempo real para inversionistas (read-side, proyecciones) |
| audit, signing, regulator-export | **6. `compliance-svc`** | Cumplimiento regulatorio: bitácora inmutable, firma digital y reportes a la Superintendencia |

> **El API Gateway no se cuenta como microservicio de negocio**: en local es un reverse-proxy ligero (o se integra como módulo de borde en `gateway-origination-svc`). Justificación en §4.

### 1.2 Principios que rigen la consolidación
- **Alta cohesión, bajo acoplamiento:** cada servicio agrupa lo que cambia junto y por la misma razón.
- **Modularidad interna obligatoria:** dentro de cada servicio, los sub-dominios son **módulos separados** (carpetas/módulos NestJS), de modo que **extraer un módulo a su propio microservicio en el futuro sea mecánico** (escalabilidad evolutiva, sin reescritura).
- **Contratos estables:** los límites entre servicios son contratos (REST + eventos), no llamadas a funciones internas. La consolidación no rompe la posibilidad de dividir después.

---

## 2. Cumplimiento de requerimientos de BASE-GUIDE (matriz de trazabilidad)

> **Garantía:** los 6 servicios cubren el 100% de los incisos. Nada de BASE-GUIDE se elimina; se reorganiza.

### 2.1 Requerimientos funcionales

| # | Requerimiento (BASE-GUIDE) | Servicio responsable | Módulo interno |
|---|---|---|---|
| I | Solicitar crédito en < 3 min subiendo solo el documento | `gateway-origination-svc` | `identity`, `origination` (Saga) |
| II | Score en tiempo real (buró + servicios + billeteras + e-commerce) + SHAP | `scoring-svc` | `features`, `bureau`, `altdata`, `model`, `explain` |
| III | Aprobación automática ≤ USD 500 en < 90s; mayores → manual | `credit-svc` | `decision` |
| IV | Desembolso multicanal (billetera/banco/corresponsal) | `credit-svc` | `disbursement` |
| V | Cobranza: recordatorios WhatsApp/SMS/email, acuerdos, reestructuración, reporte a buró | `servicing-svc` | `collections`, `notification` |
| VI | Portal de inversionistas en tiempo real (TIR, morosidad, flujo de caja) | `investor-svc` | `metrics`, `projections`, `stream` |
| VII | Detección de fraude en tiempo real (biometría vs identidades robadas) | `scoring-svc` | `fraud` (procesamiento local — ver data residency) |
| VIII | Educación financiera gamificada que mejora el score y bonifica tasa | `servicing-svc` | `gamification` |

### 2.2 Requerimientos no funcionales y contexto adicional

| Requerimiento NF / Contexto | Dónde se cumple | Cómo (versión local) |
|---|---|---|
| Pipeline scoring p95 < 60s; auto-aprob. < 90s | `scoring-svc` + `credit-svc` | scatter-gather paralelo, caché, timeouts, modelo en memoria |
| Cifrado AES-256 datos financieros | Todos | cifrado de columnas a nivel app (libre, `node:crypto`) + TLS local |
| Logs inmutables auditables 10 años + firma digital | `compliance-svc` | tabla append-only + hash chain + firma JWS (clave local) |
| Reportes automáticos al ente regulador | `compliance-svc` | módulo `regulator` (export firmado) |
| **Scoring como microservicio independiente con update sin downtime (blue/green ML)** | `scoring-svc` | dos slots de modelo (BLUE/GREEN) + switch atómico |
| **CQRS + Event Sourcing en créditos** | `credit-svc` | event store en PostgreSQL + proyecciones |
| **Circuit breaker para buró SOAP (10 rps, 8–15s)** | `scoring-svc` (módulo `bureau`) | breaker + rate-limit + caché Redis + fallback |
| Activo-activo 2 regiones | Diseño documentado (§9) | **local = single-node**; el diseño multi-región se documenta como evolución (ver §9) |
| IA explicable y no discriminatoria (auditoría sesgo mensual) | `scoring-svc` + `compliance-svc` | SHAP por decisión + reporte de sesgo |
| Data residency biométrica (no sale del país) | `scoring-svc` (módulo `fraud`) | procesamiento **local/on-prem**; sin librerías cloud extranjeras |
| Trazabilidad firmada para Superintendencia (MVP 4) | `compliance-svc` | inputs + pesos modelo + decisión + firma, encadenados por hash |

> **Nota honesta sobre activo-activo:** el requerimiento es **arquitectónico/de continuidad**. En esta versión **localhost** se ejecuta un solo nodo; el diseño activo-activo se entrega como **documento de despliegue** (§9) y los servicios se construyen *stateless* y *event-driven* para que esa topología sea posible sin reescritura. Esto se declara explícitamente para no presentar como "implementado" algo que en local es de diseño.

---

## 3. Stack tecnológico — 100% local y gratuito

| Capa | Tecnología (libre) | Por qué |
|---|---|---|
| **Frontend web** | React + Vite + TypeScript | Rápido, gratuito; cubre portal analista e inversionista |
| **Frontend móvil** | Expo (React Native) — *opcional en MVP* | Gratuito; para demo basta PWA web responsive |
| **5 microservicios** | **Node.js + NestJS + TypeScript** | Un solo stack = velocidad; NestJS impone modularidad limpia |
| **Scoring** | **Python + FastAPI** | Ecosistema ML/SHAP; único servicio en Python (justificado) |
| **Base de datos** | **PostgreSQL 16** (una instancia, **una BD lógica por servicio**) | Libre; `JSONB` cubre datos flexibles → no necesitamos MongoDB |
| **Caché / breaker state / feature store** | **Redis 7** | Libre, ligero |
| **Event bus** | **Redpanda** (API Kafka, single-binary) | Kafka-compatible pero liviano para local; gratuito. *(Alternativa aún más simple: Redis Streams)* |
| **Auth** | **JWT propio** (`@nestjs/jwt`, librería `jose`) | Evita levantar Keycloak; suficiente y gratuito en local |
| **Firma digital** | `node:crypto` / `jose` (claves locales OpenSSL) | JWS verificable sin HSM (HSM = evolución productiva) |
| **API Gateway local** | NestJS como borde / proxy ligero | Sin coste; un solo punto de entrada |
| **Orquestación local** | **Docker Compose** | Un comando levanta todo; gratuito |
| **Observabilidad (ligera)** | Logs estructurados (pino) + healthchecks | Sin coste; OTel opcional |
| **Mocks** | Servicio `mocks` propio (buró SOAP, billetera, WhatsApp) | Permite demo sin proveedores reales |

> **Regla del entorno local:** todo debe levantar con `docker compose up` sin cuentas, API keys de pago ni servicios cloud. Las integraciones externas (buró, billeteras, WhatsApp) se sustituyen por **mocks locales**.

---

## 4. Arquitectura — Modelo C4 (adaptado a 6 servicios)

### 4.1 Nivel 1 — Contexto

```
 Solicitante (PWA/App) ─┐                                   ┌─ Buró SOAP (MOCK local)
 Analista ──────────────┤                                   ├─ Servicios públicos / e-commerce (MOCK)
 Inversionista ─────────┤   NEOLEND PLATFORM (localhost)    ├─ Billeteras / corresponsales (MOCK)
 Gestor de cobranza ────┤   6 microservicios + frontend     ├─ WhatsApp/SMS/Email (MOCK)
 Superintendencia ──────┘                                   └─ Base identidades robadas (MOCK local)
```

### 4.2 Nivel 2 — Contenedores

```
┌───────────────────────── FRONTEND (React/Vite) ──────────────────────────┐
│  App Solicitante · Consola Analista · Portal Inversionista · Cobranza      │
└───────────────────────────────────┬───────────────────────────────────────┘
                                     │  REST/JSON + WebSocket
                        ┌────────────▼─────────────┐
                        │   API GATEWAY (borde)     │  AuthN JWT · routing · CORS
                        └────────────┬─────────────┘
        ┌──────────────┬─────────────┼──────────────┬───────────────┬─────────────┐
        ▼              ▼             ▼              ▼               ▼             ▼
 ┌────────────┐ ┌────────────┐ ┌──────────┐  ┌────────────┐ ┌────────────┐ ┌────────────┐
 │1 gateway-  │ │2 scoring   │ │3 credit  │  │4 servicing │ │5 investor  │ │6 compliance│
 │ origination│ │ (Py/SHAP)  │ │(CQRS+ES) │  │(cobr+notif │ │ (portal RT)│ │(audit+firma│
 │ (id+saga)  │ │ buró/fraude│ │ desemb.  │  │ +gamif)    │ │            │ │ +regulador)│
 └─────┬──────┘ └─────┬──────┘ └────┬─────┘  └─────┬──────┘ └─────┬──────┘ └─────┬──────┘
       │              │             │              │              │              │
       └──────────────┴──── EVENT BUS (Redpanda / Kafka API) ─────┴──────────────┘
       │              │             │              │              │              │
   PostgreSQL: origination_db  scoring (Redis)  credit_db    servicing_db  investor_db  compliance_db
                                + Redis cache    (+eventstore)
```

### 4.3 Nivel 3 — Módulos internos (preparados para futura extracción)

```
1 gateway-origination-svc:  [gateway] [identity] [origination(saga)]
2 scoring-svc:              [features] [bureau(circuit-breaker)] [altdata] [fraud] [model(blue/green)] [explain(SHAP)]
3 credit-svc:               [decision] [credit(command/ES)] [credit(query/projections)] [disbursement] [ledger]
4 servicing-svc:            [collections] [notification] [gamification]
5 investor-svc:             [metrics] [projections] [stream(ws)]
6 compliance-svc:           [audit(hash-chain)] [signing(JWS)] [regulator(export)]
```
> Cada `[módulo]` es una carpeta/módulo NestJS con su frontera clara. Extraerlo a un microservicio propio mañana = mover la carpeta + exponer su API. **Escalabilidad sin reescritura.**

---

## 5. Catálogo de los 6 microservicios

> Puertos locales: gateway `8080`; servicios `8101`–`8106`; scoring (Python) `8102`. Cada servicio expone `/health`, `/docs` (OpenAPI) y `/metrics`.

| # | Servicio | Puerto | Stack | BD propia | Incisos cubiertos |
|---|---|---|---|---|---|
| 1 | `gateway-origination-svc` | 8101 (+gateway 8080) | NestJS | `origination_db` | I |
| 2 | `scoring-svc` | 8102 | FastAPI | `scoring` (Redis) | II, VII |
| 3 | `credit-svc` | 8103 | NestJS | `credit_db` (+ event store) | III, IV |
| 4 | `servicing-svc` | 8104 | NestJS | `servicing_db` | V, VIII |
| 5 | `investor-svc` | 8105 | NestJS | `investor_db` | VI |
| 6 | `compliance-svc` | 8106 | NestJS | `compliance_db` | Contexto b) / MVP 4 |

---

## 6. Diseño detallado por microservicio

### 6.1 `gateway-origination-svc` (8101) — Identidad + Solicitud (Saga) + Borde

**Responsabilidad:** punto de entrada (auth JWT, routing), onboarding/KYC con OCR del documento, y orquestación de la solicitud de crédito mediante una **Saga** que coordina scoring → credit.

**Endpoints**
```
# Auth / borde
POST   /v1/auth/login                      # emite JWT (roles: applicant/analyst/investor/collector/regulator)

# Identidad / KYC
POST   /v1/applicants                      # crea solicitante
POST   /v1/applicants/{id}/document        # sube documento (multipart) → OCR (mock)
GET    /v1/applicants/{id}

# Solicitud de crédito (orquestación)
POST   /v1/loan-applications               # inicia solicitud (Saga) → 202
GET    /v1/loan-applications/{id}          # estado + progreso (timeline)
```

**Saga de originación**
```
t0  POST /loan-applications  (correlationId = applicationId)
 1. → scoring-svc POST /v1/scores           (incluye fraude + buró + alt-data internos)
 2. → credit-svc  POST /v1/credits/decision (score → auto/manual)
 3. credit-svc abre el crédito si AUTO_APPROVED
 Compensación: si un paso falla → estado FAILED + evento *.failed
Eventos: publica origination.application.submitted; consume scoring/decision/credit.
```

**Esquema request — iniciar solicitud**
```json
POST /v1/loan-applications
{ "applicantId": "uuid", "requestedAmount": 450.00, "currency": "USD", "termMonths": 6 }
```
**Response (202)**
```json
{ "applicationId": "uuid", "status": "PROCESSING", "pollUrl": "/v1/loan-applications/uuid" }
```

---

### 6.2 `scoring-svc` (8102, Python/FastAPI) — Motor de riesgo (independiente, OBLIGATORIO)

**Responsabilidad:** calcular el score crediticio en tiempo real combinando **buró (con circuit breaker), datos alternativos, comportamiento de billetera/e-commerce y señales de fraude**, con **explicabilidad SHAP** y **blue/green del modelo**.

**Endpoints**
```
POST   /v1/scores                          # calcula score (síncrono, timeout 30s)
GET    /v1/scores/{scoreId}                # score + SHAP
POST   /v1/fraud/assess                     # evaluación de fraude (módulo interno)
GET    /v1/bureau/health/breaker            # estado del circuit breaker
GET    /v1/model/active                     # modelo activo (slot/version)
POST   /v1/model/promote                     # blue/green: GREEN → BLUE (sin downtime)
```

**Request**
```json
POST /v1/scores
{
  "applicationId": "uuid", "applicantId": "uuid", "documentNumber": "***4567",
  "altData": { "utilities": {"onTimeRatio":0.94}, "wallet": {"avgMonthlyInflow":380}, "ecommerce": {"orders6m":9} },
  "fraud": { "selfieRef": "local://...", "deviceFingerprint": "..." }
}
```
**Response**
```json
{
  "scoreId": "uuid", "score": 712, "riskBand": "B", "probabilityOfDefault": 0.083,
  "modelVersion": "v3.2.1", "modelSlot": "BLUE", "partialData": false,
  "fraud": { "decision": "PASS", "fraudScore": 0.07 },
  "explanation": { "shap": [{"feature":"utilities.onTimeRatio","contribution":0.21}], "baseValue": 0.5 },
  "computedAt": "2026-06-16T19:00:12Z"
}
```
**Eventos:** publica `scoring.score.completed` (con feature vector + SHAP, para auditoría).

**Módulo `bureau` — Circuit Breaker (contexto a)**
```
RateLimiter(8 rps) → Bulkhead(10) → CircuitBreaker(timeout 12s, abre 50%/20 calls, half-open 30s)
   CLOSED → SOAP mock → cachea en Redis (TTL 24h)
   OPEN   → fallback {source:FALLBACK, hasFile:false} → score con partialData=true
```
**Blue/Green ML:** dos modelos cargados (`slots/blue`, `slots/green`); `POST /model/promote` cambia el puntero `active` de forma atómica → sin downtime.

---

### 6.3 `credit-svc` (8103, NestJS) — Decisión + Crédito (CQRS+ES) + Desembolso + Ledger

**Responsabilidad:** núcleo financiero. Decide (auto ≤ USD 500 / manual), abre y gestiona el crédito con **Event Sourcing**, desembolsa (multicanal) y lleva contabilidad.

**Endpoints**
```
# Decisión (inciso III)
POST   /v1/credits/decision                # score+monto → AUTO_APPROVED / MANUAL / REJECTED
GET    /v1/credits/decisions/queue/manual  # cola revisión manual (analista)
POST   /v1/credits/decisions/{id}/resolve  # resolución del analista

# Crédito (CQRS+ES)
POST   /v1/credits/{id}/commands/register-payment
POST   /v1/credits/{id}/commands/restructure
GET    /v1/credits/{id}                     # proyección (estado actual)
GET    /v1/credits/{id}/events              # stream de eventos (auditoría)
GET    /v1/credits/{id}/schedule            # cronograma de cuotas

# Desembolso (inciso IV)
POST   /v1/credits/{id}/disbursements       # idempotente (canal billetera/banco/corresponsal)
GET    /v1/disbursements/{id}
```

**Request — decisión**
```json
{ "applicationId":"uuid", "scoreId":"uuid", "score":712, "riskBand":"B",
  "requestedAmount":450, "fraudFlag":false, "partialData":false }
```
**Response**
```json
{ "decisionId":"uuid", "outcome":"AUTO_APPROVED", "creditId":"uuid",
  "approvedAmount":450.00, "interestRate":0.0289, "termMonths":6, "requiresManualReview":false }
```
**Event Sourcing:** eventos del agregado `Credit`: `CreditOpened`, `CreditDisbursed`, `PaymentRegistered`, `CreditRestructured`, `CreditDelinquent`, `CreditClosed`, `CreditWrittenOff`. Cada evento se **firma** vía `compliance-svc` y se publica en `credit.events`.
**Eventos:** publica `decision.made`, `credit.*`, `disbursement.completed`; consume `scoring.score.completed`, `collections.payment.registered`.

---

### 6.4 `servicing-svc` (8104, NestJS) — Cobranza + Notificaciones + Gamificación

**Responsabilidad:** ciclo de vida del cliente **post-desembolso**: cobranza (recordatorios, acuerdos, reestructuración, reporte a buró), notificaciones omnicanal y educación financiera gamificada.

**Endpoints**
```
# Cobranza (inciso V)
GET    /v1/collections/cases
POST   /v1/collections/cases/{id}/reminders        # WhatsApp/SMS/email (mock)
POST   /v1/collections/cases/{id}/agreements       # acuerdo de pago
POST   /v1/collections/cases/{id}/restructure      # → dispara credit-svc.restructure
POST   /v1/collections/cases/{id}/report-bureau

# Notificaciones
POST   /v1/notifications                            # { channel, to, template, data }

# Gamificación (inciso VIII)
GET    /v1/courses
POST   /v1/users/{id}/courses/{courseId}/complete   # otorga puntos + bonus de tasa
GET    /v1/users/{id}/rewards
```
**Eventos:** consume `credit.events.CreditDelinquent`; publica `collections.payment.registered`, `collections.reminder.sent`, `gamification.rate.bonus.granted` (este último lo consume `scoring-svc`/`credit-svc`).

---

### 6.5 `investor-svc` (8105, NestJS) — Portal de inversionistas en tiempo real

**Responsabilidad:** proyecciones analíticas de la cartera alimentadas por eventos: TIR, morosidad por segmento, flujo de caja proyectado y exposición.

**Endpoints**
```
GET    /v1/portfolio/metrics                # TIR, PAR30/90, morosidad por segmento
GET    /v1/portfolio/cashflow/projection
GET    /v1/funds/{fundId}/exposure
WS     /v1/portfolio/stream                  # WebSocket: actualización en vivo
```
**Response — métricas**
```json
{ "asOf":"2026-06-16T19:05:00Z", "irr":0.184, "par30":0.061, "par90":0.022,
  "outstandingPrincipal":12850000.00, "delinquencyBySegment":{"A":0.01,"B":0.04,"C":0.11} }
```
**Eventos:** consume `credit.events.*`, `disbursement.completed`, `collections.payment.registered` → actualiza proyecciones (read-side puro, sin escritura transaccional).

---

### 6.6 `compliance-svc` (8106, NestJS) — Auditoría + Firma + Reportes (MVP 4, 100%)

**Responsabilidad:** trazabilidad regulatoria. Bitácora **append-only e inmutable** (hash chain), **firma digital JWS** de decisiones, y **export firmado** para la Superintendencia (inputs + pesos del modelo + decisión).

**Endpoints**
```
# Firma (usado por credit-svc al emitir eventos)
POST   /v1/sign                             # firma payload → JWS
POST   /v1/verify

# Auditoría
GET    /v1/audit/records/{correlationId}     # trazabilidad completa de una solicitud
GET    /v1/audit/verify/{recordId}           # verifica integridad de la cadena de hash

# Reportes al regulador
POST   /v1/reports/scoring-traceability      # genera export auditable (rango fechas)
GET    /v1/reports/{id}/download             # paquete firmado
GET    /v1/reports/bias-audit                # auditoría de sesgo demográfico (mensual)
```
**Funcionamiento:** consume todos los eventos relevantes (`scoring.score.completed`, `decision.made`, `credit.*`, `disbursement.completed`); por cada uno calcula `hash = SHA256(prev_hash || payload)`, lo firma y lo persiste en tabla append-only + archivo WORM (carpeta inmutable local). Verificación recorre la cadena y valida firmas.

---

## 7. Mapa de carpetas y archivos (mono-repo, local-first)

```
neolend-financial/
├── README.md
├── BASE-GUIDE.MD
├── PROPUESTA-TECNICA.md
├── DISENO-BASES-DE-DATOS.md
├── PLAN-DE-TRABAJO.md
├── docker-compose.yml                 # levanta TODO localmente (1 comando)
├── .env.example                       # variables locales (sin secretos reales)
├── pnpm-workspace.yaml
│
├── .github/workflows/ci.yml           # lint + test + build (gratuito en Actions)
│
├── docs/
│   ├── architecture/                  # C4 (L1-L3), pipeline scoring, despliegue activo-activo (diseño)
│   ├── adr/                           # ADR-0001..0008
│   ├── api/                           # openapi.yaml por servicio
│   └── evidence/                      # capturas del MVP (rúbrica)
│
├── libs/                              # compartido — NADA se duplica
│   ├── ts-common/                     # logger, cliente Kafka, errores RFC7807, crypto AES, health
│   ├── ts-events/                     # tipos TS de eventos (envelope + payloads)
│   └── proto/                         # esquemas de eventos (avro/json-schema)
│
├── gateway/                           # config del proxy de borde (o módulo en svc 1)
│
├── services/
│   ├── gateway-origination-svc/       # NestJS  (puerto 8101 + gateway 8080)
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── modules/gateway/        # auth JWT, routing, CORS
│   │   │   ├── modules/identity/       # applicants, OCR (mock), KYC
│   │   │   ├── modules/origination/    # saga, timeline
│   │   │   └── common/{kafka,crypto,health,filters}/   # importa de libs/ts-common
│   │   ├── migrations/
│   │   ├── test/  openapi.yaml  Dockerfile  package.json
│   │
│   ├── scoring-svc/                   # FastAPI (Python, puerto 8102)
│   │   ├── app/
│   │   │   ├── main.py
│   │   │   ├── api/{scores.py, fraud.py, model.py, health.py}
│   │   │   ├── core/{feature_orchestrator.py, score_assembler.py}
│   │   │   ├── modules/bureau/{soap_client.py, circuit_breaker.py, cache.py}
│   │   │   ├── modules/altdata/  modules/fraud/
│   │   │   ├── ml/{model_server.py, explain_shap.py, slots/{blue,green}/}
│   │   │   └── events/kafka_producer.py
│   │   ├── tests/  pyproject.toml  Dockerfile
│   │
│   ├── credit-svc/                    # NestJS (puerto 8103)
│   │   └── src/modules/{decision/, credit-command/, credit-query/, disbursement/, ledger/, eventstore/}
│   │
│   ├── servicing-svc/                 # NestJS (puerto 8104)
│   │   └── src/modules/{collections/, notification/, gamification/}
│   │
│   ├── investor-svc/                  # NestJS (puerto 8105)
│   │   └── src/modules/{metrics/, projections/, stream/}
│   │
│   └── compliance-svc/                # NestJS (puerto 8106)
│       └── src/modules/{audit/, signing/, regulator/}
│
├── clients/
│   └── web-portal/                    # React + Vite (solicitante, analista, inversionista, cobranza)
│       └── src/{pages/, components/, api/, charts/}
│
└── mocks/                             # locales y gratuitos
    ├── bureau-soap-mock/              # simula buró lento (8-15s, 10rps)
    ├── wallet-mock/
    └── whatsapp-mock/
```

---

## 8. Pipeline de scoring (flujo end-to-end, objetivo < 60s)

```
PWA → gateway-origination (Saga, t=0)
        │
        └─▶ scoring-svc POST /v1/scores
                 ├─ fraud (interno, local)            ~1s
                 ├─ altdata (interno)                 ~0.5s
                 ├─ bureau (circuit breaker + caché)  0.1s (cache) / 12s (timeout→fallback)
                 └─ model BLUE + SHAP                 ~1s
        ◀── score + SHAP
        └─▶ credit-svc POST /v1/credits/decision
                 ├─ AUTO_APPROVED (≤500) → CreditOpened (firmado) → disbursement
                 └─ MANUAL (>500)        → cola revisión (evidencia precargada)
        └─▶ compliance-svc registra cada paso (hash chain + firma)
Objetivo: p95 < 60s · auto-aprobación < 90s
```

---

## 9. Despliegue: local ahora, activo-activo después

### 9.1 Local (esta versión) — `docker-compose.yml`
```
Servicios: gateway-origination, scoring, credit, servicing, investor, compliance, mocks, frontend
Infra:     postgres (1 contenedor, 6 BDs lógicas), redis, redpanda (Kafka API)
Arranque:  docker compose up   → todo en localhost, sin cuentas ni costos
```

### 9.2 Evolución a producción activo-activo (documentado, no implementado en local)
```
Región A  ⇄  Región B   (Kafka MirrorMaker entre regiones, DB con réplica, GSLB)
scoring(fraude/biometría) → on-premise nacional (data residency)
```
> Los servicios se construyen **stateless + event-driven** justamente para que esta topología no requiera reescritura: solo cambia el despliegue (Helm/K8s multi-región), no el código.

---

## 10. ADRs (decisiones clave de esta versión)

| ADR | Decisión | Justificación |
|---|---|---|
| 0001 | Consolidar en **6 microservicios** por bounded context | MVP rápido y operable en local sin perder límites de dominio |
| 0002 | **Modularidad interna** (módulos extraíbles) | Escalabilidad evolutiva: dividir después sin reescritura |
| 0003 | **Scoring como servicio independiente** | Exigido por BASE-GUIDE; permite blue/green del modelo |
| 0004 | **CQRS + Event Sourcing solo en `credit-svc`** | Trazabilidad regulatoria; evita complejidad innecesaria en el resto |
| 0005 | **PostgreSQL + JSONB** en lugar de poliglota | Un motor = menos fricción local; JSONB cubre datos flexibles |
| 0006 | **Redpanda (Kafka API)** como bus | Liviano y gratuito en local; compatible con Kafka para producción |
| 0007 | **JWT propio** en lugar de Keycloak (local) | Velocidad; Keycloak queda como mejora productiva |
| 0008 | **Circuit breaker en módulo `bureau` de scoring** | Aísla el buró legado lento dentro del servicio que lo consume |

---

## 11. Checklist de entregables (rúbrica)

- [x] Diagramas C4 (L1–L3) — §4
- [x] Diagrama de flujo del pipeline de scoring — §8
- [x] ADRs — §10
- [x] Esquema de Event Sourcing — ver [DISENO-BASES-DE-DATOS.md](DISENO-BASES-DE-DATOS.md)
- [x] Diagrama de despliegue activo-activo (diseño) — §9.2
- [x] Estrategia de circuit breaker para el buró — §6.2
- [x] Matriz de cumplimiento de requerimientos — §2
- [ ] Carátula con alumnos — §0 (completar)
- [ ] Imágenes de respaldo del MVP — `docs/evidence/`
- [ ] Enlaces a repos GitHub — §0

---

_Fin — Propuesta Técnica NeoLend v2.0 (6 microservicios, local-first)_
