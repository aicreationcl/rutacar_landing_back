import cron from "node-cron";
import { procesarSeguimientoFrio } from "../services/seguimientoFrio.service.js";

/**
 * Diario a las 9am — job in-process, no un servicio Railway separado (mismo
 * razonamiento que lib/server/rateLimit.ts del frontend: este backend corre
 * como proceso Node persistente, no serverless).
 */
export function iniciarJobSeguimientoFrio(): void {
  cron.schedule("0 9 * * *", () => {
    procesarSeguimientoFrio().catch((err: unknown) => {
      console.error("[seguimientoFrio.job] Error no controlado:", err);
    });
  });
}
