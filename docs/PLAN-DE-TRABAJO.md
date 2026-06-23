# Plan de Trabajo del Equipo — NeoLend Financial Corp.

> **Plan de ejecución para 6 developers — Arquitectura de 6 Microservicios (Local-First)**
> Complementa a [PROPUESTA-TECNICA.md](PROPUESTA-TECNICA.md) y [DISENO-BASES-DE-DATOS.md](DISENO-BASES-DE-DATOS.md)
> Versión 2.0 — Hackatón Final 16/06/2026 (sesión 18:45–21:15)
> **Objetivo:** producto **uniforme, sin duplicidad, sin código sucio, sin malas conexiones**, ejecutable **100% en localhost y gratis**

---

## 0. Filosofía: "Contratos primero, código después"

El mayor riesgo al integrar 6 personas en paralelo es que cada quien implemente con **supuestos distintos** sobre cómo se conectan. Por eso **congelamos los contratos** (REST/OpenAPI, eventos, tipos compartidos) en la **Fase 0**, antes de la lógica. Si los contratos están fijos, cada developer trabaja aislado y la integración es mecánica.

> **Regla de oro:** nadie consume la **implementación** de otro; todos consumen su **contrato** (OpenAPI / esquema de evento / tipo TS compartido). Mientras un servicio no esté listo, se usa su **mock**.

### 0.1 Las 5 reglas anti-conflicto
1. **Un dueño por servicio** (`CODEOWNERS`). Nadie edita el servicio de otro sin PR aprobado por su dueño.
2. **Contratos congelados en Fase 0** (REST + eventos + tipos compartidos).
3. **Mocks por defecto** para todo lo no terminado o externo (buró, billetera, WhatsApp).
4. **`libs/` compartido, nunca copy-paste** (logger, cliente Kafka, eventos, crypto).
5. **`main` siempre verde**: PR obligatorio + CI que bloquea merge si falla lint/test/build.

### 0.2 Ventaja del nuevo diseño (6 servicios)
Con solo **6 servicios y 6 personas**, la asignación es casi **1 servicio = 1 dueño**. Esto **elimina** los conflictos de merge por contención: cada persona vive en su carpeta. La modularidad interna (módulos por sub-dominio) mantiene el código limpio y extraíble a futuro.

---

## 1. Asignación: 6 developers → 6 microservicios + frontend

> Reparto **vertical**: cada developer es dueño de **un servicio completo (código + BD + contratos)** de punta a punta. El frontend lo lleva quien también dueña el servicio más "read-only" (investor), porque ese portal es intensivo en UI.

| Dev | Rol | Propiedad | BD propia | Incisos |
|---|---|---|---|---|
| **D1** | **Frontend + Inversionista** | `clients/web-portal` (React) + `investor-svc` (portal RT end-to-end) | investor_db | VI |
| **D2** | **Originación & Identidad** | `gateway-origination-svc` (gateway + identity + saga) | origination_db | I |
| **D3** | **Scoring (ML)** | `scoring-svc` (features + buró/CB + altdata + fraude + SHAP + blue/green) | scoring (Redis) | II, VII |
| **D4** | **Crédito & Dinero** | `credit-svc` (decisión + CQRS/ES + desembolso + ledger) | credit_db | III, IV |
| **D5** | **Servicing** | `servicing-svc` (cobranza + notificaciones + gamificación) | servicing_db | V, VIII |
| **D6** | **Plataforma & Compliance** | `compliance-svc` + `libs/` + gateway/CI/`docker-compose` + `mocks/` | compliance_db | MVP4 / contexto b) |

### 1.1 Por qué este reparto (justificación profesional)
- **D1** construye toda la UI; el `investor-svc` es read-only (proyecciones), por lo que su backend es ligero y encaja con un perfil frontend → el portal del inversionista se entrega **end-to-end por una sola persona**.
- **D2** controla la **entrada** (gateway + KYC + Saga): es el "director de orquesta" del MVP 1.
- **D3** concentra todo el conocimiento de **ML, datos alternativos, buró y fraude** en una persona (cohesión de expertise).
- **D4** toma el núcleo **transaccional/financiero** (Event Sourcing, decisión, desembolso, contabilidad): el perfil más fuerte en consistencia.
- **D5** lleva el ciclo de vida **post-desembolso** (cobranza + notificación + gamificación), todo event-driven.
- **D6** es **dueño de la plataforma**: `libs/`, gateway, `docker-compose`, CI, mocks **y** `compliance-svc` (MVP 4, el 100%). Es el guardián de la uniformidad del código.

### 1.2 Matriz de dependencias (de contrato, no de código)
```
D1(front) ──REST──▶ gateway(D2) ; ──WS/REST──▶ investor-svc(propio)
D2(saga)  ──REST──▶ scoring(D3) , credit(D4) ; firma vía compliance(D6)
D3        ── publica scoring.events ──▶ credit(D4), compliance(D6)
D4        ── publica credit/disbursement.events ──▶ servicing(D5), investor(D1), compliance(D6)
D5        ── consume credit.Delinquent ; publica collections/gamification.events
D6        ── provee libs/, gateway, mocks, contratos base ──▶ TODOS ; consume todos los eventos
```
> Todas las flechas tienen **mock**: nadie se bloquea esperando la implementación real de otro.

---

## 2. Línea de tiempo de la sesión (18:45–21:15)

| Fase | Tiempo | Objetivo | Quién |
|---|---|---|---|
| **Fase 0 — Contratos & Scaffolding** | 18:45–19:05 (20') | `docker-compose` arriba, contratos congelados, `libs/`, template | **Todos**, lidera **D6** |
| **Fase 1 — MVP 1 (60%)** | 19:05–19:55 (50') | Solicitud → scoring (SHAP, buró/CB, fraude) → aprobación auto | D2, D3, D4, D1(UI) |
| **Fase 2 — MVP 2 (70%)** | 19:55–20:25 (30') | Desembolso + cobranza + notificaciones | D4, D5 |
| **Fase 3 — MVP 3 (80%)** | 20:25–20:50 (25') | Portal inversionista RT + fraude visible + gamificación | D1, D5, D3 |
| **Fase 4 — MVP 4 (100%)** | 20:50–21:00 (10') | Trazabilidad firmada + Event Sourcing visible + export regulador | D6, D4 |
| **Cierre & Demo** | 21:00–21:15 (15') | Evidencias `docs/evidence/` + carga LMS | Todos |

> Cada fase cierra con **merge a `main` + smoke test** del flujo acumulado. No se avanza con `main` rojo.

### 2.1 Fase 0 en detalle (la que define el éxito de la integración)
En 20 min, en paralelo:
- **D6:** `docker compose up` con `postgres` (5 BDs vía `init.sql`), `redis`, `redpanda`, y publica `libs/ts-common` + `libs/ts-events` + `service-template`.
- **D2/D3/D4/D5:** escriben su `openapi.yaml` y los **esquemas de los eventos que publican**.
- **D1:** define contratos que la UI necesita del gateway/investor y levanta **mocks Prism**.
- **Todos:** firman el **Contrato de Eventos** (§4) y el **Contrato de IDs/correlationId** (§5).

**Definition of Ready (salida de Fase 0):** `docker compose up` levanta todo en localhost; `openapi.yaml` de cada servicio en `docs/api/`; esquemas de eventos en `libs/proto`; CI verde en commit base.

---

## 3. Estándares de código (uniformidad — los hace cumplir el CI)

| Tema | Regla |
|---|---|
| Stacks | NestJS+TS (servicios 1,3,4,5,6 y BFF), FastAPI+Python (scoring), React+Vite (frontend) |
| Estilo TS | ESLint + Prettier — **config única en la raíz** (no se sobreescribe por servicio) |
| Estilo Python | Ruff + Black (config en `pyproject.toml` raíz) |
| Commits | **Conventional Commits** con scope = servicio. Ej: `feat(scoring): add SHAP endpoint` |
| Idioma | Código en inglés; comentarios/documentos en español |
| Endpoints | REST plural, versionado `/v1`; errores en **RFC 7807** (`{type,title,status,detail,correlationId}`) |
| Fechas | ISO-8601 UTC siempre |
| Dinero | `NUMERIC(14,2)` + `currency`; nunca `float` |
| IDs | UUID v4 generado por el servicio dueño |

### 3.1 Estructura interna idéntica (anti "cada uno a su manera")
Todos los servicios NestJS parten del **`service-template`** que provee D6:
```
<service>/
├── src/
│   ├── main.ts  app.module.ts
│   ├── modules/<subdominio>/{*.controller.ts, *.service.ts, *.entity.ts, dto/}
│   └── common/{kafka, crypto, health, filters}/   # re-exporta de libs/ts-common
├── migrations/  test/  openapi.yaml  Dockerfile  package.json
```
> **Modularidad interna obligatoria:** cada sub-dominio (p.ej. en `credit-svc`: `decision`, `credit-command`, `credit-query`, `disbursement`, `ledger`) es un **módulo separado**. Esto mantiene el código limpio **y** permite extraerlo a su propio microservicio en el futuro sin reescritura.

### 3.2 `libs/` — fuente única de verdad (prohibido duplicar)
| Lib | Contenido | Quién la usa |
|---|---|---|
| `libs/ts-common` | logger (pino), cliente Kafka/Redpanda, filtro de errores RFC7807, crypto AES-256, health | servicios TS |
| `libs/ts-events` | tipos TS de **todos** los eventos (envelope + payloads) | productores y consumidores |
| `libs/proto` | esquemas de eventos (JSON-Schema/Avro) — fuente de verdad | todos |
> Si falta algo común, se **agrega a `libs/`** vía PR a D6; jamás se copia dentro de un servicio.

---

## 4. Contrato de Eventos (el pegamento — evita malas conexiones)

### 4.1 Envelope estándar de todo evento
```json
{
  "eventId": "uuid",
  "eventType": "credit.CreditOpened",
  "occurredAt": "2026-06-16T19:00:30Z",
  "correlationId": "uuid",         // = applicationId, viaja por TODO el flujo
  "causationId": "uuid",
  "producer": "credit-svc",
  "schemaVersion": 1,
  "payload": { /* ... */ }
}
```

### 4.2 Tabla maestra de eventos (dueño único + consumidores)
| Evento | Productor (Dev) | Consumidores (Dev) |
|---|---|---|
| `origination.application.submitted` | gateway-origination (D2) | compliance (D6) |
| `scoring.score.completed` | scoring (D3) | credit (D4), compliance (D6) |
| `decision.made` | credit (D4) | gateway-origination (D2), compliance (D6), servicing (D5) |
| `credit.CreditOpened` | credit (D4) | investor (D1), compliance (D6) |
| `disbursement.completed` | credit (D4) | servicing (D5), investor (D1), compliance (D6) |
| `credit.CreditDelinquent` | credit (D4) | servicing (D5), investor (D1) |
| `collections.payment.registered` | servicing (D5) | credit (D4), investor (D1) |
| `gamification.rate.bonus.granted` | servicing (D5) | scoring (D3), credit (D4) |

**Reglas:** esquema **solo aditivo** (compat. BACKWARD); consumidores **idempotentes** (dedupe por `eventId`, guardan `last_event_seq`); clave de partición = `aggregateId`.

---

## 5. Contrato de identificadores y trazabilidad

| ID | Lo genera | Significa | Viaja en |
|---|---|---|---|
| `applicationId` = `correlationId` | gateway-origination (D2) | la solicitud | todos los eventos/logs del flujo |
| `applicantId` | gateway-origination (D2) | el titular | scoring, credit, servicing |
| `scoreId` | scoring (D3) | un cálculo de score | decision, compliance |
| `decisionId` | credit (D4) | una decisión | credit events, compliance |
| `creditId` = `aggregateId` | credit (D4) | el crédito (agregado ES) | disbursement, servicing, investor |

> El `correlationId` viaja en el header `X-Correlation-Id` (HTTP) y en el envelope (eventos), y se loguea en toda traza. **Sin esto la trazabilidad regulatoria (MVP 4) no funciona.**

---

## 6. Integración: cómo se une el código sin romperse

### 6.1 Git — trunk-based con ramas cortas
```
main (siempre verde) ← PR ← feat/dX-<tarea>   (ramas de vida < 1 fase)
```
PR pequeño y frecuente, **review obligatorio** del dueño del área. Nada se acumula sin mergear.

### 6.2 `CODEOWNERS` (cada quien su carpeta → cero contención)
```
/clients/                          @D1
/services/investor-svc/            @D1
/services/gateway-origination-svc/ @D2
/services/scoring-svc/             @D3
/services/credit-svc/              @D4
/services/servicing-svc/           @D5
/services/compliance-svc/          @D6
/libs/  /gateway/  /mocks/  /.github/  /docker-compose.yml   @D6
```
> **Regla de frontera:** si tu tarea necesita cambiar `libs/` o el contrato de otro, abres PR y lo coordinas; no editas su servicio directo.

### 6.3 CI/CD (puerta de calidad — bloquea lo sucio) — gratuito en GitHub Actions
```
1. detect-changes  → solo construye/testea servicios tocados (matrix)
2. lint            → ESLint/Ruff (falla = bloquea merge)
3. test            → unit + contract tests
4. build           → compila + imagen Docker
5. contract-check  → valida openapi.yaml + esquemas de eventos (no breaking)
6. smoke (en main) → docker compose up + healthchecks de los 6 servicios
```

### 6.4 Contract testing + mocks (evita malas conexiones)
- **Pact (consumer-driven):** D1 define lo que espera del gateway/investor; D2 lo que espera de scoring/credit. El CI verifica que el productor cumple → una conexión rota se detecta **antes del merge**, no en la demo.
- **Prism mocks:** mientras un servicio no está, se levanta su mock desde `openapi.yaml`. Al integrar el real, nada cambia.

### 6.5 Smoke test acumulativo (al cierre de cada fase)
```
Fin Fase 1: solicitud→score(SHAP/buró/fraude)→decisión→auto-aprobación   ▶ E2E
Fin Fase 2: + desembolso + cobranza + notificaciones                     ▶ E2E
Fin Fase 3: + portal inversionista RT + gamificación                     ▶ E2E
Fin Fase 4: + Event Sourcing + auditoría firmada + export regulador      ▶ E2E
```

---

## 7. Tareas por developer

### D1 — Frontend + Investor (incisos VI)
| # | Tarea | Depende de | Entregable |
|---|---|---|---|
| 1.1 | Scaffolding React+Vite; design system mínimo; cliente API + auth JWT | gateway contract | app levanta |
| 1.2 | Pantalla solicitud de crédito (subir documento + progreso/timeline) | origination contract | flujo MVP1 (UI) |
| 1.3 | Consola analista: score + **SHAP** + cola de revisión manual | scoring/credit contract | UI MVP1/MVP3 |
| 1.4 | `investor-svc`: proyecciones + métricas (TIR, PAR30/90) | credit/disb events | backend portal |
| 1.5 | Portal inversionista: dashboard + gráficas + **WebSocket** RT | investor-svc | MVP3 |
| 1.6 | Pantalla gamificación (cursos, rewards) | servicing contract | UI MVP3 |

### D2 — gateway-origination-svc (inciso I)
| # | Tarea | Depende de | Entregable |
|---|---|---|---|
| 2.1 | Gateway de borde: auth JWT, routing, CORS, RFC7807 | libs/ts-common | gateway |
| 2.2 | Identity/KYC: applicants + OCR (mock) + cifrado AES de PII | libs crypto | identity |
| 2.3 | Saga de originación (scoring→decisión→crédito) + timeline | scoring/credit contracts | saga |
| 2.4 | Publicar `origination.application.submitted`; consumir resultados | libs/ts-events | integración |

### D3 — scoring-svc (incisos II, VII)
| # | Tarea | Depende de | Entregable |
|---|---|---|---|
| 3.1 | FastAPI + feature orchestrator (scatter-gather) | clients buró/altdata | scoring base |
| 3.2 | Modelo ML (logistic/dummy) + ONNX + **SHAP** | — | score explicable |
| 3.3 | **Blue/Green** del modelo (slots BLUE/GREEN + promote) | — | switch sin downtime |
| 3.4 | Módulo `bureau`: SOAP mock + **circuit breaker + caché Redis** | mock buró (D6) | resiliencia buró |
| 3.5 | Módulo `altdata` + módulo `fraud` (local, data residency) | — | features + fraude |
| 3.6 | Publicar `scoring.score.completed` (feature vector + SHAP) | libs/ts-events | evento auditable |

### D4 — credit-svc (incisos III, IV)
| # | Tarea | Depende de | Entregable |
|---|---|---|---|
| 4.1 | Módulo `decision`: auto ≤500 / manual + cola + evidencia | scoring contract | decisión |
| 4.2 | Event Store (append-only) + agregado `Credit` + comandos | libs | CQRS write |
| 4.3 | Proyecciones (`credit_view`, schedule) + reproyección | — | CQRS read |
| 4.4 | Firma de eventos vía compliance-svc (`/sign`) | compliance contract | eventos firmados |
| 4.5 | Módulo `disbursement` idempotente (canales, mock billetera) | wallet mock (D6) | desembolso |
| 4.6 | Módulo `ledger` (double-entry) + consumir pagos | libs/ts-events | contabilidad |

### D5 — servicing-svc (incisos V, VIII)
| # | Tarea | Depende de | Entregable |
|---|---|---|---|
| 5.1 | Cobranza: casos por DPD (consume `CreditDelinquent`), acuerdos | credit events | cobranza |
| 5.2 | Notificaciones WhatsApp/SMS/email (mock) | whatsapp mock (D6) | omnicanal |
| 5.3 | Reestructuración → dispara `credit-svc.restructure` | credit contract | acuerdos |
| 5.4 | Gamificación: cursos, rewards, **bonus de tasa** | — | gamificación |
| 5.5 | Publicar `collections.payment.registered`, `gamification.rate.bonus.granted` | libs/ts-events | integración |

### D6 — compliance-svc + Plataforma (MVP 4 / contexto b)
| # | Tarea | Depende de | Entregable |
|---|---|---|---|
| 6.1 | Mono-repo, `docker-compose` (postgres 5 BDs, redis, redpanda), `.env.example` | — | entorno local |
| 6.2 | `libs/ts-common`, `libs/ts-events`, `libs/proto`, `service-template` | — | librerías + plantilla |
| 6.3 | CI/CD (lint+test+build+contract+smoke) | — | pipeline verde |
| 6.4 | `mocks/`: buró SOAP (lento 8-15s), billetera, WhatsApp | — | mocks compartidos |
| 6.5 | `compliance-svc` módulo `signing`: firma JWS (clave local) | — | firma digital |
| 6.6 | módulo `audit`: append-only + hash chain + WORM local | — | bitácora inmutable |
| 6.7 | módulo `regulator`: export trazabilidad firmado + bias-audit | audit | reporte regulador |

---

## 8. Definition of Done (criterio único)
- [ ] En `main` vía PR aprobado por el dueño del área.
- [ ] Lint/format en verde; **no duplica** nada de `libs/`.
- [ ] `openapi.yaml` / esquema de evento actualizado y validado por `contract-check`.
- [ ] `/health` y `/docs` responden; propaga `X-Correlation-Id`; usa logger de `libs/ts-common`.
- [ ] Migraciones versionadas y aplicadas en `docker-compose`.
- [ ] Eventos idempotentes con envelope estándar.
- [ ] Pasa el **smoke test E2E** de la fase.
- [ ] Evidencia (captura) en `docs/evidence/`.

---

## 9. Riesgos de integración y mitigación
| Riesgo | Mitigación |
|---|---|
| Duplicidad de código | todo común en `libs/`; detector jscpd en CI |
| Malas conexiones | contract testing (Pact) bloquea merge; mocks Prism del contrato |
| Estilo divergente / código sucio | ESLint/Ruff en CI; `service-template` único; review obligatorio |
| Conflictos de merge | `CODEOWNERS` + 1 servicio por dueño + ramas cortas |
| Bloqueo por dependencia | mocks por defecto; nadie espera la implementación real |
| `main` roto antes de la demo | CI bloquea merge en rojo; smoke test por fase |
| Eventos incompatibles | esquemas solo aditivos (`libs/proto`) |
| Trazabilidad rota | contrato de IDs (§5); `correlationId` obligatorio |
| Entorno no levanta en otra máquina | todo en `docker-compose`; `.env.example`; sin servicios cloud ni keys de pago |

---

## 10. Comunicación
- **Stand-up relámpago cada 30 min** (1 min/persona): hecho / bloqueo / contra qué mock.
- **Canal "contratos":** todo cambio a `openapi.yaml`, evento o `libs/` se anuncia antes de mergear.
- **D6 = integrador/tech-lead:** custodia `libs/`, gateway, CI y mocks; desbloquea conflictos de contrato.
- **Pairing en fronteras críticas:** D2↔D3 (saga↔scoring), D4↔D6 (credit↔firma/audit).

---

## 11. Checklist de arranque (Fase 0)
- [ ] Mono-repo + `CODEOWNERS`.
- [ ] `docker compose up` levanta postgres (5 BDs), redis, redpanda, los 6 servicios y el frontend.
- [ ] `libs/ts-common`, `libs/ts-events`, `libs/proto` publicados; `service-template` disponible.
- [ ] `openapi.yaml` inicial de cada servicio + mocks Prism corriendo.
- [ ] Esquemas de eventos registrados (`libs/proto`).
- [ ] Contrato de IDs/`correlationId` (§5) acordado.
- [ ] CI verde en commit base; ramas `feat/dX-*` creadas.
- [ ] `.env.example` con todas las variables locales (sin secretos reales).

---

## 12. Resumen visual — quién hace qué y cómo se conecta

```
┌──── D1: Frontend (React) + investor-svc ────┐   REST/WS
│ solicitante · analista · inversionista · cob │ ─────────────┐
└──────────────────────────────────────────────┘             ▼
                                          ┌──── D2: gateway-origination-svc ────┐
                                          │ gateway(JWT) · identity · saga       │
                                          └───────┬───────────────┬──────────────┘
                                          REST    │               │  REST
                                       ┌──────────▼───┐    ┌───────▼──────────┐
                                       │ D3: scoring  │    │ D4: credit-svc   │
                                       │ buró(CB)·SHAP│───▶│ decisión·ES·desem│
                                       │ fraude·blue/g│evt │ ledger           │
                                       └──────────────┘    └───┬──────────┬───┘
                                                               │ evt      │ evt
                                                      ┌────────▼───┐ ┌────▼────────────┐
                                                      │ D5:servicing│ │ D1: investor-svc│
                                                      │ cobr·notif  │ │ métricas RT (WS)│
                                                      │ gamificación│ └─────────────────┘
                                                      └─────────────┘
       ┌──── D6: compliance-svc + PLATAFORMA ────┐   consume TODOS los eventos
       │ audit(hash) · signing(JWS) · regulador   │◀──────────────────────────────────┘
       │ libs/ · gateway · docker-compose · mocks · CI │
       └───────────────────────────────────────────────┘
   Todos: libs/ts-common · envelope de evento estándar · correlationId · docker compose up
```

---

_Fin — Plan de Trabajo NeoLend v2.0 (6 developers, 6 microservicios, local-first)_
