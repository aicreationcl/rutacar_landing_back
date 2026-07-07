import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { CotizacionModel } from "../models/Cotizacion.js";
import { SeguimientoLeadModel } from "../models/SeguimientoLead.js";
import {
  MAX_INTENTOS,
  procesarSeguimientoFrio,
  siguienteIntentoDebido,
  UMBRALES_DIAS,
} from "./seguimientoFrio.service.js";

let mongod: MongoMemoryServer;

const AHORA = new Date("2026-07-07T00:00:00.000Z");

function hace(dias: number): Date {
  return new Date(AHORA.getTime() - dias * 24 * 60 * 60 * 1000);
}

async function crearCotizacion(fechaCreacion: Date, estado: "nueva" | "contactada" = "nueva") {
  return CotizacionModel.create({
    tipologiaSlug: "gas",
    tipologiaNombre: "Gas",
    especificaciones: { capacidadLitros: 10000 },
    reglaCalculoVersion: "v0-conservador-provisional",
    rangoEstimadoCLP: { min: 1, max: 2 },
    contacto: { nombre: "Test Lead", email: "test@example.com", telefono: "+56900000000" },
    estado,
    fechaCreacion,
  });
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});

afterEach(async () => {
  await CotizacionModel.deleteMany({});
  await SeguimientoLeadModel.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

describe("siguienteIntentoDebido (función pura)", () => {
  it("lead de 3 días, sin intentos previos: nada (bajo el umbral 1)", () => {
    expect(siguienteIntentoDebido(hace(3), 0, AHORA)).toBeNull();
  });

  it("lead de 6 días, sin intentos previos: toque 1 (umbral 5)", () => {
    expect(siguienteIntentoDebido(hace(6), 0, AHORA)).toBe(1);
  });

  it("lead de 12 días, con 1 intento previo: toque 2 (umbral 10)", () => {
    expect(siguienteIntentoDebido(hace(12), 1, AHORA)).toBe(2);
  });

  it("lead de 22 días, con 2 intentos previos: toque 3 (umbral 20)", () => {
    expect(siguienteIntentoDebido(hace(22), 2, AHORA)).toBe(3);
  });

  it("lead con el tope de intentos alcanzado: nada, nunca un 4to toque", () => {
    expect(siguienteIntentoDebido(hace(100), MAX_INTENTOS, AHORA)).toBeNull();
  });

  it("job atrasado: lead de 25 días sin intentos previos recibe el toque 1, nunca salta al 3", () => {
    expect(siguienteIntentoDebido(hace(25), 0, AHORA)).toBe(1);
  });

  it("UMBRALES_DIAS expone exactamente 3 umbrales (5, 10, 20 — placeholder documentado)", () => {
    expect(UMBRALES_DIAS).toEqual([5, 10, 20]);
  });
});

describe("procesarSeguimientoFrio (integración, Mongo en memoria)", () => {
  it("un lead 'nueva' de 6 días recibe el toque 1 y queda registrado en SeguimientoLead", async () => {
    const doc = await crearCotizacion(hace(6));

    const pendientes = await procesarSeguimientoFrio(AHORA);

    expect(pendientes).toHaveLength(1);
    expect(pendientes.at(0)?.siguienteIntento).toBe(1);

    const registro = await SeguimientoLeadModel.findOne({ leadId: doc._id }).lean();
    expect(registro).not.toBeNull();
    expect(registro?.numeroIntento).toBe(1);
  });

  it("un lead con estado distinto de 'nueva' nunca se toca, sin importar la fecha", async () => {
    await crearCotizacion(hace(100), "contactada");

    const pendientes = await procesarSeguimientoFrio(AHORA);

    expect(pendientes).toHaveLength(0);
    expect(await SeguimientoLeadModel.countDocuments({})).toBe(0);
  });

  it("un lead de 3 días no recibe ningún toque todavía", async () => {
    await crearCotizacion(hace(3));

    const pendientes = await procesarSeguimientoFrio(AHORA);

    expect(pendientes).toHaveLength(0);
  });

  it("secuencia no salteada: con 1 intento previo exitoso, el siguiente run pide el toque 2, no el 3", async () => {
    const doc = await crearCotizacion(hace(22));
    await SeguimientoLeadModel.create({ leadId: doc._id, leadTipo: "cotizacion", numeroIntento: 1, enviado: true });

    const pendientes = await procesarSeguimientoFrio(AHORA);

    expect(pendientes).toHaveLength(1);
    expect(pendientes.at(0)?.siguienteIntento).toBe(2);
  });

  it("un intento fallido (enviado:false) no cuenta como previo — se reintenta el mismo toque", async () => {
    const doc = await crearCotizacion(hace(6));
    await SeguimientoLeadModel.create({ leadId: doc._id, leadTipo: "cotizacion", numeroIntento: 1, enviado: false });

    const pendientes = await procesarSeguimientoFrio(AHORA);

    expect(pendientes).toHaveLength(1);
    expect(pendientes.at(0)?.siguienteIntento).toBe(1);
  });

  it("un lead que ya recibió los 3 toques no genera un 4to", async () => {
    const doc = await crearCotizacion(hace(100));
    for (let n = 1; n <= MAX_INTENTOS; n++) {
      await SeguimientoLeadModel.create({ leadId: doc._id, leadTipo: "cotizacion", numeroIntento: n, enviado: true });
    }

    const pendientes = await procesarSeguimientoFrio(AHORA);

    expect(pendientes).toHaveLength(0);
  });
});
