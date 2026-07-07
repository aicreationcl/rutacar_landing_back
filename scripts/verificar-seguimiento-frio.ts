/**
 * Verificación manual puntual de procesarSeguimientoFrio() — no forma parte
 * del pipeline de CI. Usa Mongo en memoria (no toca Atlas) y crea leads con
 * fechaCreacion fabricada para ver el job "disparar" sin esperar al cron
 * diario ni a que un lead real envejezca.
 */
import { MongoMemoryServer } from "mongodb-memory-server";

// NODE_ENV=test (default de Vitest, aquí seteado igual a mano): enviarEmailReal
// corta antes de llamar a Resend — este script demuestra la lógica de
// detección/secuencia, no repite la prueba de entrega real ya hecha en producción.
process.env.NODE_ENV = "test";

async function main() {
  const mongod = await MongoMemoryServer.create();
  const mongoose = (await import("mongoose")).default;
  await mongoose.connect(mongod.getUri());

  const { CotizacionModel } = await import("../src/models/Cotizacion.js");
  const { PrecalificacionLeadModel } = await import("../src/models/PrecalificacionLead.js");
  const { procesarSeguimientoFrio, construirMensaje } = await import(
    "../src/services/seguimientoFrio.service.js"
  );

  function hace(dias: number): Date {
    return new Date(Date.now() - dias * 24 * 60 * 60 * 1000);
  }

  const cotizacionFria = await CotizacionModel.create({
    tipologiaSlug: "gas",
    tipologiaNombre: "Gas",
    especificaciones: { capacidadLitros: 10000 },
    reglaCalculoVersion: "v0-conservador-provisional",
    rangoEstimadoCLP: { min: 9_000_000, max: 16_000_000 },
    contacto: { nombre: "Lead de Prueba (Cotización)", email: "lead-cotizacion@example.com", telefono: "+56900000001" },
    estado: "nueva",
    fechaCreacion: hace(6), // pasó el umbral de 5 días -> toque 1
  });

  const precalificacionFria = await PrecalificacionLeadModel.create({
    tipoVehiculo: "minera",
    industria: "Minería",
    plazoEstimado: "1-3-meses",
    contacto: { nombre: "Lead de Prueba (Precalificación)", email: "lead-precalificacion@example.com", telefono: "+56900000002" },
    calificacion: "a_seguir",
    reglaCalificacionVersion: "v0-simple-provisional",
    estado: "nueva",
    fechaCreacion: hace(12), // sin intentos previos -> toque 1 igual (nunca salta al 2 solo por ser vieja)
  });

  // Lead con 1 toque previo YA registrado y 12 días de antigüedad -> ahora sí toque 2 (umbral 10).
  const { SeguimientoLeadModel: SeguimientoLeadModelSeed } = await import("../src/models/SeguimientoLead.js");
  const cotizacionConHistorial = await CotizacionModel.create({
    tipologiaSlug: "minera",
    tipologiaNombre: "Minera",
    especificaciones: { capacidadLitros: 15000 },
    reglaCalculoVersion: "v0-conservador-provisional",
    rangoEstimadoCLP: { min: 12_000_000, max: 22_000_000 },
    contacto: { nombre: "Lead de Prueba (con historial)", email: "lead-historial@example.com", telefono: "+56900000004" },
    estado: "nueva",
    fechaCreacion: hace(12),
  });
  await SeguimientoLeadModelSeed.create({
    leadId: cotizacionConHistorial._id,
    leadTipo: "cotizacion",
    numeroIntento: 1,
    enviado: true,
    fechaEnvio: hace(6),
  });

  const leadAlDia = await CotizacionModel.create({
    tipologiaSlug: "carga-general",
    tipologiaNombre: "Carga General",
    especificaciones: { capacidadLitros: 5000 },
    reglaCalculoVersion: "v0-conservador-provisional",
    rangoEstimadoCLP: { min: 5_500_000, max: 9_500_000 },
    contacto: { nombre: "Lead Reciente (no debe tocarse)", email: "lead-reciente@example.com", telefono: "+56900000003" },
    estado: "nueva",
    fechaCreacion: hace(1),
  });

  console.log("--- Leads sembrados ---");
  console.log("Cotización (6 días, sin intentos previos) -> debería dar toque 1:", cotizacionFria._id.toString());
  console.log("Precalificación (12 días, sin intentos previos) -> debería dar toque 1, no toque 2:", precalificacionFria._id.toString());
  console.log("Cotización (12 días, 1 toque previo ya registrado) -> debería dar toque 2:", cotizacionConHistorial._id.toString());
  console.log("Cotización reciente (1 día, no debe recibir nada):", leadAlDia._id.toString());

  console.log("\n--- Corriendo procesarSeguimientoFrio() ---");
  const pendientes = await procesarSeguimientoFrio();

  console.log(`\n${pendientes.length} lead(s) procesado(s):\n`);
  for (const lead of pendientes) {
    const { asunto, cuerpo } = construirMensaje(lead);
    console.log(`[${lead.leadTipo}] ${lead.nombre} <${lead.email}> — toque ${lead.siguienteIntento}`);
    console.log(`  Asunto: ${asunto}`);
    console.log(`  Cuerpo: ${cuerpo}\n`);
  }

  const { SeguimientoLeadModel } = await import("../src/models/SeguimientoLead.js");
  const registros = await SeguimientoLeadModel.find({}).lean();
  console.log(`--- SeguimientoLead (${registros.length} registro(s) creado(s)) ---`);
  for (const r of registros) {
    console.log(`  leadId=${r.leadId} leadTipo=${r.leadTipo} numeroIntento=${r.numeroIntento} enviado=${r.enviado}`);
  }

  await mongoose.disconnect();
  await mongod.stop();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
