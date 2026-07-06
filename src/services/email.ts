import { Resend } from "resend";
import { env } from "../config/env.js";

/**
 * Cliente de envío de email compartido por notification.service.ts
 * (cotizaciones) y precalificacion.notification.service.ts — extraído para no
 * duplicar el guard de NODE_ENV=test ni el de RESEND_API_KEY/FROM_EMAIL.
 */
const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

export async function enviarEmailReal(asunto: string, cuerpo: string, destinatario: string): Promise<boolean> {
  // LA-2026-005: los tests de integración no deben depender de (ni disparar)
  // un envío real cada vez que corren. Vitest fija NODE_ENV=test por defecto.
  if (env.NODE_ENV === "test") {
    return false;
  }

  if (!resend || !env.FROM_EMAIL) {
    console.warn("[email] RESEND_API_KEY/FROM_EMAIL no configurados — el email no se envía de verdad.");
    return false;
  }

  const { data, error } = await resend.emails.send({
    from: env.FROM_EMAIL,
    to: destinatario,
    subject: asunto,
    text: cuerpo,
  });

  if (error) {
    console.error(`[email] Resend rechazó el envío a ${destinatario}:`, error);
    return false;
  }

  console.info(`[email] Email enviado a ${destinatario} (Resend id: ${data?.id})`);
  return true;
}
