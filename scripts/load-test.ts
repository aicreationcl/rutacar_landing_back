/**
 * Prueba de carga puntual de POST /api/cotizaciones — no forma parte del
 * pipeline de CI, se corre a mano cuando se necesite reverificar. Usa Mongo en
 * memoria (no toca Atlas/Resend real) y rota X-Forwarded-For por request para
 * no chocar con el rate limiter (5/60min por IP con trust proxy=1, DT-11).
 *
 * Concurrencia moderada a propósito: es un formulario de lead B2B ("picos de
 * campaña"), no un checkout de e-commerce.
 */
import autocannon from "autocannon";
import { MongoMemoryServer } from "mongodb-memory-server";

const API_KEY = "load-test-backend-api-key-0123456789";

process.env.NODE_ENV = "test";
process.env.BACKEND_API_KEY = API_KEY;
process.env.RATE_LIMIT_WINDOW_MINUTES = "60";
process.env.RATE_LIMIT_MAX_REQUESTS = "100000"; // el límite real se prueba aparte, no aquí

async function main() {
  const mongod = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongod.getUri();

  const mongoose = (await import("mongoose")).default;
  await mongoose.connect(mongod.getUri());

  const { createApp } = await import("../src/app.js");
  const app = createApp();

  const server = app.listen(0);
  const address = server.address();
  if (address === null || typeof address === "string") {
    throw new Error("No se pudo obtener el puerto del servidor de prueba");
  }
  const url = `http://127.0.0.1:${address.port}/api/cotizaciones`;

  let contador = 0;
  const payload = () => {
    contador += 1;
    return JSON.stringify({
      tipologiaSlug: "carga-general",
      tipologiaNombre: "Carga general",
      especificaciones: { capacidadLitros: 8000, ejes: 2 },
      contacto: {
        nombre: `Carga Test ${contador}`,
        email: `carga${contador}@example.com`,
        telefono: "+56911111111",
      },
    });
  };

  console.log(`Cargando ${url} ...`);
  const resultado = await autocannon({
    url,
    connections: 20,
    duration: 30,
    method: "POST",
    headers: { "content-type": "application/json", "x-backend-api-key": API_KEY },
    setupClient: (client) => {
      // Rota X-Forwarded-For por request simulado — con trust proxy=1 el
      // rate limiter lo respeta como IP real de un hop, evitando cortar la
      // prueba a la 5ª request (que es el comportamiento correcto en producción).
      client.setHeaders({ "x-forwarded-for": `10.0.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}` });
      client.setBody(payload());
    },
  });

  console.log(autocannon.printResult(resultado));
  console.log(`Errores: ${resultado.errors}, timeouts: ${resultado.timeouts}, non2xx: ${resultado.non2xx}`);

  // Deja drenar cualquier request en cola antes de cerrar — sin esto, el
  // cierre corta conexiones en curso y ensucia el log con errores de teardown
  // que no reflejan la medición real de autocannon (ya calculada arriba).
  await new Promise((resolve) => setTimeout(resolve, 500));
  await new Promise((resolve) => server.close(resolve));
  await mongoose.disconnect();
  await mongod.stop();

  if (resultado.errors > 0 || resultado.non2xx > 0) {
    console.error("Prueba de carga con errores — revisar antes de cerrar el ítem.");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
