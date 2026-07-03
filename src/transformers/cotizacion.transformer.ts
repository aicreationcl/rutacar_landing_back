import type { CotizacionDoc } from "../models/Cotizacion.js";

/**
 * LA-2026-016: nunca hacer spread de un documento Mongoose (`{ ...doc }`) — filtra
 * metadata interna del ORM. LA-2026-001: proyectar explícitamente los campos que
 * necesita cada consumidor, en vez de asumir que el default de una consulta trae
 * todo lo que hace falta.
 *
 * Este transformer es el único punto donde el sitio Next.js (a través del proxy)
 * recibe datos de una cotización — nunca el documento de Mongoose directamente.
 */
export interface CotizacionClienteResponse {
  id: string;
  rangoEstimadoCLP: { min: number; max: number };
  reglaCalculoVersion: string;
  contactoEmail: string;
}

export function toClienteResponse(doc: CotizacionDoc): CotizacionClienteResponse {
  return {
    id: doc._id.toString(),
    rangoEstimadoCLP: {
      min: doc.rangoEstimadoCLP.min,
      max: doc.rangoEstimadoCLP.max,
    },
    reglaCalculoVersion: doc.reglaCalculoVersion,
    contactoEmail: doc.contacto.email,
  };
}
