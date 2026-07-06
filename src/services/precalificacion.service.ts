/**
 * Reglas de calificación del formulario de precalificación (Incremento 03).
 *
 * PENDIENTE (mismo patrón que R-001/DT-01 del cotizador): las reglas reales
 * dependen de una reunión con el equipo comercial de Ruta Car, no agendada
 * todavía. Regla v0 = el ejemplo literal del propio plan de ejecución
 * ("plazo 'este mes' + industria objetivo = lead prioritario"), documentada
 * como placeholder honesto (LA-2026-045), no como definitiva.
 *
 * `version` queda grabado en cada lead (snapshot, LA-2026-002) para poder
 * distinguir después qué leads se calificaron con esta regla provisional.
 */
export const REGLA_CALIFICACION_VERSION = "v0-simple-provisional";

export type Calificacion = "prioritario" | "a_seguir" | "descartar";

export interface CalificarLeadInput {
  plazoEstimado: string;
}

export function calificarLead({ plazoEstimado }: CalificarLeadInput): Calificacion {
  if (plazoEstimado === "inmediato") return "prioritario";
  if (plazoEstimado === "1-3-meses") return "a_seguir";
  return "descartar";
}
