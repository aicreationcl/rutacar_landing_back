import type { NextFunction, Request, Response } from "express";
import { z } from "zod";

export class AppError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

/**
 * Manejador de errores general — debe registrarse último y con 4 parámetros
 * (Express 5 exige la aridad exacta para reconocerlo como error handler).
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction): void {
  if (err instanceof z.ZodError) {
    res.status(400).json({ error: "Datos inválidos", detalle: z.treeifyError(err) });
    return;
  }

  if (err instanceof AppError) {
    res.status(err.status).json({ error: err.message });
    return;
  }

  console.error("[errorHandler] Error no controlado:", err);
  res.status(500).json({ error: "Error interno del servidor" });
}
