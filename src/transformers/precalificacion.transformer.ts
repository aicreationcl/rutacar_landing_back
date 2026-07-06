import type { PrecalificacionLeadDoc } from "../models/PrecalificacionLead.js";

/**
 * LA-2026-016/001: nunca spread del doc Mongoose, proyectar explícito. El
 * cliente solo necesita `calificacion` para elegir el mensaje de resultado —
 * nunca se le exponen campos internos de seguimiento (estado, notificacion*).
 */
export interface PrecalificacionClienteResponse {
  id: string;
  calificacion: string;
}

export function toClienteResponse(doc: PrecalificacionLeadDoc): PrecalificacionClienteResponse {
  return {
    id: doc._id.toString(),
    calificacion: doc.calificacion,
  };
}
