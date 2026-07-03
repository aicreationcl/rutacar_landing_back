import express, { type Express } from "express";
import helmet from "helmet";
import { env } from "./config/env.js";
import { requireBackendApiKey } from "./middleware/apiKeyAuth.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { cotizacionesRouter } from "./routes/cotizaciones.routes.js";

/**
 * LA-2026-017: los orígenes permitidos quedan documentados aquí y en el README,
 * aunque el flujo público (formulario → proxy Next.js → este backend) no
 * dependa de CORS de navegador. Se deja preparado por si un incremento futuro
 * (04, 07, 08, 09) necesita que un panel interno llame a este backend desde el
 * navegador directamente, detrás de su propia autenticación de usuario.
 */
export const ALLOWED_ORIGINS = env.ALLOWED_ORIGINS;

export function createApp(): Express {
  const app = express();

  app.disable("x-powered-by");
  app.use(helmet());
  app.use(express.json({ limit: "100kb" }));

  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });

  // Todo lo que cuelga de /api requiere la API key server-to-server — el
  // backend nunca queda expuesto directamente al navegador (ver decisión de
  // arquitectura del Incremento 02).
  app.use("/api", requireBackendApiKey);
  app.use("/api/cotizaciones", cotizacionesRouter);

  app.use((_req, res) => {
    res.status(404).json({ error: "No encontrado" });
  });

  app.use(errorHandler);

  return app;
}
