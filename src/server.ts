import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { connectDatabase } from "./db/connection.js";
import { iniciarJobSeguimientoFrio } from "./jobs/seguimientoFrio.job.js";

async function main(): Promise<void> {
  await connectDatabase();
  console.info("[server] Conectado a MongoDB");

  iniciarJobSeguimientoFrio();

  const app = createApp();
  app.listen(env.PORT, () => {
    // LA-2026-042: este log de arranque es la referencia para verificar el
    // targetPort real contra el que se configure en Railway al crear el
    // servicio/dominio del backend.
    console.info(`[server] Escuchando en el puerto ${env.PORT}`);
  });
}

main().catch((err: unknown) => {
  console.error("[server] Error fatal en el arranque:", err);
  process.exit(1);
});
