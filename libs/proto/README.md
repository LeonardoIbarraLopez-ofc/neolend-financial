# @neolend/proto — Contrato de eventos

Esquemas **JSON-Schema** de los eventos del bus. Es la **fuente de verdad** del contrato de integración asíncrona.

- `schemas/event-envelope.schema.json` — sobre estándar (obligatorio para todo evento).
- Un esquema por `payload` de evento (a crear en Fase 0 por el productor de cada evento).

## Reglas

- Cambios **solo aditivos** (compatibilidad BACKWARD).
- El productor de un evento es el dueño de su esquema (ver tabla maestra en `PLAN-DE-TRABAJO.md §4.2`).
- Los tipos TypeScript equivalentes viven en `libs/ts-events` y deben mantenerse sincronizados con estos esquemas.
- El job `contract-check` del CI valida que los esquemas no introduzcan cambios incompatibles.
