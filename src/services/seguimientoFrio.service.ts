import { CotizacionModel, type CotizacionDoc } from "../models/Cotizacion.js";
import { PrecalificacionLeadModel, type PrecalificacionLeadDoc } from "../models/PrecalificacionLead.js";
import { SeguimientoLeadModel, type TipoLead } from "../models/SeguimientoLead.js";
import { enviarEmailReal } from "./email.js";

/**
 * Umbrales de reenganche en días (placeholder, ejemplo literal del propio
 * plan de ejecución del Incremento 06) — pendiente de calibrar con marketing
 * /comercial. `intentosPrevios` (0, 1 o 2) indexa directo: el toque N+1 se
 * debe cuando pasaron >= UMBRALES_DIAS[N] días desde la creación del lead.
 */
export const UMBRALES_DIAS = [5, 10, 20] as const;
export const MAX_INTENTOS = UMBRALES_DIAS.length;

export interface LeadFrioPendiente {
  leadId: string;
  leadTipo: TipoLead;
  siguienteIntento: number;
  nombre: string;
  email: string;
  descripcion: string;
}

function diasDesde(fecha: Date, ahora: Date): number {
  return (ahora.getTime() - fecha.getTime()) / (24 * 60 * 60 * 1000);
}

/**
 * Calcula si un lead con `intentosPrevios` ya enviados y `fechaCreacion` dada
 * debe recibir el siguiente toque. Nunca salta pasos: si el job estuvo
 * detenido, un lead de 25 días con 0 intentos recibe el toque 1, no el 3.
 */
export function siguienteIntentoDebido(fechaCreacion: Date, intentosPrevios: number, ahora: Date): number | null {
  const umbral = UMBRALES_DIAS.at(intentosPrevios);
  if (umbral === undefined) return null;
  if (diasDesde(fechaCreacion, ahora) >= umbral) return intentosPrevios + 1;
  return null;
}

async function contarIntentosPrevios(leadId: string): Promise<number> {
  return SeguimientoLeadModel.countDocuments({ leadId, enviado: true });
}

async function buscarPendientesCotizaciones(ahora: Date): Promise<LeadFrioPendiente[]> {
  const cotizaciones = await CotizacionModel.find({ estado: "nueva" }).lean();
  const pendientes: LeadFrioPendiente[] = [];

  for (const c of cotizaciones as CotizacionDoc[]) {
    const intentosPrevios = await contarIntentosPrevios(c._id.toString());
    const siguiente = siguienteIntentoDebido(c.fechaCreacion, intentosPrevios, ahora);
    if (siguiente) {
      pendientes.push({
        leadId: c._id.toString(),
        leadTipo: "cotizacion",
        siguienteIntento: siguiente,
        nombre: c.contacto.nombre,
        email: c.contacto.email,
        descripcion: c.tipologiaNombre,
      });
    }
  }
  return pendientes;
}

async function buscarPendientesPrecalificaciones(ahora: Date): Promise<LeadFrioPendiente[]> {
  const leads = await PrecalificacionLeadModel.find({ estado: "nueva" }).lean();
  const pendientes: LeadFrioPendiente[] = [];

  for (const l of leads as PrecalificacionLeadDoc[]) {
    const intentosPrevios = await contarIntentosPrevios(l._id.toString());
    const siguiente = siguienteIntentoDebido(l.fechaCreacion, intentosPrevios, ahora);
    if (siguiente) {
      pendientes.push({
        leadId: l._id.toString(),
        leadTipo: "precalificacion",
        siguienteIntento: siguiente,
        nombre: l.contacto.nombre,
        email: l.contacto.email,
        descripcion: l.tipoVehiculo,
      });
    }
  }
  return pendientes;
}

export async function buscarLeadsFriosPendientes(ahora: Date = new Date()): Promise<LeadFrioPendiente[]> {
  const [cotizaciones, precalificaciones] = await Promise.all([
    buscarPendientesCotizaciones(ahora),
    buscarPendientesPrecalificaciones(ahora),
  ]);
  return [...cotizaciones, ...precalificaciones];
}

/** Plantillas fijas, sin IA — variables simples (nombre, lo cotizado/consultado). */
export function construirMensaje(lead: LeadFrioPendiente): { asunto: string; cuerpo: string } {
  switch (lead.siguienteIntento) {
    case 1:
      return {
        asunto: "¿Sigues interesado en tu carrocería?",
        cuerpo: `Hola ${lead.nombre}, notamos que consultaste sobre ${lead.descripcion} hace unos días. Si sigues interesado, respóndenos este correo o escríbenos por WhatsApp y seguimos la conversación.`,
      };
    case 2:
      return {
        asunto: "Seguimos disponibles para tu carrocería",
        cuerpo: `Hola ${lead.nombre}, queremos asegurarnos de que tu consulta sobre ${lead.descripcion} no quede sin respuesta. Cuéntanos si aún te interesa o si prefieres que no te contactemos más por ahora.`,
      };
    default:
      return {
        asunto: "Última consulta sobre tu carrocería",
        cuerpo: `Hola ${lead.nombre}, este es nuestro último recordatorio sobre tu consulta de ${lead.descripcion}. Si más adelante vuelves a necesitar una carrocería a medida, contáctanos cuando quieras.`,
      };
  }
}

/**
 * Orquestador puro, testeable sin esperar un tick de cron (mismo patrón que
 * pricing.service.ts/precalificacion.service.ts). R-004: registra cada
 * intento pase lo que pase, nunca falla en silencio.
 */
export async function procesarSeguimientoFrio(ahora: Date = new Date()): Promise<LeadFrioPendiente[]> {
  const pendientes = await buscarLeadsFriosPendientes(ahora);

  for (const lead of pendientes) {
    const { asunto, cuerpo } = construirMensaje(lead);
    const enviado = await enviarEmailReal(asunto, cuerpo, lead.email);

    await SeguimientoLeadModel.create({
      leadId: lead.leadId,
      leadTipo: lead.leadTipo,
      numeroIntento: lead.siguienteIntento,
      enviado,
    });
  }

  return pendientes;
}
