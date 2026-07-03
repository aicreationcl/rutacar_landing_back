import { env } from "../config/env.js";
import { CotizacionModel, type CotizacionDoc } from "../models/Cotizacion.js";

/**
 * R-004: una notificación fallida en silencio significa que un lead nunca llega
 * a ser atendido. Por eso cada intento (éxito o fracaso) queda registrado en el
 * propio documento (`notificacionEnviada`, `notificacionIntentos`), no solo en
 * un log que se puede perder.
 *
 * PENDIENTE: el envío real (Resend/Nodemailer) todavía no está conectado a un
 * proveedor — hoy el "envío" solo registra la intención y loguea el contenido.
 * Reemplazar `enviarEmailReal` por una integración real antes de DP-FINAL
 * (Fase 2 del prompt maestro: "notificación al equipo comercial verificada con
 * un envío real, no solo en tests").
 */
export interface ResultadoNotificacion {
  enviada: boolean;
  intento: number;
}

async function enviarEmailReal(asunto: string, cuerpo: string, destinatario: string): Promise<boolean> {
  if (!env.NOTIFICATION_EMAIL_TO || !env.NOTIFICATION_EMAIL_FROM) {
    console.warn(
      "[notification.service] NOTIFICATION_EMAIL_TO/FROM no configurados — la notificación no se envía de verdad.",
    );
    return false;
  }

  // TODO(Sprint 2): reemplazar por el proveedor real (Resend/Nodemailer).
  console.info(`[notification.service] (stub) Email a ${destinatario} — asunto: ${asunto}\n${cuerpo}`);
  return true;
}

export async function notificarEquipoComercial(cotizacion: CotizacionDoc): Promise<ResultadoNotificacion> {
  const asunto = `Nueva cotización — ${cotizacion.tipologiaNombre}`;
  const cuerpo = [
    `Tipología: ${cotizacion.tipologiaNombre}`,
    `Contacto: ${cotizacion.contacto.nombre} (${cotizacion.contacto.email}, ${cotizacion.contacto.telefono})`,
    `Rango estimado: $${cotizacion.rangoEstimadoCLP.min.toLocaleString("es-CL")} - $${cotizacion.rangoEstimadoCLP.max.toLocaleString("es-CL")} CLP`,
    `Regla de cálculo: ${cotizacion.reglaCalculoVersion}`,
  ].join("\n");

  const enviada = env.NOTIFICATION_EMAIL_TO
    ? await enviarEmailReal(asunto, cuerpo, env.NOTIFICATION_EMAIL_TO)
    : false;

  cotizacion.notificacionIntentos += 1;
  cotizacion.notificacionEnviada = cotizacion.notificacionEnviada || enviada;
  await cotizacion.save();

  return { enviada, intento: cotizacion.notificacionIntentos };
}

export async function confirmarAlCliente(cotizacion: CotizacionDoc): Promise<ResultadoNotificacion> {
  const asunto = "Tu cotización preliminar — Ruta Car";
  const cuerpo = [
    `Hola ${cotizacion.contacto.nombre},`,
    `Recibimos tu solicitud de cotización para ${cotizacion.tipologiaNombre}.`,
    `Rango preliminar estimado: $${cotizacion.rangoEstimadoCLP.min.toLocaleString("es-CL")} - $${cotizacion.rangoEstimadoCLP.max.toLocaleString("es-CL")} CLP.`,
    "Un asesor te contactará para confirmar los detalles.",
  ].join("\n");

  const enviada = await enviarEmailReal(asunto, cuerpo, cotizacion.contacto.email);
  return { enviada, intento: cotizacion.notificacionIntentos };
}

/** Solo para uso en tests: fuerza una recarga del contador de intentos desde la DB. */
export async function releerIntentos(id: string): Promise<number> {
  const doc = await CotizacionModel.findById(id).select("notificacionIntentos").lean();
  return doc?.notificacionIntentos ?? 0;
}
