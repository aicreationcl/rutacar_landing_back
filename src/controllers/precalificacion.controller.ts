import type { Request, Response } from "express";
import { PrecalificacionLeadModel, type PrecalificacionLeadAttrs } from "../models/PrecalificacionLead.js";
import { crearPrecalificacionSchema } from "../schemas/precalificacion.schema.js";
import { calificarLead, REGLA_CALIFICACION_VERSION } from "../services/precalificacion.service.js";
import { notificarEquipoComercialPrecalificacion } from "../services/precalificacion.notification.service.js";
import { toClienteResponse } from "../transformers/precalificacion.transformer.js";

export async function crearPrecalificacion(req: Request, res: Response): Promise<void> {
  const input = crearPrecalificacionSchema.parse(req.body);

  const calificacion = calificarLead({ plazoEstimado: input.plazoEstimado });

  const nuevoLead: Partial<PrecalificacionLeadAttrs> = {
    tipoVehiculo: input.tipoVehiculo,
    industria: input.industria,
    usoPrincipal: input.usoPrincipal ?? null,
    plazoEstimado: input.plazoEstimado,
    contacto: {
      nombre: input.contacto.nombre,
      email: input.contacto.email,
      telefono: input.contacto.telefono,
    },
    calificacion,
    reglaCalificacionVersion: REGLA_CALIFICACION_VERSION,
  };

  const doc = await PrecalificacionLeadModel.create(nuevoLead);

  // R-004 (mismo criterio que cotizaciones): registrar el intento pase lo que pase.
  await notificarEquipoComercialPrecalificacion(doc);

  res.status(201).json(toClienteResponse(doc));
}
