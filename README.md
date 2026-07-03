# rutacar_landing_back

Backend del **Incremento 02 · Cotizador de Carrocerías** del proyecto Ruta Car. Repositorio: [aicreationcl/rutacar_landing_back](https://github.com/aicreationcl/rutacar_landing_back) — separado del sitio público (`rutacar_landing_new`, Incremento 01). Ver la justificación completa de esta arquitectura en [`../prompt-maestro-desarrollo.md`](../prompt-maestro-desarrollo.md).

## Arquitectura

```
Next.js (rutacar_landing_new)  ── POST /api/cotizaciones (proxy server-to-server) ──▶  rutacar_landing_back (este repo)  ──▶  MongoDB Atlas
```

- El navegador **nunca** llama a este backend directamente. Solo el servidor de Next.js lo hace, autenticado con `BACKEND_API_KEY` (header `x-backend-api-key`).
- Futuros consumidores directos (con su propia autenticación de usuario, no esta API key): panel interno del Incremento 04, CRM del Incremento 07, gestión de taller del Incremento 08, dashboard del Incremento 09.

## Stack

Node.js + TypeScript (ESM, `strict: true`) + Express 5 + Mongoose 9 + Zod 4. Tests con Vitest + Supertest + `mongodb-memory-server` (LA-2026-005 — nunca mockear el ORM).

> Nota de versión: `npm install` resolvió Express 5, Mongoose 9, Zod 4 y TypeScript 6 — todas versiones mayores más recientes que el conocimiento de entrenamiento del asistente al momento de escribir este código. Antes de escribir el código se consultó documentación actual vía Context7 (LA-2026-046) para los patrones que cambian entre versiones: manejo automático de errores async y sintaxis de rutas en Express 5, `z.email()`/`z.treeifyError()` en Zod 4 (reemplazan `.email()` encadenado y `.flatten()`), y el renombre `FilterQuery → QueryFilter` en Mongoose 9.

## Variables de entorno

Ver [`.env.example`](.env.example). Ninguna tiene valor por defecto salvo `PORT`, `NODE_ENV` y los parámetros de rate limiting — `MONGODB_URI` y `BACKEND_API_KEY` son obligatorias y el arranque falla explícitamente (`src/config/env.ts`) si faltan o son inválidas.

## Orígenes permitidos (`ALLOWED_ORIGINS`)

LA-2026-017: documentado aquí aunque el flujo público actual no dependa de CORS de navegador (usa el proxy server-to-server). Relevante cuando un panel interno futuro llame a este backend directamente desde el navegador.

## Scripts

```bash
npm run dev     # tsx watch — desarrollo local
npm run build   # tsc → dist/
npm start       # node dist/server.js — producción
npm test        # vitest run — tests de integración con MongoMemoryServer
npm run lint    # eslint
```

## Endpoints

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | `/health` | ninguna | Liveness check para Railway |
| POST | `/api/cotizaciones` | `x-backend-api-key` | Crea una cotización preliminar (rate limited) |

## Pendientes conocidos (no bloquean el esqueleto, sí el DP-FINAL del incremento)

- **Reglas de cálculo reales** (`src/services/pricing.service.ts`): hoy usa un rango conservador provisional (`v0-conservador-provisional`) por tipología — depende de la reunión con el equipo comercial de Ruta Car (riesgo R-001 del prompt maestro).
- **Notificación por email real** (`src/services/notification.service.ts`): conectada a Resend, pero con `FROM_EMAIL=onboarding@resend.dev` (dominio de pruebas sin verificar) — solo puede enviar hacia `ADMIN_EMAIL` (la cuenta dueña de la API key), no hacia el email real que escribe cada cliente en el formulario. Verificar un dominio propio de Ruta Car en resend.com/domains antes de DP-FINAL (ver DEUDA_TECNICA.md DT-02).
- **Rate limiting por IP real de usuario**: el limiter de este backend (`src/middleware/rateLimiter.ts`) solo ve la IP del servidor de Next.js, no la del visitante — el rate limiting por IP de usuario real debe implementarse en el Route Handler proxy de Next.js (próximo paso, todavía no construido).
- **`targetPort` de Railway**: al crear el servicio de este backend en Railway, verificar el `targetPort` contra el puerto real de arranque de Express (`PORT` en `.env`) — LA-2026-042 ya se repitió una vez en el Incremento 01.
