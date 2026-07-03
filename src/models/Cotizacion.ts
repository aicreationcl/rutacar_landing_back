import { Schema, model, type HydratedDocument } from "mongoose";

export const ESTADOS_COTIZACION = [
  "nueva",
  "contactada",
  "cotizacion_enviada",
  "negociacion",
  "ganada",
  "perdida",
] as const;

export type EstadoCotizacion = (typeof ESTADOS_COTIZACION)[number];

/**
 * Forma canónica del documento de cotización.
 *
 * Los campos de "snapshot" (tipologiaNombre, especificaciones, reglaCalculoVersion,
 * rangoEstimadoCLP) se copian tal cual estaban al momento de guardar (LA-2026-002):
 * si las reglas de cálculo cambian después, una cotización histórica no debe
 * "cambiar de precio" retroactivamente.
 *
 * Los campos de metadata de seguimiento (estado, canalOrigen, fechaCreacion,
 * notificacion*) están pensados para ser consumidos sin migración por el futuro
 * CRM del Incremento 07 — el mismo vocabulario de `estado` que usará su pipeline.
 */
export interface CotizacionAttrs {
  tipologiaSlug: string;
  tipologiaNombre: string;
  especificaciones: Record<string, string | number | boolean>;
  reglaCalculoVersion: string;
  rangoEstimadoCLP: { min: number; max: number };
  contacto: {
    nombre: string;
    email: string;
    telefono: string;
    empresa?: string | null;
    comentario?: string | null;
  };
  estado: EstadoCotizacion;
  canalOrigen: "formulario_web";
  fechaCreacion: Date;
  notificacionEnviada: boolean;
  notificacionIntentos: number;
}

export type CotizacionDoc = HydratedDocument<CotizacionAttrs>;

const cotizacionSchema = new Schema<CotizacionAttrs>({
  tipologiaSlug: { type: String, required: true, index: true },
  tipologiaNombre: { type: String, required: true },
  especificaciones: { type: Schema.Types.Mixed, required: true },
  reglaCalculoVersion: { type: String, required: true },
  rangoEstimadoCLP: {
    min: { type: Number, required: true },
    max: { type: Number, required: true },
  },
  contacto: {
    nombre: { type: String, required: true },
    email: { type: String, required: true },
    telefono: { type: String, required: true },
    empresa: { type: String, default: null },
    comentario: { type: String, default: null },
  },
  estado: {
    type: String,
    enum: ESTADOS_COTIZACION,
    default: "nueva",
    required: true,
    index: true,
  },
  canalOrigen: { type: String, enum: ["formulario_web"], required: true, default: "formulario_web" },
  fechaCreacion: { type: Date, required: true, default: () => new Date() },
  notificacionEnviada: { type: Boolean, required: true, default: false },
  notificacionIntentos: { type: Number, required: true, default: 0 },
});

export const CotizacionModel = model<CotizacionAttrs>("Cotizacion", cotizacionSchema);
