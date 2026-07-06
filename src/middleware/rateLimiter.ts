import { rateLimit } from "express-rate-limit";
import { env } from "../config/env.js";

/**
 * LA-2026-004: en otro proyecto, express-rate-limit se instaló pero nunca se
 * activó en las rutas críticas hasta el cierre — quedó como deuda técnica
 * expuesta en producción. Aquí se configura desde el Sprint 0, no como tarea
 * pendiente de un sprint posterior.
 *
 * IMPORTANTE: con el patrón de proxy server-to-server, este backend solo ve la
 * IP del servidor de Next.js, no la del navegador de cada visitante — limitar
 * por IP aquí protege contra un bug/loop del propio proxy, pero NO reemplaza el
 * rate limiting por IP real del visitante, que debe vivir en el Route Handler
 * proxy de Next.js (pendiente al construirlo). Ver R-003 en el prompt maestro.
 */
/** Compartido por /api/cotizaciones y /api/precalificaciones — mismo objetivo de anti-abuso. */
export const leadsRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MINUTES * 60 * 1000,
  limit: env.RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  ipv6Subnet: 56,
  message: { error: "Demasiadas solicitudes de cotización. Intenta de nuevo más tarde." },
});
