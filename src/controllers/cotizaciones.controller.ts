import type { Request, Response } from "express";
import { CotizacionModel, type CotizacionAttrs } from "../models/Cotizacion.js";
import { crearCotizacionSchema } from "../schemas/cotizacion.schema.js";
import { calcularRangoEstimado, REGLA_CALCULO_VERSION } from "../services/pricing.service.js";
import { confirmarAlCliente, notificarEquipoComercial } from "../services/notification.service.js";
import { toClienteResponse } from "../transformers/cotizacion.transformer.js";

/**
 * Express 5 reenvía automáticamente las promesas rechazadas de un handler async
 * a `next(err)` — no hace falta envolver esto en try/catch para que
 * `crearCotizacionSchema.parse()` (que lanza ZodError) llegue al errorHandler.
 */
export async function crearCotizacion(req: Request, res: Response): Promise<void> {
  const input = crearCotizacionSchema.parse(req.body);

  const rangoEstimadoCLP = calcularRangoEstimado(input.tipologiaSlug);

  const nuevaCotizacion: Partial<CotizacionAttrs> = {
    tipologiaSlug: input.tipologiaSlug,
    tipologiaNombre: input.tipologiaNombre,
    especificaciones: input.especificaciones,
    reglaCalculoVersion: REGLA_CALCULO_VERSION,
    rangoEstimadoCLP,
    contacto: {
      nombre: input.contacto.nombre,
      email: input.contacto.email,
      telefono: input.contacto.telefono,
      empresa: input.contacto.empresa ?? null,
      comentario: input.contacto.comentario ?? null,
    },
  };

  const doc = await CotizacionModel.create(nuevaCotizacion);

  // R-004: registrar el intento pase lo que pase, nunca fallar en silencio.
  await notificarEquipoComercial(doc);
  await confirmarAlCliente(doc);

  res.status(201).json(toClienteResponse(doc));
}
