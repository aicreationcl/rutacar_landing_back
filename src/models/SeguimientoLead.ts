import { Schema, model, type HydratedDocument, type Types } from "mongoose";

export const TIPOS_LEAD = ["cotizacion", "precalificacion"] as const;
export type TipoLead = (typeof TIPOS_LEAD)[number];

/**
 * Registro de cada intento de seguimiento enviado — colección propia en vez
 * de agregar campos a Cotizacion/PrecalificacionLead (sin migración sobre
 * documentos ya en producción). Un lead frío se detecta cruzando estado
 * "nueva" en su colección de origen contra la ausencia de filas aquí.
 */
export interface SeguimientoLeadAttrs {
  leadId: Types.ObjectId;
  leadTipo: TipoLead;
  numeroIntento: number;
  fechaEnvio: Date;
  enviado: boolean;
}

export type SeguimientoLeadDoc = HydratedDocument<SeguimientoLeadAttrs>;

const seguimientoLeadSchema = new Schema<SeguimientoLeadAttrs>({
  leadId: { type: Schema.Types.ObjectId, required: true, index: true },
  leadTipo: { type: String, enum: TIPOS_LEAD, required: true },
  numeroIntento: { type: Number, required: true, min: 1, max: 3 },
  fechaEnvio: { type: Date, required: true, default: () => new Date() },
  enviado: { type: Boolean, required: true },
});

export const SeguimientoLeadModel = model<SeguimientoLeadAttrs>("SeguimientoLead", seguimientoLeadSchema);
