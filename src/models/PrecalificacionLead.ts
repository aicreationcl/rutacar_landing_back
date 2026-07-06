import { Schema, model, type HydratedDocument } from "mongoose";
import { ESTADOS_COTIZACION, type EstadoCotizacion } from "./Cotizacion.js";

export const CALIFICACIONES_LEAD = ["prioritario", "a_seguir", "descartar"] as const;
export type CalificacionLead = (typeof CALIFICACIONES_LEAD)[number];

/**
 * Colección propia (no reutiliza Cotizacion) — el formulario de
 * precalificación es deliberadamente independiente del cotizador técnico
 * (ver plan-ejecucion.md del Incremento 03). Reutiliza el vocabulario de
 * `estado` de Cotizacion (ESTADOS_COTIZACION) para que el futuro CRM
 * (Incremento 07) consuma ambos leads con el mismo pipeline sin migración.
 */
export interface PrecalificacionLeadAttrs {
  tipoVehiculo: string;
  industria: string;
  usoPrincipal?: string | null;
  plazoEstimado: string;
  contacto: {
    nombre: string;
    email: string;
    telefono: string;
  };
  calificacion: CalificacionLead;
  reglaCalificacionVersion: string;
  estado: EstadoCotizacion;
  canalOrigen: "formulario_precalificacion";
  fechaCreacion: Date;
  notificacionEnviada: boolean;
  notificacionIntentos: number;
}

export type PrecalificacionLeadDoc = HydratedDocument<PrecalificacionLeadAttrs>;

const precalificacionLeadSchema = new Schema<PrecalificacionLeadAttrs>({
  tipoVehiculo: { type: String, required: true, index: true },
  industria: { type: String, required: true },
  usoPrincipal: { type: String, default: null },
  plazoEstimado: { type: String, required: true },
  contacto: {
    nombre: { type: String, required: true },
    email: { type: String, required: true },
    telefono: { type: String, required: true },
  },
  calificacion: { type: String, enum: CALIFICACIONES_LEAD, required: true, index: true },
  reglaCalificacionVersion: { type: String, required: true },
  estado: {
    type: String,
    enum: ESTADOS_COTIZACION,
    default: "nueva",
    required: true,
    index: true,
  },
  canalOrigen: {
    type: String,
    enum: ["formulario_precalificacion"],
    required: true,
    default: "formulario_precalificacion",
  },
  fechaCreacion: { type: Date, required: true, default: () => new Date() },
  notificacionEnviada: { type: Boolean, required: true, default: false },
  notificacionIntentos: { type: Number, required: true, default: 0 },
});

export const PrecalificacionLeadModel = model<PrecalificacionLeadAttrs>(
  "PrecalificacionLead",
  precalificacionLeadSchema,
);
