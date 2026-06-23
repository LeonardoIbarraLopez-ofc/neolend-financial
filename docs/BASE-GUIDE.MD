KATA ARQUITECTÓNICO – HACKATON FINAL (16/06/2026)

START UP NEOLEND FINANCIAL CORP.
Un grupo de inversión de capital de riesgo ha identificado que el 60% de la población latinoamericana no tiene acceso a crédito bancario formal por falta de historial crediticio tradicional. Tras obtener licencia de operación como entidad financiera digital, lanza NeoLend Financial Corp. y contrata a un equipo de desarrollo para construir una Plataforma FinTech de Crédito Digital que evalúe el riesgo crediticio usando fuentes de datos alternativas (comportamiento de pago de servicios públicos Ej. Luz, agua, telefonía celular y fija, etc., actividad en e-commerce, historial de recargas móviles), otorgue créditos en minutos y gestione toda la cartera de préstamos en tiempo real.
Usuarios
Más de 2 millones de solicitantes de crédito en el primer año (proyección de crecimiento del 300% anual).
~1,200 analistas de riesgo y gestores de cobranza.
Inversionistas institucionales que fondean la cartera de créditos (~50 fondos).
Entes regulatorios financieros (Superintendencia de Bancos o equivalente).
Comercios afiliados que ofrecen crédito NeoLend en el punto de venta.
Requerimientos
Funcionales
Los solicitantes deben poder solicitar un crédito desde la app móvil en menos de 3 minutos, subiendo solo su documento de identidad (el sistema hace el resto mediante APIs externas).
El motor de score crediticio debe consumir en tiempo real: buró de crédito, historial de servicios públicos, comportamiento transaccional de billeteras digitales y datos de e-commerce, generando un puntaje explicable (SHAP values visibles para el analista).
El sistema de aprobación automática debe otorgar créditos de hasta USD 500 sin intervención humana en menos de 90 segundos; montos mayores escalan a revisión manual con toda la evidencia pre-cargada.
El desembolso debe integrarse con billeteras digitales, cuentas bancarias y redes de corresponsales bancarios para entrega de efectivo.
El módulo de cobranza debe gestionar el ciclo de vida completo: recordatorios automáticos por WhatsApp/SMS/email, acuerdos de pago, reestructuraciones y reporte a burós de crédito.
Los inversionistas deben acceder a un portal en tiempo real con métricas de la cartera: TIR, morosidad por segmento, flujo de caja proyectado y exposición al riesgo.
El sistema debe detectar fraudes en tiempo real durante la solicitud, comparando patrones biométricos del documento con bases de datos de identidades robadas.
Debe existir un módulo de educación financiera gamificado que mejore el score del usuario al completar cursos y pague bonificaciones en tasas de interés.
No Funcionales
El pipeline de scoring debe procesar el 95% de solicitudes en menos de 60 segundos de extremo a extremo.
Cumplimiento regulatorio: cifrado de datos financieros con AES-256, logs inmutables de todas las decisiones de crédito (auditables por 10 años), y reportes automáticos al ente regulador.
El sistema debe operar en modo activo-activo en dos regiones geográficas para garantizar continuidad ante desastres.
Las decisiones del modelo de IA deben ser explicables y no discriminatorias (auditoría de sesgo demográfico mensual).
Contexto Adicional
El buró de crédito nacional opera en un sistema mainframe IBM Z con una API SOAP de los años 2000 que tiene límite de 10 consultas/segundo y frecuentemente presenta latencias de 8-15 segundos; debe manejarse con circuit breaker y caché inteligente.
Todas las decisiones de crédito son auditadas mensualmente por la Superintendencia de Bancos, que exige acceso a la trazabilidad completa del proceso de scoring incluyendo las variables de entrada, pesos del modelo y decisión final, con firmas digitales del sistema.
La regulación local exige que los datos biométricos de los usuarios nunca salgan del país (data residency), lo que impide usar servicios cloud de reconocimiento facial de proveedores extranjeros.

Instrucciones
Desarrollar el sistema que NeoLend Financial Corp. está solicitando considerando los siguientes puntos:

N°	MVP	Ponderación
1	Incisos I., II., III. – Solicitud de crédito, motor de scoring con fuentes alternativas y aprobación automática.	60%
2	Incisos IV., V. – Desembolso multi-canal e integración con billeteras/corresponsales, y módulo de cobranza.	70%
3	Incisos VI., VII., VIII. – Portal de inversionistas en tiempo real, detección de fraude y módulo gamificado.	80%
4	Inciso b) del Contexto Adicional – Trazabilidad auditada de decisiones de scoring con firma digital para la Superintendencia.	100%

Importante por considerar: los MVPs no pueden ser básicos; deben tener complejidad media. La arquitectura obligatoria es microservicios. El motor de scoring debe implementarse como un microservicio independiente con capacidad de actualización del modelo sin downtime (blue/green deployment del modelo ML).
Cada microservicio debe gestionar su propia base de datos. Se recomienda CQRS+Event Sourcing para el servicio de créditos (trazabilidad regulatoria). Incluir enlaces a repositorios de Github del grupo.
Rúbrica
Los MVPs se desarrollan en el tiempo de clase de 18:45 a 21:15 (los últimos 15 minutos para carga al LMS).
Documentación requerida: diagramas C4, diagrama de flujo del pipeline de scoring, ADRs, diseño del esquema de Event Sourcing y diagrama de despliegue activo-activo.
Debe diseñarse la estrategia de circuit breaker para la integración con el buró de crédito (inciso a del contexto adicional).
El documento entregable debe incluir carátula con detalle de los alumnos asistentes al hackathon.
El documento debe contener las imágenes de respaldo del sistema como evidencia del MVP logrado.
Cualquier consulta puede dirigirse al docente durante la sesión.
