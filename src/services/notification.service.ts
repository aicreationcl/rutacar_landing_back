import { env } from "../config/env.js";
import { CotizacionModel, type CotizacionDoc } from "../models/Cotizacion.js";
import { enviarEmailReal } from "./email.js";

/**
 * R-004: una notificación fallida en silencio significa que un lead nunca llega
 * a ser atendido. Por eso cada intento (éxito o fracaso) queda registrado en el
 * propio documento (`notificacionEnviada`, `notificacionIntentos`), no solo en
 * un log que se puede perder.
 *
 * Proveedor: Resend. `FROM_EMAIL` hoy es `onboarding@resend.dev` (dominio de
 * pruebas compartido, sin verificar) — Resend solo permite enviar DESDE ese
 * dominio HACIA la dirección dueña de la cuenta (`ADMIN_EMAIL`); cualquier otro
 * destinatario responde 403. `notificarEquipoComercial` (destino fijo
 * `ADMIN_EMAIL`) funciona en este modo, pero `confirmarAlCliente` (destino =
 * email que el cliente escribió en el formulario) va a fallar salvo que
 * coincida con `ADMIN_EMAIL` — el fallo queda registrado, no silencioso. Se
 * resuelve verificando un dominio propio de Ruta Car en resend.com/domains
 * antes de DP-FINAL (ver DEUDA_TECNICA.md DT-02).
 */
export interface ResultadoNotificacion {
  enviada: boolean;
  intento: number;
}

export async function notificarEquipoComercial(cotizacion: CotizacionDoc): Promise<ResultadoNotificacion> {
  const asunto = `Nueva cotización — ${cotizacion.tipologiaNombre}`;
  const cuerpo = [
    `Tipología: ${cotizacion.tipologiaNombre}`,
    `Contacto: ${cotizacion.contacto.nombre} (${cotizacion.contacto.email}, ${cotizacion.contacto.telefono})`,
    `Rango estimado: $${cotizacion.rangoEstimadoCLP.min.toLocaleString("es-CL")} - $${cotizacion.rangoEstimadoCLP.max.toLocaleString("es-CL")} CLP`,
    `Regla de cálculo: ${cotizacion.reglaCalculoVersion}`,
  ].join("\n");

  const enviada = env.ADMIN_EMAIL ? await enviarEmailReal(asunto, cuerpo, env.ADMIN_EMAIL) : false;

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
