# Arquitectura — rutacar_landing_back

Contexto completo y justificación de negocio en [`../prompt-maestro-desarrollo.md`](../prompt-maestro-desarrollo.md) (sección `STACK_TECNOLOGICO`). Este documento es el resumen técnico para quien abre este repo directamente.

## Por qué un backend separado del sitio Next.js

El sitio público (`rutacar_landing_new`, Incremento 01) es una landing de marketing/SEO. Este backend es el primer componente transaccional del proyecto Ruta Car, y el mapa de dependencias de `00-plan-tecnico-general.md` muestra que **5 incrementos más** (04 portal de seguimiento, 07 CRM, 08 gestión de taller, 09 dashboard) van a necesitar esta misma capa de datos, varios con paneles internos autenticados. Mezclarlo con el bundle público habría significado una migración forzada más cara en el Incremento 04. Se separa desde ahora.

## Diagrama

```
Navegador ──(nunca directo)──X

rutacar_landing_new (Next.js)          rutacar_landing_back (este repo)         MongoDB Atlas
   Route Handler proxy      ── POST ──▶   requireBackendApiKey                       │
   app/api/cotizaciones/route.ts           │                                          │
   (x-backend-api-key)                     ▼                                          │
                                    cotizacionesRateLimiter                           │
                                            │                                          │
                                            ▼                                          │
                                    crearCotizacionSchema (Zod)                       │
                                            │                                          │
                                            ▼                                          │
                                    CotizacionModel.create() ────────────────────────▶│
                                            │
                                            ▼
                                    notificarEquipoComercial / confirmarAlCliente (stub)
```

## Reglas de comunicación

- **Autenticación:** header `x-backend-api-key`, verificado en `src/middleware/apiKeyAuth.ts`. Sin este header válido, todo `/api/*` responde 401. No hay otro mecanismo de auth todavía — los paneles internos futuros (04/07/08/09) necesitarán su propio esquema de autenticación de usuario, adicional a esta capa.
- **`tipologiaNombre` no se valida contra un catálogo propio**: este backend no tiene el catálogo de tipologías (vive en `rutacar_landing_new/lib/content/tipologias.ts`, single source of truth, LA-2026-027). El proxy de Next.js resuelve el nombre real a partir del slug antes de reenviar — este backend simplemente graba lo que recibe como snapshot (LA-2026-002).
- **Rate limiting de este backend** (`src/middleware/rateLimiter.ts`) solo ve la IP del servidor de Next.js, no la del visitante real — es una segunda capa de defensa, no la principal. El límite por visitante real vive en el proxy (`rutacar_landing_new/lib/server/rateLimit.ts`).

## Esquema de datos

Ver el bloque de comentarios en [`src/models/Cotizacion.ts`](src/models/Cotizacion.ts) — documenta explícitamente qué campos son snapshot y cuáles son metadata de seguimiento pensada para el futuro CRM (Incremento 07).

## Decisiones técnicas notables

- **Mongoose 9 + Express 5 + Zod 4**: versiones mayores más nuevas que el conocimiento de entrenamiento del asistente al momento de escribir este código — se verificaron contra documentación actual (Context7) antes de escribir el primer archivo. Ver nota de versión en [`README.md`](README.md).
- **Reglas de cálculo de precio provisionales** (`src/services/pricing.service.ts`): ver [`DEUDA_TECNICA.md`](DEUDA_TECNICA.md).
