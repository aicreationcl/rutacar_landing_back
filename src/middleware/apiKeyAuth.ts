import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env.js";

/**
 * Este backend no debe ser alcanzable directamente por el navegador (ver
 * decisión de arquitectura en prompt-maestro-desarrollo.md del Incremento 02).
 * Su único cliente confiable hoy es el Route Handler proxy de Next.js, que
 * conoce esta misma API key server-to-server. Los futuros paneles internos
 * (Incrementos 04, 07, 08, 09) tendrán su propio mecanismo de autenticación de
 * usuario, adicional a esta capa.
 */
export function requireBackendApiKey(req: Request, res: Response, next: NextFunction): void {
  const providedKey = req.header("x-backend-api-key");

  if (!providedKey || providedKey !== env.BACKEND_API_KEY) {
    res.status(401).json({ error: "No autorizado" });
    return;
  }

  next();
}
