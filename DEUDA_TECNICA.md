# Registro de deuda técnica — Incremento 02 (Cotizador)

> Formato heredado del Incremento 01 (LA-2026-020): P0 = crítico, P3 = bajo. Cubre ambos repos del incremento (`rutacar_landing_back` y el proxy en `rutacar_landing_new`).

| ID | Ítem | Prioridad | Repo | Descripción | Acción antes de DP-FINAL |
|---|---|---|---|---|---|
| DT-01 | Reglas de cálculo provisionales | P0 | backend | `src/services/pricing.service.ts` usa un rango conservador por tipología (`v0-conservador-provisional`), no las reglas reales del negocio. | Bloqueante real de DP-FINAL — depende de la reunión con el equipo comercial de Ruta Car (riesgo R-001). |
| DT-02 | Notificación por email es un stub | P0 | backend | `src/services/notification.service.ts` solo loguea el contenido; no hay proveedor real (Resend/Nodemailer) conectado. | Conectar un proveedor real y verificar con un envío de punta a punta antes de DP-FINAL. |
| DT-03 | Sin MongoDB Atlas ni servicio Railway del backend provisionados | P1 | backend | El código está listo pero corre solo local/verificado con Mongo en memoria — no hay cluster Atlas ni deploy real todavía. | Provisionar Atlas + Railway (bloqueado por credenciales del usuario, no por código). |
| DT-04 | WhatsApp Business API no conectado | P2 | backend + frontend | La confirmación al cliente y la notificación al equipo solo usan email. WhatsApp queda `[POR DEFINIR CON RUTA CAR]` (requiere cuenta Meta verificada). | Evaluar cuando Ruta Car tenga la cuenta lista; no bloquea el MVP (el click-to-chat del Incremento 01 cubre el canal manual). |
| DT-05 | Sin formulario multi-paso real todavía | P1 | frontend | El proxy (`app/api/cotizaciones/route.ts`) existe y está probado, pero no hay UI que lo consuma — se probó con `curl`. | Construir en el siguiente paso (WBS 2.1.3, Sprint 1). |
| DT-06 | Sin `NEXT_PUBLIC_USE_MOCKS` en el frontend | P2 | frontend | El modo de mocks (LA-2026-010) para desarrollar el formulario sin depender del backend real todavía no existe. | Implementar junto con el formulario multi-paso. |
| DT-07 | Contrato de tipos entre los dos repos mantenido a mano | P2 | ambos | No hay un paquete de tipos compartido — `CrearCotizacionInput` (backend) y el payload que arma el proxy (frontend) se mantienen sincronizados manualmente. | Si el número de endpoints crece (Incrementos 04/07), evaluar un paquete compartido (ver R-008 del prompt maestro). |
| DT-08 | Verificado y corregido: slugs de tipología en `pricing.service.ts` | Cerrado | backend | La primera versión usaba slugs inventados que no coincidían con el catálogo real (`lib/content/tipologias.ts`). Detectado y corregido durante la verificación end-to-end del proxy. | Ninguna — cerrado, ver commit "Corregir slugs de tipologia...". Se deja registrado como lección: sin la prueba end-to-end real, este bug habría llegado a producción silenciosamente (ningún test unitario lo detectaba, porque el backend no valida sus reglas contra el catálogo del otro repo). |

## Cómo se usa

Revisar al inicio de cada sprint (mismo hábito que el Incremento 01). Cerrar un ítem = mover su fila a "Cerrado" con el commit/fecha que lo resolvió, no borrarla.
