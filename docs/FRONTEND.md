# Documentación del Frontend — NeoLend Financial Corp.

> **Especificación funcional y técnica del cliente web (`clients/web-portal`)**
> Complementa a [PROPUESTA-TECNICA.md](../PROPUESTA-TECNICA.md), [DISENO-BASES-DE-DATOS.md](../DISENO-BASES-DE-DATOS.md) y [PLAN-DE-TRABAJO.md](../PLAN-DE-TRABAJO.md)
> Versión 1.0 — Hackatón Final 16/06/2026
> Stack: **React + Vite + TypeScript** · **100% local y gratuito** · Responsable: **D1**

---

## 0. Alcance y filosofía

El frontend es **una sola SPA (React + Vite)** que sirve a **cuatro perfiles de usuario** mediante rutas y layouts protegidos por rol. No hay backend de frontend pesado: el cliente habla con el **gateway** (`http://localhost:8080`) vía el proxy de Vite (`/v1`) y, para tiempo real, con `investor-svc` por **WebSocket (socket.io)**.

**Principios de construcción:**
1. **Contra contratos, no implementaciones.** Toda llamada usa los `openapi.yaml` de los servicios; mientras un servicio no esté, se consume su **mock Prism**. La UI nunca inventa formas de datos.
2. **Una capa de API tipada.** Todo `fetch` vive en `src/api/`; los componentes nunca llaman `fetch` directo. Tipos compartidos espejan los DTOs de los servicios.
3. **Trazabilidad.** Cada request adjunta el header `X-Correlation-Id`; cuando el backend lo devuelve, se muestra/loguea para soporte.
4. **Sin librerías de pago.** React, Vite, React Router, Recharts (gráficas), socket.io-client. Nada que requiera cuenta o licencia.
5. **Mobile-first responsive.** El perfil "solicitante" simula la app móvil (BASE-GUIDE inciso I); se construye responsive para demo sin necesidad de compilar nativo.

> **Importante (BASE-GUIDE):** la solicitud debe completarse en **< 3 minutos subiendo solo el documento**. El flujo del solicitante debe ser de **3 pasos máximo** y mostrar progreso en vivo del pipeline de scoring.

---

## 1. Perfiles de usuario y mapa de rutas

| Perfil (rol JWT) | Objetivo | Rutas base | Servicios que consume |
|---|---|---|---|
| **Solicitante** (`applicant`) | Pedir crédito en < 3 min y ver resultado | `/app/*` | gateway-origination, (resultado de credit) |
| **Analista de riesgo** (`analyst`) | Revisar score+SHAP y resolver cola manual | `/analyst/*` | scoring (vía gateway), credit |
| **Inversionista** (`investor`) | Ver métricas de cartera en tiempo real | `/investor/*` | investor-svc (REST + WS) |
| **Gestor de cobranza** (`collector`) | Gestionar casos de mora y acuerdos | `/collections/*` | servicing-svc |

> Un quinto rol `regulator` puede reutilizar la vista de auditoría (solo lectura de trazabilidad) si da tiempo; es opcional para el MVP.

### 1.1 Árbol de rutas (React Router)
```
/                          → Landing + selección/login
/login                     → Login (emite JWT vía POST /v1/auth/login)

/app                       → Layout Solicitante (rol applicant)
  /app/solicitar           → Wizard de solicitud (3 pasos)
  /app/solicitud/:id       → Estado/resultado de la solicitud (timeline en vivo)
  /app/educacion           → Cursos gamificados (mejora score / bonus tasa)

/analyst                   → Layout Analista (rol analyst)
  /analyst/cola            → Cola de revisión manual
  /analyst/solicitud/:id   → Detalle: score, SHAP, evidencia, aprobar/rechazar

/investor                  → Layout Inversionista (rol investor)
  /investor/dashboard      → KPIs + gráficas + stream en vivo
  /investor/fondos/:id     → Exposición por fondo

/collections               → Layout Cobranza (rol collector)
  /collections/casos       → Lista de casos por mora
  /collections/casos/:id   → Detalle: recordatorios, acuerdos, reestructuración

/audit                     → (opcional, rol regulator) Trazabilidad firmada
```

---

## 2. Estructura de carpetas del frontend

```
clients/web-portal/
├── index.html
├── vite.config.ts                 # proxy /v1 → gateway:8080
├── tsconfig.json
├── package.json
├── .env.example                   # VITE_API_BASE, VITE_WS_URL
├── public/
│   └── logo.svg
└── src/
    ├── main.tsx                   # bootstrap React + Router
    ├── App.tsx                    # rutas + guards por rol
    ├── theme.css                  # design tokens (colores, espaciado, tipografía)
    │
    ├── api/                       # ÚNICA capa de acceso a backend (tipada)
    │   ├── client.ts              # wrapper fetch: baseUrl, JWT, X-Correlation-Id, errores RFC7807
    │   ├── auth.api.ts            # login, getProfile
    │   ├── origination.api.ts     # applicants, document upload, loan-applications
    │   ├── credit.api.ts          # decisión, cola manual, resolver, crédito
    │   ├── scoring.api.ts         # (lectura de score/SHAP vía gateway)
    │   ├── servicing.api.ts       # cobranza, notificaciones, gamificación
    │   ├── investor.api.ts        # métricas, cashflow, exposición
    │   ├── investor.ws.ts         # socket.io: /v1/portfolio/stream
    │   └── types.ts               # DTOs espejo de los openapi.yaml
    │
    ├── auth/
    │   ├── AuthContext.tsx        # estado de sesión (JWT, rol, user)
    │   ├── useAuth.ts
    │   └── RequireRole.tsx        # guard de ruta por rol
    │
    ├── components/                # componentes reutilizables (design system)
    │   ├── Layout/                # AppShell, Sidebar, Topbar
    │   ├── Button.tsx  Input.tsx  Card.tsx  Badge.tsx  Spinner.tsx
    │   ├── Stepper.tsx            # wizard de pasos
    │   ├── FileDropzone.tsx       # subida de documento
    │   ├── DataTable.tsx          # tablas (cola, casos)
    │   ├── StatCard.tsx           # KPI inversionista
    │   ├── Timeline.tsx           # progreso del pipeline
    │   └── ShapChart.tsx          # gráfico de contribuciones SHAP
    │
    ├── pages/                     # una carpeta por perfil
    │   ├── auth/LoginPage.tsx
    │   ├── applicant/{SolicitudWizard.tsx, SolicitudStatus.tsx, Educacion.tsx}
    │   ├── analyst/{ColaManual.tsx, DetalleSolicitud.tsx}
    │   ├── investor/{Dashboard.tsx, Fondo.tsx}
    │   └── collections/{Casos.tsx, DetalleCaso.tsx}
    │
    ├── charts/                    # configuración de gráficas (Recharts)
    │   ├── PortfolioCharts.tsx
    │   └── ShapBar.tsx
    │
    ├── hooks/
    │   ├── usePolling.ts          # polling del estado de solicitud
    │   └── useToast.ts
    │
    └── lib/
        ├── format.ts              # dinero (NUMERIC 2 dec), fechas ISO, %
        └── correlation.ts         # genera/propaga X-Correlation-Id
```

---

## 3. Detalle por pantalla (qué construir, completo)

### 3.1 Login (`/login`) — todos los perfiles
- **Objetivo:** autenticar y obtener JWT con el rol.
- **UI:** formulario email + contraseña + selector de "perfil demo" (atajo para el hackatón).
- **Acción:** `POST /v1/auth/login` → guarda JWT en memoria + `localStorage` (key `neolend_token`); decodifica el rol y redirige al layout correspondiente.
- **Validaciones:** campos requeridos; mostrar error RFC7807 (`title`/`detail`) en banner.
- **Estado:** `AuthContext` expone `{ token, role, user, login(), logout() }`.

### 3.2 Wizard de solicitud (`/app/solicitar`) — Solicitante (inciso I) ⭐ crítico
Flujo de **3 pasos** con `Stepper`, optimizado para < 3 minutos:

**Paso 1 — Datos mínimos**
- Campos: nombre completo, tipo y número de documento, teléfono, email.
- Acción: `POST /v1/applicants` → guarda `applicantId`.

**Paso 2 — Subir documento (única carga del usuario)**
- Componente `FileDropzone` (frente y reverso). Acepta imagen; muestra preview.
- Acción: `POST /v1/applicants/{id}/document` (multipart) → muestra resultado OCR (nombre, número detectado, confianza). El sistema "hace el resto".
- Mensaje claro: "Solo necesitamos tu documento. Nosotros consultamos el resto."

**Paso 3 — Monto y plazo + Enviar**
- Campos: monto solicitado (slider/numérico), plazo en meses, propósito (opcional).
- Acción: `POST /v1/loan-applications` → recibe `202 { applicationId, pollUrl }` → redirige a `/app/solicitud/:id`.

**Requisitos UX:**
- Validación inline; botón "Siguiente" deshabilitado hasta completar.
- Mostrar un cronómetro/indicador de "tu solicitud toma ~1 minuto".
- Manejar errores de cada paso sin perder lo avanzado.

### 3.3 Estado de la solicitud (`/app/solicitud/:id`) — Solicitante ⭐
- **Objetivo:** mostrar en vivo el avance del pipeline de scoring y el resultado.
- **Mecanismo:** `usePolling` a `GET /v1/loan-applications/{id}` cada 1.5s hasta estado terminal.
- **UI:** componente `Timeline` con los pasos de la Saga:
  `Recibida → Verificación de fraude → Consulta de fuentes → Cálculo de score → Decisión → Resultado`.
- **Resultados posibles:**
  - `APPROVED` (auto ≤ USD 500): mostrar monto aprobado, tasa, plazo, y CTA "Recibir desembolso" (canal: billetera/banco/corresponsal).
  - `MANUAL_REVIEW` (> 500): "Tu solicitud está en revisión; te avisaremos".
  - `REJECTED`: mensaje empático + sugerir cursos de educación financiera (link a `/app/educacion`).
- **Detalle:** mostrar `partialData=true` discretamente si el buró estaba caído (transparencia).

### 3.4 Educación financiera (`/app/educacion`) — Solicitante (inciso VIII)
- **Objetivo:** gamificación que mejora score y bonifica tasa.
- **UI:** lista de `Card` de cursos (`GET /v1/courses`), con puntos y `rate_bonus`. Botón "Completar" → `POST /v1/users/{id}/courses/{courseId}/complete`.
- **Panel de recompensas:** `GET /v1/users/{id}/rewards` → puntos, bonus de tasa acumulado, score boost. Barra de progreso y badges.

### 3.5 Cola de revisión manual (`/analyst/cola`) — Analista (inciso III)
- **UI:** `DataTable` con casos pendientes (`GET /v1/credits/decisions/queue/manual`): aplicación, monto, score, banda, antigüedad, prioridad.
- **Acción:** click en fila → `/analyst/solicitud/:id`.
- **Filtros:** por banda de riesgo y prioridad.

### 3.6 Detalle de solicitud / score (`/analyst/solicitud/:id`) — Analista ⭐ (inciso II)
- **Objetivo:** mostrar el score **explicable** y resolver.
- **UI:**
  - Encabezado: solicitante, monto, banda, score, probabilidad de default.
  - **`ShapChart`**: gráfico de barras de contribuciones SHAP (positivas/negativas) — es el corazón de la explicabilidad exigida.
  - Evidencia precargada: datos de buró (o `FALLBACK`), fuentes alternativas, señales de fraude.
  - Botones: **Aprobar** / **Rechazar** → `POST /v1/credits/decisions/{id}/resolve` con motivo.
- **Detalle clave:** mostrar `modelVersion` y `modelSlot` (BLUE/GREEN) para auditoría.

### 3.7 Dashboard del inversionista (`/investor/dashboard`) — Inversionista ⭐ (inciso VI)
- **Objetivo:** métricas de cartera en **tiempo real**.
- **Carga inicial:** `GET /v1/portfolio/metrics` y `GET /v1/portfolio/cashflow/projection`.
- **Tiempo real:** suscripción `investor.ws.ts` (socket.io a `/v1/portfolio/stream`) → actualiza KPIs sin recargar.
- **UI:**
  - `StatCard` x4: TIR, PAR30, PAR90, principal vigente.
  - Gráfica de morosidad por segmento (Recharts, barras).
  - Gráfica de flujo de caja proyectado (líneas).
  - Indicador "en vivo" (punto verde) cuando el WS está conectado.

### 3.8 Exposición por fondo (`/investor/fondos/:id`) — Inversionista
- `GET /v1/funds/{fundId}/exposure` → comprometido vs desplegado, target TIR, exposición por banda.

### 3.9 Casos de cobranza (`/collections/casos`) — Cobranza (inciso V)
- **UI:** `DataTable` (`GET /v1/collections/cases`): crédito, días de mora (DPD), monto vencido, etapa (EARLY/MID/LATE/LEGAL).
- **Filtros:** por etapa y DPD. Código de color por severidad (`Badge`).

### 3.10 Detalle de caso (`/collections/casos/:id`) — Cobranza
- **Acciones:**
  - Programar recordatorio: `POST /.../reminders` (selector de canal WhatsApp/SMS/email).
  - Crear acuerdo de pago: `POST /.../agreements` (editor de nuevo cronograma).
  - Reestructurar: `POST /.../restructure`.
  - Reportar a buró: botón con confirmación.
- **UI:** historial de interacciones + estado del acuerdo.

---

## 4. Capa de API (`src/api/`) — contrato con el backend

### 4.1 `client.ts` (wrapper único)
Responsabilidades:
- Base URL desde `import.meta.env.VITE_API_BASE` (por defecto `/v1` vía proxy Vite).
- Adjuntar `Authorization: Bearer <jwt>` si hay sesión.
- Generar y adjuntar `X-Correlation-Id` por request (de `lib/correlation.ts`).
- Parsear errores **RFC 7807** (`{ type, title, status, detail, correlationId }`) y lanzar un `ApiError` tipado.
- Timeout y manejo de `503` (buró/servicio caído) con mensaje amable.

### 4.2 Endpoints consumidos (resumen por archivo)
| Archivo | Endpoints |
|---|---|
| `auth.api.ts` | `POST /auth/login` |
| `origination.api.ts` | `POST /applicants`, `POST /applicants/{id}/document`, `POST /loan-applications`, `GET /loan-applications/{id}` |
| `credit.api.ts` | `POST /credits/decision`, `GET /credits/decisions/queue/manual`, `POST /credits/decisions/{id}/resolve`, `GET /credits/{id}`, `POST /credits/{id}/disbursements` |
| `servicing.api.ts` | `GET /collections/cases`, `POST /collections/cases/{id}/reminders|agreements|restructure`, `GET /courses`, `POST /users/{id}/courses/{courseId}/complete`, `GET /users/{id}/rewards` |
| `investor.api.ts` | `GET /portfolio/metrics`, `GET /portfolio/cashflow/projection`, `GET /funds/{id}/exposure` |
| `investor.ws.ts` | socket.io `connect` → evento `metrics` (push) |

### 4.3 `types.ts` (DTOs espejo — deben coincidir con los `openapi.yaml`)
```ts
export interface LoanApplicationStatus {
  applicationId: string;
  status: 'PROCESSING' | 'APPROVED' | 'REJECTED' | 'MANUAL_REVIEW' | 'FAILED';
  timeline: { step: string; status: string; occurredAt: string }[];
  result?: { approvedAmount: number; interestRate: number; termMonths: number };
}

export interface ScoreExplanation {
  score: number;
  riskBand: string;
  probabilityOfDefault: number;
  modelVersion: string;
  modelSlot: 'BLUE' | 'GREEN';
  partialData: boolean;
  shap: { feature: string; contribution: number }[];
}

export interface PortfolioMetrics {
  asOf: string;
  irr: number;
  par30: number;
  par90: number;
  outstandingPrincipal: number;
  delinquencyBySegment: Record<string, number>;
}
```

---

## 5. Diseño visual (design system mínimo)

- **Tokens** (`theme.css`): paleta (primario fintech azul/verde confianza), neutros, estados (éxito/alerta/error), radios, sombras, escala de espaciado 4/8/16/24.
- **Tipografía:** sistema (`system-ui`) para no depender de fuentes externas (local/gratis).
- **Componentes base** consistentes (`Button`, `Input`, `Card`, `Badge`, `Spinner`) → ningún estilo ad-hoc por página.
- **Accesibilidad:** labels en inputs, foco visible, contraste AA, textos de error asociados al campo.
- **Estados obligatorios en cada vista de datos:** *loading* (Spinner), *empty* (mensaje guía), *error* (banner RFC7807 con `correlationId`), *success*.

---

## 6. Estado, sesión y tiempo real

- **Estado global mínimo:** `AuthContext` (sesión/rol). El resto es estado local por página + datos del servidor (sin Redux; mantener simple para el MVP).
- **Sesión:** JWT en `localStorage`; `RequireRole` protege rutas; expiración → redirige a `/login`.
- **Polling** (`usePolling`): solo en `SolicitudStatus` hasta estado terminal; cancelar al desmontar.
- **WebSocket** (`investor.ws.ts`): conectar al entrar al dashboard, desconectar al salir; reconexión automática de socket.io; fallback a polling de métricas si el WS no conecta.

---

## 7. Variables de entorno del frontend (`.env.example`)
```
VITE_API_BASE=/v1
VITE_GATEWAY_URL=http://localhost:8080
VITE_WS_URL=http://localhost:8105
```
> En desarrollo, el proxy de Vite (`vite.config.ts`) enruta `/v1` → `http://localhost:8080` (gateway), evitando CORS.

---

## 8. Integración con el flujo de trabajo (alineación con el plan)

- **Dueño:** **D1** (Frontend + investor-svc), según [PLAN-DE-TRABAJO.md §1](../PLAN-DE-TRABAJO.md).
- **Fase 0:** D1 define los contratos que necesita del gateway/investor y levanta **mocks Prism**; arranca la UI sin esperar backend.
- **Construcción por fase (prioridad rúbrica):**
  - **Fase 1 (MVP 1):** Login + Wizard de solicitud + Estado de solicitud + (analista) Detalle con SHAP.
  - **Fase 2 (MVP 2):** CTA de desembolso + vistas de cobranza.
  - **Fase 3 (MVP 3):** Dashboard inversionista (RT) + Educación gamificada.
  - **Fase 4 (MVP 4):** (opcional) vista de auditoría/trazabilidad firmada.
- **Definition of Done (frontend):** usa solo `src/api/`; sin `fetch` en componentes; estados loading/empty/error cubiertos; propaga `X-Correlation-Id`; lint en verde; captura en `docs/evidence/`.

---

## 9. Checklist de entregables del frontend

- [ ] Scaffolding Vite + Router + AuthContext + capa `api/` tipada.
- [ ] Login funcional con JWT y guard por rol.
- [ ] Wizard de solicitud (3 pasos) con subida de documento + OCR.
- [ ] Pantalla de estado con timeline en vivo del pipeline.
- [ ] Consola de analista con **gráfico SHAP** y resolución de cola manual.
- [ ] Dashboard de inversionista con KPIs + gráficas + **WebSocket en vivo**.
- [ ] Vistas de cobranza (lista + detalle con acciones).
- [ ] Pantalla de educación financiera gamificada.
- [ ] Estados loading/empty/error en todas las vistas de datos.
- [ ] Responsive (perfil solicitante usable en móvil).
- [ ] Capturas de cada pantalla en `docs/evidence/`.

---

_Fin — Documentación del Frontend NeoLend v1.0_
