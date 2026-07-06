import type { PrecalificacionLeadDoc } from "../models/PrecalificacionLead.js";
import { env } from "../config/env.js";
import { enviarEmailReal } from "./email.js";
import type { ResultadoNotificacion } from "./notification.service.js";

/**
 * Sin equivalente a confirmarAlCliente (cotizaciones): el DoD de este
 * incremento solo exige que el equipo comercial reciba la notificación — el
 * "mensaje distinto según calificación" lo muestra el frontend en pantalla,
 * no un email al cliente (evita heredar el problema del dominio de pruebas
 * de Resend, DT-02, en un segundo flujo).
 */
export async function notificarEquipoComercialPrecalificacion(
  lead: PrecalificacionLeadDoc,
): Promise<ResultadoNotificacion> {
  const asunto = `Nuevo lead de precalificación — ${lead.tipoVehiculo}`;
  const cuerpo = [
    `Tipo de vehículo: ${lead.tipoVehiculo}`,
    `Industria: ${lead.industria}`,
    `Plazo estimado: ${lead.plazoEstimado}`,
    `Calificación: ${lead.calificacion} (regla ${lead.reglaCalificacionVersion})`,
    `Contacto: ${lead.contacto.nombre} (${lead.contacto.email}, ${lead.contacto.telefono})`,
  ].join("\n");

  const enviada = env.ADMIN_EMAIL ? await enviarEmailReal(asunto, cuerpo, env.ADMIN_EMAIL) : false;

  lead.notificacionIntentos += 1;
  lead.notificacionEnviada = lead.notificacionEnviada || enviada;
  await lead.save();

  return { enviada, intento: lead.notificacionIntentos };
}
